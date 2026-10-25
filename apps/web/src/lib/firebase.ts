import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'placeholder-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'codeforensics-dev.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'codeforensics-dev',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'codeforensics-dev.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789012',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789012:web:abcdef123456',
};

/**
 * Checks whether real non-placeholder Firebase credentials are provided.
 */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== 'placeholder-api-key' &&
  firebaseConfig.apiKey.length > 20
);

let app: FirebaseApp;
let auth: Auth;

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  auth = getAuth(app);
} catch (err) {
  console.warn('[Firebase] Initialization warning:', err);
  // Fallback in test/headless environments
  app = getApps()[0] || initializeApp(firebaseConfig, 'fallback-app');
  auth = getAuth(app);
}

export { app, auth };
