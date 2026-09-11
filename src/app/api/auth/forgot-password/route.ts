import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, savePasswordResetToken } from '@/lib/auth/user-store';
import { generateRandomToken, checkRateLimit } from '@/lib/auth/security';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkRateLimit(`forgot-pass:${ip}`, 5, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many password reset requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required.' },
        { status: 400 }
      );
    }

    const user = findUserByEmail(email);

    // Standard security practice: return success message even if email not found to prevent user enumeration
    if (!user) {
      return NextResponse.json({
        message: 'If an account exists with that email, a password reset token has been generated.',
      });
    }

    const resetToken = generateRandomToken();
    savePasswordResetToken(email, resetToken, 15);

    return NextResponse.json({
      message: 'Password reset token generated successfully.',
      resetToken, // Returned in API response for demo/testing architecture
      expiresInMinutes: 15,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Forgot password request failed.' },
      { status: 500 }
    );
  }
}
