import { NextRequest, NextResponse } from 'next/server';
import { getCollection, ObjectId } from '@/lib/mongodb';
import { Attorney } from '@/lib/types';

// GET /api/attorneys - List all attorneys
export async function GET() {
  try {
    const collection = await getCollection<Attorney>('attorneys');
    const attorneys = await collection.find({}).sort({ name: 1 }).toArray();

    return NextResponse.json(
      attorneys.map(a => ({
        ...a,
        _id: a._id?.toString(),
      }))
    );
  } catch (error) {
    console.error('Error fetching attorneys:', error);
    return NextResponse.json({ error: 'Failed to fetch attorneys' }, { status: 500 });
  }
}

// POST /api/attorneys - Create a new attorney
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const collection = await getCollection<Attorney>('attorneys');

    const newAttorney: Attorney = {
      name: body.name,
      barNumber: body.barNumber,
      yearsOutOfLawSchool: body.yearsOutOfLawSchool,
      isParalegal: body.isParalegal || false,
      defaultRate: body.defaultRate,
      createdAt: new Date(),
    };

    const result = await collection.insertOne(newAttorney);

    return NextResponse.json({
      ...newAttorney,
      _id: result.insertedId.toString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating attorney:', error);
    return NextResponse.json({ error: 'Failed to create attorney' }, { status: 500 });
  }
}
