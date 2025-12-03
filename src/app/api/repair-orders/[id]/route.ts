import { NextRequest, NextResponse } from 'next/server';
import { getCollection, ObjectId } from '@/lib/mongodb';
import { RepairOrder, RepairOrderInput } from '@/lib/types';

// GET /api/repair-orders/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid repair order ID' }, { status: 400 });
    }

    const collection = await getCollection<RepairOrder>('repairOrders');
    const repairOrder = await collection.findOne({ _id: new ObjectId(id) });

    if (!repairOrder) {
      return NextResponse.json({ error: 'Repair order not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...repairOrder,
      _id: repairOrder._id?.toString(),
      caseId: repairOrder.caseId.toString(),
    });
  } catch (error) {
    console.error('Error fetching repair order:', error);
    return NextResponse.json({ error: 'Failed to fetch repair order' }, { status: 500 });
  }
}

// PUT /api/repair-orders/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid repair order ID' }, { status: 400 });
    }

    const body: Partial<RepairOrderInput> = await request.json();
    const collection = await getCollection<RepairOrder>('repairOrders');

    const updateData: Partial<RepairOrder> = {};

    if (body.roNumber) updateData.roNumber = body.roNumber;
    if (body.dealership) updateData.dealership = body.dealership;
    if (body.dateIn) updateData.dateIn = new Date(body.dateIn);
    if (body.dateOut) updateData.dateOut = new Date(body.dateOut);
    if (body.mileageIn !== undefined) updateData.mileageIn = body.mileageIn;
    if (body.mileageOut !== undefined) updateData.mileageOut = body.mileageOut;
    if (body.daysDown !== undefined) updateData.daysDown = body.daysDown;
    if (body.techNumber !== undefined) updateData.techNumber = body.techNumber;
    if (body.category) updateData.category = body.category;
    if (body.customerConcern) updateData.customerConcern = body.customerConcern;
    if (body.workPerformed) updateData.workPerformed = body.workPerformed;
    if (body.partsReplaced !== undefined) updateData.partsReplaced = body.partsReplaced;
    if (body.resolved) updateData.resolved = body.resolved;
    if (body.rawText) updateData.rawText = body.rawText;
    if (body.sourceFile) updateData.sourceFile = body.sourceFile;

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ error: 'Repair order not found' }, { status: 404 });
    }

    // Update case's updatedAt
    const casesCollection = await getCollection('cases');
    await casesCollection.updateOne(
      { _id: result.caseId },
      { $set: { updatedAt: new Date() } }
    );

    return NextResponse.json({
      ...result,
      _id: result._id?.toString(),
      caseId: result.caseId.toString(),
    });
  } catch (error) {
    console.error('Error updating repair order:', error);
    return NextResponse.json({ error: 'Failed to update repair order' }, { status: 500 });
  }
}

// DELETE /api/repair-orders/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid repair order ID' }, { status: 400 });
    }

    const collection = await getCollection<RepairOrder>('repairOrders');

    // Get the repair order to find the case ID
    const repairOrder = await collection.findOne({ _id: new ObjectId(id) });

    if (!repairOrder) {
      return NextResponse.json({ error: 'Repair order not found' }, { status: 404 });
    }

    await collection.deleteOne({ _id: new ObjectId(id) });

    // Update case's updatedAt
    const casesCollection = await getCollection('cases');
    await casesCollection.updateOne(
      { _id: repairOrder.caseId },
      { $set: { updatedAt: new Date() } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting repair order:', error);
    return NextResponse.json({ error: 'Failed to delete repair order' }, { status: 500 });
  }
}
