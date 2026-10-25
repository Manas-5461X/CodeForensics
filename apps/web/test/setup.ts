import '@testing-library/react';
import { vi } from 'vitest';

// Mock Firebase Web SDK for fast, deterministic unit and component tests
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: '[DEFAULT]' })),
  getApps: vi.fn(() => [{ name: '[DEFAULT]' }]),
  getApp: vi.fn(() => ({ name: '[DEFAULT]' })),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
  onAuthStateChanged: vi.fn((_auth, callback) => {
    callback(null);
    return () => {};
  }),
  onIdTokenChanged: vi.fn((_auth, callback) => {
    callback(null);
    return () => {};
  }),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  GithubAuthProvider: vi.fn(),
}));

// Mock global fetch for deterministic UI component tests without live backend
globalThis.fetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
  const urlStr = typeof url === 'string' ? url : url.toString();
  if (urlStr.includes('/api/v1/repositories')) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: [],
        meta: { timestamp: new Date().toISOString() },
      }),
    } as Response;
  }
  if (urlStr.includes('/api/v1/github/installations')) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: [],
        meta: { timestamp: new Date().toISOString() },
      }),
    } as Response;
  }
  return {
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      data: null,
      meta: { timestamp: new Date().toISOString() },
    }),
  } as Response;
});

// Mock window.scrollTo in JSDOM
if (typeof window !== 'undefined') {
  window.scrollTo = vi.fn();
}

