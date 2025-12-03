import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { LaffeyMatrix } from '@/lib/types';

// GET /api/laffey-matrix - Get all Laffey Matrix periods
export async function GET() {
  try {
    const collection = await getCollection<LaffeyMatrix>('laffeyMatrix');
    const matrix = await collection.find({}).sort({ periodStart: -1 }).toArray();

    return NextResponse.json(
      matrix.map(m => ({
        ...m,
        _id: m._id?.toString(),
      }))
    );
  } catch (error) {
    console.error('Error fetching Laffey Matrix:', error);
    return NextResponse.json({ error: 'Failed to fetch Laffey Matrix' }, { status: 500 });
  }
}
