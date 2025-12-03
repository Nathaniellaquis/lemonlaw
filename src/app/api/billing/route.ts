import { NextRequest, NextResponse } from 'next/server';
import { getCollection, ObjectId } from '@/lib/mongodb';
import { BillingEntry } from '@/lib/types';

// GET /api/billing - List billing entries (optionally filter by caseId)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');

    const collection = await getCollection<BillingEntry>('billingEntries');

    const query = caseId && ObjectId.isValid(caseId)
      ? { caseId: new ObjectId(caseId) }
      : {};

    const entries = await collection.find(query).sort({ date: -1 }).toArray();

    return NextResponse.json(
      entries.map(e => ({
        ...e,
        _id: e._id?.toString(),
        caseId: e.caseId?.toString(),
      }))
    );
  } catch (error) {
    console.error('Error fetching billing entries:', error);
    return NextResponse.json({ error: 'Failed to fetch billing entries' }, { status: 500 });
  }
}

// Input for bulk insert
interface BulkBillingInput {
  caseId: string;
  billingEntries: {
    date?: string;
    attorney?: string;
    hours?: number;
    rate?: number;
    description?: string;
    type?: string;
  }[];
}

// POST /api/billing - Create billing entries (bulk)
export async function POST(request: NextRequest) {
  try {
    const body: BulkBillingInput = await request.json();

    if (!body.caseId || !ObjectId.isValid(body.caseId)) {
      return NextResponse.json({ error: 'Valid caseId is required' }, { status: 400 });
    }

    if (!body.billingEntries || body.billingEntries.length === 0) {
      return NextResponse.json({ error: 'At least one billing entry is required' }, { status: 400 });
    }

    const collection = await getCollection('billingEntries');
    const caseObjectId = new ObjectId(body.caseId);

    // Create billing entry documents
    const billingDocs = body.billingEntries.map(b => ({
      caseId: caseObjectId,
      date: b.date || '',
      attorney: b.attorney || '',
      hours: b.hours || 0,
      rate: b.rate || 0,
      amount: (b.hours || 0) * (b.rate || 0),
      description: b.description || '',
      type: b.type || 'Billable',
      isReduced: false,
      createdAt: new Date(),
    }));

    const result = await collection.insertMany(billingDocs);

    // Update case's updatedAt
    const casesCollection = await getCollection('cases');
    await casesCollection.updateOne(
      { _id: caseObjectId },
      { $set: { updatedAt: new Date() } }
    );

    return NextResponse.json({
      success: true,
      insertedCount: result.insertedCount,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating billing entries:', error);
    return NextResponse.json({ error: 'Failed to create billing entries' }, { status: 500 });
  }
}
