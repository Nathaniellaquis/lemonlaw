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
  formatCurrency,
  formatDate,
  calculateLaffeyRate,
} from "@/lib/document-utils";
import { generateMotionContent, CaseDataForMotion, ExtractedRepairOrder } from "@/lib/ai";

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
        doc = await generateMotionDocument(caseData, repairOrders, billing, costs, laffeyComparison);
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
        doc = await generateFullPackage(caseData, repairOrders, billing, costs, laffeyComparison);
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

// Generate motion document
async function generateMotionDocument(
  caseData: GenerateRequest["caseData"],
  repairOrders: ExtractedRepairOrder[],
  billing?: GenerateRequest["billing"],
  costs?: GenerateRequest["costs"],
  laffeyComparison?: LaffeyComparisonResult | null
): Promise<Document> {
  const totalDaysDown = repairOrders.reduce((sum, ro) => sum + (ro.daysDown || 0), 0);

  // Generate AI content
  const motionData: CaseDataForMotion = {
    ...caseData,
    repairOrders,
    totalDaysDown,
    totalHours: billing?.totalHours || 0,
    totalFees: billing?.totalFees || 0,
    totalCosts: costs?.totalCosts || 0,
  };

  await generateMotionContent(motionData);
  const children: (Paragraph | Table)[] = [];

  // Caption
  children.push(...createCaptionBlock(
    caseData.caseNumber,
    caseData.clientName,
    caseData.defendant,
    "MOTION FOR ATTORNEY'S FEES AND COSTS"
  ));

  // Introduction
  children.push(createHeading("I. INTRODUCTION", 2));
  children.push(createParagraph(
    `Plaintiff ${caseData.clientName}, by and through undersigned counsel, hereby moves this Court ` +
    `for an award of attorney's fees and costs pursuant to California Civil Code § 1794(d), the ` +
    `Song-Beverly Consumer Warranty Act.`
  ));
  children.push(createEmptyLine());

  // Statement of Facts
  children.push(createHeading("II. STATEMENT OF FACTS", 2));
  children.push(createParagraph(
    `On or about ${formatDate(caseData.purchaseDate)}, Plaintiff purchased a ${caseData.vehicleYear} ` +
    `${caseData.vehicleMake} ${caseData.vehicleModel}, VIN ${caseData.vin}, for ${formatCurrency(caseData.purchasePrice)}. ` +
    `The vehicle was covered by the manufacturer's express warranty.`
  ));
  children.push(createEmptyLine());
  children.push(createParagraph(
    `Despite ${repairOrders.length} repair attempts over ${totalDaysDown} days out of service, ` +
    `Defendant failed to repair the vehicle to conform to the applicable warranties. ` +
    `A detailed summary of the repair history is attached as Exhibit A.`
  ));
  children.push(createEmptyLine());

  // Legal Standard
  children.push(createHeading("III. LEGAL STANDARD", 2));
  children.push(createParagraph(
    `Civil Code § 1794(d) provides that a prevailing buyer in a Song-Beverly action "shall be allowed ` +
    `by the court to recover as part of the judgment a sum equal to the aggregate amount of costs and ` +
    `expenses, including attorney's fees based on actual time expended, determined by the court to ` +
    `have been reasonably incurred by the buyer in connection with the commencement and prosecution ` +
    `of such action."`
  ));
  children.push(createEmptyLine());

  // Attorney's Fees
  children.push(createHeading("IV. ATTORNEY'S FEES", 2));
  if (billing?.entries && billing.entries.length > 0) {
    children.push(createParagraph(
      `Plaintiff's counsel expended a total of ${billing.totalHours.toFixed(1)} hours prosecuting this action, ` +
      `resulting in total fees of ${formatCurrency(billing.totalFees)}. A detailed billing summary is attached as Exhibit B.`
    ));
    children.push(createEmptyLine());

    if (laffeyComparison) {
      children.push(createParagraph(
        `The rates charged are ${laffeyComparison.isUnderLaffey ? "below" : "consistent with"} the ` +
        `Laffey Matrix rates, which represent the prevailing market rate for attorneys of similar ` +
        `experience in this jurisdiction.`,
        { bold: laffeyComparison.isUnderLaffey }
      ));
      children.push(createEmptyLine());

      if (laffeyComparison.isUnderLaffey) {
        children.push(createParagraph(
          `Under the Laffey Matrix, the reasonable fee would be ${formatCurrency(laffeyComparison.totalLaffey)}, ` +
          `which is ${formatCurrency(laffeyComparison.difference)} MORE than the ${formatCurrency(laffeyComparison.totalBilled)} ` +
          `actually billed. A Laffey Matrix comparison is attached as Exhibit C.`
        ));
        children.push(createEmptyLine());
      }
    }
  }

  // Costs
  if (costs?.entries && costs.entries.length > 0) {
    children.push(createHeading("V. COSTS", 2));
    children.push(createParagraph(
      `Plaintiff incurred ${formatCurrency(costs.totalCosts)} in costs prosecuting this action, including:`
    ));
    children.push(createEmptyLine());

    for (const cost of costs.entries) {
      children.push(createParagraph(`• ${cost.description}: ${formatCurrency(cost.amount)}`, { indent: 0.5 }));
    }
    children.push(createEmptyLine());
  }

  // Conclusion
  children.push(createHeading("VI. CONCLUSION", 2));
  const totalAmount = (billing?.totalFees || 0) + (costs?.totalCosts || 0);
  children.push(createParagraph(
    `For the foregoing reasons, Plaintiff respectfully requests that this Court grant this motion ` +
    `and award Plaintiff attorney's fees in the amount of ${formatCurrency(billing?.totalFees || 0)}` +
    (costs?.totalCosts ? ` and costs in the amount of ${formatCurrency(costs.totalCosts)}` : "") +
    `, for a total award of ${formatCurrency(totalAmount)}.`
  ));
  children.push(createEmptyLine());
  children.push(createEmptyLine());

  // Signature block
  children.push(createParagraph("Dated: " + formatDate(new Date())));
  children.push(createEmptyLine());
  children.push(createParagraph("Respectfully submitted,"));
  children.push(createEmptyLine());
  children.push(createParagraph("_________________________________"));
  children.push(createParagraph("Attorney for Plaintiff"));

  return createCourtDocument([{ children }]);
}

// Generate repair summary (Exhibit A)
function generateRepairSummaryDocument(
  caseData: GenerateRequest["caseData"],
  repairOrders: ExtractedRepairOrder[]
): Document {
  const totalDaysDown = repairOrders.reduce((sum, ro) => sum + (ro.daysDown || 0), 0);
  const children: (Paragraph | Table)[] = [];

  children.push(createParagraph("EXHIBIT A", { bold: true, centered: true, allCaps: true }));
  children.push(createEmptyLine());
  children.push(createHeading("REPAIR ORDER SUMMARY", 1));
  children.push(createEmptyLine());

  children.push(createMixedParagraph([
    { text: "Vehicle: ", bold: true },
    { text: `${caseData.vehicleYear} ${caseData.vehicleMake} ${caseData.vehicleModel}` },
  ]));
  children.push(createMixedParagraph([
    { text: "VIN: ", bold: true },
    { text: caseData.vin },
  ]));
  children.push(createMixedParagraph([
    { text: "Purchase Date: ", bold: true },
    { text: formatDate(caseData.purchaseDate) },
  ]));
  children.push(createMixedParagraph([
    { text: "Purchase Price: ", bold: true },
    { text: formatCurrency(caseData.purchasePrice) },
  ]));
  children.push(createEmptyLine());

  children.push(createMixedParagraph([
    { text: "Total Repair Visits: ", bold: true },
    { text: String(repairOrders.length) },
  ]));
  children.push(createMixedParagraph([
    { text: "Total Days Out of Service: ", bold: true },
    { text: String(totalDaysDown) },
  ]));
  children.push(createEmptyLine());

  children.push(createHeading("REPAIR HISTORY", 2));
  const tableHeaders = ["#", "Date In", "Date Out", "Mileage", "Days", "Category", "Resolved"];
  const tableRows = repairOrders.map((ro, i) => [
    String(i + 1),
    ro.dateIn || "N/A",
    ro.dateOut || "N/A",
    ro.mileageIn?.toLocaleString() || "N/A",
    String(ro.daysDown || 0),
    ro.category || "Other",
    ro.resolved || "No",
  ]);
  children.push(createTable(tableHeaders, tableRows, [5, 15, 15, 15, 10, 20, 10]));
  children.push(createEmptyLine());

  children.push(createHeading("DETAILED REPAIR DESCRIPTIONS", 2));
  repairOrders.forEach((ro, i) => {
    children.push(createParagraph(`Repair Visit #${i + 1} - ${ro.dateIn || "Date Unknown"}`, { bold: true }));
    children.push(createMixedParagraph([
      { text: "Dealership: ", bold: true },
      { text: ro.dealership || "N/A" },
    ]));
    children.push(createMixedParagraph([
      { text: "Customer Concern: ", bold: true },
      { text: ro.customerConcern || "Not documented" },
    ]));
    children.push(createMixedParagraph([
      { text: "Work Performed: ", bold: true },
      { text: ro.workPerformed || "Not documented" },
    ]));
    children.push(createMixedParagraph([
      { text: "Parts Replaced: ", bold: true },
      { text: ro.partsReplaced || "None listed" },
    ]));
    children.push(createMixedParagraph([
      { text: "Resolved: ", bold: true },
      { text: ro.resolved || "No" },
    ]));
    children.push(createEmptyLine());
  });

  return createCourtDocument([{ children }]);
}

// Generate billing summary (Exhibit B)
function generateBillingSummaryDocument(
  caseData: GenerateRequest["caseData"],
  billing?: GenerateRequest["billing"],
  laffeyComparison?: LaffeyComparisonResult | null
): Document {
  const children: (Paragraph | Table)[] = [];

  children.push(createParagraph("EXHIBIT B", { bold: true, centered: true, allCaps: true }));
  children.push(createEmptyLine());
  children.push(createHeading("BILLING SUMMARY", 1));
  children.push(createEmptyLine());

  children.push(createParagraph(`${caseData.clientName} v. ${caseData.defendant}`, { centered: true }));
  children.push(createParagraph(`Case No. ${caseData.caseNumber}`, { centered: true }));
  children.push(createEmptyLine());

  children.push(createMixedParagraph([
    { text: "Total Hours: ", bold: true },
    { text: String(billing?.totalHours?.toFixed(1) || 0) },
  ]));
  children.push(createMixedParagraph([
    { text: "Total Fees: ", bold: true },
    { text: formatCurrency(billing?.totalFees || 0) },
  ]));
  children.push(createEmptyLine());

  if (billing?.entries && billing.entries.length > 0) {
    children.push(createHeading("TIME ENTRIES", 2));
    const tableHeaders = ["Date", "Attorney", "Hours", "Rate", "Amount", "Description"];
    const tableRows = billing.entries.map((e) => [
      e.date || "N/A",
      e.attorney || "N/A",
      e.hours?.toFixed(1) || "0",
      formatCurrency(e.rate || 0),
      formatCurrency((e.hours || 0) * (e.rate || 0)),
      e.description || "",
    ]);
    children.push(createTable(tableHeaders, tableRows, [12, 15, 8, 10, 12, 43]));
    children.push(createEmptyLine());

    // Summary by attorney
    children.push(createHeading("SUMMARY BY ATTORNEY", 2));
    const attorneySummary = new Map<string, { hours: number; amount: number }>();
    for (const entry of billing.entries) {
      const existing = attorneySummary.get(entry.attorney) || { hours: 0, amount: 0 };
      existing.hours += entry.hours || 0;
      existing.amount += (entry.hours || 0) * (entry.rate || 0);
      attorneySummary.set(entry.attorney, existing);
    }

    const summaryHeaders = ["Attorney", "Hours", "Amount"];
    const summaryRows = Array.from(attorneySummary.entries()).map(([attorney, data]) => [
      attorney,
      data.hours.toFixed(1),
      formatCurrency(data.amount),
    ]);
    summaryRows.push(["TOTAL", billing.totalHours?.toFixed(1) || "0", formatCurrency(billing.totalFees || 0)]);
    children.push(createTable(summaryHeaders, summaryRows, [50, 25, 25]));
  }

  // Laffey comparison
  if (laffeyComparison) {
    children.push(createEmptyLine());
    children.push(createHeading("LAFFEY MATRIX COMPARISON", 2));
    children.push(createParagraph(
      `The following compares the actual billed rates to the Laffey Matrix rates, which represent ` +
      `the prevailing market rate for legal services in this jurisdiction.`
    ));
    children.push(createEmptyLine());

    const laffeyHeaders = ["Attorney", "Hours", "Billed Rate", "Laffey Rate", "Billed Total", "Laffey Total"];
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
    children.push(createTable(laffeyHeaders, laffeyRows, [25, 10, 15, 15, 17, 18]));
    children.push(createEmptyLine());

    if (laffeyComparison.isUnderLaffey) {
      children.push(createParagraph(
        `The billed amount of ${formatCurrency(laffeyComparison.totalBilled)} is ` +
        `${formatCurrency(laffeyComparison.difference)} BELOW the Laffey Matrix amount of ` +
        `${formatCurrency(laffeyComparison.totalLaffey)}, demonstrating the reasonableness of the fees requested.`,
        { bold: true }
      ));
    }
  }

  return createCourtDocument([{ children }]);
}

// Generate full package with all exhibits
async function generateFullPackage(
  caseData: GenerateRequest["caseData"],
  repairOrders: ExtractedRepairOrder[],
  billing?: GenerateRequest["billing"],
  costs?: GenerateRequest["costs"],
  laffeyComparison?: LaffeyComparisonResult | null
): Promise<Document> {
  const totalDaysDown = repairOrders.reduce((sum, ro) => sum + (ro.daysDown || 0), 0);
  const sections: { children: (Paragraph | Table)[] }[] = [];

  // Section 1: Motion
  const motionChildren: (Paragraph | Table)[] = [];
  motionChildren.push(...createCaptionBlock(
    caseData.caseNumber,
    caseData.clientName,
    caseData.defendant,
    "MOTION FOR ATTORNEY'S FEES AND COSTS"
  ));

  motionChildren.push(createHeading("I. INTRODUCTION", 2));
  motionChildren.push(createParagraph(
    `Plaintiff ${caseData.clientName} moves for attorney's fees and costs pursuant to ` +
    `California Civil Code § 1794(d).`
  ));
  motionChildren.push(createEmptyLine());

  motionChildren.push(createHeading("II. SUMMARY", 2));
  const totalAmount = (billing?.totalFees || 0) + (costs?.totalCosts || 0);
  motionChildren.push(createParagraph(`Vehicle: ${caseData.vehicleYear} ${caseData.vehicleMake} ${caseData.vehicleModel}`));
  motionChildren.push(createParagraph(`Repair Visits: ${repairOrders.length}`));
  motionChildren.push(createParagraph(`Days Out of Service: ${totalDaysDown}`));
  motionChildren.push(createEmptyLine());
  motionChildren.push(createParagraph(`Attorney's Fees: ${formatCurrency(billing?.totalFees || 0)}`));
  motionChildren.push(createParagraph(`Costs: ${formatCurrency(costs?.totalCosts || 0)}`));
  motionChildren.push(createParagraph(`TOTAL REQUESTED: ${formatCurrency(totalAmount)}`, { bold: true }));
  motionChildren.push(createEmptyLine());
  motionChildren.push(createParagraph("See attached Exhibits A, B" + (laffeyComparison ? ", and C" : "") + " for supporting documentation."));

  motionChildren.push(createEmptyLine());
  motionChildren.push(createParagraph("Dated: " + formatDate(new Date())));
  motionChildren.push(createEmptyLine());
  motionChildren.push(createParagraph("Respectfully submitted,"));
  motionChildren.push(createEmptyLine());
  motionChildren.push(createParagraph("_________________________________"));
  motionChildren.push(createParagraph("Attorney for Plaintiff"));

  sections.push({ children: motionChildren });

  // Section 2: Exhibit A - Repair Summary
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
    { text: String(totalDaysDown) },
  ]));
  exhibitAChildren.push(createEmptyLine());

  const repairHeaders = ["#", "Date", "Mileage", "Days", "Category", "Resolved"];
  const repairRows = repairOrders.map((ro, i) => [
    String(i + 1),
    ro.dateIn || "N/A",
    ro.mileageIn?.toLocaleString() || "N/A",
    String(ro.daysDown || 0),
    ro.category || "Other",
    ro.resolved || "No",
  ]);
  exhibitAChildren.push(createTable(repairHeaders, repairRows));

  sections.push({ children: exhibitAChildren });

  // Section 3: Exhibit B - Billing Summary
  const exhibitBChildren: (Paragraph | Table)[] = [];
  exhibitBChildren.push(...createExhibitHeader("B", "BILLING SUMMARY"));

  if (billing?.entries) {
    exhibitBChildren.push(createMixedParagraph([
      { text: "Total Hours: ", bold: true },
      { text: billing.totalHours?.toFixed(1) || "0" },
    ]));
    exhibitBChildren.push(createMixedParagraph([
      { text: "Total Fees: ", bold: true },
      { text: formatCurrency(billing.totalFees || 0) },
    ]));
    exhibitBChildren.push(createEmptyLine());

    const billingHeaders = ["Date", "Attorney", "Hours", "Rate", "Amount"];
    const billingRows = billing.entries.map((e) => [
      e.date || "N/A",
      e.attorney || "N/A",
      e.hours?.toFixed(1) || "0",
      formatCurrency(e.rate || 0),
      formatCurrency((e.hours || 0) * (e.rate || 0)),
    ]);
    exhibitBChildren.push(createTable(billingHeaders, billingRows));
  }

  sections.push({ children: exhibitBChildren });

  // Section 4: Exhibit C - Laffey Matrix Comparison
  if (laffeyComparison) {
    const exhibitCChildren: (Paragraph | Table)[] = [];
    exhibitCChildren.push(...createExhibitHeader("C", "LAFFEY MATRIX COMPARISON"));

    const laffeyHeaders = ["Attorney", "Hours", "Billed Rate", "Laffey Rate", "Difference"];
    const laffeyRows = laffeyComparison.byAttorney.map((a) => [
      a.attorney,
      a.hours.toFixed(1),
      formatCurrency(a.billedRate),
      formatCurrency(a.laffeyRate),
      formatCurrency(a.laffeyAmount - a.billedAmount),
    ]);
    exhibitCChildren.push(createTable(laffeyHeaders, laffeyRows));
    exhibitCChildren.push(createEmptyLine());

    exhibitCChildren.push(createParagraph(`Billed Total: ${formatCurrency(laffeyComparison.totalBilled)}`));
    exhibitCChildren.push(createParagraph(`Laffey Matrix Total: ${formatCurrency(laffeyComparison.totalLaffey)}`));
    exhibitCChildren.push(createParagraph(
      laffeyComparison.isUnderLaffey
        ? `Fees are ${formatCurrency(laffeyComparison.difference)} BELOW Laffey rates.`
        : `Fees exceed Laffey rates by ${formatCurrency(Math.abs(laffeyComparison.difference))}.`,
      { bold: true }
    ));

    sections.push({ children: exhibitCChildren });
  }

  return createCourtDocument(sections);
}
