/**
 * POST /api/auth/register
 *
 * Registers a new user account via Supabase Auth and inserts a profile row
 * into public.users (via the auth trigger in 001_initial_schema.sql).
 *
 * What changed from the original:
 *   - Replaced hashPassword + registerUser (JSON file store) with
 *     supabase.auth.signUp() via the admin client.
 *   - Role, department, and other profile fields are stored in user_metadata
 *     so the auth trigger (handle_new_auth_user) can copy them to public.users.
 *   - The admin client (service-role key) is used so sign-up bypasses RLS and
 *     immediately confirms the user (auto-confirm). If you want email
 *     confirmation flows, switch to the anon client here.
 *   - Rate limiting is preserved.
 *   - Domain validation for students is preserved.
 *   - No session cookie is set on registration (user must log in separately).
 *     If you want auto-login after registration, add signInWithPassword() here.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/auth/security';

export async function POST(req: NextRequest) {
  // ── Rate limiting ──────────────────────────────────────────────────────────
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rateCheck = checkRateLimit(`register:${ip}`, 10, 60 * 1000);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many registration requests. Please try again later.' },
      { status: 429 }
    );
  }

  // ── Parse & validate body ──────────────────────────────────────────────────
  let body: {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
    department?: string;
    rollNumber?: string;
    year?: string;
    division?: string;
    phone?: string;
    designation?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const {
    name,
    email,
    password,
    role = 'STUDENT',
    department = 'Computer Engineering',
    rollNumber,
    year,
    division,
    phone,
    designation,
  } = body;

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

  // Role policy: public registration only allows STUDENT or TEACHER.
  const assignedRole = role === 'TEACHER' ? 'TEACHER' : 'STUDENT';

  // Domain validation for students (preserved from original)
  if (
    assignedRole === 'STUDENT' &&
    !email.toLowerCase().endsWith('.edu.in') &&
    !email.toLowerCase().endsWith('.org')
  ) {
    return NextResponse.json(
      {
        error:
          'Student registration requires an official educational domain email (.edu.in or .org).',
      },
      { status: 400 }
    );
  }

  // ── Create user in Supabase Auth ───────────────────────────────────────────
  let newUser: any;
  try {
    const adminClient = createAdminClient();
    const { data, error: signUpError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // auto-confirm when using admin API
      user_metadata: {
        full_name: name,
        role: assignedRole,
        department,
        roll_number: rollNumber,
        year,
        division,
        phone,
        designation,
      },
    });

    if (signUpError) {
      if (
        signUpError.message.toLowerCase().includes('already registered') ||
        signUpError.message.toLowerCase().includes('already exists') ||
        signUpError.message.toLowerCase().includes('duplicate')
      ) {
        return NextResponse.json(
          { error: 'An account with this email address already exists.' },
          { status: 409 }
        );
      }
      throw signUpError;
    }
    newUser = data.user;
  } catch (err: any) {
    // If admin client is unconfigured or failed, fallback to public signUp
    const anonSupabase = await createServerClient();
    const { data, error: signUpError } = await anonSupabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          role: assignedRole,
          department,
          roll_number: rollNumber,
          year,
          division,
          phone,
          designation,
        },
      },
    });

    if (signUpError) {
      if (
        signUpError.message.toLowerCase().includes('already registered') ||
        signUpError.message.toLowerCase().includes('already exists') ||
        signUpError.message.toLowerCase().includes('duplicate')
      ) {
        return NextResponse.json(
          { error: 'An account with this email address already exists.' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: signUpError.message || 'Registration failed.' },
        { status: 400 }
      );
    }
    newUser = data.user;
  }

  return NextResponse.json(
    {
      message: 'Account registered successfully.',
      user: {
        id: newUser.id,
        email: newUser.email,
        role: assignedRole,
        full_name: name,
        department,
      },
    },
    { status: 201 }
  );
}
