import { NextRequest, NextResponse } from "next/server";
import {
  extractRepairOrders,
  extractBillingEntries,
  extractCosts,
  extractFromImage,
  ExtractedRepairOrder,
  ExtractedBillingEntry,
  ExtractedCost,
} from "@/lib/ai";

export const maxDuration = 60;

type ExtractionType = "repair_orders" | "billing" | "costs" | "unknown";

interface ExtractionResult {
  success: boolean;
  type: ExtractionType;
  data: ExtractedRepairOrder[] | ExtractedBillingEntry[] | ExtractedCost[];
  rawText?: string;
  error?: string;
}

// PDF parsing using pdf-parse-fork (better Next.js compatibility)
async function parsePDF(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse-fork");
  const data = await pdfParse(buffer, {
    // Disable problematic features
    max: 0, // no page limit
  });
  return data.text;
}

// DOCX parsing using mammoth
async function parseDOCX(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mammoth = require("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function POST(request: NextRequest): Promise<NextResponse<ExtractionResult>> {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const docType = formData.get("type") as ExtractionType | null;

    if (!file) {
      return NextResponse.json(
        { success: false, type: "unknown", data: [], error: "No file provided" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name.toLowerCase();
    const mimeType = file.type;

    let extractedData: ExtractedRepairOrder[] | ExtractedBillingEntry[] | ExtractedCost[] = [];
    let rawText = "";

    // Handle different file types
    if (fileName.endsWith(".pdf") || mimeType === "application/pdf") {
      // Parse PDF
      try {
        rawText = await parsePDF(buffer);
        const detectedType = docType || detectDocumentType(rawText);
        extractedData = await extractByType(rawText, detectedType);
        return NextResponse.json({
          success: true,
          type: detectedType,
          data: extractedData,
          rawText,
        });
      } catch (pdfError) {
        // PDF parsing failed - this usually means it's a scanned/image-based PDF
        // We can't easily extract images from PDFs without heavy dependencies
        // Return an error asking user to convert to image or use text-based PDF
        console.log("PDF parse failed:", pdfError);
        return NextResponse.json(
          {
            success: false,
            type: "unknown",
            data: [],
            error: "Could not extract text from this PDF. If it's a scanned document, please convert it to an image (PNG/JPG) and upload again.",
          },
          { status: 400 }
        );
      }
    } else if (
      fileName.endsWith(".jpg") ||
      fileName.endsWith(".jpeg") ||
      fileName.endsWith(".png") ||
      mimeType.startsWith("image/")
    ) {
      // Handle image with vision
      const base64 = buffer.toString("base64");
      extractedData = await extractFromImage(base64, mimeType);
      return NextResponse.json({
        success: true,
        type: "repair_orders",
        data: extractedData,
      });
    } else if (
      fileName.endsWith(".docx") ||
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      // Handle DOCX with mammoth
      try {
        rawText = await parseDOCX(buffer);
        const detectedType = docType || detectDocumentType(rawText);
        extractedData = await extractByType(rawText, detectedType);
        return NextResponse.json({
          success: true,
          type: detectedType,
          data: extractedData,
          rawText,
        });
      } catch (docxError) {
        console.error("DOCX parse error:", docxError);
        return NextResponse.json(
          {
            success: false,
            type: "unknown",
            data: [],
            error: "Failed to parse DOCX file",
          },
          { status: 400 }
        );
      }
    } else if (
      fileName.endsWith(".csv") ||
      fileName.endsWith(".txt") ||
      mimeType === "text/csv" ||
      mimeType === "text/plain"
    ) {
      // Handle text/CSV
      rawText = buffer.toString("utf-8");
      const detectedType = docType || detectDocumentType(rawText);
      extractedData = await extractByType(rawText, detectedType);
      return NextResponse.json({
        success: true,
        type: detectedType,
        data: extractedData,
        rawText,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          type: "unknown",
          data: [],
          error: `Unsupported file type: ${mimeType || fileName}`,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Extraction error:", error);
    return NextResponse.json(
      {
        success: false,
        type: "unknown",
        data: [],
        error: error instanceof Error ? error.message : "Extraction failed",
      },
      { status: 500 }
    );
  }
}

// Detect document type based on content
function detectDocumentType(text: string): ExtractionType {
  const lowerText = text.toLowerCase();

  // Check for costs first (most specific)
  const costsKeywords = [
    "filing fee",
    "service of process",
    "court reporter",
    "deposition cost",
    "expert fee",
    "mediation fee",
    "appearance fee",
    "transcript",
    "cost memo",
    "cost bill",
  ];
  const costsScore = costsKeywords.filter((k) => lowerText.includes(k)).length;

  // Check for billing
  const billingKeywords = [
    "billable",
    "hours",
    "hourly rate",
    "time entry",
    "attorney fees",
    "legal services",
    "professional services",
  ];
  const billingScore = billingKeywords.filter((k) => lowerText.includes(k)).length;

  // Check for repair orders
  const repairKeywords = [
    "repair order",
    "work order",
    "service order",
    "mileage",
    "customer concern",
    "work performed",
    "parts replaced",
    "dealership",
    "vin",
  ];
  const repairScore = repairKeywords.filter((k) => lowerText.includes(k)).length;

  // Return type with highest score
  if (costsScore >= 2) return "costs";
  if (billingScore > repairScore) return "billing";
  if (repairScore > 0) return "repair_orders";

  // Default to repair orders
  return "repair_orders";
}

// Extract based on detected type
async function extractByType(
  text: string,
  type: ExtractionType
): Promise<ExtractedRepairOrder[] | ExtractedBillingEntry[] | ExtractedCost[]> {
  switch (type) {
    case "costs":
      return await extractCosts(text);
    case "billing":
      return await extractBillingEntries(text);
    default:
      return await extractRepairOrders(text);
  }
}
