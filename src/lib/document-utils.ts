// Document generation utilities for California court-ready legal documents
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
  TabStopType,
  TabStopPosition,
  HeadingLevel,
  UnderlineType,
  ITableCellBorders,
} from "docx";

// California court document standards
export const COURT_FORMATTING = {
  font: "Times New Roman",
  fontSize: 24, // 12pt in half-points
  lineSpacing: 480, // Double-spaced (240 = single, 480 = double)
  margins: {
    top: convertInchesToTwip(1),
    bottom: convertInchesToTwip(0.5),
    left: convertInchesToTwip(1),
    right: convertInchesToTwip(1),
  },
} as const;

// No borders helper
const NO_BORDERS: ITableCellBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

// Standard paragraph with court formatting
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
    spacingAfter?: number;
    spacingBefore?: number;
    fontSize?: number;
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
    },
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
    justified?: boolean;
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
      : options?.justified
      ? AlignmentType.JUSTIFIED
      : AlignmentType.LEFT,
    indent: options?.indent ? { left: convertInchesToTwip(options.indent) } : undefined,
    spacing: {
      line: COURT_FORMATTING.lineSpacing,
      after: options?.spacingAfter ?? 0,
    },
  });
}

// Section heading - Roman numeral style for motions
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
      line: COURT_FORMATTING.lineSpacing,
    },
    heading: level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
  });
}

// Numbered paragraph (for legal arguments)
export function createNumberedParagraph(number: string, text: string, indent: number = 0.5): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: `${number}.\t`,
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
      left: convertInchesToTwip(indent),
      hanging: convertInchesToTwip(0.5),
    },
    tabStops: [
      {
        type: TabStopType.LEFT,
        position: TabStopPosition.MAX,
      },
    ],
  });
}

// Create table cell with proper formatting
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
  }
): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            font: COURT_FORMATTING.font,
            size: options?.fontSize ?? 20, // 10pt for tables
            bold: options?.bold,
          }),
        ],
        alignment:
          options?.align === "center"
            ? AlignmentType.CENTER
            : options?.align === "right"
            ? AlignmentType.RIGHT
            : AlignmentType.LEFT,
        spacing: { after: 60, before: 60 },
      }),
    ],
    width: options?.width ? { size: options.width, type: WidthType.PERCENTAGE } : undefined,
    shading: options?.shading ? { fill: options.shading } : undefined,
    borders: options?.noBorders
      ? NO_BORDERS
      : {
          top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        },
    verticalAlign: options?.verticalAlign === "center" ? "center" : options?.verticalAlign === "bottom" ? "bottom" : "top",
  });
}

// Create a standard table with improved styling
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
        shading: "E8E8E8",
        fontSize: 20,
      })
    ),
    tableHeader: true,
  });

  const dataRows = rows.map(
    (row, rowIndex) =>
      new TableRow({
        children: row.map((cell, i) =>
          createCell(cell, {
            width: columnWidths?.[i],
            shading: rowIndex % 2 === 1 ? "F8F8F8" : undefined,
          })
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

// Exhibit header - professional styling
export function createExhibitHeader(exhibitLetter: string, title: string): Paragraph[] {
  return [
    createPageBreak(),
    new Paragraph({
      children: [
        new TextRun({
          text: `EXHIBIT ${exhibitLetter}`,
          font: COURT_FORMATTING.font,
          size: 32, // 16pt
          bold: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      border: {
        bottom: { style: BorderStyle.DOUBLE, size: 6, color: "000000" },
      },
    }),
    createEmptyLine(),
    new Paragraph({
      children: [
        new TextRun({
          text: title,
          font: COURT_FORMATTING.font,
          size: 28, // 14pt
          bold: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    createEmptyLine(),
  ];
}

// California court caption block - proper formatting
export function createCaptionBlock(
  caseNumber: string,
  plaintiff: string,
  defendant: string,
  documentTitle: string,
  courtName?: string,
  county?: string
): (Paragraph | Table)[] {
  const paragraphs: (Paragraph | Table)[] = [];

  // Court name
  if (courtName || county) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: courtName || "SUPERIOR COURT OF THE STATE OF CALIFORNIA",
            font: COURT_FORMATTING.font,
            size: COURT_FORMATTING.fontSize,
            bold: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
      })
    );
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `FOR THE COUNTY OF ${(county || "LOS ANGELES").toUpperCase()}`,
            font: COURT_FORMATTING.font,
            size: COURT_FORMATTING.fontSize,
            bold: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );
    paragraphs.push(createEmptyLine());
  }

  // Caption table - plaintiff v. defendant with case number on right
  const captionTable = new Table({
    rows: [
      new TableRow({
        children: [
          // Left side - parties
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: plaintiff.toUpperCase(),
                    font: COURT_FORMATTING.font,
                    size: COURT_FORMATTING.fontSize,
                    bold: true,
                  }),
                ],
                spacing: { after: 120 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Plaintiff,",
                    font: COURT_FORMATTING.font,
                    size: COURT_FORMATTING.fontSize,
                  }),
                ],
                indent: { left: convertInchesToTwip(2) },
                spacing: { after: 200 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "v.",
                    font: COURT_FORMATTING.font,
                    size: COURT_FORMATTING.fontSize,
                  }),
                ],
                indent: { left: convertInchesToTwip(0.5) },
                spacing: { after: 200 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: defendant.toUpperCase(),
                    font: COURT_FORMATTING.font,
                    size: COURT_FORMATTING.fontSize,
                    bold: true,
                  }),
                ],
                spacing: { after: 120 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Defendant.",
                    font: COURT_FORMATTING.font,
                    size: COURT_FORMATTING.fontSize,
                  }),
                ],
                indent: { left: convertInchesToTwip(2) },
              }),
            ],
            width: { size: 55, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
          }),
          // Right side - case info
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Case No. ${caseNumber}`,
                    font: COURT_FORMATTING.font,
                    size: COURT_FORMATTING.fontSize,
                    bold: true,
                  }),
                ],
                spacing: { after: 400 },
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
              }),
            ],
            width: { size: 45, type: WidthType.PERCENTAGE },
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

  paragraphs.push(captionTable);
  paragraphs.push(createEmptyLine());
  paragraphs.push(createEmptyLine());

  return paragraphs;
}

// Signature block - proper legal formatting
export function createSignatureBlock(firmName?: string, attorneyName?: string, barNumber?: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(createEmptyLine());
  paragraphs.push(createEmptyLine());
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Dated: " + formatDate(new Date()),
          font: COURT_FORMATTING.font,
          size: COURT_FORMATTING.fontSize,
        }),
      ],
      tabStops: [{ type: TabStopType.LEFT, position: convertInchesToTwip(3.5) }],
    })
  );
  paragraphs.push(createEmptyLine());
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "\t\t\t\t\tRespectfully submitted,",
          font: COURT_FORMATTING.font,
          size: COURT_FORMATTING.fontSize,
        }),
      ],
    })
  );
  paragraphs.push(createEmptyLine());
  paragraphs.push(createEmptyLine());
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "\t\t\t\t\t_________________________________",
          font: COURT_FORMATTING.font,
          size: COURT_FORMATTING.fontSize,
        }),
      ],
    })
  );

  if (firmName) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `\t\t\t\t\t${firmName}`,
            font: COURT_FORMATTING.font,
            size: COURT_FORMATTING.fontSize,
            bold: true,
          }),
        ],
      })
    );
  }

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: attorneyName ? `\t\t\t\t\t${attorneyName}` : "\t\t\t\t\tAttorney for Plaintiff",
          font: COURT_FORMATTING.font,
          size: COURT_FORMATTING.fontSize,
        }),
      ],
    })
  );

  if (barNumber) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `\t\t\t\t\tState Bar No. ${barNumber}`,
            font: COURT_FORMATTING.font,
            size: COURT_FORMATTING.fontSize,
          }),
        ],
      })
    );
  }

  return paragraphs;
}

// Create court document with professional styling
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
        heading1: {
          run: {
            font: COURT_FORMATTING.font,
            size: COURT_FORMATTING.fontSize,
            bold: true,
          },
          paragraph: {
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 240, line: COURT_FORMATTING.lineSpacing },
          },
        },
        heading2: {
          run: {
            font: COURT_FORMATTING.font,
            size: COURT_FORMATTING.fontSize,
            bold: true,
          },
          paragraph: {
            spacing: { before: 240, after: 120, line: COURT_FORMATTING.lineSpacing },
          },
        },
      },
    },
    sections: sections.map((section) => ({
      properties: {
        page: {
          margin: COURT_FORMATTING.margins,
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

// Format date
export function formatDate(date: string | Date): string {
  if (!date) return "N/A";
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
        text: "•\t" + text,
        font: COURT_FORMATTING.font,
        size: COURT_FORMATTING.fontSize,
      }),
    ],
    spacing: {
      line: COURT_FORMATTING.lineSpacing,
      after: 60,
    },
    indent: {
      left: convertInchesToTwip(indent),
      hanging: convertInchesToTwip(0.25),
    },
  });
}

// Section with proper legal formatting
export function createLegalSection(
  romanNumeral: string,
  title: string,
  content: string[]
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Section heading
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${romanNumeral}. ${title}`,
          font: COURT_FORMATTING.font,
          size: COURT_FORMATTING.fontSize,
          bold: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 360, after: 240, line: COURT_FORMATTING.lineSpacing },
    })
  );

  // Content paragraphs
  for (const paragraph of content) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: paragraph,
            font: COURT_FORMATTING.font,
            size: COURT_FORMATTING.fontSize,
          }),
        ],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { line: COURT_FORMATTING.lineSpacing, after: 240 },
        indent: { firstLine: convertInchesToTwip(0.5) },
      })
    );
  }

  return paragraphs;
}
