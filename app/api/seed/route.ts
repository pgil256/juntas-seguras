import { NextRequest, NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/db/seed';

// POST /api/seed - Seed the database with initial data
// This is only for development purposes
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Seeding is not allowed in production' },
      { status: 403 }
    );
  }
  
  try {
    await seedDatabase();
    
    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully'
    });
  } catch (error) {
    console.error('Error seeding database:', error);
    return NextResponse.json(
      { error: 'Failed to seed database' },
      { status: 500 }
    );
  }
}