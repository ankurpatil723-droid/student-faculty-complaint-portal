'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Role } from '@/lib/types';
import { DEMO_STUDENT, DEMO_TEACHER, DEMO_ADMIN } from '@/lib/demo-data';

interface AuthContextType {
  user: User;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginAsRole: (role: Role, customEmail?: string, customName?: string, customDept?: string) => void;
  loginCustomUser: (userData: Partial<User>) => void;
  updateUserProfile: (updatedData: Partial<User>) => void;
  loginApi: (email: string, password: string, selectedRole?: Role) => Promise<{ success: boolean; error?: string; user?: User }>;
  registerApi: (formData: Record<string, any>) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const STORAGE_KEY = 'rscoe_portal_user_session';
const PROFILE_STORE_PREFIX = 'rscoe_profile_';

// Get previously saved profile edits for a specific email
const getSavedProfile = (email: string): Partial<User> => {
  if (typeof window === 'undefined') return {};
  try {
    const key = PROFILE_STORE_PREFIX + email.toLowerCase().trim();
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

// Save profile edits keyed by email so they persist across logins
const saveProfileForEmail = (email: string, data: Partial<User>) => {
  if (typeof window === 'undefined') return;
  try {
    const key = PROFILE_STORE_PREFIX + email.toLowerCase().trim();
    const existing = getSavedProfile(email);
    localStorage.setItem(key, JSON.stringify({ ...existing, ...data }));
  } catch (e) {
    console.error('Failed to persist profile data', e);
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User>(DEMO_STUDENT);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check server-side session on initial mount
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setUser(data.user);
            setIsAuthenticated(true);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Server session check failed, falling back to cached session.');
      }

      // Local storage fallback
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          setUser(JSON.parse(saved));
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.error('Failed to load session from localStorage', e);
      } finally {
        setIsLoading(false);
      }
    }

    checkSession();
  }, []);

  const saveUser = (newUser: User) => {
    setUser(newUser);
    setIsAuthenticated(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    } catch (e) {
      console.error('Failed to save session to localStorage', e);
    }
  };

  const loginApi = async (email: string, password: string, selectedRole?: Role) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, selectedRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Authentication failed.' };
      }

      saveUser(data.user);
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during login.' };
    }
  };

  const registerApi = async (formData: Record<string, any>) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed.' };
      }

      saveUser(data.user);
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during registration.' };
    }
  };

  const loginAsRole = (role: Role, customEmail?: string, customName?: string, customDept?: string) => {
    const ACCOUNT_PROFILES: Record<string, Partial<User>> = {
      'ganesh.patil.comp@jspm.edu.in': {
        id: 'usr-001',
        name: 'Ganesh Patil',
        email: 'ganesh.patil.comp@jspm.edu.in',
        role: 'STUDENT',
        department: 'Computer Engineering',
        rollNumber: 'COMP2021089',
        year: 'Third Year',
        division: 'B',
      },
      'pooja.sharma.it@jspm.edu.in': {
        id: 'usr-005',
        name: 'Pooja Sharma',
        email: 'pooja.sharma.it@jspm.edu.in',
        role: 'STUDENT',
        department: 'Information Technology',
        rollNumber: 'IT2021045',
        year: 'Fourth Year',
        division: 'A',
      },
      'anil.kadam.comp@jspm.org': {
        id: 'usr-002',
        name: 'Prof. Anil Kadam',
        email: 'anil.kadam.comp@jspm.org',
        role: 'TEACHER',
        department: 'Computer Engineering',
        designation: 'Assistant Professor',
      },
      'sunita.rao.it@jspm.org': {
        id: 'usr-006',
        name: 'Dr. Sunita Rao',
        email: 'sunita.rao.it@jspm.org',
        role: 'TEACHER',
        department: 'Information Technology',
        designation: 'Associate Professor',
      },
      'hod.computer@jspm.edu.in': {
        id: 'usr-003',
        name: 'Dr. Suresh Mane',
        email: 'hod.computer@jspm.edu.in',
        role: 'HEAD',
        department: 'Computer Engineering',
        designation: 'Head of Department (Computer)',
      },
      'principal@jspm.edu.in': {
        id: 'usr-004',
        name: 'Dr. Rajesh Deshmukh',
        email: 'principal@jspm.edu.in',
        role: 'SUPER_ADMIN',
        department: 'Administration',
        designation: 'Principal & Super Administrator',
      },
    };

    let targetUser: User;

    if (customEmail && customEmail.trim()) {
      const emailKey = customEmail.trim().toLowerCase();
      if (ACCOUNT_PROFILES[emailKey]) {
        targetUser = {
          ...DEMO_STUDENT,
          ...ACCOUNT_PROFILES[emailKey],
          role: role === 'ADMIN' ? 'HEAD' : (ACCOUNT_PROFILES[emailKey].role || role),
        } as User;
      } else {
        // Derive name formatted cleanly from email username (e.g. ankur.patil -> Ankur Patil)
        const username = emailKey.split('@')[0];
        const nameParts = username
          .split(/[\._\-]/)
          .filter((p) => !['comp', 'it', 'mech', 'civil', 'entc', 'jspm', 'edu', 'in', 'org'].includes(p.toLowerCase()));
        const derivedName = nameParts.length > 0
          ? nameParts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ')
          : 'User ' + username;

        const effectiveRole = role === 'ADMIN' ? 'HEAD' : role;
        targetUser = {
          id: `usr-${emailKey.replace(/[^a-z0-9]/g, '-')}`,
          name: customName && customName.trim() ? customName.trim() : derivedName,
          email: customEmail.trim(),
          role: effectiveRole,
          department: customDept && customDept.trim()
            ? customDept.trim()
            : emailKey.includes('it')
            ? 'Information Technology'
            : emailKey.includes('mech')
            ? 'Mechanical Engineering'
            : emailKey.includes('civil')
            ? 'Civil Engineering'
            : 'Computer Engineering',
          rollNumber: effectiveRole === 'STUDENT' ? `RSC${Math.floor(100000 + Math.random() * 900000)}` : undefined,
          year: effectiveRole === 'STUDENT' ? 'Third Year' : undefined,
          division: effectiveRole === 'STUDENT' ? 'A' : undefined,
          designation: effectiveRole !== 'STUDENT' ? (effectiveRole === 'TEACHER' ? 'Faculty Member' : 'Department Head') : undefined,
          joinedAt: new Date().toISOString(),
        };
      }
    } else {
      if (role === 'TEACHER') {
        targetUser = { ...DEMO_TEACHER };
      } else if (role === 'ADMIN' || role === 'HEAD') {
        targetUser = { ...DEMO_ADMIN, role: 'HEAD' };
      } else if (role === 'SUPER_ADMIN') {
        targetUser = ACCOUNT_PROFILES['principal@jspm.edu.in'] as User;
      } else {
        targetUser = { ...DEMO_STUDENT };
      }
    }

    if (customName && customName.trim()) {
      targetUser.name = customName.trim();
    }
    if (customDept && customDept.trim()) {
      targetUser.department = customDept.trim();
    }

    // Merge any previously saved profile edits for this email on top
    const savedOverrides = getSavedProfile(targetUser.email);
    if (Object.keys(savedOverrides).length > 0) {
      targetUser = { ...targetUser, ...savedOverrides, email: targetUser.email, role: targetUser.role } as User;
    }

    saveUser(targetUser);
  };

  const loginCustomUser = (userData: Partial<User>) => {
    const newUser: User = {
      id: userData.id || `usr-${(userData.email || 'user').replace(/[^a-z0-9]/gi, '-')}`,
      name: userData.name || 'User',
      email: userData.email || 'user@jspm.edu.in',
      role: userData.role || 'STUDENT',
      department: userData.department || 'Computer Engineering',
      rollNumber: userData.rollNumber,
      year: userData.year,
      division: userData.division,
      designation: userData.designation,
      phone: userData.phone,
      joinedAt: userData.joinedAt || new Date().toISOString(),
    };
    saveUser(newUser);
    saveProfileForEmail(newUser.email, newUser);
  };

  const updateUserProfile = (updatedData: Partial<User>) => {
    setUser((prev) => {
      const newUser = { ...prev, ...updatedData };
      // Persist to session storage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      // Also persist keyed by email so data survives re-login
      saveProfileForEmail(prev.email, updatedData);
      return newUser;
    });
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout API call failed', err);
    }
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    setUser(DEMO_STUDENT);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        loginAsRole,
        loginCustomUser,
        updateUserProfile,
        loginApi,
        registerApi,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
