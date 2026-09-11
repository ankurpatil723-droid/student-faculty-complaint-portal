import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, registerUser } from '@/lib/auth/user-store';
import { hashPassword, createSessionToken, checkRateLimit } from '@/lib/auth/security';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkRateLimit(`register:${ip}`, 10, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many registration requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { name, email, password, role = 'STUDENT', department = 'Computer Engineering', rollNumber, year, division, phone } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Full name, email, and password are required.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    // Role verification policy
    const assignedRole = role === 'TEACHER' ? 'TEACHER' : 'STUDENT';

    if (assignedRole === 'STUDENT' && !email.toLowerCase().endsWith('.edu.in') && !email.toLowerCase().endsWith('.org')) {
      return NextResponse.json(
        { error: 'Student registration requires an official educational domain email (.edu.in or .org).' },
        { status: 400 }
      );
    }

    const existing = findUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email address already exists.' },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const newUser = registerUser({
      name,
      email,
      role: assignedRole,
      department,
      rollNumber,
      year,
      division,
      phone,
      passwordHash: hashedPassword,
    });

    const sessionPayload = {
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      name: newUser.name,
      department: newUser.department,
    };

    const token = createSessionToken(sessionPayload);

    const res = NextResponse.json(
      {
        message: 'Account registered successfully.',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          department: newUser.department,
        },
      },
      { status: 201 }
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
      { error: error.message || 'Registration failed.' },
      { status: 500 }
    );
  }
}
