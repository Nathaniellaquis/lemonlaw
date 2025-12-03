import { NextRequest, NextResponse } from 'next/server';
import { getCollection, ObjectId } from '@/lib/mongodb';
import { Case, CaseInput } from '@/lib/types';

// GET /api/cases - List all cases with stats
export async function GET() {
  try {
    const casesCollection = await getCollection<Case>('cases');
    const repairOrdersCollection = await getCollection('repairOrders');
    const billingCollection = await getCollection('billingEntries');

    const cases = await casesCollection.find({}).sort({ updatedAt: -1 }).toArray();

    // Add stats to each case
    const casesWithStats = await Promise.all(
      cases.map(async (c) => {
        const [repairOrders, billing] = await Promise.all([
          repairOrdersCollection.find({ caseId: c._id }).toArray(),
          billingCollection.find({ caseId: c._id }).toArray(),
        ]);

        return {
          ...c,
          _id: c._id?.toString(),
          repairOrderCount: repairOrders.length,
          totalDaysDown: repairOrders.reduce((sum, ro) => sum + (ro.daysDown || 0), 0),
          totalHours: billing.reduce((sum, b) => sum + (b.hours || 0), 0),
          totalFees: billing.reduce((sum, b) => sum + ((b.hours || 0) * (b.rate || 0)), 0),
        };
      })
    );

    return NextResponse.json(casesWithStats);
  } catch (error) {
    console.error('Error fetching cases:', error);
    return NextResponse.json({ error: 'Failed to fetch cases' }, { status: 500 });
  }
}

// POST /api/cases - Create a new case
export async function POST(request: NextRequest) {
  try {
    const body: CaseInput = await request.json();

    const casesCollection = await getCollection<Case>('cases');

    // Check for duplicate case number
    const existing = await casesCollection.findOne({ caseNumber: body.caseNumber });
    if (existing) {
      return NextResponse.json({ error: 'Case number already exists' }, { status: 400 });
    }

    const newCase: Case = {
      caseNumber: body.caseNumber,
      clientName: body.clientName,
      defendant: body.defendant || '',
      vehicleYear: body.vehicleYear,
      vehicleMake: body.vehicleMake,
      vehicleModel: body.vehicleModel,
      vin: body.vin || '',
      purchaseDate: body.purchaseDate || '',
      purchasePrice: body.purchasePrice || 0,
      status: body.status || 'Active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await casesCollection.insertOne(newCase);

    return NextResponse.json({
      ...newCase,
      _id: result.insertedId.toString()
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating case:', error);
    return NextResponse.json({ error: 'Failed to create case' }, { status: 500 });
  }
}
