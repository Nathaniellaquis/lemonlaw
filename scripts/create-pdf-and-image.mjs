// Create PDF and PNG test documents
import PDFDocument from 'pdfkit';
import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';

const testDocsDir = path.join(process.cwd(), 'test-docs');

// Ensure test-docs directory exists
if (!fs.existsSync(testDocsDir)) {
  fs.mkdirSync(testDocsDir, { recursive: true });
}

// Create PDF repair order
function createRepairOrderPDF() {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(path.join(testDocsDir, 'repair-order-sample.pdf'));
    doc.pipe(stream);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('TESLA SERVICE CENTER', { align: 'center' });
    doc.fontSize(16).text('REPAIR ORDER', { align: 'center' });
    doc.moveDown();

    // Line
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // RO Info
    doc.fontSize(12).font('Helvetica-Bold').text('REPAIR ORDER #: RO-45892');
    doc.font('Helvetica').text('SERVICE CENTER: Tesla Sunnyvale');
    doc.text('DATE IN: August 12, 2024');
    doc.text('DATE OUT: August 20, 2024');
    doc.moveDown();

    // Vehicle Info
    doc.font('Helvetica-Bold').text('VEHICLE INFORMATION');
    doc.font('Helvetica');
    doc.text('Year: 2023');
    doc.text('Make: Tesla');
    doc.text('Model: Model 3');
    doc.text('VIN: 5YJ3E1EA1NF123456');
    doc.text('Mileage In: 31,200');
    doc.text('Mileage Out: 31,200');
    doc.moveDown();

    // Customer Concern
    doc.font('Helvetica-Bold').text('CUSTOMER CONCERN:');
    doc.font('Helvetica');
    doc.text('Air conditioning blowing warm air only. Climate control shows cooling engaged but no cold air from vents. Issue started 3 days ago and has not improved. Customer also reports rattling noise from dashboard area when A/C is on.', {
      width: 500,
      align: 'left'
    });
    doc.moveDown();

    // Work Performed
    doc.font('Helvetica-Bold').text('WORK PERFORMED:');
    doc.font('Helvetica');
    doc.text('• Verified customer concern - A/C not cooling');
    doc.text('• Checked refrigerant levels - found low');
    doc.text('• Performed leak detection - found leak at condenser');
    doc.text('• Replaced A/C condenser assembly');
    doc.text('• Recharged A/C system with R-1234yf refrigerant');
    doc.text('• Replaced blower motor (source of rattle)');
    doc.text('• Verified proper operation - A/C cooling to 42°F');
    doc.moveDown();

    // Parts Replaced
    doc.font('Helvetica-Bold').text('PARTS REPLACED:');
    doc.font('Helvetica');
    doc.text('• A/C Condenser Assembly (1507176-00-A) - $892.00');
    doc.text('• Blower Motor (6007352-00-A) - $345.00');
    doc.text('• R-1234yf Refrigerant (2 lbs) - $180.00');
    doc.moveDown();

    // Summary
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();
    doc.font('Helvetica-Bold');
    doc.text('DAYS OUT OF SERVICE: 8');
    doc.text('CATEGORY: HVAC');
    doc.text('RESOLVED: Yes');
    doc.moveDown();
    doc.text('TOTAL: $2,847.00 (Covered under warranty)');

    doc.end();
    stream.on('finish', () => {
      console.log('Created: repair-order-sample.pdf');
      resolve();
    });
  });
}

// Create second PDF - billing statement
function createBillingPDF() {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(path.join(testDocsDir, 'billing-statement-sample.pdf'));
    doc.pipe(stream);

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text('CHEN & RODRIGUEZ LAW FIRM', { align: 'center' });
    doc.fontSize(14).text('ATTORNEYS AT LAW', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('1234 Legal Center Drive, Suite 500, Los Angeles, CA 90025', { align: 'center' });
    doc.text('(310) 555-0199 | billing@chenrodriguezlaw.com', { align: 'center' });
    doc.moveDown();

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    doc.fontSize(14).font('Helvetica-Bold').text('BILLING STATEMENT');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text('Client: John Smith');
    doc.text('Matter: Smith v. Tesla, Inc.');
    doc.text('Case No: 24CHCV01234');
    doc.text('Statement Date: September 15, 2024');
    doc.text('Statement Period: July - September 2024');
    doc.moveDown();

    doc.font('Helvetica-Bold').text('PROFESSIONAL SERVICES');
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    const entries = [
      { date: '07/08/2024', atty: 'Sarah Chen', hrs: '2.5', rate: '695', desc: 'Reviewed discovery responses from Tesla; identified deficiencies' },
      { date: '07/15/2024', atty: 'Michael Rodriguez', hrs: '4.0', rate: '495', desc: 'Prepared motion to compel further responses; legal research' },
      { date: '07/22/2024', atty: 'Sarah Chen', hrs: '1.5', rate: '695', desc: 'Court appearance for motion to compel hearing' },
      { date: '08/01/2024', atty: 'Michael Rodriguez', hrs: '3.5', rate: '495', desc: 'Reviewed supplemental discovery; prepared deposition outline' },
      { date: '08/12/2024', atty: 'Sarah Chen', hrs: '6.0', rate: '695', desc: 'Deposition of Tesla service manager (full day)' },
      { date: '08/20/2024', atty: 'Michael Rodriguez', hrs: '2.5', rate: '495', desc: 'Summarized deposition transcript; identified key admissions' },
      { date: '09/05/2024', atty: 'Sarah Chen', hrs: '3.0', rate: '695', desc: 'Settlement conference preparation; demand letter update' },
      { date: '09/10/2024', atty: 'Sarah Chen', hrs: '4.0', rate: '695', desc: 'Mandatory settlement conference attendance' },
    ];

    doc.font('Helvetica').fontSize(9);
    entries.forEach(e => {
      const amount = (parseFloat(e.hrs) * parseFloat(e.rate)).toFixed(2);
      doc.text(`${e.date}  ${e.atty}  ${e.hrs} hrs @ $${e.rate}/hr = $${amount}`);
      doc.text(`   ${e.desc}`, { indent: 20 });
      doc.moveDown(0.3);
    });

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Summary
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('SUMMARY');
    doc.font('Helvetica');
    doc.text('Sarah Chen (Partner): 17.0 hrs @ $695/hr = $11,815.00');
    doc.text('Michael Rodriguez (Associate): 10.0 hrs @ $495/hr = $4,950.00');
    doc.moveDown();
    doc.text('Total Hours: 27.0');
    doc.fontSize(14).font('Helvetica-Bold').text('TOTAL FEES: $16,765.00');

    doc.end();
    stream.on('finish', () => {
      console.log('Created: billing-statement-sample.pdf');
      resolve();
    });
  });
}

// Create PNG image of a repair order (simulating a scanned document)
function createRepairOrderImage() {
  const width = 800;
  const height = 1000;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Add slight texture to simulate scan
  ctx.fillStyle = '#fafafa';
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.fillStyle = '#000000';

  // Header
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('TESLA SERVICE CENTER', width / 2, 50);
  ctx.font = 'bold 22px Arial';
  ctx.fillText('REPAIR ORDER', width / 2, 80);

  // Line
  ctx.beginPath();
  ctx.moveTo(50, 100);
  ctx.lineTo(750, 100);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = 'bold 14px Arial';
  let y = 130;

  ctx.fillText('REPAIR ORDER #: RO-67123', 50, y);
  ctx.font = '14px Arial';
  y += 25;
  ctx.fillText('SERVICE CENTER: Tesla Palo Alto', 50, y);
  y += 20;
  ctx.fillText('DATE IN: September 25, 2024', 50, y);
  y += 20;
  ctx.fillText('DATE OUT: October 2, 2024', 50, y);
  y += 35;

  ctx.font = 'bold 14px Arial';
  ctx.fillText('VEHICLE INFORMATION', 50, y);
  ctx.font = '14px Arial';
  y += 22;
  ctx.fillText('Year: 2023    Make: Tesla    Model: Model 3', 50, y);
  y += 20;
  ctx.fillText('VIN: 5YJ3E1EA1NF123456', 50, y);
  y += 20;
  ctx.fillText('Mileage In: 35,800    Mileage Out: 35,800', 50, y);
  y += 35;

  ctx.font = 'bold 14px Arial';
  ctx.fillText('CUSTOMER CONCERN:', 50, y);
  ctx.font = '14px Arial';
  y += 22;
  ctx.fillText('Vehicle displays multiple warning messages including "Cruise Control Disabled",', 50, y);
  y += 18;
  ctx.fillText('"Forward Collision Unavailable", and "Autopilot Unavailable". Warnings appear', 50, y);
  y += 18;
  ctx.fillText('immediately upon starting the vehicle and do not clear. Customer unable to use', 50, y);
  y += 18;
  ctx.fillText('any driver assistance features.', 50, y);
  y += 35;

  ctx.font = 'bold 14px Arial';
  ctx.fillText('WORK PERFORMED:', 50, y);
  ctx.font = '14px Arial';
  y += 22;
  ctx.fillText('• Performed full diagnostic scan', 50, y);
  y += 18;
  ctx.fillText('• Found fault codes related to front radar sensor', 50, y);
  y += 18;
  ctx.fillText('• Inspected radar sensor - found damaged connector', 50, y);
  y += 18;
  ctx.fillText('• Replaced front radar sensor assembly', 50, y);
  y += 18;
  ctx.fillText('• Calibrated ADAS cameras and sensors', 50, y);
  y += 18;
  ctx.fillText('• Software update to latest version', 50, y);
  y += 18;
  ctx.fillText('• Road test verified all systems operational', 50, y);
  y += 35;

  ctx.font = 'bold 14px Arial';
  ctx.fillText('PARTS REPLACED:', 50, y);
  ctx.font = '14px Arial';
  y += 22;
  ctx.fillText('• Front Radar Sensor Assembly (1137268-00-C) - $1,245.00', 50, y);
  y += 35;

  // Summary box
  ctx.beginPath();
  ctx.moveTo(50, y);
  ctx.lineTo(750, y);
  ctx.stroke();
  y += 25;

  ctx.font = 'bold 16px Arial';
  ctx.fillText('DAYS OUT OF SERVICE: 7', 50, y);
  y += 25;
  ctx.fillText('CATEGORY: Electrical / ADAS', 50, y);
  y += 25;
  ctx.fillText('RESOLVED: No - Warnings returned after 1 week', 50, y);
  y += 35;

  ctx.font = 'bold 14px Arial';
  ctx.fillText('TOTAL: $1,675.00 (Covered under warranty)', 50, y);

  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(testDocsDir, 'repair-order-scan.png'), buffer);
  console.log('Created: repair-order-scan.png');
}

// Create second image - handwritten style notes
function createHandwrittenNotesImage() {
  const width = 800;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Slightly off-white background (like paper)
  ctx.fillStyle = '#fffef5';
  ctx.fillRect(0, 0, width, height);

  // Add paper lines
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  for (let y = 50; y < height; y += 30) {
    ctx.beginPath();
    ctx.moveTo(50, y);
    ctx.lineTo(750, y);
    ctx.stroke();
  }

  ctx.fillStyle = '#1a1a1a';
  ctx.font = '18px Georgia';

  let y = 70;
  ctx.fillText('Repair Order Notes - RO-88456', 60, y);
  y += 35;
  ctx.fillText('Date: October 15, 2024', 60, y);
  y += 35;
  ctx.fillText('Tesla Model 3 - VIN: 5YJ3E1EA1NF123456', 60, y);
  y += 35;
  ctx.fillText('Mileage: 38,500', 60, y);
  y += 45;

  ctx.font = 'bold 18px Georgia';
  ctx.fillText('Customer States:', 60, y);
  ctx.font = '18px Georgia';
  y += 35;
  ctx.fillText('- Battery range dropped to 150 miles (was 270)', 60, y);
  y += 30;
  ctx.fillText('- Charging takes much longer than before', 60, y);
  y += 30;
  ctx.fillText('- "Battery needs service" warning appeared', 60, y);
  y += 45;

  ctx.font = 'bold 18px Georgia';
  ctx.fillText('Work Done:', 60, y);
  ctx.font = '18px Georgia';
  y += 35;
  ctx.fillText('- Ran full battery diagnostic', 60, y);
  y += 30;
  ctx.fillText('- Found 12 degraded cells in pack', 60, y);
  y += 30;
  ctx.fillText('- Replaced high voltage battery pack', 60, y);
  y += 45;

  ctx.font = 'bold 18px Georgia';
  ctx.fillText('Days in shop: 11', 60, y);
  y += 35;
  ctx.fillText('Category: Battery', 60, y);
  y += 35;
  ctx.fillText('Resolved: Yes', 60, y);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(testDocsDir, 'repair-notes-photo.png'), buffer);
  console.log('Created: repair-notes-photo.png');
}

async function main() {
  console.log('Creating PDF and image test documents...\n');

  await createRepairOrderPDF();
  await createBillingPDF();
  createRepairOrderImage();
  createHandwrittenNotesImage();

  console.log('\n✓ All documents created!\n');
  console.log('Test files available in test-docs/:');
  console.log('');
  console.log('  CSV FILES (direct parse):');
  console.log('    sample-repair-orders.csv');
  console.log('    sample-billing.csv');
  console.log('');
  console.log('  DOCX FILES (mammoth parse):');
  console.log('    repair-order-sample.docx');
  console.log('    billing-statement-sample.docx');
  console.log('');
  console.log('  PDF FILES (pdf-parse):');
  console.log('    repair-order-sample.pdf');
  console.log('    billing-statement-sample.pdf');
  console.log('');
  console.log('  IMAGE FILES (AI vision):');
  console.log('    repair-order-scan.png');
  console.log('    repair-notes-photo.png');
}

main().catch(console.error);
