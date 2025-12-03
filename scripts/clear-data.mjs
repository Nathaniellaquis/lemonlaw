// Clear all data from MongoDB collections
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://base-template:base-template-password@base-template.wvuokia.mongodb.net/?retryWrites=true&w=majority&appName=base-template";
const MONGODB_DB = "lemonlaw";

async function clearData() {
  console.log("Connecting to MongoDB...");
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(MONGODB_DB);

    console.log("Clearing all collections...");

    // Clear all collections
    const collections = ['cases', 'repairOrders', 'billingEntries', 'costs', 'motions', 'attorneys'];

    for (const collectionName of collections) {
      const result = await db.collection(collectionName).deleteMany({});
      console.log(`  - ${collectionName}: deleted ${result.deletedCount} documents`);
    }

    console.log("\nAll data cleared! Database is now empty and ready for fresh data.");

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

clearData();
