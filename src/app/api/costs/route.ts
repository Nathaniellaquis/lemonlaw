import { NextRequest, NextResponse } from 'next/server';
import { getCollection, ObjectId } from '@/lib/mongodb';
import { Cost, CostInput } from '@/lib/types';

// GET /api/costs - List costs (optionally filter by caseId)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');

    const collection = await getCollection<Cost>('costs');

    const query = caseId && ObjectId.isValid(caseId)
      ? { caseId: new ObjectId(caseId) }
      : {};

    const costs = await collection.find(query).sort({ date: -1 }).toArray();

    return NextResponse.json(
      costs.map(c => ({
        ...c,
        _id: c._id?.toString(),
        caseId: c.caseId.toString(),
      }))
    );
  } catch (error) {
    console.error('Error fetching costs:', error);
    return NextResponse.json({ error: 'Failed to fetch costs' }, { status: 500 });
  }
}

// POST /api/costs - Create a new cost entry
export async function POST(request: NextRequest) {
  try {
    const body: CostInput = await request.json();

    if (!body.caseId || !ObjectId.isValid(body.caseId)) {
      return NextResponse.json({ error: 'Valid caseId is required' }, { status: 400 });
    }

    const collection = await getCollection<Cost>('costs');

    const newCost: Cost = {
      caseId: new ObjectId(body.caseId),
      date: new Date(body.date),
      vendor: body.vendor,
      reference: body.reference,
      description: body.description,
      category: body.category,
      amount: body.amount,
      createdAt: new Date(),
    };

    const result = await collection.insertOne(newCost);

    // Update case's updatedAt
    const casesCollection = await getCollection('cases');
    await casesCollection.updateOne(
      { _id: new ObjectId(body.caseId) },
      { $set: { updatedAt: new Date() } }
    );

    return NextResponse.json({
      ...newCost,
      _id: result.insertedId.toString(),
      caseId: body.caseId,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating cost:', error);
    return NextResponse.json({ error: 'Failed to create cost' }, { status: 500 });
  }
}
