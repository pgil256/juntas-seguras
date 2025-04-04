import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import connectToDatabase from '@/lib/db/connect';
import getUserModel from '@/lib/db/models/user';

// POST /api/auth/register - Register a new user
export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();
    
    // Simple validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }
    
    // Connect to database
    await connectToDatabase();
    
    // Get user model
    const UserModel = getUserModel();
    
    // Check if user already exists
    const existingUser = await UserModel.findOne({ email });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }
    
    // Hash the password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create the user
    const newUser = await UserModel.create({
      id: uuidv4(),
      name,
      email,
      hashedPassword: hashedPassword,
      createdAt: new Date().toISOString(),
      pools: []
    });
    
    // Don't return the password in the response
    const userResponse = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      createdAt: newUser.createdAt
    };
    
    return NextResponse.json({
      user: userResponse,
      message: 'User registered successfully'
    });
    
  } catch (error: any) {
    console.error('Error registering user:', error);
    
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}