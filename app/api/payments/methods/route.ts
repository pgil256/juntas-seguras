import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth';
import connectToDatabase from '../../../../lib/db/connect';
import { getPaymentMethodModel } from '../../../../lib/db/models/payment';

/**
 * Payment Methods API
 *
 * SECURITY NOTES:
 * - NEVER store CVV, full card numbers, or full bank account numbers
 * - Only store last 4 digits for display purposes
 * - Use PayPal Vault for tokenized payment methods
 * - All sensitive data should be tokenized through PayPal
 */

// GET /api/payments/methods - Get all payment methods for the authenticated user
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }
    const user = userResult.user;

    await connectToDatabase();
    const PaymentMethod = getPaymentMethodModel();

    // Get user's payment methods (excluding soft-deleted ones)
    const userMethods = await PaymentMethod.find({
      userId: user._id,
      deletedAt: null
    }).sort({ isDefault: -1, createdAt: -1 });

    // Return sanitized payment methods (never expose sensitive data)
    const sanitizedMethods = userMethods.map((method) => ({
      id: method._id,
      type: method.type,
      name: method.name,
      last4: method.last4,
      isDefault: method.isDefault,
      createdAt: method.createdAt,
      // Type-specific fields (safe to return)
      ...(method.type === 'paypal' && { paypalEmail: method.paypalEmail }),
      ...(method.type === 'card' && {
        cardholderName: method.cardholderName,
        expiryMonth: method.expiryMonth,
        expiryYear: method.expiryYear,
        cardBrand: method.cardBrand
      }),
      ...(method.type === 'bank' && {
        accountHolderName: method.accountHolderName,
        accountType: method.accountType,
        bankName: method.bankName
      }),
      verified: method.verified
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
    // Authenticate user
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }
    const user = userResult.user;

    const body = await request.json();
    const { type, isDefault } = body;

    if (!type) {
      return NextResponse.json(
        { error: 'Payment method type is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const PaymentMethod = getPaymentMethodModel();

    // Validate and extract fields based on payment method type
    let paymentMethodData: any = {
      userId: user._id,
      type,
      isDefault: !!isDefault,
      verified: false
    };

    if (type === 'paypal') {
      const { paypalEmail } = body;
      if (!paypalEmail) {
        return NextResponse.json(
          { error: 'PayPal email is required' },
          { status: 400 }
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(paypalEmail)) {
        return NextResponse.json(
          { error: 'Invalid PayPal email format' },
          { status: 400 }
        );
      }

      paymentMethodData = {
        ...paymentMethodData,
        name: `PayPal (${paypalEmail})`,
        last4: paypalEmail.slice(-4),
        paypalEmail,
        // PayPal accounts are considered verified
        verified: true
      };

    } else if (type === 'card') {
      const { cardholderName, cardNumber, expiryMonth, expiryYear } = body;
      // NOTE: CVV is intentionally NOT stored - it should only be used for
      // one-time verification with PayPal and then discarded

      if (!cardholderName || !cardNumber || !expiryMonth || !expiryYear) {
        return NextResponse.json(
          { error: 'Missing required card fields (cardholderName, cardNumber, expiryMonth, expiryYear)' },
          { status: 400 }
        );
      }

      // Validate card number format (basic check)
      const cleanCardNumber = cardNumber.replace(/\s/g, '');
      if (!/^\d{13,19}$/.test(cleanCardNumber)) {
        return NextResponse.json(
          { error: 'Invalid card number format' },
          { status: 400 }
        );
      }

      // Validate expiry
      const currentYear = new Date().getFullYear() % 100;
      const currentMonth = new Date().getMonth() + 1;
      const expYear = parseInt(expiryYear, 10);
      const expMonth = parseInt(expiryMonth, 10);

      if (expMonth < 1 || expMonth > 12) {
        return NextResponse.json(
          { error: 'Invalid expiry month' },
          { status: 400 }
        );
      }

      if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
        return NextResponse.json(
          { error: 'Card has expired' },
          { status: 400 }
        );
      }

      // Detect card brand from number
      let cardBrand = 'unknown';
      if (/^4/.test(cleanCardNumber)) cardBrand = 'visa';
      else if (/^5[1-5]/.test(cleanCardNumber)) cardBrand = 'mastercard';
      else if (/^3[47]/.test(cleanCardNumber)) cardBrand = 'amex';
      else if (/^6(?:011|5)/.test(cleanCardNumber)) cardBrand = 'discover';

      // TODO: In production, you would tokenize the card with PayPal Vault here
      // const vaultResult = await createPayPalVaultToken(cardNumber, expiryMonth, expiryYear, cvv);
      // paymentMethodData.paypalVaultId = vaultResult.vaultId;

      paymentMethodData = {
        ...paymentMethodData,
        name: `${cardBrand.charAt(0).toUpperCase() + cardBrand.slice(1)} •••• ${cleanCardNumber.slice(-4)}`,
        last4: cleanCardNumber.slice(-4),
        cardholderName,
        expiryMonth,
        expiryYear,
        cardBrand,
        // Note: Card needs verification through PayPal
        verified: false
      };

    } else if (type === 'bank') {
      const { accountHolderName, accountNumber, routingNumber, accountType, bankName } = body;

      if (!accountHolderName || !accountNumber || !routingNumber || !accountType) {
        return NextResponse.json(
          { error: 'Missing required bank account fields' },
          { status: 400 }
        );
      }

      // Validate routing number format (US banks have 9 digits)
      if (!/^\d{9}$/.test(routingNumber)) {
        return NextResponse.json(
          { error: 'Invalid routing number format (must be 9 digits)' },
          { status: 400 }
        );
      }

      // Validate account number (basic format check)
      if (!/^\d{4,17}$/.test(accountNumber)) {
        return NextResponse.json(
          { error: 'Invalid account number format' },
          { status: 400 }
        );
      }

      if (!['checking', 'savings'].includes(accountType)) {
        return NextResponse.json(
          { error: 'Account type must be "checking" or "savings"' },
          { status: 400 }
        );
      }

      // TODO: In production, tokenize bank account with PayPal
      // const vaultResult = await createPayPalBankVaultToken(accountNumber, routingNumber);
      // paymentMethodData.paypalVaultId = vaultResult.vaultId;

      paymentMethodData = {
        ...paymentMethodData,
        name: `${bankName || 'Bank'} •••• ${accountNumber.slice(-4)}`,
        last4: accountNumber.slice(-4),
        accountHolderName,
        accountType,
        bankName: bankName || null,
        routingLast4: routingNumber.slice(-4),
        // Bank accounts need verification through PayPal (micro-deposits)
        verified: false
      };

    } else {
      return NextResponse.json(
        { error: 'Invalid payment method type. Must be "paypal", "card", or "bank"' },
        { status: 400 }
      );
    }

    // If this is set as default, update other payment methods
    if (isDefault) {
      await PaymentMethod.updateMany(
        { userId: user._id, deletedAt: null },
        { $set: { isDefault: false } }
      );
    }

    // Create the payment method
    const paymentMethod = new PaymentMethod(paymentMethodData);
    await paymentMethod.save();

    // Log activity
    await logActivity(user._id.toString(), 'payment_method_add', {
      methodId: paymentMethod._id.toString(),
      type,
    });

    return NextResponse.json({
      success: true,
      method: {
        id: paymentMethod._id,
        type: paymentMethod.type,
        name: paymentMethod.name,
        last4: paymentMethod.last4,
        isDefault: paymentMethod.isDefault,
        verified: paymentMethod.verified
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
    // Authenticate user
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }
    const user = userResult.user;

    const methodId = request.nextUrl.searchParams.get('id');

    if (!methodId) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const PaymentMethod = getPaymentMethodModel();

    // Find the method and verify ownership
    const method = await PaymentMethod.findOne({
      _id: methodId,
      userId: user._id,
      deletedAt: null
    });

    if (!method) {
      return NextResponse.json(
        { error: 'Payment method not found' },
        { status: 404 }
      );
    }

    // Soft delete the method
    method.deletedAt = new Date();
    await method.save();

    // If this was the default method, set another one as default
    if (method.isDefault) {
      const remainingMethods = await PaymentMethod.find({
        userId: user._id,
        deletedAt: null
      }).sort({ createdAt: -1 });

      if (remainingMethods.length > 0) {
        remainingMethods[0].isDefault = true;
        await remainingMethods[0].save();
      }
    }

    // Log activity
    await logActivity(user._id.toString(), 'payment_method_remove', {
      methodId: methodId,
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

// PATCH /api/payments/methods - Update a payment method (e.g., set as default)
export async function PATCH(request: NextRequest) {
  try {
    // Authenticate user
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }
    const user = userResult.user;

    const body = await request.json();
    const { id, isDefault } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const PaymentMethod = getPaymentMethodModel();

    // Find the method and verify ownership
    const method = await PaymentMethod.findOne({
      _id: id,
      userId: user._id,
      deletedAt: null
    });

    if (!method) {
      return NextResponse.json(
        { error: 'Payment method not found' },
        { status: 404 }
      );
    }

    // Update default status
    if (isDefault !== undefined) {
      if (isDefault) {
        // Remove default from all other methods
        await PaymentMethod.updateMany(
          { userId: user._id, deletedAt: null },
          { $set: { isDefault: false } }
        );
      }
      method.isDefault = isDefault;
      await method.save();
    }

    return NextResponse.json({
      success: true,
      method: {
        id: method._id,
        type: method.type,
        name: method.name,
        last4: method.last4,
        isDefault: method.isDefault,
      },
    });

  } catch (error) {
    console.error('Error updating payment method:', error);
    return NextResponse.json(
      { error: 'Failed to update payment method' },
      { status: 500 }
    );
  }
}

// Helper function to log activity
async function logActivity(userId: string, type: string, metadata: Record<string, unknown>) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    await fetch(`${baseUrl}/api/security/activity-log`, {
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
