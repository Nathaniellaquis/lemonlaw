import { MongoClient } from 'mongodb';

const MONGODB_URI = "mongodb+srv://base-template:base-template-password@base-template.wvuokia.mongodb.net/?retryWrites=true&w=majority&appName=base-template";
const DB_NAME = "lemonlaw";

async function setup() {
  console.log("🔌 Connecting to MongoDB Atlas...");
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected successfully!\n");

    const db = client.db(DB_NAME);

    // List existing databases
    const adminDb = client.db().admin();
    const { databases } = await adminDb.listDatabases();
    console.log("📚 Existing databases:");
    databases.forEach(d => console.log(`   - ${d.name}`));
    console.log("");

    // Create collections with schema validation
    const collections = ['cases', 'repairOrders', 'billingEntries', 'costs', 'attorneys', 'laffeyMatrix', 'motions'];

    console.log(`📁 Setting up collections in '${DB_NAME}'...`);
    for (const collName of collections) {
      try {
        await db.createCollection(collName);
        console.log(`   ✅ Created: ${collName}`);
      } catch (e) {
        if (e.code === 48) { // Collection already exists
          console.log(`   ⏭️  Exists: ${collName}`);
        } else {
          throw e;
        }
      }
    }
    console.log("");

    // Create indexes
    console.log("🔍 Creating indexes...");

    // Cases - unique case number
    await db.collection('cases').createIndex({ caseNumber: 1 }, { unique: true });
    console.log("   ✅ cases.caseNumber (unique)");

    // Reference indexes
    await db.collection('repairOrders').createIndex({ caseId: 1 });
    console.log("   ✅ repairOrders.caseId");

    await db.collection('billingEntries').createIndex({ caseId: 1 });
    console.log("   ✅ billingEntries.caseId");

    await db.collection('costs').createIndex({ caseId: 1 });
    console.log("   ✅ costs.caseId");

    await db.collection('motions').createIndex({ caseId: 1 });
    console.log("   ✅ motions.caseId");

    // Date indexes
    await db.collection('repairOrders').createIndex({ dateIn: 1 });
    console.log("   ✅ repairOrders.dateIn");

    await db.collection('billingEntries').createIndex({ date: 1 });
    console.log("   ✅ billingEntries.date");

    await db.collection('laffeyMatrix').createIndex({ periodStart: 1, periodEnd: 1 });
    console.log("   ✅ laffeyMatrix.periodStart + periodEnd");
    console.log("");

    // Seed Laffey Matrix data (2024-2025 rates)
    console.log("📊 Seeding Laffey Matrix data...");
    const laffeyData = [
      {
        periodStart: new Date('2024-06-01'),
        periodEnd: new Date('2025-05-31'),
        adjustmentFactor: 1.0,
        paralegalRate: 185,
        tier1to3Rate: 402,      // 1-3 years out of law school
        tier4to7Rate: 492,      // 4-7 years
        tier8to10Rate: 585,     // 8-10 years
        tier11to19Rate: 680,    // 11-19 years
        tier20PlusRate: 822,    // 20+ years
        createdAt: new Date()
      },
      {
        periodStart: new Date('2023-06-01'),
        periodEnd: new Date('2024-05-31'),
        adjustmentFactor: 1.0,
        paralegalRate: 178,
        tier1to3Rate: 385,
        tier4to7Rate: 472,
        tier8to10Rate: 561,
        tier11to19Rate: 652,
        tier20PlusRate: 788,
        createdAt: new Date()
      }
    ];

    // Clear existing and insert
    await db.collection('laffeyMatrix').deleteMany({});
    const laffeyResult = await db.collection('laffeyMatrix').insertMany(laffeyData);
    console.log(`   ✅ Inserted ${laffeyResult.insertedCount} Laffey Matrix periods`);
    console.log("");

    // Create a sample attorney
    console.log("👨‍⚖️ Creating sample attorney...");
    await db.collection('attorneys').deleteMany({});
    const attorneyResult = await db.collection('attorneys').insertOne({
      name: "Sample Attorney",
      barNumber: "123456",
      yearsOutOfLawSchool: 8,
      isParalegal: false,
      defaultRate: 450,
      createdAt: new Date()
    });
    console.log(`   ✅ Created attorney: ${attorneyResult.insertedId}`);
    console.log("");

    // Create a sample case
    console.log("📋 Creating sample case...");
    await db.collection('cases').deleteMany({});
    const caseResult = await db.collection('cases').insertOne({
      caseNumber: "24TEST00001",
      clientName: "Test Client",
      vehicleVIN: "1HGCV1F34PA000001",
      vehicleMake: "Honda",
      vehicleModel: "Accord",
      vehicleYear: 2023,
      purchaseDate: new Date('2023-03-15'),
      purchasePrice: 32500.00,
      warrantyType: "Basic",
      warrantyExpires: new Date('2026-03-15'),
      status: "Active",
      defendant: {
        name: "American Honda Motor Co., Inc.",
        type: "Manufacturer"
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`   ✅ Created case: ${caseResult.insertedId}`);

    // Add a sample repair order
    const repairResult = await db.collection('repairOrders').insertOne({
      caseId: caseResult.insertedId,
      roNumber: "RO-2024-001",
      dealership: "Test Honda Dealership",
      dateIn: new Date('2024-01-15'),
      dateOut: new Date('2024-01-18'),
      mileageIn: 15000,
      mileageOut: 15005,
      daysDown: 3,
      techNumber: "T101",
      category: "Engine",
      customerConcern: "Check engine light on, rough idle",
      workPerformed: "Diagnosed misfire condition. Replaced ignition coils and spark plugs.",
      partsReplaced: "4x Ignition Coils, 4x Spark Plugs",
      resolved: "Partial",
      rawText: "Sample raw OCR text from repair order document",
      sourceFile: "uploads/ro-2024-001.pdf",
      createdAt: new Date()
    });
    console.log(`   ✅ Created repair order: ${repairResult.insertedId}`);
    console.log("");

    // Final summary
    console.log("🎉 Setup complete! Summary:");
    for (const collName of collections) {
      const count = await db.collection(collName).countDocuments();
      console.log(`   ${collName}: ${count} documents`);
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
    console.log("\n🔌 Connection closed.");
  }
}

setup();
