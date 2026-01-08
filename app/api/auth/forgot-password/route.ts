import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';
import { MongoClient, ObjectId } from 'mongodb';

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'juntassegurasservice@gmail.com',
    pass: 'mpdo mzvb dotr pqna'
  }
});

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/juntas-app';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Connect directly to MongoDB using the native driver instead of Mongoose
    console.log('Connecting to MongoDB directly...');
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    console.log('Connected to MongoDB. Accessing database...');
    const db = client.db();
    const usersCollection = db.collection('users');
    
    // Find user by email
    const user = await usersCollection.findOne({ email });
    
    if (!user) {
      // Return success even if user doesn't exist to prevent email enumeration
      await client.close();
      return NextResponse.json({ success: true });
    }

    // Generate a reset token
    const resetToken = uuidv4();
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // Token expires in 1 hour

    console.log('Updating user with reset token:', {
      userId: user._id,
      email: user.email,
      resetToken
    });

    // Update the user document directly with the MongoDB driver
    const updateResult = await usersCollection.updateOne(
      { _id: user._id },
      { 
        $set: { 
          resetToken: resetToken,
          resetTokenExpiry: resetTokenExpiry
        }
      }
    );

    console.log('Update result from MongoDB native driver:', updateResult);

    // Verify the update
    const updatedUser = await usersCollection.findOne({ _id: user._id });
    
    console.log('Updated user:', {
      _id: updatedUser?._id,
      email: updatedUser?.email,
      resetToken: updatedUser?.resetToken,
      resetTokenExpiry: updatedUser?.resetTokenExpiry
    });
    
    if (!updatedUser?.resetToken) {
      console.error('Failed to save reset token to user');
      await client.close();
      return NextResponse.json(
        { error: 'Failed to generate reset token' },
        { status: 500 }
      );
    }

    // Send reset email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/auth/reset-password?token=${updatedUser.resetToken}`;
    console.log('Reset URL:', resetUrl);
    
    try {
      await transporter.sendMail({
        from: 'juntassegurasservice@gmail.com',
        to: user.email,
        subject: 'Reset Your Juntas Seguras Password',
        text: `Click this link to reset your password: ${resetUrl}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Reset Your Password</title>
            </head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px;">
                <h2 style="color: #111827; margin-bottom: 20px;">Reset Your Password</h2>
                <p style="color: #4b5563; margin-bottom: 20px;">
                  Click the button below to reset your password. This link will expire in 1 hour.
                </p>
                <div style="text-align: center; margin: 20px 0;">
                  <a href="${resetUrl}" 
                     style="display: inline-block; 
                            padding: 12px 24px; 
                            background-color: #3B82F6; 
                            color: white; 
                            text-decoration: none; 
                            border-radius: 6px; 
                            font-weight: 500;
                            border: none;
                            cursor: pointer;">
                    Reset Password
                  </a>
                </div>
                <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                  If you didn't request a password reset, please ignore this email.
                </p>
                <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                  Or copy and paste this link into your browser:<br>
                  <span style="word-break: break-all;">${resetUrl}</span>
                </p>
              </div>
            </body>
          </html>
        `
      });

      await client.close();
      return NextResponse.json({ success: true });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      await client.close();
      return NextResponse.json(
        { error: 'An error occurred while sending the email' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in forgot password:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
} 