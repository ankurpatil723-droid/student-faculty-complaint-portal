import { User, Role, PasswordResetToken } from '@/lib/types';
import { hashPasswordSync } from './security';
import { readJson, writeJson } from '@/lib/persist';

export interface StoredUser extends User {
  passwordHash: string;
}

const USERS_FILE = 'users.json';
const TOKENS_FILE = 'reset-tokens.json';

// Pre-seeded hashed password for demo users ("Password@123")
const SEED_PASSWORD_HASH = hashPasswordSync('Password@123');

const INITIAL_USERS: StoredUser[] = [
  {
    id: 'usr-001',
    name: 'Ganesh Patil',
    email: 'ganesh.patil.comp@jspm.edu.in',
    role: 'STUDENT',
    department: 'Computer Engineering',
    rollNumber: 'COMP2021089',
    year: 'Third Year',
    division: 'B',
    phone: '+91 98765 43210',
    joinedAt: '2023-08-15T00:00:00.000Z',
    passwordHash: SEED_PASSWORD_HASH,
  },
  {
    id: 'usr-002',
    name: 'Prof. Anil Kadam',
    email: 'anil.kadam.comp@jspm.org',
    role: 'TEACHER',
    department: 'Computer Engineering',
    designation: 'Assistant Professor',
    phone: '+91 98220 11223',
    joinedAt: '2021-06-10T00:00:00.000Z',
    passwordHash: SEED_PASSWORD_HASH,
  },
  {
    id: 'usr-003',
    name: 'Dr. Suresh Mane',
    email: 'hod.computer@jspm.edu.in',
    role: 'HEAD',
    department: 'Computer Engineering',
    designation: 'Head of Department (HOD)',
    phone: '+91 94225 99887',
    joinedAt: '2018-03-01T00:00:00.000Z',
    passwordHash: SEED_PASSWORD_HASH,
  },
  {
    id: 'usr-004',
    name: 'Dr. Rajesh Deshmukh',
    email: 'principal@jspm.edu.in',
    role: 'SUPER_ADMIN',
    department: 'Administration',
    designation: 'Principal & Super Administrator',
    phone: '+91 90110 00001',
    joinedAt: '2015-01-01T00:00:00.000Z',
    passwordHash: SEED_PASSWORD_HASH,
  },
];

/**
 * Load user registry from disk, seeding defaults if empty.
 */
function loadRegistry(): StoredUser[] {
  const stored = readJson<StoredUser[]>(USERS_FILE, []);
  if (stored.length === 0) {
    // First boot: seed defaults and persist them
    writeJson(USERS_FILE, INITIAL_USERS);
    return [...INITIAL_USERS];
  }
  // Ensure seed users always exist (merge without duplicating)
  const emails = new Set(stored.map((u) => u.email.toLowerCase()));
  const toAdd = INITIAL_USERS.filter((u) => !emails.has(u.email.toLowerCase()));
  if (toAdd.length > 0) {
    const merged = [...stored, ...toAdd];
    writeJson(USERS_FILE, merged);
    return merged;
  }
  return stored;
}

function saveRegistry(users: StoredUser[]): void {
  writeJson(USERS_FILE, users);
}

// Password Reset Tokens Store
function loadTokens(): PasswordResetToken[] {
  return readJson<PasswordResetToken[]>(TOKENS_FILE, []);
}

function saveTokens(tokens: PasswordResetToken[]): void {
  writeJson(TOKENS_FILE, tokens);
}

/**
 * Finds a user by email address (case insensitive).
 */
export function findUserByEmail(email: string): StoredUser | undefined {
  const normalized = email.toLowerCase().trim();
  return loadRegistry().find((u) => u.email.toLowerCase() === normalized);
}

/**
 * Finds a user by unique ID.
 */
export function findUserById(id: string): StoredUser | undefined {
  return loadRegistry().find((u) => u.id === id);
}

/**
 * Registers a new user. Accepts any email address (no domain restriction).
 */
export function registerUser(userData: Omit<StoredUser, 'id' | 'joinedAt'>): StoredUser {
  const registry = loadRegistry();
  const existing = registry.find(
    (u) => u.email.toLowerCase() === userData.email.toLowerCase().trim()
  );
  if (existing) {
    throw new Error('An account with this email address already exists.');
  }

  const newUser: StoredUser = {
    ...userData,
    id: `usr-${Date.now()}`,
    joinedAt: new Date().toISOString(),
  };

  registry.push(newUser);
  saveRegistry(registry);
  return newUser;
}

/**
 * Updates a user's password hash.
 */
export function updateUserPassword(email: string, newPasswordHash: string): boolean {
  const registry = loadRegistry();
  const user = registry.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
  if (!user) return false;
  user.passwordHash = newPasswordHash;
  saveRegistry(registry);
  return true;
}

/**
 * Creates and saves a password reset token for a user.
 */
export function savePasswordResetToken(
  email: string,
  token: string,
  expiresMinutes: number = 15
): PasswordResetToken {
  const user = findUserByEmail(email);
  if (!user) throw new Error('User not found.');

  const tokens = loadTokens().filter(
    (t) => t.email.toLowerCase() !== email.toLowerCase()
  );

  const resetToken: PasswordResetToken = {
    token,
    userId: user.id,
    email: user.email,
    expiresAt: Date.now() + expiresMinutes * 60 * 1000,
  };

  tokens.push(resetToken);
  saveTokens(tokens);
  return resetToken;
}

/**
 * Validates a password reset token.
 */
export function getPasswordResetToken(token: string): PasswordResetToken | undefined {
  const tokens = loadTokens();
  const found = tokens.find((t) => t.token === token);
  if (!found) return undefined;

  if (Date.now() > found.expiresAt) {
    saveTokens(tokens.filter((t) => t.token !== token));
    return undefined;
  }

  return found;
}

/**
 * Consumes/deletes a password reset token after use.
 */
export function invalidateResetToken(token: string): void {
  saveTokens(loadTokens().filter((t) => t.token !== token));
}

/**
 * Utility to get all registered users (sanitized without password hashes).
 */
export function getAllUsers(): User[] {
  return loadRegistry().map(({ passwordHash, ...user }) => user);
}
