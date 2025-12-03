import { NextRequest, NextResponse } from 'next/server';
import { getCollection, ObjectId } from '@/lib/mongodb';
import { Case, CaseInput } from '@/lib/types';

// GET /api/cases/[id] - Get a single case
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid case ID' }, { status: 400 });
    }

    const casesCollection = await getCollection<Case>('cases');
    const caseDoc = await casesCollection.findOne({ _id: new ObjectId(id) });

    if (!caseDoc) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...caseDoc,
      _id: caseDoc._id?.toString(),
    });
  } catch (error) {
    console.error('Error fetching case:', error);
    return NextResponse.json({ error: 'Failed to fetch case' }, { status: 500 });
  }
}

// PUT /api/cases/[id] - Update a case
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid case ID' }, { status: 400 });
    }

    const body: Partial<CaseInput> = await request.json();
    const casesCollection = await getCollection<Case>('cases');

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Map all fields
    if (body.caseNumber !== undefined) updateData.caseNumber = body.caseNumber;
    if (body.clientName !== undefined) updateData.clientName = body.clientName;
    if (body.defendant !== undefined) updateData.defendant = body.defendant;
    if (body.vehicleYear !== undefined) updateData.vehicleYear = body.vehicleYear;
    if (body.vehicleMake !== undefined) updateData.vehicleMake = body.vehicleMake;
    if (body.vehicleModel !== undefined) updateData.vehicleModel = body.vehicleModel;
    if (body.vin !== undefined) updateData.vin = body.vin;
    if (body.purchaseDate !== undefined) updateData.purchaseDate = body.purchaseDate;
    if (body.purchasePrice !== undefined) updateData.purchasePrice = body.purchasePrice;
    if (body.status !== undefined) updateData.status = body.status;

    const result = await casesCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...result,
      _id: result._id?.toString()
    });
  } catch (error) {
    console.error('Error updating case:', error);
    return NextResponse.json({ error: 'Failed to update case' }, { status: 500 });
  }
}

// DELETE /api/cases/[id] - Delete a case and all related data
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid case ID' }, { status: 400 });
    }

    const objectId = new ObjectId(id);

    // Delete all related data first
    const [
      casesCollection,
      repairOrdersCollection,
      billingCollection,
    ] = await Promise.all([
      getCollection<Case>('cases'),
      getCollection('repairOrders'),
      getCollection('billingEntries'),
    ]);

    await Promise.all([
      repairOrdersCollection.deleteMany({ caseId: objectId }),
      billingCollection.deleteMany({ caseId: objectId }),
    ]);

    const result = await casesCollection.deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting case:', error);
    return NextResponse.json({ error: 'Failed to delete case' }, { status: 500 });
  }
}
