import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, registerUser } from '@/lib/auth/user-store';
import { createSessionToken, hashPasswordSync } from '@/lib/auth/security';

const REQUIRED_DOMAIN = 'jspm.edu.in';

function parseGoogleJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role = 'STUDENT', email, name, credential, token: incomingToken, hd } = body;

    // Decode token if passed as credential or token
    const rawToken = incomingToken || credential;
    const decoded = rawToken ? parseGoogleJwt(rawToken) : null;

    // Determine email (provided email or parsed from token or simulated OAuth credential)
    let userEmail = (email || decoded?.email || credential || '').trim().toLowerCase();
    if (!userEmail) {
      if (role === 'TEACHER') {
        userEmail = 'anil.kadam.comp@jspm.org';
      } else if (role === 'HEAD' || role === 'ADMIN') {
        userEmail = 'hod.computer@jspm.edu.in';
      } else if (role === 'SUPER_ADMIN') {
        userEmail = 'principal@jspm.edu.in';
      } else {
        userEmail = 'ganesh.patil.comp@jspm.edu.in';
      }
    }

    const effectiveRole = role === 'ADMIN' ? 'HEAD' : role;

    // Find or dynamically provision user
    let user = findUserByEmail(userEmail);
    if (!user) {
      // Derive clean name from decoded token or provided name
      let userName = (name || decoded?.name || '').trim();
      if (!userName) {
        const username = userEmail.split('@')[0];
        const nameParts = username
          .split(/[\._\-]/)
          .filter((p: string) => !['comp', 'it', 'mech', 'civil', 'entc', 'jspm', 'edu', 'in', 'org'].includes(p.toLowerCase()));
        userName = nameParts.length > 0
          ? nameParts.map((p: string) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ')
          : 'User ' + username;
      }

      user = registerUser({
        name: userName,
        email: userEmail,
        role: effectiveRole,
        department: userEmail.includes('it')
          ? 'Information Technology'
          : userEmail.includes('mech')
          ? 'Mechanical Engineering'
          : userEmail.includes('civil')
          ? 'Civil Engineering'
          : 'Computer Engineering',
        rollNumber: effectiveRole === 'STUDENT' ? `COMP${Math.floor(2021000 + Math.random() * 9000)}` : undefined,
        year: effectiveRole === 'STUDENT' ? 'Third Year' : undefined,
        division: effectiveRole === 'STUDENT' ? 'A' : undefined,
        designation: effectiveRole !== 'STUDENT' ? (effectiveRole === 'TEACHER' ? 'Assistant Professor' : 'Department Head') : undefined,
        passwordHash: hashPasswordSync('Password@123'),
      });
    }

    const sessionPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      department: user.department,
      rollNumber: user.rollNumber,
      year: user.year,
      division: user.division,
      designation: user.designation,
    };

    const token = createSessionToken(sessionPayload);
    const destination =
      effectiveRole === 'STUDENT'
        ? '/student/dashboard'
        : effectiveRole === 'TEACHER'
        ? '/teacher/dashboard'
        : '/admin/dashboard';

    const response = NextResponse.json(
      {
        success: true,
        message: 'Google Sign-In successful.',
        user: sessionPayload,
        destination,
        token,
      },
      { status: 200 }
    );

    // Set HttpOnly session cookie for server-side persistence
    response.cookies.set('rscoe_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Google authentication failed.' },
      { status: 500 }
    );
  }
}
