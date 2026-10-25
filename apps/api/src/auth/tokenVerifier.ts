import { initializeApp, getApps, cert, applicationDefault, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'node:fs';
import type { AppConfig } from '../config/env.js';

export interface DecodedAuthToken {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
  [key: string]: unknown;
}

export interface TokenVerifier {
  verifyIdToken(token: string): Promise<DecodedAuthToken>;
}

export class FirebaseAdminTokenVerifier implements TokenVerifier {
  private app: App;

  constructor(config: AppConfig) {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      this.app = existingApps[0]!;
      return;
    }

    if (config.FIREBASE_AUTH_EMULATOR_HOST) {
      process.env.FIREBASE_AUTH_EMULATOR_HOST = config.FIREBASE_AUTH_EMULATOR_HOST;
    }

    let credential = applicationDefault();

    if (config.FIREBASE_SERVICE_ACCOUNT_PATH && fs.existsSync(config.FIREBASE_SERVICE_ACCOUNT_PATH)) {
      try {
        const fileContent = JSON.parse(fs.readFileSync(config.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8'));
        credential = cert(fileContent);
      } catch (err) {
        console.error(
          `[FirebaseAdminTokenVerifier] Failed to parse service account from ${config.FIREBASE_SERVICE_ACCOUNT_PATH}:`,
          err
        );
      }
    } else if (config.FIREBASE_CLIENT_EMAIL && config.FIREBASE_PRIVATE_KEY) {
      const privateKey = config.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      credential = cert({
        projectId: config.FIREBASE_PROJECT_ID,
        clientEmail: config.FIREBASE_CLIENT_EMAIL,
        privateKey,
      });
    }

    this.app = initializeApp({
      credential,
      projectId: config.FIREBASE_PROJECT_ID,
    });
  }

  async verifyIdToken(token: string): Promise<DecodedAuthToken> {
    const decoded = await getAuth(this.app).verifyIdToken(token);
    return {
      ...decoded,
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
      email_verified: decoded.email_verified,
    };
  }
}

/**
 * In-memory test token verifier allowing unit tests to simulate valid, expired,
 * and malformed tokens without hitting external Google APIs.
 */
export class MockTokenVerifier implements TokenVerifier {
  private validTokens: Map<string, DecodedAuthToken>;

  constructor(initialTokens: Record<string, DecodedAuthToken> = {}) {
    this.validTokens = new Map(Object.entries(initialTokens));
  }

  setToken(token: string, payload: DecodedAuthToken): void {
    this.validTokens.set(token, payload);
  }

  registerToken(token: string, payload: DecodedAuthToken): void {
    this.validTokens.set(token, payload);
  }

  removeToken(token: string): void {
    this.validTokens.delete(token);
  }

  async verifyIdToken(token: string): Promise<DecodedAuthToken> {
    if (token === 'expired-token') {
      const error = new Error('Firebase ID token has expired');
      (error as { code?: string }).code = 'auth/id-token-expired';
      throw error;
    }

    if (token === 'revoked-token') {
      const error = new Error('Firebase ID token has been revoked');
      (error as { code?: string }).code = 'auth/id-token-revoked';
      throw error;
    }

    const payload = this.validTokens.get(token);
    if (!payload) {
      const error = new Error('Firebase ID token verification failed: token is invalid');
      (error as { code?: string }).code = 'auth/argument-error';
      throw error;
    }

    return payload;
  }
}

export function createTokenVerifier(config: AppConfig, customVerifier?: TokenVerifier): TokenVerifier {
  if (customVerifier) {
    return customVerifier;
  }

  // If in test mode and no explicit credentials provided, default to MockTokenVerifier
  if (config.NODE_ENV === 'test' && !config.FIREBASE_CLIENT_EMAIL && !config.FIREBASE_SERVICE_ACCOUNT_PATH) {
    return new MockTokenVerifier();
  }

  return new FirebaseAdminTokenVerifier(config);
}
