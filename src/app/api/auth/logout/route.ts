import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const res = NextResponse.json(
    { message: 'Signed out successfully.' },
    { status: 200 }
  );

  // Clear HttpOnly cookie
  res.cookies.set('rscoe_session', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });

  return res;
}
