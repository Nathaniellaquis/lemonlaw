import { NextRequest, NextResponse } from 'next/server';
import { getCollection, ObjectId } from '@/lib/mongodb';
import { RepairOrder } from '@/lib/types';

// GET /api/repair-orders - List repair orders (optionally filter by caseId)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');

    const collection = await getCollection<RepairOrder>('repairOrders');

    const query = caseId && ObjectId.isValid(caseId)
      ? { caseId: new ObjectId(caseId) }
      : {};

    const repairOrders = await collection.find(query).sort({ dateIn: 1 }).toArray();

    return NextResponse.json(
      repairOrders.map(ro => ({
        ...ro,
        _id: ro._id?.toString(),
        caseId: ro.caseId?.toString(),
      }))
    );
  } catch (error) {
    console.error('Error fetching repair orders:', error);
    return NextResponse.json({ error: 'Failed to fetch repair orders' }, { status: 500 });
  }
}

// Input for bulk insert
interface BulkRepairOrderInput {
  caseId: string;
  repairOrders: {
    roNumber?: string;
    dealership?: string;
    dateIn?: string;
    dateOut?: string;
    mileageIn?: number;
    mileageOut?: number;
    daysDown?: number;
    category?: string;
    customerConcern?: string;
    workPerformed?: string;
    partsReplaced?: string;
    resolved?: string;
  }[];
}

// POST /api/repair-orders - Create repair orders (bulk)
export async function POST(request: NextRequest) {
  try {
    const body: BulkRepairOrderInput = await request.json();

    if (!body.caseId || !ObjectId.isValid(body.caseId)) {
      return NextResponse.json({ error: 'Valid caseId is required' }, { status: 400 });
    }

    if (!body.repairOrders || body.repairOrders.length === 0) {
      return NextResponse.json({ error: 'At least one repair order is required' }, { status: 400 });
    }

    const collection = await getCollection('repairOrders');
    const caseObjectId = new ObjectId(body.caseId);

    // Create repair order documents
    const repairOrderDocs = body.repairOrders.map(ro => ({
      caseId: caseObjectId,
      roNumber: ro.roNumber || '',
      dealership: ro.dealership || '',
      dateIn: ro.dateIn || '',
      dateOut: ro.dateOut || '',
      mileageIn: ro.mileageIn || 0,
      mileageOut: ro.mileageOut || 0,
      daysDown: ro.daysDown || 0,
      category: ro.category || 'Other',
      customerConcern: ro.customerConcern || '',
      workPerformed: ro.workPerformed || '',
      partsReplaced: ro.partsReplaced || '',
      resolved: ro.resolved || 'No',
      createdAt: new Date(),
    }));

    const result = await collection.insertMany(repairOrderDocs);

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
    console.error('Error creating repair orders:', error);
    return NextResponse.json({ error: 'Failed to create repair orders' }, { status: 500 });
  }
}
