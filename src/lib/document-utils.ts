// California Court-Ready Legal Document Generation
// Compliant with California Rules of Court, Rule 2.100-2.119
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
  PageNumber,
  Footer,
  Header,
  HeadingLevel,
  UnderlineType,
  ITableCellBorders,
  LineRuleType,
  Tab,
  TabStopType,
  SectionType,
} from "docx";

// California Rules of Court formatting standards
export const COURT_FORMATTING = {
  font: "Times New Roman",
  fontSize: 24, // 12pt in half-points
  lineHeight: 480, // Double-spaced (24pt line height)
  linesPerPage: 28,
  margins: {
    top: convertInchesToTwip(1),
    bottom: convertInchesToTwip(0.5),
    left: convertInchesToTwip(1.5), // Extra for line numbers
    right: convertInchesToTwip(0.5),
  },
} as const;

// No borders helper
const NO_BORDERS: ITableCellBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

// Standard court paragraph
export function createParagraph(
  text: string,
  options?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    allCaps?: boolean;
    centered?: boolean;
    rightAlign?: boolean;
    indent?: number;
    hangingIndent?: number;
    firstLineIndent?: number;
    spacingAfter?: number;
    spacingBefore?: number;
    fontSize?: number;
    singleSpaced?: boolean;
  }
): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: COURT_FORMATTING.font,
        size: options?.fontSize ?? COURT_FORMATTING.fontSize,
        bold: options?.bold,
        italics: options?.italic,
        underline: options?.underline ? { type: UnderlineType.SINGLE } : undefined,
        allCaps: options?.allCaps,
      }),
    ],
    alignment: options?.centered
      ? AlignmentType.CENTER
      : options?.rightAlign
        ? AlignmentType.RIGHT
        : AlignmentType.JUSTIFIED,
    indent: {
      left: options?.indent ? convertInchesToTwip(options.indent) : undefined,
      hanging: options?.hangingIndent ? convertInchesToTwip(options.hangingIndent) : undefined,
      firstLine: options?.firstLineIndent ? convertInchesToTwip(options.firstLineIndent) : undefined,
    },
    spacing: {
      line: options?.singleSpaced ? 240 : COURT_FORMATTING.lineHeight,
      lineRule: LineRuleType.AUTO,
      after: options?.spacingAfter ?? 0,
      before: options?.spacingBefore ?? 0,
    },
  });
}

// Mixed formatting paragraph
export function createMixedParagraph(
  runs: { text: string; bold?: boolean; italic?: boolean; underline?: boolean }[],
  options?: {
    centered?: boolean;
    indent?: number;
    spacingAfter?: number;
    justified?: boolean;
    firstLineIndent?: number;
    singleSpaced?: boolean;
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
          underline: run.underline ? { type: UnderlineType.SINGLE } : undefined,
        })
    ),
    alignment: options?.centered
      ? AlignmentType.CENTER
      : options?.justified !== false
        ? AlignmentType.JUSTIFIED
        : AlignmentType.LEFT,
    indent: {
      left: options?.indent ? convertInchesToTwip(options.indent) : undefined,
      firstLine: options?.firstLineIndent ? convertInchesToTwip(options.firstLineIndent) : undefined,
    },
    spacing: {
      line: options?.singleSpaced ? 240 : COURT_FORMATTING.lineHeight,
      lineRule: LineRuleType.AUTO,
      after: options?.spacingAfter ?? 0,
    },
  });
}

// Section heading - Roman numeral format for motions
export function createHeading(text: string, level: 1 | 2 | 3 = 1): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: COURT_FORMATTING.font,
        size: COURT_FORMATTING.fontSize,
        bold: true,
        underline: level === 2 ? { type: UnderlineType.SINGLE } : undefined,
      }),
    ],
    alignment: level === 1 ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: {
      before: 240,
      after: 240,
      line: COURT_FORMATTING.lineHeight,
      lineRule: LineRuleType.AUTO,
    },
    heading: level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
  });
}

// Numbered paragraph for legal arguments
export function createNumberedParagraph(number: string, text: string, indent: number = 0.5): Paragraph {
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
      line: COURT_FORMATTING.lineHeight,
      lineRule: LineRuleType.AUTO,
      after: 120,
    },
    indent: {
      left: convertInchesToTwip(indent),
      hanging: convertInchesToTwip(0.5),
    },
  });
}

// Table cell with court formatting
export function createCell(
  text: string,
  options?: {
    bold?: boolean;
    width?: number;
    align?: "left" | "center" | "right";
    shading?: string;
    fontSize?: number;
    noBorders?: boolean;
    verticalAlign?: "top" | "center" | "bottom";
    rowSpan?: number;
    colSpan?: number;
  }
): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            font: COURT_FORMATTING.font,
            size: options?.fontSize ?? 20,
            bold: options?.bold,
          }),
        ],
        alignment:
          options?.align === "center"
            ? AlignmentType.CENTER
            : options?.align === "right"
              ? AlignmentType.RIGHT
              : AlignmentType.LEFT,
        spacing: { after: 60, before: 60, line: 240 },
      }),
    ],
    width: options?.width ? { size: options.width, type: WidthType.PERCENTAGE } : undefined,
    shading: options?.shading ? { fill: options.shading } : undefined,
    borders: options?.noBorders ? NO_BORDERS : {
      top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    },
    verticalAlign: options?.verticalAlign === "center" ? "center" : options?.verticalAlign === "bottom" ? "bottom" : "top",
    rowSpan: options?.rowSpan,
    columnSpan: options?.colSpan,
  });
}

// Professional table with court styling
export function createTable(
  headers: string[],
  rows: string[][],
  columnWidths?: number[]
): Table {
  const headerRow = new TableRow({
    children: headers.map((h, i) =>
      createCell(h, {
        bold: true,
        width: columnWidths?.[i],
        align: "center",
        shading: "D9D9D9",
        fontSize: 20,
      })
    ),
    tableHeader: true,
  });

  const dataRows = rows.map(
    (row) =>
      new TableRow({
        children: row.map((cell, i) =>
          createCell(cell, {
            width: columnWidths?.[i],
            fontSize: 18,
          })
        ),
      })
  );

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

// Empty line (double-spaced)
export function createEmptyLine(): Paragraph {
  return new Paragraph({
    children: [],
    spacing: { line: COURT_FORMATTING.lineHeight, lineRule: LineRuleType.AUTO },
  });
}

// Page break
export function createPageBreak(): Paragraph {
  return new Paragraph({
    children: [],
    pageBreakBefore: true,
  });
}

// Exhibit header with professional styling
export function createExhibitHeader(exhibitLetter: string, title: string): Paragraph[] {
  return [
    createPageBreak(),
    new Paragraph({
      children: [
        new TextRun({
          text: `EXHIBIT ${exhibitLetter}`,
          font: COURT_FORMATTING.font,
          size: 32,
          bold: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200, line: 240 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "═".repeat(50),
          font: COURT_FORMATTING.font,
          size: 24,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: title,
          font: COURT_FORMATTING.font,
          size: 28,
          bold: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400, line: 240 },
    }),
    createEmptyLine(),
  ];
}

// Attorney information block (top of pleading)
export function createAttorneyBlock(
  attorneyName: string,
  barNumber: string,
  firmName: string,
  address: string[],
  phone: string,
  fax?: string,
  email?: string,
  attorneyFor?: string
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Attorney name and bar number
  paragraphs.push(new Paragraph({
    children: [
      new TextRun({
        text: `${attorneyName} (State Bar No. ${barNumber})`,
        font: COURT_FORMATTING.font,
        size: COURT_FORMATTING.fontSize,
      }),
    ],
    spacing: { line: 240, after: 0 },
  }));

  // Firm name
  paragraphs.push(new Paragraph({
    children: [
      new TextRun({
        text: firmName,
        font: COURT_FORMATTING.font,
        size: COURT_FORMATTING.fontSize,
      }),
    ],
    spacing: { line: 240, after: 0 },
  }));

  // Address lines
  for (const line of address) {
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({
          text: line,
          font: COURT_FORMATTING.font,
          size: COURT_FORMATTING.fontSize,
        }),
      ],
      spacing: { line: 240, after: 0 },
    }));
  }

  // Phone
  paragraphs.push(new Paragraph({
    children: [
      new TextRun({
        text: `Telephone: ${phone}`,
        font: COURT_FORMATTING.font,
        size: COURT_FORMATTING.fontSize,
      }),
    ],
    spacing: { line: 240, after: 0 },
  }));

  // Fax (if provided)
  if (fax) {
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({
          text: `Facsimile: ${fax}`,
          font: COURT_FORMATTING.font,
          size: COURT_FORMATTING.fontSize,
        }),
      ],
      spacing: { line: 240, after: 0 },
    }));
  }

  // Email (if provided)
  if (email) {
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({
          text: `Email: ${email}`,
          font: COURT_FORMATTING.font,
          size: COURT_FORMATTING.fontSize,
        }),
      ],
      spacing: { line: 240, after: 0 },
    }));
  }

  // Attorney for
  paragraphs.push(createEmptyLine());
  paragraphs.push(new Paragraph({
    children: [
      new TextRun({
        text: `Attorney for ${attorneyFor || "Plaintiff"}`,
        font: COURT_FORMATTING.font,
        size: COURT_FORMATTING.fontSize,
      }),
    ],
    spacing: { line: 240, after: 0 },
  }));

  paragraphs.push(createEmptyLine());
  paragraphs.push(createEmptyLine());

  return paragraphs;
}

// Court header (centered above caption)
export function createCourtHeader(courtName: string, county: string, branchName?: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(new Paragraph({
    children: [
      new TextRun({
        text: courtName,
        font: COURT_FORMATTING.font,
        size: COURT_FORMATTING.fontSize,
        bold: true,
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { line: 240, after: 0 },
  }));

  paragraphs.push(new Paragraph({
    children: [
      new TextRun({
        text: `COUNTY OF ${county.toUpperCase()}`,
        font: COURT_FORMATTING.font,
        size: COURT_FORMATTING.fontSize,
        bold: true,
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { line: 240, after: 0 },
  }));

  if (branchName) {
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({
          text: branchName,
          font: COURT_FORMATTING.font,
          size: COURT_FORMATTING.fontSize,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { line: 240, after: 0 },
    }));
  }

  paragraphs.push(createEmptyLine());
  paragraphs.push(createEmptyLine());

  return paragraphs;
}

// California-style caption block with proper formatting
export function createCaptionBlock(
  caseNumber: string,
  plaintiff: string,
  defendant: string,
  documentTitle: string
): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  // Create caption table
  const captionTable = new Table({
    rows: [
      new TableRow({
        children: [
          // Left column - parties
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: plaintiff.toUpperCase() + ",",
                    font: COURT_FORMATTING.font,
                    size: COURT_FORMATTING.fontSize,
                  }),
                ],
                spacing: { line: 240, after: 120 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Plaintiff,",
                    font: COURT_FORMATTING.font,
                    size: COURT_FORMATTING.fontSize,
                  }),
                ],
                indent: { left: convertInchesToTwip(1.5) },
                spacing: { line: 240, after: 120 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "vs.",
                    font: COURT_FORMATTING.font,
                    size: COURT_FORMATTING.fontSize,
                  }),
                ],
                indent: { left: convertInchesToTwip(0.3) },
                spacing: { line: 240, after: 120 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: defendant.toUpperCase() + ",",
                    font: COURT_FORMATTING.font,
                    size: COURT_FORMATTING.fontSize,
                  }),
                ],
                spacing: { line: 240, after: 120 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Defendant.",
                    font: COURT_FORMATTING.font,
                    size: COURT_FORMATTING.fontSize,
                  }),
                ],
                indent: { left: convertInchesToTwip(1.5) },
                spacing: { line: 240 },
              }),
            ],
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
          }),
          // Right column - case info with line border on left
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Case No.: ${caseNumber}`,
                    font: COURT_FORMATTING.font,
                    size: COURT_FORMATTING.fontSize,
                    bold: true,
                  }),
                ],
                spacing: { line: 240, after: 240 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: documentTitle,
                    font: COURT_FORMATTING.font,
                    size: COURT_FORMATTING.fontSize,
                    bold: true,
                  }),
                ],
                spacing: { line: 240, after: 120 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "[Song-Beverly Consumer Warranty Act]",
                    font: COURT_FORMATTING.font,
                    size: 20,
                    italics: true,
                  }),
                ],
                spacing: { line: 240 },
              }),
            ],
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: {
              ...NO_BORDERS,
              left: { style: BorderStyle.SINGLE, size: 12, color: "000000" },
            },
            verticalAlign: "top",
          }),
        ],
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  elements.push(captionTable);
  elements.push(createEmptyLine());
  elements.push(createEmptyLine());

  return elements;
}

// Signature block with proper legal formatting
export function createSignatureBlock(
  firmName?: string,
  attorneyName?: string,
  barNumber?: string
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(createEmptyLine());
  paragraphs.push(createEmptyLine());

  // Dated line
  paragraphs.push(new Paragraph({
    children: [
      new TextRun({
        text: `Dated: ${formatDate(new Date())}`,
        font: COURT_FORMATTING.font,
        size: COURT_FORMATTING.fontSize,
      }),
    ],
    spacing: { line: COURT_FORMATTING.lineHeight, after: 0 },
  }));

  paragraphs.push(createEmptyLine());

  // Respectfully submitted (right-aligned block)
  paragraphs.push(new Paragraph({
    children: [
      new TextRun({
        text: "Respectfully submitted,",
        font: COURT_FORMATTING.font,
        size: COURT_FORMATTING.fontSize,
      }),
    ],
    indent: { left: convertInchesToTwip(3.5) },
    spacing: { line: COURT_FORMATTING.lineHeight },
  }));

  paragraphs.push(createEmptyLine());
  paragraphs.push(createEmptyLine());
  paragraphs.push(createEmptyLine());

  // Signature line
  paragraphs.push(new Paragraph({
    children: [
      new TextRun({
        text: "______________________________________",
        font: COURT_FORMATTING.font,
        size: COURT_FORMATTING.fontSize,
      }),
    ],
    indent: { left: convertInchesToTwip(3.5) },
    spacing: { line: 240 },
  }));

  // Firm name
  if (firmName) {
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({
          text: firmName,
          font: COURT_FORMATTING.font,
          size: COURT_FORMATTING.fontSize,
          bold: true,
        }),
      ],
      indent: { left: convertInchesToTwip(3.5) },
      spacing: { line: 240 },
    }));
  }

  // Attorney name
  paragraphs.push(new Paragraph({
    children: [
      new TextRun({
        text: attorneyName || "[ATTORNEY NAME]",
        font: COURT_FORMATTING.font,
        size: COURT_FORMATTING.fontSize,
      }),
    ],
    indent: { left: convertInchesToTwip(3.5) },
    spacing: { line: 240 },
  }));

  // Bar number
  if (barNumber) {
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({
          text: `State Bar No. ${barNumber}`,
          font: COURT_FORMATTING.font,
          size: COURT_FORMATTING.fontSize,
        }),
      ],
      indent: { left: convertInchesToTwip(3.5) },
      spacing: { line: 240 },
    }));
  }

  // Attorney for Plaintiff
  paragraphs.push(new Paragraph({
    children: [
      new TextRun({
        text: "Attorneys for Plaintiff",
        font: COURT_FORMATTING.font,
        size: COURT_FORMATTING.fontSize,
      }),
    ],
    indent: { left: convertInchesToTwip(3.5) },
    spacing: { line: 240 },
  }));

  return paragraphs;
}

// Create court document with California standards
export function createCourtDocument(
  sections: { children: (Paragraph | Table)[] }[]
): Document {
  return new Document({
    creator: "LemonLaw AI",
    title: "Legal Document",
    styles: {
      default: {
        document: {
          run: {
            font: COURT_FORMATTING.font,
            size: COURT_FORMATTING.fontSize,
          },
          paragraph: {
            spacing: {
              line: COURT_FORMATTING.lineHeight,
              lineRule: LineRuleType.AUTO,
            },
          },
        },
        heading1: {
          run: {
            font: COURT_FORMATTING.font,
            size: COURT_FORMATTING.fontSize,
            bold: true,
          },
          paragraph: {
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 240, line: COURT_FORMATTING.lineHeight },
          },
        },
        heading2: {
          run: {
            font: COURT_FORMATTING.font,
            size: COURT_FORMATTING.fontSize,
            bold: true,
            underline: { type: UnderlineType.SINGLE },
          },
          paragraph: {
            spacing: { before: 240, after: 120, line: COURT_FORMATTING.lineHeight },
          },
        },
      },
    },
    sections: sections.map((section, index) => ({
      properties: {
        page: {
          margin: COURT_FORMATTING.margins,
        },
        type: index === 0 ? undefined : SectionType.NEXT_PAGE,
      },
      children: section.children,
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  children: ["- ", PageNumber.CURRENT, " -"],
                  font: COURT_FORMATTING.font,
                  size: 20,
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

// Format date in legal format
export function formatDate(date: string | Date): string {
  if (!date) return "[DATE]";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return String(date);
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

// Bullet point paragraph
export function createBulletPoint(text: string, indent: number = 0.5): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: "• ",
        font: COURT_FORMATTING.font,
        size: COURT_FORMATTING.fontSize,
      }),
      new TextRun({
        text,
        font: COURT_FORMATTING.font,
        size: COURT_FORMATTING.fontSize,
      }),
    ],
    spacing: {
      line: COURT_FORMATTING.lineHeight,
      lineRule: LineRuleType.AUTO,
      after: 60,
    },
    indent: {
      left: convertInchesToTwip(indent),
      hanging: convertInchesToTwip(0.25),
    },
  });
}

// Legal section with proper formatting
export function createLegalSection(
  romanNumeral: string,
  title: string,
  content: string[]
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Section heading (centered, bold)
  paragraphs.push(new Paragraph({
    children: [
      new TextRun({
        text: `${romanNumeral}.`,
        font: COURT_FORMATTING.font,
        size: COURT_FORMATTING.fontSize,
        bold: true,
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { before: 360, after: 0, line: COURT_FORMATTING.lineHeight },
  }));

  paragraphs.push(new Paragraph({
    children: [
      new TextRun({
        text: title,
        font: COURT_FORMATTING.font,
        size: COURT_FORMATTING.fontSize,
        bold: true,
        underline: { type: UnderlineType.SINGLE },
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 240, line: COURT_FORMATTING.lineHeight },
  }));

  // Content paragraphs with first line indent
  for (const paragraph of content) {
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({
          text: paragraph,
          font: COURT_FORMATTING.font,
          size: COURT_FORMATTING.fontSize,
        }),
      ],
      alignment: AlignmentType.JUSTIFIED,
      spacing: { line: COURT_FORMATTING.lineHeight, lineRule: LineRuleType.AUTO, after: 240 },
      indent: { firstLine: convertInchesToTwip(0.5) },
    }));
  }

  return paragraphs;
}

// Subsection heading (e.g., "A. Reasonableness of Hours")
export function createSubsectionHeading(letter: string, title: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: `${letter}. ${title}`,
        font: COURT_FORMATTING.font,
        size: COURT_FORMATTING.fontSize,
        bold: true,
        underline: { type: UnderlineType.SINGLE },
      }),
    ],
    spacing: { before: 240, after: 120, line: COURT_FORMATTING.lineHeight },
    indent: { left: convertInchesToTwip(0.5) },
  });
}

// Citation paragraph (indented, for block quotes)
export function createBlockQuote(text: string, citation: string): Paragraph[] {
  return [
    new Paragraph({
      children: [
        new TextRun({
          text: `"${text}"`,
          font: COURT_FORMATTING.font,
          size: COURT_FORMATTING.fontSize,
          italics: true,
        }),
      ],
      alignment: AlignmentType.JUSTIFIED,
      spacing: { line: 240, after: 0 }, // Single-spaced for block quotes
      indent: { left: convertInchesToTwip(0.5), right: convertInchesToTwip(0.5) },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: citation,
          font: COURT_FORMATTING.font,
          size: COURT_FORMATTING.fontSize,
        }),
      ],
      alignment: AlignmentType.RIGHT,
      spacing: { line: 240, after: 240 },
      indent: { right: convertInchesToTwip(0.5) },
    }),
  ];
}

// Proof of Service
export function createProofOfService(
  servedParty: string,
  servedAddress: string[],
  serveMethod: "mail" | "electronic" | "personal",
  documentList: string[]
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(createPageBreak());
  paragraphs.push(new Paragraph({
    children: [
      new TextRun({
        text: "PROOF OF SERVICE",
        font: COURT_FORMATTING.font,
        size: COURT_FORMATTING.fontSize,
        bold: true,
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 240, line: COURT_FORMATTING.lineHeight },
  }));

  paragraphs.push(createEmptyLine());

  const methodText = serveMethod === "mail"
    ? "by placing a true copy thereof enclosed in a sealed envelope with postage thereon fully prepaid, in the United States mail"
    : serveMethod === "electronic"
      ? "by transmitting via electronic mail"
      : "by personally delivering a true copy thereof";

  paragraphs.push(new Paragraph({
    children: [
      new TextRun({
        text: `STATE OF CALIFORNIA, COUNTY OF ________________`,
        font: COURT_FORMATTING.font,
        size: COURT_FORMATTING.fontSize,
      }),
    ],
    spacing: { line: COURT_FORMATTING.lineHeight, after: 240 },
  }));

  paragraphs.push(new Paragraph({
    children: [
      new TextRun({
        text: `I am employed in the County of ________________, State of California. I am over the age of eighteen (18) years and am not a party to the within action. My business address is ________________.`,
        font: COURT_FORMATTING.font,
        size: COURT_FORMATTING.fontSize,
      }),
    ],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: COURT_FORMATTING.lineHeight, after: 240 },
    indent: { firstLine: convertInchesToTwip(0.5) },
  }));

  paragraphs.push(new Paragraph({
    children: [
      new TextRun({
        text: `On ${formatDate(new Date())}, I served the foregoing document(s) described as:`,
        font: COURT_FORMATTING.font,
        size: COURT_FORMATTING.fontSize,
      }),
    ],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: COURT_FORMATTING.lineHeight, after: 120 },
    indent: { firstLine: convertInchesToTwip(0.5) },
  }));

  for (const doc of documentList) {
    paragraphs.push(createBulletPoint(doc, 0.75));
  }

  paragraphs.push(createEmptyLine());

  paragraphs.push(new Paragraph({
    children: [
      new TextRun({
        text: `${methodText} to the following party(ies):`,
        font: COURT_FORMATTING.font,
        size: COURT_FORMATTING.fontSize,
      }),
    ],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: COURT_FORMATTING.lineHeight, after: 240 },
    indent: { firstLine: convertInchesToTwip(0.5) },
  }));

  paragraphs.push(new Paragraph({
    children: [
      new TextRun({
        text: servedParty,
        font: COURT_FORMATTING.font,
        size: COURT_FORMATTING.fontSize,
        bold: true,
      }),
    ],
    indent: { left: convertInchesToTwip(1) },
    spacing: { line: 240 },
  }));

  for (const line of servedAddress) {
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({
          text: line,
          font: COURT_FORMATTING.font,
          size: COURT_FORMATTING.fontSize,
        }),
      ],
      indent: { left: convertInchesToTwip(1) },
      spacing: { line: 240 },
    }));
  }

  paragraphs.push(createEmptyLine());
  paragraphs.push(createEmptyLine());

  paragraphs.push(new Paragraph({
    children: [
      new TextRun({
        text: "I declare under penalty of perjury under the laws of the State of California that the foregoing is true and correct.",
        font: COURT_FORMATTING.font,
        size: COURT_FORMATTING.fontSize,
      }),
    ],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: COURT_FORMATTING.lineHeight, after: 240 },
    indent: { firstLine: convertInchesToTwip(0.5) },
  }));

  paragraphs.push(new Paragraph({
    children: [
      new TextRun({
        text: `Executed on ${formatDate(new Date())}, at ________________, California.`,
        font: COURT_FORMATTING.font,
        size: COURT_FORMATTING.fontSize,
      }),
    ],
    spacing: { line: COURT_FORMATTING.lineHeight, after: 240 },
    indent: { firstLine: convertInchesToTwip(0.5) },
  }));

  paragraphs.push(createEmptyLine());
  paragraphs.push(createEmptyLine());
  paragraphs.push(createEmptyLine());

  paragraphs.push(new Paragraph({
    children: [
      new TextRun({
        text: "______________________________________",
        font: COURT_FORMATTING.font,
        size: COURT_FORMATTING.fontSize,
      }),
    ],
    indent: { left: convertInchesToTwip(3.5) },
    spacing: { line: 240 },
  }));

  paragraphs.push(new Paragraph({
    children: [
      new TextRun({
        text: "[Name of Declarant]",
        font: COURT_FORMATTING.font,
        size: COURT_FORMATTING.fontSize,
      }),
    ],
    indent: { left: convertInchesToTwip(3.5) },
    spacing: { line: 240 },
  }));

  return paragraphs;
}
