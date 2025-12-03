// Document generation utilities for court-ready legal documents
import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  convertInchesToTwip,
  LineNumberRestartFormat,
  PageNumber,
  NumberFormat,
  Footer,
  Header,
} from "docx";

// Court document standards
export const COURT_FORMATTING = {
  font: "Times New Roman",
  fontSize: 24, // 12pt in half-points
  lineSpacing: 480, // Double-spaced (240 = single, 480 = double)
  margins: {
    top: convertInchesToTwip(1),
    bottom: convertInchesToTwip(1),
    left: convertInchesToTwip(1),
    right: convertInchesToTwip(1),
  },
} as const;

// Standard paragraph with court formatting
export function createParagraph(
  text: string,
  options?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    allCaps?: boolean;
    centered?: boolean;
    indent?: number;
    spacingAfter?: number;
    spacingBefore?: number;
  }
): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: COURT_FORMATTING.font,
        size: COURT_FORMATTING.fontSize,
        bold: options?.bold,
        italics: options?.italic,
        underline: options?.underline ? {} : undefined,
        allCaps: options?.allCaps,
      }),
    ],
    alignment: options?.centered ? AlignmentType.CENTER : AlignmentType.LEFT,
    indent: options?.indent ? { left: convertInchesToTwip(options.indent) } : undefined,
    spacing: {
      line: COURT_FORMATTING.lineSpacing,
      after: options?.spacingAfter ?? 0,
      before: options?.spacingBefore ?? 0,
    },
  });
}

// Create paragraph with multiple text runs (for mixed formatting)
export function createMixedParagraph(
  runs: { text: string; bold?: boolean; italic?: boolean; underline?: boolean }[],
  options?: {
    centered?: boolean;
    indent?: number;
    spacingAfter?: number;
  }
): Paragraph {
  return new Paragraph({
    children: runs.map(
      (run) =>
        new TextRun({
          text: run.text,
          font: COURT_FORMATTING.font,
          size: COURT_FORMATTING.fontSize,
          bold: run.bold,
          italics: run.italic,
          underline: run.underline ? {} : undefined,
        })
    ),
    alignment: options?.centered ? AlignmentType.CENTER : AlignmentType.LEFT,
    indent: options?.indent ? { left: convertInchesToTwip(options.indent) } : undefined,
    spacing: {
      line: COURT_FORMATTING.lineSpacing,
      after: options?.spacingAfter ?? 0,
    },
  });
}

// Section heading (bold, centered)
export function createHeading(text: string, level: 1 | 2 | 3 = 1): Paragraph {
  const sizes = { 1: 28, 2: 26, 3: 24 }; // 14pt, 13pt, 12pt
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: COURT_FORMATTING.font,
        size: sizes[level],
        bold: true,
        allCaps: level === 1,
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: {
      before: 240,
      after: 240,
      line: COURT_FORMATTING.lineSpacing,
    },
  });
}

// Numbered paragraph (for legal arguments)
export function createNumberedParagraph(number: string, text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: `${number}. `,
        font: COURT_FORMATTING.font,
        size: COURT_FORMATTING.fontSize,
        bold: true,
      }),
      new TextRun({
        text,
        font: COURT_FORMATTING.font,
        size: COURT_FORMATTING.fontSize,
      }),
    ],
    spacing: {
      line: COURT_FORMATTING.lineSpacing,
      after: 120,
    },
    indent: {
      left: convertInchesToTwip(0.5),
      hanging: convertInchesToTwip(0.5),
    },
  });
}

// Create table cell with proper formatting
export function createCell(
  text: string,
  options?: {
    bold?: boolean;
    width?: number;
    align?: "left" | "center" | "right";
  }
): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            font: COURT_FORMATTING.font,
            size: 20, // 10pt for tables
            bold: options?.bold,
          }),
        ],
        alignment:
          options?.align === "center"
            ? AlignmentType.CENTER
            : options?.align === "right"
            ? AlignmentType.RIGHT
            : AlignmentType.LEFT,
      }),
    ],
    width: options?.width ? { size: options.width, type: WidthType.PERCENTAGE } : undefined,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    },
  });
}

// Create a standard table
export function createTable(
  headers: string[],
  rows: string[][],
  columnWidths?: number[]
): Table {
  const headerRow = new TableRow({
    children: headers.map((h, i) =>
      createCell(h, { bold: true, width: columnWidths?.[i], align: "center" })
    ),
    tableHeader: true,
  });

  const dataRows = rows.map(
    (row) =>
      new TableRow({
        children: row.map((cell, i) =>
          createCell(cell, { width: columnWidths?.[i] })
        ),
      })
  );

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

// Empty line
export function createEmptyLine(): Paragraph {
  return new Paragraph({
    children: [],
    spacing: { line: COURT_FORMATTING.lineSpacing },
  });
}

// Page break
export function createPageBreak(): Paragraph {
  return new Paragraph({
    children: [],
    pageBreakBefore: true,
  });
}

// Exhibit header
export function createExhibitHeader(exhibitLetter: string, title: string): Paragraph[] {
  return [
    createPageBreak(),
    createParagraph(`EXHIBIT ${exhibitLetter}`, { bold: true, centered: true, allCaps: true }),
    createEmptyLine(),
    createParagraph(title, { bold: true, centered: true }),
    createEmptyLine(),
  ];
}

// Caption block for pleadings
export function createCaptionBlock(
  caseNumber: string,
  plaintiff: string,
  defendant: string,
  documentTitle: string
): Paragraph[] {
  return [
    createParagraph(plaintiff, { bold: true }),
    createMixedParagraph([{ text: "Plaintiff," }], { indent: 2 }),
    createEmptyLine(),
    createParagraph("v.", { indent: 0.5 }),
    createEmptyLine(),
    createParagraph(defendant, { bold: true }),
    createMixedParagraph([{ text: "Defendant." }], { indent: 2 }),
    createEmptyLine(),
    createParagraph(`Case No. ${caseNumber}`, { bold: true }),
    createEmptyLine(),
    createHeading(documentTitle, 1),
    createEmptyLine(),
  ];
}

// Create court document with standard sections
export function createCourtDocument(
  sections: { children: (Paragraph | Table)[] }[]
): Document {
  return new Document({
    styles: {
      default: {
        document: {
          run: {
            font: COURT_FORMATTING.font,
            size: COURT_FORMATTING.fontSize,
          },
          paragraph: {
            spacing: {
              line: COURT_FORMATTING.lineSpacing,
            },
          },
        },
      },
    },
    sections: sections.map((section) => ({
      properties: {
        page: {
          margin: COURT_FORMATTING.margins,
        },
        lineNumbers: {
          countBy: 1,
          restart: LineNumberRestartFormat.NEW_PAGE,
        },
      },
      children: section.children,
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  children: [PageNumber.CURRENT],
                  font: COURT_FORMATTING.font,
                  size: COURT_FORMATTING.fontSize,
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
      },
    })),
  });
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

// Format date
export function formatDate(date: string | Date): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Get Laffey tier based on years of experience
export function getLaffeyTier(yearsExperience: number): string {
  if (yearsExperience <= 3) return "tier1to3";
  if (yearsExperience <= 7) return "tier4to7";
  if (yearsExperience <= 10) return "tier8to10";
  if (yearsExperience <= 19) return "tier11to19";
  return "tier20Plus";
}

// Calculate Laffey rate for an attorney
export function calculateLaffeyRate(
  yearsExperience: number,
  laffeyMatrix: {
    tier1to3Rate: number;
    tier4to7Rate: number;
    tier8to10Rate: number;
    tier11to19Rate: number;
    tier20PlusRate: number;
  }
): number {
  if (yearsExperience <= 3) return laffeyMatrix.tier1to3Rate;
  if (yearsExperience <= 7) return laffeyMatrix.tier4to7Rate;
  if (yearsExperience <= 10) return laffeyMatrix.tier8to10Rate;
  if (yearsExperience <= 19) return laffeyMatrix.tier11to19Rate;
  return laffeyMatrix.tier20PlusRate;
}
