import { NextRequest, NextResponse } from 'next/server';

// In a real application, this would use a proper payment gateway and database
const mockPaymentMethods = new Map();

// Define types
interface PaymentMethod {
  id: number;
  userId: string;
  type: 'paypal' | 'card' | 'bank';
  name: string;
  last4: string;
  isDefault: boolean;
  createdAt: string;
  // PayPal-specific fields
  paypalEmail?: string;
  // Card-specific fields
  cardholderName?: string;
  expiryMonth?: string;
  expiryYear?: string;
  // Bank-specific fields
  accountHolderName?: string;
  accountType?: 'checking' | 'savings';
  routingNumber?: string;
}

// GET /api/payments/methods - Get all payment methods for a user
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // In a real app, this would query from a database
    const userMethods = Array.from(mockPaymentMethods.values())
      .filter((method: any) => method.userId === userId)
      // Sort by default first, then by creation date
      .sort((a: any, b: any) => {
        if (a.isDefault === b.isDefault) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return a.isDefault ? -1 : 1;
      });

    // Mask sensitive data
    const sanitizedMethods = userMethods.map((method: PaymentMethod) => ({
      id: method.id,
      type: method.type,
      name: method.name,
      last4: method.last4,
      isDefault: method.isDefault,
      createdAt: method.createdAt,
      paypalEmail: method.type === 'paypal' ? method.paypalEmail : undefined,
      cardholderName: method.type === 'card' ? method.cardholderName : undefined,
      accountHolderName: method.type === 'bank' ? method.accountHolderName : undefined,
      accountType: method.type === 'bank' ? method.accountType : undefined,
      expiryMonth: method.type === 'card' ? method.expiryMonth : undefined,
      expiryYear: method.type === 'card' ? method.expiryYear : undefined,
    }));

    return NextResponse.json({
      methods: sanitizedMethods,
    });

  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
}

// POST /api/payments/methods - Create a new payment method
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, isDefault } = body;

    if (!userId || !type) {
      return NextResponse.json(
        { error: 'Required fields missing' },
        { status: 400 }
      );
    }

    // Validate required fields based on payment method type
    if (type === 'paypal') {
      const { paypalEmail } = body;
      if (!paypalEmail) {
        return NextResponse.json(
          { error: 'PayPal email is required' },
          { status: 400 }
        );
      }
    } else if (type === 'card') {
      const { cardholderName, cardNumber, expiryMonth, expiryYear, cvv } = body;
      if (!cardholderName || !cardNumber || !expiryMonth || !expiryYear || !cvv) {
        return NextResponse.json(
          { error: 'Missing required card fields' },
          { status: 400 }
        );
      }
    } else if (type === 'bank') {
      const { accountHolderName, accountNumber, routingNumber, accountType } = body;
      if (!accountHolderName || !accountNumber || !routingNumber || !accountType) {
        return NextResponse.json(
          { error: 'Missing required bank account fields' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid payment method type' },
        { status: 400 }
      );
    }

    // In a real app, this would tokenize the card/bank details with PayPal
    // and store only the token and minimal details in our database

    // Generate a unique ID
    const id = Date.now();

    // Create the payment method object
    const paymentMethod: PaymentMethod = {
      id,
      userId,
      type,
      name: type === 'paypal'
        ? `PayPal (${body.paypalEmail})`
        : type === 'card'
          ? `${body.cardholderName}'s Card`
          : `${body.accountHolderName}'s Bank`,
      last4: type === 'paypal'
        ? body.paypalEmail.slice(-4)
        : type === 'card'
          ? body.cardNumber.slice(-4)
          : body.accountNumber.slice(-4),
      isDefault,
      createdAt: new Date().toISOString(),
    };

    // Add type-specific fields
    if (type === 'paypal') {
      paymentMethod.paypalEmail = body.paypalEmail;
    } else if (type === 'card') {
      paymentMethod.cardholderName = body.cardholderName;
      paymentMethod.expiryMonth = body.expiryMonth;
      paymentMethod.expiryYear = body.expiryYear;
    } else {
      paymentMethod.accountHolderName = body.accountHolderName;
      paymentMethod.accountType = body.accountType;
      paymentMethod.routingNumber = body.routingNumber;
    }

    // If this is set as default, update other payment methods
    if (isDefault) {
      const userMethods = Array.from(mockPaymentMethods.values())
        .filter((method: any) => method.userId === userId);

      for (const method of userMethods) {
        method.isDefault = false;
        mockPaymentMethods.set(method.id, method);
      }
    }

    // Save to mock database
    mockPaymentMethods.set(id, paymentMethod);

    // Log activity
    await logActivity(userId, 'payment_method_add', {
      methodId: id,
      type,
    });

    return NextResponse.json({
      success: true,
      method: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        name: paymentMethod.name,
        last4: paymentMethod.last4,
        isDefault: paymentMethod.isDefault,
      },
    });

  } catch (error) {
    console.error('Error creating payment method:', error);
    return NextResponse.json(
      { error: 'Failed to create payment method' },
      { status: 500 }
    );
  }
}

// DELETE /api/payments/methods - Delete a payment method
export async function DELETE(request: NextRequest) {
  try {
    const methodId = request.nextUrl.searchParams.get('id');
    const userId = request.nextUrl.searchParams.get('userId');

    if (!methodId || !userId) {
      return NextResponse.json(
        { error: 'Method ID and User ID are required' },
        { status: 400 }
      );
    }

    // Check if the method exists and belongs to the user
    const method = mockPaymentMethods.get(parseInt(methodId));

    if (!method || method.userId !== userId) {
      return NextResponse.json(
        { error: 'Payment method not found' },
        { status: 404 }
      );
    }

    // Delete the method
    mockPaymentMethods.delete(parseInt(methodId));

    // If this was the default method, set another one as default
    if (method.isDefault) {
      const userMethods = Array.from(mockPaymentMethods.values())
        .filter((m: any) => m.userId === userId);

      if (userMethods.length > 0) {
        const newDefault = userMethods[0];
        newDefault.isDefault = true;
        mockPaymentMethods.set(newDefault.id, newDefault);
      }
    }

    // Log activity
    await logActivity(userId, 'payment_method_remove', {
      methodId: parseInt(methodId),
      type: method.type,
    });

    return NextResponse.json({
      success: true,
      message: 'Payment method deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting payment method:', error);
    return NextResponse.json(
      { error: 'Failed to delete payment method' },
      { status: 500 }
    );
  }
}

// Helper function to log activity
async function logActivity(userId: string, type: string, metadata: any) {
  try {
    await fetch('/api/security/activity-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        type,
        metadata
      })
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
