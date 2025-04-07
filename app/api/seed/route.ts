import { NextRequest, NextResponse } from 'next/server';

// POST /api/seed
// Seed functionality has been removed
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { message: 'Seed functionality has been removed' },
    { status: 200 }
  );
}