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
  createSubsectionHeading,
  createBlockQuote,
  createProofOfService,
  createCourtHeader,
  createAttorneyBlock,
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

interface AttorneyInfo {
  name: string;
  barNumber: string;
  firmName: string;
  address: string[];
  phone: string;
  fax?: string;
  email?: string;
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
    courtName?: string;
    county?: string;
  };
  attorneyInfo?: AttorneyInfo;
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
    const { type, caseData, repairOrders = [], billing, costs, laffeyMatrix, attorneys, attorneyInfo } = body;

    let doc: Document;
    let filename: string;

    // Calculate Laffey comparison if we have the data
    const laffeyComparison = laffeyMatrix && billing?.entries
      ? calculateLaffeyComparison(billing.entries, laffeyMatrix, attorneys)
      : null;

    switch (type) {
      case "motion":
        doc = generateMotionDocument(caseData, repairOrders, billing, costs, laffeyComparison, attorneyInfo);
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
        doc = generateFullPackage(caseData, repairOrders, billing, costs, laffeyComparison, attorneyInfo);
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

// ═══════════════════════════════════════════════════════════════════════════════
// MOTION FOR ATTORNEY'S FEES AND COSTS - PROFESSIONAL COURT DOCUMENT
// ═══════════════════════════════════════════════════════════════════════════════
function generateMotionDocument(
  caseData: GenerateRequest["caseData"],
  repairOrders: ExtractedRepairOrder[],
  billing?: GenerateRequest["billing"],
  costs?: GenerateRequest["costs"],
  laffeyComparison?: LaffeyComparisonResult | null,
  attorneyInfo?: AttorneyInfo
): Document {
  const totalDaysDown = repairOrders.reduce((sum, ro) => sum + (ro.daysDown || 0), 0);
  const children: (Paragraph | Table)[] = [];

  // ─────────────────────────────────────────────────────────────────────────────
  // HEADER - Attorney Info & Court Name
  // ─────────────────────────────────────────────────────────────────────────────
  if (attorneyInfo) {
    children.push(...createAttorneyBlock(
      attorneyInfo.name,
      attorneyInfo.barNumber,
      attorneyInfo.firmName,
      attorneyInfo.address,
      attorneyInfo.phone,
      attorneyInfo.fax,
      attorneyInfo.email,
      caseData.clientName
    ));
  }

  // Court header
  children.push(...createCourtHeader(
    caseData.courtName || "SUPERIOR COURT OF THE STATE OF CALIFORNIA",
    caseData.county || "LOS ANGELES"
  ));

  // Caption block
  children.push(...createCaptionBlock(
    caseData.caseNumber,
    caseData.clientName,
    caseData.defendant,
    "MOTION FOR ATTORNEY'S FEES AND COSTS"
  ));

  // ─────────────────────────────────────────────────────────────────────────────
  // I. INTRODUCTION
  // ─────────────────────────────────────────────────────────────────────────────
  children.push(...createLegalSection("I", "INTRODUCTION", [
    `Plaintiff ${caseData.clientName.toUpperCase()} ("Plaintiff"), by and through undersigned counsel, hereby moves this Honorable Court for an order awarding Plaintiff attorney's fees and costs pursuant to California Civil Code section 1794, subdivision (d), the Song-Beverly Consumer Warranty Act (the "Act" or "Song-Beverly Act").`,
    `This Motion is made following Plaintiff's successful prosecution of this lemon law action against Defendant ${caseData.defendant.toUpperCase()} ("Defendant") for Defendant's failure to repurchase or replace Plaintiff's defective ${caseData.vehicleYear} ${caseData.vehicleMake} ${caseData.vehicleModel} (the "Subject Vehicle") after multiple repair attempts failed to conform the vehicle to applicable warranties.`,
    `This Motion is based upon this Notice of Motion and Motion, the attached Memorandum of Points and Authorities, the Declarations of counsel filed concurrently herewith, the pleadings and papers on file in this action, and upon such oral and documentary evidence as may be presented at the hearing on this Motion.`,
  ]));

  // ─────────────────────────────────────────────────────────────────────────────
  // II. STATEMENT OF FACTS
  // ─────────────────────────────────────────────────────────────────────────────
  children.push(...createLegalSection("II", "STATEMENT OF FACTS", [
    `On or about ${formatDate(caseData.purchaseDate)}, Plaintiff purchased a new ${caseData.vehicleYear} ${caseData.vehicleMake} ${caseData.vehicleModel}, Vehicle Identification Number ${caseData.vin} (the "Subject Vehicle"), for ${formatCurrency(caseData.purchasePrice)}. The Subject Vehicle was accompanied by Defendant's express written warranty covering defects in materials and workmanship.`,
    `During the warranty period, the Subject Vehicle exhibited numerous defects and nonconformities that substantially impaired its use, value, and/or safety. Plaintiff dutifully presented the Subject Vehicle to Defendant's authorized repair facilities on ${repairOrders.length} separate occasions in an attempt to have the defects repaired.`,
  ]));

  // Add repair summary paragraph
  if (repairOrders.length > 0) {
  children.push(createParagraph(
      `Despite Defendant's ${repairOrders.length} repair attempts, spanning a total of ${totalDaysDown} days out of service, Defendant and its authorized repair facilities were unable to conform the Subject Vehicle to the applicable express warranties. The defects included:`,
      { firstLineIndent: 0.5 }
  ));
  children.push(createEmptyLine());

    // Get unique categories/issues
    const issues = new Set<string>();
    for (const ro of repairOrders) {
      if (ro.customerConcern) {
        issues.add(ro.customerConcern.substring(0, 100));
      }
    }
    
    for (const issue of Array.from(issues).slice(0, 5)) {
      children.push(createBulletPoint(issue));
    }
    children.push(createEmptyLine());
  }

  children.push(createParagraph(
    `The ${totalDaysDown} cumulative days the Subject Vehicle was out of service for repair well exceeds the 30-day presumption threshold established by Civil Code section 1793.22. A detailed chronological summary of the repair history is attached hereto as Exhibit A and incorporated by reference.`,
    { firstLineIndent: 0.5 }
  ));
  children.push(createEmptyLine());

  // ─────────────────────────────────────────────────────────────────────────────
  // III. LEGAL STANDARD
  // ─────────────────────────────────────────────────────────────────────────────
  children.push(...createLegalSection("III", "LEGAL STANDARD", []));

  // Statutory basis
  children.push(createSubsectionHeading("A", "Mandatory Fee Award Under the Song-Beverly Act"));
  children.push(createEmptyLine());

  children.push(createParagraph(
    `California Civil Code section 1794, subdivision (d) provides, in relevant part:`,
    { firstLineIndent: 0.5 }
  ));
  children.push(createEmptyLine());

  children.push(...createBlockQuote(
    "If the buyer prevails in an action under this section, the buyer shall be allowed by the court to recover as part of the judgment a sum equal to the aggregate amount of costs and expenses, including attorney's fees based on actual time expended, determined by the court to have been reasonably incurred by the buyer in connection with the commencement and prosecution of such action.",
    "(Cal. Civ. Code § 1794(d) (emphasis added).)"
  ));

  children.push(createParagraph(
    `The Legislature's use of the mandatory "shall" makes clear that an award of attorney's fees to a prevailing buyer is not discretionary, but rather required. (See Warren v. Kia Motors America, Inc. (2018) 30 Cal.App.5th 24, 42 ["Under section 1794, subdivision (d), a prevailing buyer 'shall be allowed by the court' to recover costs and attorney fees"].)`,
    { firstLineIndent: 0.5 }
  ));
  children.push(createEmptyLine());

  // Lodestar method
  children.push(createSubsectionHeading("B", "The Lodestar Method"));
  children.push(createEmptyLine());

    children.push(createParagraph(
    `In determining reasonable attorney's fees, California courts employ the "lodestar" method, which involves multiplying the number of hours reasonably expended by the reasonable hourly rate. (PLCM Group, Inc. v. Drexler (2000) 22 Cal.4th 1084, 1095; Ketchum v. Moses (2001) 24 Cal.4th 1122, 1132.)`,
    { firstLineIndent: 0.5 }
    ));
    children.push(createEmptyLine());

      children.push(createParagraph(
    `The "reasonable hourly rate" is determined by reference to the prevailing market rate in the relevant community for similar work. (Id. at 1133.) The burden is on the party seeking fees to submit evidence supporting the hours worked and rates claimed. (Christian Research Institute v. Alnor (2008) 165 Cal.App.4th 1315, 1320.)`,
    { firstLineIndent: 0.5 }
      ));
      children.push(createEmptyLine());

  // ─────────────────────────────────────────────────────────────────────────────
  // IV. ARGUMENT
  // ─────────────────────────────────────────────────────────────────────────────
  children.push(...createLegalSection("IV", "ARGUMENT", []));

  // A. Plaintiff is entitled to fees
  children.push(createSubsectionHeading("A", "Plaintiff Is the Prevailing Party Entitled to Attorney's Fees"));
  children.push(createEmptyLine());

        children.push(createParagraph(
    `Plaintiff prevailed in this Song-Beverly action, rendering the award of attorney's fees mandatory under Civil Code section 1794(d). As documented below and in the supporting declarations, Plaintiff's counsel reasonably expended ${billing?.totalHours?.toFixed(1) || "N/A"} hours prosecuting this matter, at rates that are at or below prevailing market rates for attorneys with similar experience litigating Song-Beverly Act matters in this jurisdiction.`,
    { firstLineIndent: 0.5 }
        ));
        children.push(createEmptyLine());

  // B. Hours are reasonable
  if (billing?.entries && billing.entries.length > 0) {
    children.push(createSubsectionHeading("B", "The Hours Expended Were Reasonably Necessary"));
    children.push(createEmptyLine());

    children.push(createParagraph(
      `Plaintiff's counsel expended ${billing.totalHours.toFixed(1)} hours prosecuting this action. These hours were reasonably necessary to achieve a favorable result in light of Defendant's litigation conduct and the complexity of Song-Beverly matters. The work performed included:`,
      { firstLineIndent: 0.5 }
    ));
    children.push(createEmptyLine());

    // Categorize work performed
    const categories = new Map<string, { hours: number; items: string[] }>();
    const categoryMap: Record<string, string> = {
      "intake": "Case Evaluation and Client Communications",
      "consult": "Case Evaluation and Client Communications",
      "client": "Case Evaluation and Client Communications",
      "research": "Legal Research and Analysis",
      "draft": "Document Preparation and Pleadings",
      "prepar": "Document Preparation and Pleadings",
      "complaint": "Document Preparation and Pleadings",
      "discovery": "Discovery Practice",
      "interrogat": "Discovery Practice",
      "request": "Discovery Practice",
      "deposition": "Depositions",
      "motion": "Law and Motion",
      "compel": "Law and Motion",
      "settlement": "Settlement Negotiations",
      "negoti": "Settlement Negotiations",
      "mediat": "Settlement Negotiations",
      "court": "Court Appearances",
      "hearing": "Court Appearances",
      "appear": "Court Appearances",
    };

    for (const entry of billing.entries) {
      const desc = entry.description?.toLowerCase() || "";
      let category = "Other Legal Work";
      
      for (const [keyword, cat] of Object.entries(categoryMap)) {
        if (desc.includes(keyword)) {
          category = cat;
          break;
        }
      }

      if (!categories.has(category)) {
        categories.set(category, { hours: 0, items: [] });
      }
      const cat = categories.get(category)!;
      cat.hours += entry.hours || 0;
    }

    for (const [category, data] of categories) {
      children.push(createBulletPoint(`${category}: ${data.hours.toFixed(1)} hours`));
    }
    children.push(createEmptyLine());

    children.push(createParagraph(
      `The time records are supported by contemporaneous billing records maintained by Plaintiff's counsel. A detailed itemization of all time entries is attached hereto as Exhibit B.`,
      { firstLineIndent: 0.5 }
    ));
    children.push(createEmptyLine());

    // C. Rates are reasonable
    children.push(createSubsectionHeading("C", "The Hourly Rates Charged Are Reasonable"));
    children.push(createEmptyLine());

    children.push(createParagraph(
      `The hourly rates charged by Plaintiff's counsel are consistent with—and in fact below—the prevailing market rates for attorneys with similar skill and experience in the relevant legal community. Courts commonly refer to the Laffey Matrix as a benchmark for reasonable attorney's fees in complex civil litigation.`,
      { firstLineIndent: 0.5 }
    ));
    children.push(createEmptyLine());

    if (laffeyComparison && laffeyComparison.isUnderLaffey) {
      children.push(createParagraph(
        `Here, the total fees charged (${formatCurrency(laffeyComparison.totalBilled)}) are ${formatCurrency(laffeyComparison.difference)} BELOW what would be permitted under the Laffey Matrix (${formatCurrency(laffeyComparison.totalLaffey)}). This demonstrates that the fees requested are not only reasonable but conservative.`,
        { firstLineIndent: 0.5, bold: true }
      ));
      children.push(createEmptyLine());
    }

    // Fee summary table
    const attorneySummary = new Map<string, { hours: number; amount: number; rate: number }>();
    for (const entry of billing.entries) {
      const existing = attorneySummary.get(entry.attorney) || { hours: 0, amount: 0, rate: entry.rate };
      existing.hours += entry.hours || 0;
      existing.amount += (entry.hours || 0) * (entry.rate || 0);
      attorneySummary.set(entry.attorney, existing);
    }

    const feeHeaders = ["Timekeeper", "Hours", "Rate", "Total"];
    const feeRows = Array.from(attorneySummary.entries()).map(([attorney, data]) => [
      attorney,
      data.hours.toFixed(1),
      formatCurrency(data.rate),
      formatCurrency(data.amount),
    ]);
    feeRows.push(["TOTAL", billing.totalHours.toFixed(1), "", formatCurrency(billing.totalFees)]);

    children.push(createTable(feeHeaders, feeRows, [40, 15, 20, 25]));
    children.push(createEmptyLine());
  }

  // D. Costs
  if (costs?.entries && costs.entries.length > 0) {
    children.push(createSubsectionHeading("D", "Plaintiff Is Entitled to Recovery of Costs"));
    children.push(createEmptyLine());

  children.push(createParagraph(
      `In addition to attorney's fees, Civil Code section 1794(d) expressly provides for recovery of "costs and expenses" reasonably incurred in prosecuting this action. Plaintiff incurred the following costs:`,
      { firstLineIndent: 0.5 }
  ));
  children.push(createEmptyLine());

    const costHeaders = ["Description", "Amount"];
    const costRows = costs.entries.map(c => [c.description, formatCurrency(c.amount)]);
    costRows.push(["TOTAL COSTS", formatCurrency(costs.totalCosts)]);

    children.push(createTable(costHeaders, costRows, [75, 25]));
  children.push(createEmptyLine());
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // V. CONCLUSION
  // ─────────────────────────────────────────────────────────────────────────────
  const totalAmount = (billing?.totalFees || 0) + (costs?.totalCosts || 0);

  children.push(...createLegalSection("V", "CONCLUSION", [
    `For the foregoing reasons, Plaintiff ${caseData.clientName.toUpperCase()} respectfully requests that this Court GRANT this Motion and award Plaintiff:`,
  ]));

  children.push(createBulletPoint(`Attorney's fees in the amount of ${formatCurrency(billing?.totalFees || 0)};`));
  if (costs?.totalCosts) {
    children.push(createBulletPoint(`Costs in the amount of ${formatCurrency(costs.totalCosts)};`));
  }
  children.push(createBulletPoint(`For a total award of ${formatCurrency(totalAmount)}.`));
  children.push(createEmptyLine());

  // Signature
  children.push(...createSignatureBlock(
    attorneyInfo?.firmName,
    attorneyInfo?.name,
    attorneyInfo?.barNumber
  ));

  return createCourtDocument([{ children }]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXHIBIT A - REPAIR ORDER SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════
function generateRepairSummaryDocument(
  caseData: GenerateRequest["caseData"],
  repairOrders: ExtractedRepairOrder[]
): Document {
  const totalDaysDown = repairOrders.reduce((sum, ro) => sum + (ro.daysDown || 0), 0);
  const children: (Paragraph | Table)[] = [];

  children.push(...createExhibitHeader("A", "CHRONOLOGICAL REPAIR HISTORY"));

  // Case caption (abbreviated)
  children.push(createParagraph(
    `${caseData.clientName.toUpperCase()} v. ${caseData.defendant.toUpperCase()}`,
    { centered: true, bold: true }
  ));
  children.push(createParagraph(`Case No. ${caseData.caseNumber}`, { centered: true }));
  children.push(createEmptyLine());
  children.push(createEmptyLine());

  // Vehicle Information
  children.push(createParagraph("SUBJECT VEHICLE INFORMATION", { bold: true, underline: true, centered: true }));
  children.push(createEmptyLine());

  const vehicleTable = createTable(
    ["Item", "Details"],
    [
      ["Year/Make/Model", `${caseData.vehicleYear} ${caseData.vehicleMake} ${caseData.vehicleModel}`],
      ["VIN", caseData.vin],
      ["Purchase Date", formatDate(caseData.purchaseDate)],
      ["Purchase Price", formatCurrency(caseData.purchasePrice)],
    ],
    [30, 70]
  );
  children.push(vehicleTable);
  children.push(createEmptyLine());
  children.push(createEmptyLine());

  // Summary Statistics
  children.push(createParagraph("REPAIR SUMMARY STATISTICS", { bold: true, underline: true, centered: true }));
  children.push(createEmptyLine());

  const summaryTable = createTable(
    ["Metric", "Value", "Significance"],
    [
      ["Total Repair Attempts", String(repairOrders.length), repairOrders.length >= 4 ? "Exceeds reasonable repair threshold" : ""],
      ["Total Days Out of Service", String(totalDaysDown), totalDaysDown >= 30 ? "EXCEEDS 30-DAY PRESUMPTION ✓" : ""],
      ["Average Days Per Visit", repairOrders.length > 0 ? (totalDaysDown / repairOrders.length).toFixed(1) : "0", ""],
    ],
    [35, 25, 40]
  );
  children.push(summaryTable);
  children.push(createEmptyLine());

  if (totalDaysDown >= 30) {
    children.push(createParagraph(
      `★ The Subject Vehicle was out of service for a cumulative ${totalDaysDown} days, triggering the rebuttable presumption under Civil Code § 1793.22 that the vehicle cannot be conformed to warranty.`,
      { bold: true }
    ));
    children.push(createEmptyLine());
  }
  children.push(createEmptyLine());

  // Chronological Repair Table
  children.push(createParagraph("CHRONOLOGICAL REPAIR HISTORY", { bold: true, underline: true, centered: true }));
  children.push(createEmptyLine());

  const repairHeaders = ["Visit", "Date In", "Date Out", "Days", "Mileage", "Category"];
  const repairRows = repairOrders.map((ro, i) => [
    String(i + 1),
    formatDate(ro.dateIn || ""),
    formatDate(ro.dateOut || ""),
    String(ro.daysDown || 0),
    ro.mileageIn?.toLocaleString() || "N/A",
    ro.category || "Other",
  ]);

  // Add total row
  repairRows.push(["TOTAL", "", "", String(totalDaysDown), "", ""]);

  children.push(createTable(repairHeaders, repairRows, [10, 18, 18, 10, 15, 19]));
  children.push(createEmptyLine());
  children.push(createEmptyLine());

  // Detailed descriptions
  children.push(createParagraph("DETAILED REPAIR DESCRIPTIONS", { bold: true, underline: true, centered: true }));
  children.push(createEmptyLine());

  for (let i = 0; i < repairOrders.length; i++) {
    const ro = repairOrders[i];

    children.push(createParagraph(
      `REPAIR VISIT ${i + 1} OF ${repairOrders.length}`,
      { bold: true, underline: true }
    ));
    children.push(createEmptyLine());

    // Details table for each repair
    const detailRows = [
      ["Date", `${formatDate(ro.dateIn || "")} to ${formatDate(ro.dateOut || "")}`],
      ["Days Out of Service", `${ro.daysDown || 0} days`],
      ["Odometer", `${ro.mileageIn?.toLocaleString() || "N/A"} miles`],
      ["Dealership", ro.dealership || "N/A"],
      ["RO Number", ro.roNumber || "N/A"],
      ["Problem Category", ro.category || "Other"],
      ["Issue Resolved?", ro.resolved || "No"],
    ];

    children.push(createTable(["Field", "Value"], detailRows, [30, 70]));
    children.push(createEmptyLine());

    children.push(createMixedParagraph([
      { text: "Customer Complaint: ", bold: true },
      { text: ro.customerConcern || "Not documented" },
    ]));
    children.push(createEmptyLine());

    children.push(createMixedParagraph([
      { text: "Work Performed: ", bold: true },
      { text: ro.workPerformed || "Not documented" },
    ]));
    children.push(createEmptyLine());

    if (ro.partsReplaced) {
    children.push(createMixedParagraph([
      { text: "Parts Replaced: ", bold: true },
        { text: ro.partsReplaced },
    ]));
    children.push(createEmptyLine());
    }

    children.push(createParagraph("─".repeat(70), { centered: true }));
    children.push(createEmptyLine());
  }

  return createCourtDocument([{ children }]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXHIBIT B - BILLING SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════
function generateBillingSummaryDocument(
  caseData: GenerateRequest["caseData"],
  billing?: GenerateRequest["billing"],
  laffeyComparison?: LaffeyComparisonResult | null
): Document {
  const children: (Paragraph | Table)[] = [];

  children.push(...createExhibitHeader("B", "ATTORNEY FEE ITEMIZATION"));

  // Case caption (abbreviated)
  children.push(createParagraph(
    `${caseData.clientName.toUpperCase()} v. ${caseData.defendant.toUpperCase()}`,
    { centered: true, bold: true }
  ));
  children.push(createParagraph(`Case No. ${caseData.caseNumber}`, { centered: true }));
  children.push(createEmptyLine());
  children.push(createEmptyLine());

  // Fee Summary
  children.push(createParagraph("FEE SUMMARY", { bold: true, underline: true, centered: true }));
  children.push(createEmptyLine());

  const summaryTable = createTable(
    ["Description", "Amount"],
    [
      ["Total Hours Expended", `${billing?.totalHours?.toFixed(1) || "0"} hours`],
      ["Total Attorney's Fees", formatCurrency(billing?.totalFees || 0)],
    ],
    [60, 40]
  );
  children.push(summaryTable);
  children.push(createEmptyLine());
  children.push(createEmptyLine());

  if (billing?.entries && billing.entries.length > 0) {
    // Summary by Timekeeper
    children.push(createParagraph("FEES BY TIMEKEEPER", { bold: true, underline: true, centered: true }));
    children.push(createEmptyLine());

    const attorneySummary = new Map<string, { hours: number; amount: number; avgRate: number }>();
    for (const entry of billing.entries) {
      const existing = attorneySummary.get(entry.attorney) || { hours: 0, amount: 0, avgRate: 0 };
      existing.hours += entry.hours || 0;
      existing.amount += (entry.hours || 0) * (entry.rate || 0);
      attorneySummary.set(entry.attorney, existing);
    }

    for (const [, data] of attorneySummary) {
      data.avgRate = data.hours > 0 ? data.amount / data.hours : 0;
    }

    const attorneyHeaders = ["Timekeeper", "Hours", "Rate (Avg.)", "Total Fees"];
    const attorneyRows = Array.from(attorneySummary.entries()).map(([attorney, data]) => [
      attorney,
      data.hours.toFixed(1),
      formatCurrency(data.avgRate),
      formatCurrency(data.amount),
    ]);
    attorneyRows.push(["TOTAL", billing.totalHours?.toFixed(1) || "0", "", formatCurrency(billing.totalFees || 0)]);

    children.push(createTable(attorneyHeaders, attorneyRows, [35, 15, 20, 30]));
    children.push(createEmptyLine());
    children.push(createEmptyLine());

    // Detailed Time Entries
    children.push(createParagraph("DETAILED TIME ENTRIES", { bold: true, underline: true, centered: true }));
    children.push(createEmptyLine());

    const timeHeaders = ["Date", "Timekeeper", "Hours", "Rate", "Amount", "Description"];
    const timeRows = billing.entries.map((e) => [
      formatDate(e.date || ""),
      e.attorney || "N/A",
      (e.hours || 0).toFixed(1),
      formatCurrency(e.rate || 0),
      formatCurrency((e.hours || 0) * (e.rate || 0)),
      (e.description || "").length > 50 ? (e.description || "").substring(0, 47) + "..." : (e.description || ""),
    ]);

    children.push(createTable(timeHeaders, timeRows, [12, 14, 8, 10, 12, 44]));
    children.push(createEmptyLine());
    children.push(createEmptyLine());
  }

  // Laffey Matrix Comparison
  if (laffeyComparison) {
    children.push(createParagraph("LAFFEY MATRIX COMPARISON", { bold: true, underline: true, centered: true }));
    children.push(createEmptyLine());

    children.push(createParagraph(
      `The Laffey Matrix is a widely-used benchmark for reasonable attorney's fees in complex civil litigation. The following comparison demonstrates that the rates charged are at or below prevailing market rates:`,
      { firstLineIndent: 0.5 }
    ));
    children.push(createEmptyLine());

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

    children.push(createTable(laffeyHeaders, laffeyRows, [22, 10, 14, 14, 20, 20]));
    children.push(createEmptyLine());

    if (laffeyComparison.isUnderLaffey) {
      children.push(createParagraph(
        `★ CONCLUSION: The fees billed (${formatCurrency(laffeyComparison.totalBilled)}) are ${formatCurrency(laffeyComparison.difference)} BELOW the Laffey Matrix amount (${formatCurrency(laffeyComparison.totalLaffey)}). This demonstrates the reasonableness and conservativeness of the fees requested.`,
        { bold: true }
      ));
    } else {
      children.push(createParagraph(
        `CONCLUSION: The fees billed are consistent with prevailing market rates as reflected in the Laffey Matrix.`
      ));
    }
  }

  return createCourtDocument([{ children }]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FULL PACKAGE - MOTION + ALL EXHIBITS
// ═══════════════════════════════════════════════════════════════════════════════
function generateFullPackage(
  caseData: GenerateRequest["caseData"],
  repairOrders: ExtractedRepairOrder[],
  billing?: GenerateRequest["billing"],
  costs?: GenerateRequest["costs"],
  laffeyComparison?: LaffeyComparisonResult | null,
  attorneyInfo?: AttorneyInfo
): Document {
  const totalDaysDown = repairOrders.reduce((sum, ro) => sum + (ro.daysDown || 0), 0);
  const totalAmount = (billing?.totalFees || 0) + (costs?.totalCosts || 0);
  const sections: { children: (Paragraph | Table)[] }[] = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: MOTION
  // ═══════════════════════════════════════════════════════════════════════════
  const motionDoc = generateMotionDocument(caseData, repairOrders, billing, costs, laffeyComparison, attorneyInfo);
  // Extract children from first section
  // For full package, we rebuild everything

  const motionChildren: (Paragraph | Table)[] = [];

  // Attorney info
  if (attorneyInfo) {
    motionChildren.push(...createAttorneyBlock(
      attorneyInfo.name,
      attorneyInfo.barNumber,
      attorneyInfo.firmName,
      attorneyInfo.address,
      attorneyInfo.phone,
      attorneyInfo.fax,
      attorneyInfo.email,
      caseData.clientName
    ));
  }

  // Court header
  motionChildren.push(...createCourtHeader(
    caseData.courtName || "SUPERIOR COURT OF THE STATE OF CALIFORNIA",
    caseData.county || "LOS ANGELES"
  ));

  // Caption
  motionChildren.push(...createCaptionBlock(
    caseData.caseNumber,
    caseData.clientName,
    caseData.defendant,
    "MOTION FOR ATTORNEY'S FEES AND COSTS"
  ));

  // Concise motion content
  motionChildren.push(...createLegalSection("I", "INTRODUCTION", [
    `Plaintiff ${caseData.clientName.toUpperCase()} moves for attorney's fees and costs pursuant to California Civil Code section 1794(d), following Plaintiff's successful prosecution of this Song-Beverly Consumer Warranty Act matter.`,
  ]));

  // Summary table
  motionChildren.push(createHeading("II. SUMMARY OF FEES AND COSTS REQUESTED", 1));
  motionChildren.push(createEmptyLine());

  const summaryTable = createTable(
    ["Category", "Amount"],
    [
      ["Attorney's Fees (Exhibit B)", formatCurrency(billing?.totalFees || 0)],
      ["Costs", formatCurrency(costs?.totalCosts || 0)],
      ["TOTAL REQUESTED", formatCurrency(totalAmount)],
    ],
    [70, 30]
  );
  motionChildren.push(summaryTable);
  motionChildren.push(createEmptyLine());

  // Case summary
  motionChildren.push(createHeading("III. CASE SUMMARY", 1));
  motionChildren.push(createEmptyLine());

  const caseTable = createTable(
    ["Item", "Detail"],
    [
      ["Subject Vehicle", `${caseData.vehicleYear} ${caseData.vehicleMake} ${caseData.vehicleModel}`],
      ["VIN", caseData.vin],
      ["Purchase Price", formatCurrency(caseData.purchasePrice)],
      ["Repair Attempts", `${repairOrders.length} visits`],
      ["Days Out of Service", `${totalDaysDown} days`],
      ["30-Day Presumption Met?", totalDaysDown >= 30 ? "YES ✓" : "No"],
    ],
    [40, 60]
  );
  motionChildren.push(caseTable);
  motionChildren.push(createEmptyLine());

  // Legal basis (brief)
  motionChildren.push(...createLegalSection("IV", "LEGAL BASIS", [
    `Civil Code section 1794(d) mandates that a prevailing buyer "shall be allowed by the court to recover" attorney's fees based on actual time expended, plus costs and expenses reasonably incurred. (See Warren v. Kia Motors America, Inc. (2018) 30 Cal.App.5th 24, 42.)`,
    `The detailed support for the fees and costs requested is set forth in the attached exhibits: Exhibit A (Repair History), Exhibit B (Attorney Fee Itemization)${laffeyComparison ? ", and Exhibit C (Laffey Matrix Comparison)" : ""}.`,
  ]));

  // Conclusion
  motionChildren.push(...createLegalSection("V", "CONCLUSION", [
    `Plaintiff respectfully requests that this Court GRANT this Motion and award attorney's fees of ${formatCurrency(billing?.totalFees || 0)} and costs of ${formatCurrency(costs?.totalCosts || 0)}, for a total award of ${formatCurrency(totalAmount)}.`,
  ]));

  motionChildren.push(...createSignatureBlock(
    attorneyInfo?.firmName,
    attorneyInfo?.name,
    attorneyInfo?.barNumber
  ));

  sections.push({ children: motionChildren });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: EXHIBIT A - REPAIR SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  const exhibitAChildren: (Paragraph | Table)[] = [];

  exhibitAChildren.push(...createExhibitHeader("A", "REPAIR HISTORY SUMMARY"));

  exhibitAChildren.push(createMixedParagraph([
    { text: "Subject Vehicle: ", bold: true },
    { text: `${caseData.vehicleYear} ${caseData.vehicleMake} ${caseData.vehicleModel} (VIN: ${caseData.vin})` },
  ]));
  exhibitAChildren.push(createMixedParagraph([
    { text: "Total Repair Visits: ", bold: true },
    { text: String(repairOrders.length) },
  ]));
  exhibitAChildren.push(createMixedParagraph([
    { text: "Total Days Out of Service: ", bold: true },
    { text: `${totalDaysDown} days ${totalDaysDown >= 30 ? "(EXCEEDS 30-DAY PRESUMPTION)" : ""}` },
  ]));
  exhibitAChildren.push(createEmptyLine());

  // Repair table
  const repairHeaders = ["#", "Date", "Days", "Mileage", "Category", "Concern (Summary)"];
  const repairRows = repairOrders.map((ro, i) => [
    String(i + 1),
    formatDate(ro.dateIn || ""),
    String(ro.daysDown || 0),
    ro.mileageIn?.toLocaleString() || "N/A",
    ro.category || "Other",
    (ro.customerConcern || "N/A").substring(0, 35) + ((ro.customerConcern?.length || 0) > 35 ? "..." : ""),
  ]);
  repairRows.push(["", "TOTAL", String(totalDaysDown), "", "", ""]);

  exhibitAChildren.push(createTable(repairHeaders, repairRows, [5, 15, 8, 12, 15, 45]));

  sections.push({ children: exhibitAChildren });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: EXHIBIT B - BILLING SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  const exhibitBChildren: (Paragraph | Table)[] = [];

  exhibitBChildren.push(...createExhibitHeader("B", "ATTORNEY FEE ITEMIZATION"));

    exhibitBChildren.push(createMixedParagraph([
      { text: "Total Hours: ", bold: true },
    { text: `${billing?.totalHours?.toFixed(1) || "0"} hours` },
    ]));
    exhibitBChildren.push(createMixedParagraph([
      { text: "Total Fees: ", bold: true },
    { text: formatCurrency(billing?.totalFees || 0) },
    ]));
    exhibitBChildren.push(createEmptyLine());

  if (billing?.entries && billing.entries.length > 0) {
    const billingHeaders = ["Date", "Timekeeper", "Hours", "Rate", "Amount"];
    const billingRows = billing.entries.map((e) => [
      formatDate(e.date || ""),
      e.attorney || "N/A",
      (e.hours || 0).toFixed(1),
      formatCurrency(e.rate || 0),
      formatCurrency((e.hours || 0) * (e.rate || 0)),
    ]);
    billingRows.push(["", "TOTAL", billing.totalHours?.toFixed(1) || "0", "", formatCurrency(billing.totalFees || 0)]);

    exhibitBChildren.push(createTable(billingHeaders, billingRows, [15, 25, 12, 18, 20]));
  }

  sections.push({ children: exhibitBChildren });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: EXHIBIT C - LAFFEY MATRIX (if applicable)
  // ═══════════════════════════════════════════════════════════════════════════
  if (laffeyComparison) {
    const exhibitCChildren: (Paragraph | Table)[] = [];

    exhibitCChildren.push(...createExhibitHeader("C", "LAFFEY MATRIX RATE COMPARISON"));

    exhibitCChildren.push(createParagraph(
      `The Laffey Matrix provides a benchmark for reasonable hourly rates based on attorney experience. This comparison demonstrates that the rates charged are at or below market rates.`,
      { firstLineIndent: 0.5 }
    ));
    exhibitCChildren.push(createEmptyLine());

    const laffeyHeaders = ["Timekeeper", "Hours", "Billed", "Laffey", "Billed Total", "Laffey Total"];
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

    exhibitCChildren.push(createTable(laffeyHeaders, laffeyRows, [22, 10, 14, 14, 20, 20]));
    exhibitCChildren.push(createEmptyLine());

    if (laffeyComparison.isUnderLaffey) {
    exhibitCChildren.push(createParagraph(
        `★ The fees billed are ${formatCurrency(laffeyComparison.difference)} BELOW Laffey Matrix rates, demonstrating reasonableness.`,
      { bold: true }
    ));
    }

    sections.push({ children: exhibitCChildren });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: PROOF OF SERVICE
  // ═══════════════════════════════════════════════════════════════════════════
  const posChildren: (Paragraph | Table)[] = [];
  
  posChildren.push(...createProofOfService(
    `${caseData.defendant} (via counsel)`,
    ["[Attorney Name]", "[Law Firm]", "[Address Line 1]", "[City, State ZIP]"],
    "electronic",
    [
      "Motion for Attorney's Fees and Costs",
      "Exhibit A: Repair History Summary",
      "Exhibit B: Attorney Fee Itemization",
      ...(laffeyComparison ? ["Exhibit C: Laffey Matrix Comparison"] : []),
    ]
  ));

  sections.push({ children: posChildren });

  return createCourtDocument(sections);
}
