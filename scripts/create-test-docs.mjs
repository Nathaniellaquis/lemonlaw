// Create test PDF and image documents for testing
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, HeadingLevel } from 'docx';
import fs from 'fs';
import path from 'path';

const testDocsDir = path.join(process.cwd(), 'test-docs');

// Ensure test-docs directory exists
if (!fs.existsSync(testDocsDir)) {
  fs.mkdirSync(testDocsDir, { recursive: true });
}

// Create a DOCX repair order document
async function createRepairOrderDocx() {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [new TextRun({ text: "TESLA SERVICE CENTER", bold: true, size: 32 })],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [new TextRun({ text: "REPAIR ORDER", bold: true, size: 28 })],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({ children: [new TextRun("")] }),

        // RO Info
        new Paragraph({ children: [new TextRun({ text: "REPAIR ORDER #: RO-92451", bold: true })] }),
        new Paragraph({ children: [new TextRun("SERVICE CENTER: Tesla Burlingame")] }),
        new Paragraph({ children: [new TextRun("DATE IN: June 5, 2024")] }),
        new Paragraph({ children: [new TextRun("DATE OUT: June 14, 2024")] }),
        new Paragraph({ children: [new TextRun("")] }),

        // Vehicle Info
        new Paragraph({ children: [new TextRun({ text: "VEHICLE INFORMATION", bold: true, underline: {} })] }),
        new Paragraph({ children: [new TextRun("Year: 2023")] }),
        new Paragraph({ children: [new TextRun("Make: Tesla")] }),
        new Paragraph({ children: [new TextRun("Model: Model 3")] }),
        new Paragraph({ children: [new TextRun("VIN: 5YJ3E1EA1NF123456")] }),
        new Paragraph({ children: [new TextRun("Mileage In: 28,750")] }),
        new Paragraph({ children: [new TextRun("Mileage Out: 28,750")] }),
        new Paragraph({ children: [new TextRun("")] }),

        // Customer Concern
        new Paragraph({ children: [new TextRun({ text: "CUSTOMER CONCERN:", bold: true, underline: {} })] }),
        new Paragraph({ children: [new TextRun("Vehicle making loud clunking noise from suspension when going over bumps. Front end feels loose and unstable at highway speeds. Customer states vehicle pulls to the right during braking.")] }),
        new Paragraph({ children: [new TextRun("")] }),

        // Work Performed
        new Paragraph({ children: [new TextRun({ text: "WORK PERFORMED:", bold: true, underline: {} })] }),
        new Paragraph({ children: [new TextRun("- Performed suspension inspection")] }),
        new Paragraph({ children: [new TextRun("- Found worn lower control arm bushings")] }),
        new Paragraph({ children: [new TextRun("- Upper ball joints showing excessive play")] }),
        new Paragraph({ children: [new TextRun("- Replaced front lower control arms (both sides)")] }),
        new Paragraph({ children: [new TextRun("- Replaced upper ball joints (both sides)")] }),
        new Paragraph({ children: [new TextRun("- Performed 4-wheel alignment")] }),
        new Paragraph({ children: [new TextRun("- Road tested 25 miles - no issues found")] }),
        new Paragraph({ children: [new TextRun("")] }),

        // Parts Replaced
        new Paragraph({ children: [new TextRun({ text: "PARTS REPLACED:", bold: true, underline: {} })] }),
        new Paragraph({ children: [new TextRun("- Front Lower Control Arm LH (1044567-00-B) - $425.00")] }),
        new Paragraph({ children: [new TextRun("- Front Lower Control Arm RH (1044568-00-B) - $425.00")] }),
        new Paragraph({ children: [new TextRun("- Upper Ball Joint LH (1038821-00-A) - $189.00")] }),
        new Paragraph({ children: [new TextRun("- Upper Ball Joint RH (1038822-00-A) - $189.00")] }),
        new Paragraph({ children: [new TextRun("")] }),

        new Paragraph({ children: [new TextRun({ text: "DAYS OUT OF SERVICE: 9", bold: true })] }),
        new Paragraph({ children: [new TextRun({ text: "CATEGORY: Suspension", bold: true })] }),
        new Paragraph({ children: [new TextRun({ text: "RESOLVED: No - Customer reports noise returned after 2 weeks", bold: true })] }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(testDocsDir, 'repair-order-sample.docx'), buffer);
  console.log('Created: repair-order-sample.docx');
}

// Create a DOCX billing statement
async function createBillingDocx() {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [new TextRun({ text: "CHEN & RODRIGUEZ LAW FIRM", bold: true, size: 32 })],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [new TextRun({ text: "BILLING STATEMENT", bold: true, size: 28 })],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({ children: [new TextRun("")] }),

        new Paragraph({ children: [new TextRun({ text: "Matter: Smith v. Tesla, Inc.", bold: true })] }),
        new Paragraph({ children: [new TextRun("Case No: 24CHCV01234")] }),
        new Paragraph({ children: [new TextRun("Statement Period: January - June 2024")] }),
        new Paragraph({ children: [new TextRun("")] }),

        new Paragraph({ children: [new TextRun({ text: "PROFESSIONAL SERVICES", bold: true, underline: {} })] }),
        new Paragraph({ children: [new TextRun("")] }),

        // Billing entries
        new Paragraph({ children: [new TextRun("01/15/2024 - Sarah Chen (Partner) - 2.0 hrs @ $695/hr = $1,390.00")] }),
        new Paragraph({ children: [new TextRun("   Initial client intake and case evaluation; reviewed purchase documents and repair history")] }),
        new Paragraph({ children: [new TextRun("")] }),

        new Paragraph({ children: [new TextRun("01/22/2024 - Sarah Chen (Partner) - 3.5 hrs @ $695/hr = $2,432.50")] }),
        new Paragraph({ children: [new TextRun("   Drafted demand letter to Tesla; researched Song-Beverly Act remedies")] }),
        new Paragraph({ children: [new TextRun("")] }),

        new Paragraph({ children: [new TextRun("02/05/2024 - Michael Rodriguez (Associate) - 4.0 hrs @ $495/hr = $1,980.00")] }),
        new Paragraph({ children: [new TextRun("   Legal research on civil penalty multiplier; reviewed similar Tesla lemon law cases")] }),
        new Paragraph({ children: [new TextRun("")] }),

        new Paragraph({ children: [new TextRun("02/20/2024 - Sarah Chen (Partner) - 1.5 hrs @ $695/hr = $1,042.50")] }),
        new Paragraph({ children: [new TextRun("   Telephone conference with Tesla counsel; discussed potential settlement")] }),
        new Paragraph({ children: [new TextRun("")] }),

        new Paragraph({ children: [new TextRun("03/10/2024 - Sarah Chen (Partner) - 4.0 hrs @ $695/hr = $2,780.00")] }),
        new Paragraph({ children: [new TextRun("   Prepared and filed Complaint; drafted Civil Cover Sheet; arranged service")] }),
        new Paragraph({ children: [new TextRun("")] }),

        new Paragraph({ children: [new TextRun("03/25/2024 - Michael Rodriguez (Associate) - 5.5 hrs @ $495/hr = $2,722.50")] }),
        new Paragraph({ children: [new TextRun("   Reviewed Tesla's Answer; prepared initial discovery requests including interrogatories and RFPs")] }),
        new Paragraph({ children: [new TextRun("")] }),

        new Paragraph({ children: [new TextRun("04/15/2024 - Sarah Chen (Partner) - 2.5 hrs @ $695/hr = $1,737.50")] }),
        new Paragraph({ children: [new TextRun("   Discovery meet and confer with opposing counsel; letter re: deficient responses")] }),
        new Paragraph({ children: [new TextRun("")] }),

        new Paragraph({ children: [new TextRun("05/01/2024 - Michael Rodriguez (Associate) - 6.0 hrs @ $495/hr = $2,970.00")] }),
        new Paragraph({ children: [new TextRun("   Drafted Motion to Compel Further Discovery Responses; researched case law")] }),
        new Paragraph({ children: [new TextRun("")] }),

        new Paragraph({ children: [new TextRun({ text: "═══════════════════════════════════════════", bold: false })] }),
        new Paragraph({ children: [new TextRun({ text: "SUMMARY", bold: true })] }),
        new Paragraph({ children: [new TextRun("Total Hours: 29.0")] }),
        new Paragraph({ children: [new TextRun("Sarah Chen (Partner): 13.5 hrs @ $695/hr = $9,382.50")] }),
        new Paragraph({ children: [new TextRun("Michael Rodriguez (Associate): 15.5 hrs @ $495/hr = $7,672.50")] }),
        new Paragraph({ children: [new TextRun("")] }),
        new Paragraph({ children: [new TextRun({ text: "TOTAL FEES: $17,055.00", bold: true, size: 28 })] }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(testDocsDir, 'billing-statement-sample.docx'), buffer);
  console.log('Created: billing-statement-sample.docx');
}

// Run all creation functions
async function main() {
  console.log('Creating test documents...\n');

  await createRepairOrderDocx();
  await createBillingDocx();

  console.log('\n✓ All test documents created in test-docs/ folder');
  console.log('\nFiles available:');
  console.log('  - sample-repair-orders.csv (CSV with 5 repair orders)');
  console.log('  - sample-billing.csv (CSV with 12 billing entries)');
  console.log('  - repair-order-sample.docx (DOCX repair order)');
  console.log('  - billing-statement-sample.docx (DOCX billing statement)');
  console.log('  - repair-order-text.txt (Text file to screenshot for image testing)');
  console.log('\nFor image testing:');
  console.log('  Take a screenshot of repair-order-text.txt and upload the image');
}

main().catch(console.error);
