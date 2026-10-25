import { describe, it, expect } from 'vitest';
import { formatAuthError } from '../src/utils/authErrors.js';

describe('formatAuthError Utility', () => {
  it('formats auth/unauthorized-domain with title, message, and actionable hint', () => {
    const error = new Error('Firebase: Error (auth/unauthorized-domain).');
    const result = formatAuthError(error);

    expect(result.title).toBe('Domain Not Authorized');
    expect(result.message).toContain('Firebase Authentication settings');
    expect(result.actionHint).toContain('Authorized domains');
  });

  it('formats auth/invalid-credential into user-friendly message', () => {
    const error = new Error('Firebase: Error (auth/invalid-credential).');
    const result = formatAuthError(error);

    expect(result.title).toBe('Invalid Credentials');
    expect(result.message).toContain('email address or password');
  });

  it('formats auth/too-many-requests into rate limit warning', () => {
    const error = new Error('Firebase: Error (auth/too-many-requests).');
    const result = formatAuthError(error);

    expect(result.title).toBe('Too Many Attempts');
    expect(result.actionHint).toContain('wait a few minutes');
  });

  it('formats auth/popup-closed-by-user cleanly', () => {
    const error = new Error('Firebase: Error (auth/popup-closed-by-user).');
    const result = formatAuthError(error);

    expect(result.title).toBe('Sign-in Cancelled');
  });

  it('cleans up unknown raw Firebase error strings without leaking internal wrappers', () => {
    const error = new Error('Firebase: Error (auth/unknown-future-code).');
    const result = formatAuthError(error);

    expect(result.title).toBe('Authentication Failed');
    expect(result.message).not.toContain('Firebase: Error');
  });
});
