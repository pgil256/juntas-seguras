// Identity verification route
// This project uses Stripe for payments
// Identity verification requires Stripe Identity integration

import { NextRequest, NextResponse } from 'next/server';

// POST /api/identity/verification - Start a new identity verification process
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Identity verification is not configured. This feature requires Stripe Identity integration.' },
    { status: 501 }
  );
}

// GET /api/identity/verification - Get verification status for a user
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Identity verification is not configured. This feature requires Stripe Identity integration.' },
    { status: 501 }
  );
}

// PATCH /api/identity/verification - Complete the verification process
export async function PATCH(request: NextRequest) {
  return NextResponse.json(
    { error: 'Identity verification is not configured. This feature requires Stripe Identity integration.' },
    { status: 501 }
  );
}
