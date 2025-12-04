import { NextRequest, NextResponse } from "next/server";
import { Document, Packer, Paragraph, Table } from "docx";
import {
  createCourtDocument,
  createParagraph,
  createMixedParagraph,
  createHeading,
  createTable,
  createEmptyLine,
  createExhibitHeader,
  createCaptionBlock,
  createSignatureBlock,
  createBulletPoint,
  createLegalSection,
  formatCurrency,
  formatDate,
  calculateLaffeyRate,
} from "@/lib/document-utils";
import { ExtractedRepairOrder } from "@/lib/ai";

export const maxDuration = 120;

// Request types
interface BillingEntry {
  attorney: string;
  hours: number;
  rate: number;
  description: string;
  date: string;
  yearsExperience?: number;
}

interface CostEntry {
  description: string;
  amount: number;
  date: string;
  category: string;
}

interface GenerateRequest {
  type: "motion" | "repair_summary" | "billing_summary" | "full_package";
  caseData: {
    caseNumber: string;
    clientName: string;
    defendant: string;
    vehicleYear: number;
    vehicleMake: string;
    vehicleModel: string;
    vin: string;
    purchaseDate: string;
    purchasePrice: number;
  };
  repairOrders?: ExtractedRepairOrder[];
  billing?: {
    entries: BillingEntry[];
    totalHours: number;
    totalFees: number;
  };
  costs?: {
    entries: CostEntry[];
    totalCosts: number;
  };
  laffeyMatrix?: {
    tier1to3Rate: number;
    tier4to7Rate: number;
    tier8to10Rate: number;
    tier11to19Rate: number;
    tier20PlusRate: number;
    paralegalRate: number;
  };
  attorneys?: {
    name: string;
    yearsExperience: number;
    isParalegal: boolean;
  }[];
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { type, caseData, repairOrders = [], billing, costs, laffeyMatrix, attorneys } = body;

    let doc: Document;
    let filename: string;

    // Calculate Laffey comparison if we have the data
    const laffeyComparison = laffeyMatrix && billing?.entries
      ? calculateLaffeyComparison(billing.entries, laffeyMatrix, attorneys)
      : null;

    switch (type) {
      case "motion":
        doc = generateMotionDocument(caseData, repairOrders, billing, costs, laffeyComparison);
        filename = `Motion_for_Fees_${caseData.clientName.replace(/\s+/g, "_")}.docx`;
        break;

      case "repair_summary":
        doc = generateRepairSummaryDocument(caseData, repairOrders);
        filename = `Exhibit_A_Repair_Summary_${caseData.clientName.replace(/\s+/g, "_")}.docx`;
        break;

      case "billing_summary":
        doc = generateBillingSummaryDocument(caseData, billing, laffeyComparison);
        filename = `Exhibit_B_Billing_Summary_${caseData.clientName.replace(/\s+/g, "_")}.docx`;
        break;

      case "full_package":
        doc = generateFullPackage(caseData, repairOrders, billing, costs, laffeyComparison);
        filename = `Fee_Motion_Package_${caseData.clientName.replace(/\s+/g, "_")}.docx`;
        break;

      default:
        return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
    }

    const buffer = await Packer.toBuffer(doc);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}

// Laffey comparison result
interface LaffeyComparisonResult {
  totalBilled: number;
  totalLaffey: number;
  difference: number;
  isUnderLaffey: boolean;
  byAttorney: {
    attorney: string;
    hours: number;
    billedRate: number;
    laffeyRate: number;
    billedAmount: number;
    laffeyAmount: number;
  }[];
}

function calculateLaffeyComparison(
  entries: BillingEntry[],
  laffeyMatrix: NonNullable<GenerateRequest["laffeyMatrix"]>,
  attorneys?: GenerateRequest["attorneys"]
): LaffeyComparisonResult {
  const byAttorney = new Map<string, { hours: number; billedRate: number; yearsExperience: number }>();

  for (const entry of entries) {
    const existing = byAttorney.get(entry.attorney);
    const yearsExp = entry.yearsExperience
      || attorneys?.find(a => a.name === entry.attorney)?.yearsExperience
      || 5;

    if (existing) {
      const totalHours = existing.hours + entry.hours;
      existing.billedRate = (existing.billedRate * existing.hours + entry.rate * entry.hours) / totalHours;
      existing.hours = totalHours;
    } else {
      byAttorney.set(entry.attorney, {
        hours: entry.hours,
        billedRate: entry.rate,
        yearsExperience: yearsExp,
      });
    }
  }

  const result: LaffeyComparisonResult["byAttorney"] = [];
  let totalBilled = 0;
  let totalLaffey = 0;

  for (const [attorney, data] of byAttorney) {
    const laffeyRate = calculateLaffeyRate(data.yearsExperience, laffeyMatrix);
    const billedAmount = data.hours * data.billedRate;
    const laffeyAmount = data.hours * laffeyRate;

    result.push({
      attorney,
      hours: data.hours,
      billedRate: data.billedRate,
      laffeyRate,
      billedAmount,
      laffeyAmount,
    });

    totalBilled += billedAmount;
    totalLaffey += laffeyAmount;
  }

  return {
    totalBilled,
    totalLaffey,
    difference: totalLaffey - totalBilled,
    isUnderLaffey: totalBilled <= totalLaffey,
    byAttorney: result,
  };
}

// Generate motion document with professional formatting
function generateMotionDocument(
  caseData: GenerateRequest["caseData"],
  repairOrders: ExtractedRepairOrder[],
  billing?: GenerateRequest["billing"],
  costs?: GenerateRequest["costs"],
  laffeyComparison?: LaffeyComparisonResult | null
): Document {
  const totalDaysDown = repairOrders.reduce((sum, ro) => sum + (ro.daysDown || 0), 0);
  const children: (Paragraph | Table)[] = [];

  // Caption
  children.push(...createCaptionBlock(
    caseData.caseNumber,
    caseData.clientName,
    caseData.defendant,
    "MOTION FOR ATTORNEY'S FEES AND COSTS"
  ));

  // Introduction
  children.push(...createLegalSection("I", "INTRODUCTION", [
    `Plaintiff ${caseData.clientName}, by and through undersigned counsel, hereby moves this Court for an award of attorney's fees and costs pursuant to California Civil Code § 1794(d), the Song-Beverly Consumer Warranty Act ("Song-Beverly Act" or "Lemon Law"). This motion is based on the following memorandum of points and authorities, the declarations filed herewith, and such other evidence as may be presented at the hearing on this motion.`,
  ]));

  // Statement of Facts
  const factsParagraphs = [
    `On or about ${formatDate(caseData.purchaseDate)}, Plaintiff purchased a new ${caseData.vehicleYear} ${caseData.vehicleMake} ${caseData.vehicleModel}, Vehicle Identification Number ${caseData.vin}, for ${formatCurrency(caseData.purchasePrice)}. The vehicle was sold with ${caseData.defendant}'s express written warranty covering defects in materials and workmanship.`,
    `During the warranty period, Plaintiff presented the vehicle to ${caseData.defendant}'s authorized repair facilities on ${repairOrders.length} separate occasions for repair of substantial defects that impaired the use, value, and safety of the vehicle. Despite these ${repairOrders.length} repair attempts, ${caseData.defendant} and its authorized repair facilities were unable to conform the vehicle to the applicable express warranties.`,
    `As a result of these warranty nonconformities, Plaintiff's vehicle was out of service for a total of ${totalDaysDown} days—well in excess of the 30-day threshold that raises a presumption of breach under Civil Code § 1793.22.`,
    `A detailed summary of the repair history is attached hereto as Exhibit A and incorporated by reference.`,
  ];
  children.push(...createLegalSection("II", "STATEMENT OF FACTS", factsParagraphs));

  // Legal Standard
  const legalStandardParagraphs = [
    `Civil Code § 1794(d) provides that a prevailing buyer in a Song-Beverly action "shall be allowed by the court to recover as part of the judgment a sum equal to the aggregate amount of costs and expenses, including attorney's fees based on actual time expended, determined by the court to have been reasonably incurred by the buyer in connection with the commencement and prosecution of such action."`,
    `The Legislature's use of the word "shall" makes the award of attorney's fees to a prevailing buyer mandatory. (See Warren v. Kia Motors America, Inc. (2018) 30 Cal.App.5th 24, 42.)`,
    `In determining reasonable attorney's fees, California courts apply the "lodestar" method: the number of hours reasonably expended multiplied by the reasonable hourly rate. (PLCM Group, Inc. v. Drexler (2000) 22 Cal.4th 1084, 1095.) The party seeking fees has the burden of documenting the appropriate hours expended and hourly rates.`,
  ];
  children.push(...createLegalSection("III", "LEGAL STANDARD", legalStandardParagraphs));

  // Attorney's Fees
  children.push(createHeading("IV. ATTORNEY'S FEES", 1));
  children.push(createEmptyLine());

  if (billing?.entries && billing.entries.length > 0) {
    children.push(createParagraph(
      `Plaintiff's counsel expended a total of ${billing.totalHours.toFixed(1)} hours prosecuting this action. At the hourly rates charged, this results in total attorney's fees of ${formatCurrency(billing.totalFees)}. A detailed billing summary is attached hereto as Exhibit B.`
    ));
    children.push(createEmptyLine());

    // Subsection A - Reasonableness of Hours
    children.push(createParagraph("A. The Hours Expended Were Reasonable", { bold: true, underline: true }));
    children.push(createEmptyLine());
    children.push(createParagraph(
      `The time expended by Plaintiff's counsel was reasonable and necessary to successfully prosecute this action. Counsel performed the following tasks in connection with this litigation:`
    ));
    children.push(createEmptyLine());

    // Group billing entries by category
    const categories = new Map<string, number>();
    for (const entry of billing.entries) {
      const desc = entry.description?.toLowerCase() || "";
      let category = "Other legal work";
      if (desc.includes("research")) category = "Legal research";
      else if (desc.includes("draft") || desc.includes("prepar")) category = "Document preparation";
      else if (desc.includes("discovery") || desc.includes("interrogator") || desc.includes("request")) category = "Discovery";
      else if (desc.includes("deposition")) category = "Depositions";
      else if (desc.includes("motion") || desc.includes("compel")) category = "Motions practice";
      else if (desc.includes("settlement") || desc.includes("negoti")) category = "Settlement negotiations";
      else if (desc.includes("court") || desc.includes("hearing") || desc.includes("appearance")) category = "Court appearances";
      else if (desc.includes("client") || desc.includes("intake") || desc.includes("consult")) category = "Client communications";

      categories.set(category, (categories.get(category) || 0) + entry.hours);
    }

    for (const [category, hours] of categories) {
      children.push(createBulletPoint(`${category}: ${hours.toFixed(1)} hours`));
    }
    children.push(createEmptyLine());

    // Subsection B - Reasonableness of Rates
    children.push(createParagraph("B. The Hourly Rates Are Reasonable", { bold: true, underline: true }));
    children.push(createEmptyLine());

    if (laffeyComparison) {
      const comparison = laffeyComparison.isUnderLaffey
        ? `below the Laffey Matrix rates by ${formatCurrency(laffeyComparison.difference)}`
        : `consistent with prevailing market rates`;

      children.push(createParagraph(
        `The hourly rates charged by Plaintiff's counsel are ${comparison}. The Laffey Matrix represents the prevailing market rate for attorneys of similar experience in complex civil litigation. A comparison of the actual billed rates to the Laffey Matrix rates is attached as Exhibit C.`
      ));
      children.push(createEmptyLine());

      if (laffeyComparison.isUnderLaffey) {
        children.push(createParagraph(
          `Specifically, the total fees billed of ${formatCurrency(laffeyComparison.totalBilled)} are ${formatCurrency(laffeyComparison.difference)} LESS than the ${formatCurrency(laffeyComparison.totalLaffey)} that would be justified under the Laffey Matrix. This demonstrates the reasonableness—indeed, the conservativeness—of the fees requested.`,
          { bold: true }
        ));
        children.push(createEmptyLine());
      }
    } else {
      children.push(createParagraph(
        `The hourly rates charged by Plaintiff's counsel are consistent with the prevailing market rates for attorneys of similar skill and experience handling Song-Beverly Consumer Warranty Act litigation in this jurisdiction.`
      ));
      children.push(createEmptyLine());
    }
  }

  // Costs
  if (costs?.entries && costs.entries.length > 0) {
    children.push(createHeading("V. COSTS", 1));
    children.push(createEmptyLine());
    children.push(createParagraph(
      `In addition to attorney's fees, Plaintiff incurred ${formatCurrency(costs.totalCosts)} in costs necessarily expended in prosecuting this action. Civil Code § 1794(d) expressly provides for recovery of "costs and expenses" in addition to attorney's fees. The costs incurred include:`
    ));
    children.push(createEmptyLine());

    for (const cost of costs.entries) {
      children.push(createBulletPoint(`${cost.description}: ${formatCurrency(cost.amount)}`));
    }
    children.push(createEmptyLine());
  }

  // Conclusion
  const conclusionNum = costs?.entries && costs.entries.length > 0 ? "VI" : "V";
  const totalAmount = (billing?.totalFees || 0) + (costs?.totalCosts || 0);

  children.push(createHeading(`${conclusionNum}. CONCLUSION`, 1));
  children.push(createEmptyLine());
  children.push(createParagraph(
    `For the foregoing reasons, Plaintiff ${caseData.clientName} respectfully requests that this Court grant this motion and award Plaintiff:`
  ));
  children.push(createEmptyLine());
  children.push(createBulletPoint(`Attorney's fees in the amount of ${formatCurrency(billing?.totalFees || 0)}`));
  if (costs?.totalCosts) {
    children.push(createBulletPoint(`Costs in the amount of ${formatCurrency(costs.totalCosts)}`));
  }
  children.push(createBulletPoint(`For a total award of ${formatCurrency(totalAmount)}`, 0.5));
  children.push(createEmptyLine());

  // Signature
  children.push(...createSignatureBlock());

  return createCourtDocument([{ children }]);
}

// Generate repair summary (Exhibit A) with professional formatting
function generateRepairSummaryDocument(
  caseData: GenerateRequest["caseData"],
  repairOrders: ExtractedRepairOrder[]
): Document {
  const totalDaysDown = repairOrders.reduce((sum, ro) => sum + (ro.daysDown || 0), 0);
  const children: (Paragraph | Table)[] = [];

  children.push(...createExhibitHeader("A", "REPAIR ORDER SUMMARY"));

  // Vehicle Info Box
  children.push(createParagraph("VEHICLE INFORMATION", { bold: true, underline: true, centered: true }));
  children.push(createEmptyLine());

  const vehicleInfo = [
    ["Vehicle:", `${caseData.vehicleYear} ${caseData.vehicleMake} ${caseData.vehicleModel}`],
    ["VIN:", caseData.vin],
    ["Purchase Date:", formatDate(caseData.purchaseDate)],
    ["Purchase Price:", formatCurrency(caseData.purchasePrice)],
  ];

  for (const [label, value] of vehicleInfo) {
    children.push(createMixedParagraph([
      { text: label + " ", bold: true },
      { text: value },
    ]));
  }
  children.push(createEmptyLine());

  // Summary Stats
  children.push(createParagraph("REPAIR SUMMARY", { bold: true, underline: true, centered: true }));
  children.push(createEmptyLine());

  const summaryTable = createTable(
    ["Metric", "Value"],
    [
      ["Total Repair Visits", String(repairOrders.length)],
      ["Total Days Out of Service", String(totalDaysDown)],
      ["Average Days Per Visit", repairOrders.length > 0 ? (totalDaysDown / repairOrders.length).toFixed(1) : "0"],
      ["Exceeds 30-Day Presumption?", totalDaysDown >= 30 ? "YES ✓" : "No"],
    ],
    [60, 40]
  );
  children.push(summaryTable);
  children.push(createEmptyLine());
  children.push(createEmptyLine());

  // Repair History Table
  children.push(createParagraph("REPAIR HISTORY", { bold: true, underline: true, centered: true }));
  children.push(createEmptyLine());

  const tableHeaders = ["#", "Date In", "Date Out", "Mileage", "Days", "Category", "Resolved"];
  const tableRows = repairOrders.map((ro, i) => [
    String(i + 1),
    formatDate(ro.dateIn || ""),
    formatDate(ro.dateOut || ""),
    ro.mileageIn?.toLocaleString() || "N/A",
    String(ro.daysDown || 0),
    ro.category || "Other",
    ro.resolved || "No",
  ]);
  children.push(createTable(tableHeaders, tableRows, [5, 15, 15, 12, 8, 15, 10]));
  children.push(createEmptyLine());
  children.push(createEmptyLine());

  // Detailed Descriptions
  children.push(createParagraph("DETAILED REPAIR DESCRIPTIONS", { bold: true, underline: true, centered: true }));
  children.push(createEmptyLine());

  repairOrders.forEach((ro, i) => {
    children.push(createParagraph(
      `REPAIR VISIT #${i + 1} — ${formatDate(ro.dateIn || "")}`,
      { bold: true }
    ));
    children.push(createEmptyLine());

    const details = [
      ["RO Number:", ro.roNumber || "N/A"],
      ["Dealership:", ro.dealership || "N/A"],
      ["Date Range:", `${formatDate(ro.dateIn || "")} to ${formatDate(ro.dateOut || "")}`],
      ["Mileage:", `${ro.mileageIn?.toLocaleString() || "N/A"} miles`],
      ["Days Out of Service:", `${ro.daysDown || 0} days`],
      ["Category:", ro.category || "Other"],
    ];

    for (const [label, value] of details) {
      children.push(createMixedParagraph([
        { text: label + " ", bold: true },
        { text: value },
      ], { indent: 0.25 }));
    }

    children.push(createEmptyLine());
    children.push(createMixedParagraph([
      { text: "Customer Concern: ", bold: true },
      { text: ro.customerConcern || "Not documented" },
    ], { indent: 0.25, justified: true }));

    children.push(createEmptyLine());
    children.push(createMixedParagraph([
      { text: "Work Performed: ", bold: true },
      { text: ro.workPerformed || "Not documented" },
    ], { indent: 0.25, justified: true }));

    if (ro.partsReplaced) {
      children.push(createEmptyLine());
      children.push(createMixedParagraph([
        { text: "Parts Replaced: ", bold: true },
        { text: ro.partsReplaced },
      ], { indent: 0.25 }));
    }

    children.push(createEmptyLine());
    children.push(createMixedParagraph([
      { text: "Issue Resolved: ", bold: true },
      { text: ro.resolved || "No" },
    ], { indent: 0.25 }));

    children.push(createEmptyLine());
    children.push(createParagraph("─".repeat(60), { centered: true }));
    children.push(createEmptyLine());
  });

  return createCourtDocument([{ children }]);
}

// Generate billing summary (Exhibit B) with professional formatting
function generateBillingSummaryDocument(
  caseData: GenerateRequest["caseData"],
  billing?: GenerateRequest["billing"],
  laffeyComparison?: LaffeyComparisonResult | null
): Document {
  const children: (Paragraph | Table)[] = [];

  children.push(...createExhibitHeader("B", "ATTORNEY FEE BILLING SUMMARY"));

  // Case Info
  children.push(createParagraph(`${caseData.clientName} v. ${caseData.defendant}`, { centered: true, bold: true }));
  children.push(createParagraph(`Case No. ${caseData.caseNumber}`, { centered: true }));
  children.push(createEmptyLine());
  children.push(createEmptyLine());

  // Summary
  children.push(createParagraph("FEE SUMMARY", { bold: true, underline: true, centered: true }));
  children.push(createEmptyLine());

  const summaryTable = createTable(
    ["Description", "Amount"],
    [
      ["Total Hours Expended", `${billing?.totalHours?.toFixed(1) || 0} hours`],
      ["Total Attorney's Fees", formatCurrency(billing?.totalFees || 0)],
    ],
    [70, 30]
  );
  children.push(summaryTable);
  children.push(createEmptyLine());
  children.push(createEmptyLine());

  // Summary by Attorney
  if (billing?.entries && billing.entries.length > 0) {
    children.push(createParagraph("SUMMARY BY TIMEKEEPER", { bold: true, underline: true, centered: true }));
    children.push(createEmptyLine());

    const attorneySummary = new Map<string, { hours: number; amount: number; avgRate: number }>();
    for (const entry of billing.entries) {
      const existing = attorneySummary.get(entry.attorney) || { hours: 0, amount: 0, avgRate: 0 };
      existing.hours += entry.hours || 0;
      existing.amount += (entry.hours || 0) * (entry.rate || 0);
      attorneySummary.set(entry.attorney, existing);
    }

    // Calculate average rates
    for (const [, data] of attorneySummary) {
      data.avgRate = data.hours > 0 ? data.amount / data.hours : 0;
    }

    const attorneyHeaders = ["Timekeeper", "Hours", "Avg. Rate", "Total"];
    const attorneyRows = Array.from(attorneySummary.entries()).map(([attorney, data]) => [
      attorney,
      data.hours.toFixed(1),
      formatCurrency(data.avgRate),
      formatCurrency(data.amount),
    ]);
    attorneyRows.push([
      "TOTAL",
      billing.totalHours?.toFixed(1) || "0",
      "",
      formatCurrency(billing.totalFees || 0),
    ]);

    children.push(createTable(attorneyHeaders, attorneyRows, [40, 15, 20, 25]));
    children.push(createEmptyLine());
    children.push(createEmptyLine());

    // Detailed Time Entries
    children.push(createParagraph("DETAILED TIME ENTRIES", { bold: true, underline: true, centered: true }));
    children.push(createEmptyLine());

    const tableHeaders = ["Date", "Timekeeper", "Hours", "Rate", "Amount", "Description"];
    const tableRows = billing.entries.map((e) => [
      formatDate(e.date || ""),
      e.attorney || "N/A",
      e.hours?.toFixed(1) || "0",
      formatCurrency(e.rate || 0),
      formatCurrency((e.hours || 0) * (e.rate || 0)),
      (e.description || "").substring(0, 60) + ((e.description?.length || 0) > 60 ? "..." : ""),
    ]);
    children.push(createTable(tableHeaders, tableRows, [12, 15, 8, 10, 12, 43]));
  }

  // Laffey comparison
  if (laffeyComparison) {
    children.push(createEmptyLine());
    children.push(createEmptyLine());
    children.push(createParagraph("LAFFEY MATRIX COMPARISON", { bold: true, underline: true, centered: true }));
    children.push(createEmptyLine());
    children.push(createParagraph(
      `The following table compares the actual billed rates to the Laffey Matrix rates, which represent the prevailing market rate for legal services in complex civil litigation.`
    ));
    children.push(createEmptyLine());

    const laffeyHeaders = ["Timekeeper", "Hours", "Billed Rate", "Laffey Rate", "Billed Total", "Laffey Total"];
    const laffeyRows = laffeyComparison.byAttorney.map((a) => [
      a.attorney,
      a.hours.toFixed(1),
      formatCurrency(a.billedRate),
      formatCurrency(a.laffeyRate),
      formatCurrency(a.billedAmount),
      formatCurrency(a.laffeyAmount),
    ]);
    laffeyRows.push([
      "TOTAL",
      "",
      "",
      "",
      formatCurrency(laffeyComparison.totalBilled),
      formatCurrency(laffeyComparison.totalLaffey),
    ]);
    children.push(createTable(laffeyHeaders, laffeyRows, [22, 10, 14, 14, 20, 20]));
    children.push(createEmptyLine());

    if (laffeyComparison.isUnderLaffey) {
      children.push(createParagraph(
        `★ The fees billed (${formatCurrency(laffeyComparison.totalBilled)}) are ${formatCurrency(laffeyComparison.difference)} BELOW the Laffey Matrix amount (${formatCurrency(laffeyComparison.totalLaffey)}), demonstrating the reasonableness of the fees requested.`,
        { bold: true }
      ));
    }
  }

  return createCourtDocument([{ children }]);
}

// Generate full package with all exhibits
function generateFullPackage(
  caseData: GenerateRequest["caseData"],
  repairOrders: ExtractedRepairOrder[],
  billing?: GenerateRequest["billing"],
  costs?: GenerateRequest["costs"],
  laffeyComparison?: LaffeyComparisonResult | null
): Document {
  const totalDaysDown = repairOrders.reduce((sum, ro) => sum + (ro.daysDown || 0), 0);
  const sections: { children: (Paragraph | Table)[] }[] = [];

  // ====================
  // SECTION 1: MOTION
  // ====================
  const motionChildren: (Paragraph | Table)[] = [];

  motionChildren.push(...createCaptionBlock(
    caseData.caseNumber,
    caseData.clientName,
    caseData.defendant,
    "MOTION FOR ATTORNEY'S FEES AND COSTS"
  ));

  // Intro
  motionChildren.push(...createLegalSection("I", "INTRODUCTION", [
    `Plaintiff ${caseData.clientName} moves for attorney's fees and costs pursuant to California Civil Code § 1794(d), the Song-Beverly Consumer Warranty Act.`,
  ]));

  // Summary
  motionChildren.push(createHeading("II. CASE SUMMARY", 1));
  motionChildren.push(createEmptyLine());

  const totalAmount = (billing?.totalFees || 0) + (costs?.totalCosts || 0);

  const summaryTable = createTable(
    ["Item", "Details"],
    [
      ["Vehicle", `${caseData.vehicleYear} ${caseData.vehicleMake} ${caseData.vehicleModel}`],
      ["VIN", caseData.vin],
      ["Purchase Date", formatDate(caseData.purchaseDate)],
      ["Purchase Price", formatCurrency(caseData.purchasePrice)],
      ["Repair Visits", String(repairOrders.length)],
      ["Days Out of Service", `${totalDaysDown} days`],
      ["Attorney's Fees Requested", formatCurrency(billing?.totalFees || 0)],
      ["Costs Requested", formatCurrency(costs?.totalCosts || 0)],
      ["TOTAL REQUESTED", formatCurrency(totalAmount)],
    ],
    [35, 65]
  );
  motionChildren.push(summaryTable);
  motionChildren.push(createEmptyLine());

  // Brief Legal Standard
  motionChildren.push(...createLegalSection("III", "LEGAL BASIS", [
    `Civil Code § 1794(d) mandates that a prevailing buyer "shall be allowed by the court to recover" attorney's fees and costs "reasonably incurred" in prosecuting a Song-Beverly action.`,
    `See attached Exhibits A (Repair Summary), B (Billing Summary)${laffeyComparison ? ", and C (Laffey Matrix Comparison)" : ""} for supporting documentation.`,
  ]));

  // Conclusion
  motionChildren.push(createHeading("IV. CONCLUSION", 1));
  motionChildren.push(createEmptyLine());
  motionChildren.push(createParagraph(
    `Plaintiff respectfully requests that this Court award attorney's fees of ${formatCurrency(billing?.totalFees || 0)} and costs of ${formatCurrency(costs?.totalCosts || 0)}, for a total award of ${formatCurrency(totalAmount)}.`
  ));

  motionChildren.push(...createSignatureBlock());
  sections.push({ children: motionChildren });

  // ====================
  // SECTION 2: EXHIBIT A - Repair Summary
  // ====================
  const exhibitAChildren: (Paragraph | Table)[] = [];
  exhibitAChildren.push(...createExhibitHeader("A", "REPAIR ORDER SUMMARY"));

  exhibitAChildren.push(createMixedParagraph([
    { text: "Vehicle: ", bold: true },
    { text: `${caseData.vehicleYear} ${caseData.vehicleMake} ${caseData.vehicleModel}` },
  ]));
  exhibitAChildren.push(createMixedParagraph([
    { text: "VIN: ", bold: true },
    { text: caseData.vin },
  ]));
  exhibitAChildren.push(createMixedParagraph([
    { text: "Total Repair Visits: ", bold: true },
    { text: String(repairOrders.length) },
  ]));
  exhibitAChildren.push(createMixedParagraph([
    { text: "Total Days Out of Service: ", bold: true },
    { text: `${totalDaysDown} days` },
  ]));
  exhibitAChildren.push(createEmptyLine());

  const repairHeaders = ["#", "Date", "Mileage", "Days", "Category", "Concern"];
  const repairRows = repairOrders.map((ro, i) => [
    String(i + 1),
    formatDate(ro.dateIn || ""),
    ro.mileageIn?.toLocaleString() || "N/A",
    String(ro.daysDown || 0),
    ro.category || "Other",
    (ro.customerConcern || "N/A").substring(0, 40) + ((ro.customerConcern?.length || 0) > 40 ? "..." : ""),
  ]);
  exhibitAChildren.push(createTable(repairHeaders, repairRows, [5, 15, 12, 8, 15, 45]));

  sections.push({ children: exhibitAChildren });

  // ====================
  // SECTION 3: EXHIBIT B - Billing Summary
  // ====================
  const exhibitBChildren: (Paragraph | Table)[] = [];
  exhibitBChildren.push(...createExhibitHeader("B", "BILLING SUMMARY"));

  if (billing?.entries) {
    exhibitBChildren.push(createMixedParagraph([
      { text: "Total Hours: ", bold: true },
      { text: `${billing.totalHours?.toFixed(1) || "0"} hours` },
    ]));
    exhibitBChildren.push(createMixedParagraph([
      { text: "Total Fees: ", bold: true },
      { text: formatCurrency(billing.totalFees || 0) },
    ]));
    exhibitBChildren.push(createEmptyLine());

    const billingHeaders = ["Date", "Timekeeper", "Hours", "Rate", "Amount"];
    const billingRows = billing.entries.map((e) => [
      formatDate(e.date || ""),
      e.attorney || "N/A",
      e.hours?.toFixed(1) || "0",
      formatCurrency(e.rate || 0),
      formatCurrency((e.hours || 0) * (e.rate || 0)),
    ]);
    billingRows.push(["", "TOTAL", billing.totalHours?.toFixed(1) || "0", "", formatCurrency(billing.totalFees || 0)]);
    exhibitBChildren.push(createTable(billingHeaders, billingRows, [15, 25, 12, 18, 20]));
  }

  sections.push({ children: exhibitBChildren });

  // ====================
  // SECTION 4: EXHIBIT C - Laffey Matrix (if applicable)
  // ====================
  if (laffeyComparison) {
    const exhibitCChildren: (Paragraph | Table)[] = [];
    exhibitCChildren.push(...createExhibitHeader("C", "LAFFEY MATRIX COMPARISON"));

    exhibitCChildren.push(createParagraph(
      `The Laffey Matrix represents the prevailing market rate for attorneys in complex civil litigation.`
    ));
    exhibitCChildren.push(createEmptyLine());

    const laffeyHeaders = ["Timekeeper", "Hours", "Billed Rate", "Laffey Rate", "Billed", "Laffey"];
    const laffeyRows = laffeyComparison.byAttorney.map((a) => [
      a.attorney,
      a.hours.toFixed(1),
      formatCurrency(a.billedRate),
      formatCurrency(a.laffeyRate),
      formatCurrency(a.billedAmount),
      formatCurrency(a.laffeyAmount),
    ]);
    laffeyRows.push([
      "TOTAL",
      "",
      "",
      "",
      formatCurrency(laffeyComparison.totalBilled),
      formatCurrency(laffeyComparison.totalLaffey),
    ]);
    exhibitCChildren.push(createTable(laffeyHeaders, laffeyRows, [25, 10, 15, 15, 17, 18]));
    exhibitCChildren.push(createEmptyLine());

    if (laffeyComparison.isUnderLaffey) {
      exhibitCChildren.push(createParagraph(
        `★ CONCLUSION: The fees billed are ${formatCurrency(laffeyComparison.difference)} BELOW Laffey Matrix rates, demonstrating reasonableness.`,
        { bold: true }
      ));
    }

    sections.push({ children: exhibitCChildren });
  }

  return createCourtDocument(sections);
}
