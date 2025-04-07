import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/connect';
import mongoose from 'mongoose';

// WARNING: This is a DEVELOPMENT-ONLY endpoint
// In production, this would be removed or heavily secured

export async function POST(request: NextRequest) {
  try {
    // Security check to ensure this only runs in development
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({
        error: 'This endpoint is only available in development mode',
      }, { status: 403 });
    }
    
    // Connect to the database
    await connectToDatabase();
    
    // Get all collections
    const collections = await mongoose.connection.db.collections();
    
    // Track cleared collections
    const clearedCollections = [];
    
    // Drop each collection
    for (const collection of collections) {
      await collection.deleteMany({});
      clearedCollections.push(collection.collectionName);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database cleared successfully',
      clearedCollections,
    });
  } catch (error) {
    console.error('Error clearing database:', error);
    return NextResponse.json({
      error: 'Failed to clear database',
      details: error.message,
    }, { status: 500 });
  }
}