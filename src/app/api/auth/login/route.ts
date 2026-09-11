import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail } from '@/lib/auth/user-store';
import {
  comparePassword,
  createSessionToken,
  isAccountLocked,
  recordFailedAttempt,
  resetFailedAttempts,
  checkRateLimit,
} from '@/lib/auth/security';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkRateLimit(`login:${ip}`, 15, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many authentication attempts. Please try again in 1 minute.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email, password, selectedRole } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    // Check account lockout status
    const lockStatus = isAccountLocked(email);
    if (lockStatus.isLocked) {
      return NextResponse.json(
        {
          error: `Account is temporarily locked due to 5 consecutive failed attempts. Please try again in ${lockStatus.remainingSeconds} seconds.`,
        },
        { status: 423 }
      );
    }

    const user = findUserByEmail(email);

    if (!user) {
      // Record failed attempt for unknown email as well to prevent brute force timing attacks
      recordFailedAttempt(email);
      return NextResponse.json(
        { error: 'Invalid credentials provided.' },
        { status: 401 }
      );
    }

    // Optional Role check validation
    if (selectedRole && user.role !== selectedRole && !(selectedRole === 'ADMIN' && user.role === 'HEAD')) {
      return NextResponse.json(
        { error: `This account is registered under the role ${user.role}, not ${selectedRole}.` },
        { status: 403 }
      );
    }

    // Verify password hash
    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      const { attemptsLeft, isLocked } = recordFailedAttempt(email);

      if (isLocked) {
        return NextResponse.json(
          {
            error: 'Account locked! You have exceeded the maximum of 5 failed login attempts. Locked for 15 minutes.',
          },
          { status: 423 }
        );
      }

      return NextResponse.json(
        {
          error: `Invalid credentials provided. ${attemptsLeft} attempt(s) remaining before account lockout.`,
        },
        { status: 401 }
      );
    }

    // Authentication success! Reset lockout counter
    resetFailedAttempts(email);

    const sessionPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      department: user.department,
    };

    const token = createSessionToken(sessionPayload);

    const { passwordHash, ...sanitizedUser } = user;

    const res = NextResponse.json(
      {
        message: 'Authentication successful.',
        user: sanitizedUser,
        token,
      },
      { status: 200 }
    );

    // Set HttpOnly Cookie
    res.cookies.set('rscoe_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return res;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Login failed.' },
      { status: 500 }
    );
  }
}
