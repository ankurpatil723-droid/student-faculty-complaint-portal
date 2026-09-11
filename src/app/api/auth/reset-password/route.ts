import { NextRequest, NextResponse } from 'next/server';
import { getPasswordResetToken, invalidateResetToken, updateUserPassword } from '@/lib/auth/user-store';
import { hashPassword, resetFailedAttempts } from '@/lib/auth/security';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Reset token and new password are required.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    const record = getPasswordResetToken(token);
    if (!record) {
      return NextResponse.json(
        { error: 'Invalid or expired password reset token.' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(newPassword);
    updateUserPassword(record.email, hashedPassword);
    resetFailedAttempts(record.email);
    invalidateResetToken(token);

    return NextResponse.json({
      message: 'Password reset successfully. You can now log in with your new password.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Password reset failed.' },
      { status: 500 }
    );
  }
}
