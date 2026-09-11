import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthSession, Role } from '@/lib/types';

const JWT_SECRET = process.env.JWT_SECRET || 'rscoe-production-secret-key-2026-jspm-grievance';
const SALT_ROUNDS = 10;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Rate Limiting Memory Store
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitStore = new Map<string, RateLimitRecord>();

// Account Lockout Store
interface LockoutRecord {
  failedAttempts: number;
  lockedUntil: number | null;
}
const lockoutStore = new Map<string, LockoutRecord>();

/**
 * Hashes a raw password securely using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Synchronous hash version for seed accounts initialization.
 */
export function hashPasswordSync(password: string): string {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

/**
 * Verifies a plaintext password against a hashed password.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Creates a signed JWT token for session management.
 */
export function createSessionToken(session: AuthSession, expiresIn: string = '24h'): string {
  const opts: SignOptions = { expiresIn: expiresIn as SignOptions['expiresIn'] };
  return jwt.sign(
    {
      userId: session.userId,
      email: session.email,
      role: session.role,
      name: session.name,
      department: session.department,
    },
    JWT_SECRET,
    opts
  );
}

/**
 * Verifies and decodes a signed JWT session token.
 */
export function verifySessionToken(token: string): AuthSession | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as AuthSession;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Checks if an email account is currently locked out due to excessive failed login attempts.
 */
export function isAccountLocked(email: string): { isLocked: boolean; remainingSeconds?: number } {
  const normalizedEmail = email.toLowerCase().trim();
  const record = lockoutStore.get(normalizedEmail);

  if (!record || !record.lockedUntil) {
    return { isLocked: false };
  }

  const now = Date.now();
  if (now < record.lockedUntil) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { isLocked: true, remainingSeconds };
  }

  // Lock expired, reset lockout record
  lockoutStore.delete(normalizedEmail);
  return { isLocked: false };
}

/**
 * Records a failed login attempt. If failed attempts reach MAX_FAILED_ATTEMPTS, locks the account.
 */
export function recordFailedAttempt(email: string): { attemptsLeft: number; isLocked: boolean } {
  const normalizedEmail = email.toLowerCase().trim();
  const record = lockoutStore.get(normalizedEmail) || { failedAttempts: 0, lockedUntil: null };

  record.failedAttempts += 1;

  if (record.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    lockoutStore.set(normalizedEmail, record);
    return { attemptsLeft: 0, isLocked: true };
  }

  lockoutStore.set(normalizedEmail, record);
  return { attemptsLeft: MAX_FAILED_ATTEMPTS - record.failedAttempts, isLocked: false };
}

/**
 * Resets failed login attempts for an account upon successful authentication.
 */
export function resetFailedAttempts(email: string): void {
  const normalizedEmail = email.toLowerCase().trim();
  lockoutStore.delete(normalizedEmail);
}

/**
 * Simple Rate Limiting Strategy by IP / Identifier.
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 20,
  windowMs: number = 60 * 1000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  record.count += 1;
  return { allowed: true, remaining: limit - record.count };
}

/**
 * Generates a secure random crypto token for password reset.
 */
export function generateRandomToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
