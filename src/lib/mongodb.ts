import { MongoClient, Db, Collection, ObjectId, Document as MongoDocument } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://base-template:base-template-password@base-template.wvuokia.mongodb.net/?retryWrites=true&w=majority&appName=base-template";
const MONGODB_DB = process.env.MONGODB_DB || 'lemonlaw';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db(MONGODB_DB);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCollection<T extends MongoDocument = any>(name: string): Promise<Collection<T>> {
  const { db } = await connectToDatabase();
  return db.collection<T>(name);
}

export { ObjectId };
