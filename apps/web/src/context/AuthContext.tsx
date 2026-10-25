import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  GithubAuthProvider,
  updateProfile,
  updatePassword,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase.js';
import { formatAuthError } from '../utils/authErrors.js';

export interface AuthContextValue {
  user: User | null;
  idToken: string | null;
  isLoading: boolean;
  isConfigured: boolean;
  error: string | null;
  signInWithEmail: (email: string, pass: string) => Promise<User>;
  signUpWithEmail: (email: string, pass: string) => Promise<User>;
  signInWithGoogle: () => Promise<User>;
  signInWithGithub: () => Promise<User>;
  signOut: () => Promise<void>;
  updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>;
  updateUserPassword: (newPassword: string) => Promise<void>;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: React.ReactNode;
  initialUser?: User | null;
  initialLoading?: boolean;
}

export function AuthProvider({
  children,
  initialUser = null,
  initialLoading,
}: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(
    initialLoading !== undefined ? initialLoading : (initialUser ? false : true)
  );
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const getIdToken = useCallback(async (forceRefresh = false): Promise<string | null> => {
    if (!user) {
      setIdToken(null);
      return null;
    }
    try {
      const token = await user.getIdToken(forceRefresh);
      setIdToken(token);
      return token;
    } catch (err: unknown) {
      console.error('[Auth] Failed to retrieve ID token:', err);
      return null;
    }
  }, [user]);

  // Sync authentication state from Firebase Web SDK
  useEffect(() => {
    // If testing with an explicit initialUser override, skip the Firebase listener
    if (initialUser !== null) {
      setIsLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          setIdToken(token);
        } catch {
          setIdToken(null);
        }
      } else {
        setIdToken(null);
      }
      setIsLoading(false);
    });

    const unsubscribeToken = onIdTokenChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          setIdToken(token);
        } catch {
          setIdToken(null);
        }
      } else {
        setIdToken(null);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeToken();
    };
  }, [initialUser]);

  const signInWithEmail = useCallback(async (email: string, pass: string): Promise<User> => {
    setError(null);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, pass);
      const token = await credential.user.getIdToken();
      setUser(credential.user);
      setIdToken(token);
      return credential.user;
    } catch (err: unknown) {
      const formatted = formatAuthError(err);
      setError(formatted.message);
      throw err;
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, pass: string): Promise<User> => {
    setError(null);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, pass);
      const token = await credential.user.getIdToken();
      setUser(credential.user);
      setIdToken(token);
      return credential.user;
    } catch (err: unknown) {
      const formatted = formatAuthError(err);
      setError(formatted.message);
      throw err;
    }
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<User> => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      const token = await credential.user.getIdToken();
      setUser(credential.user);
      setIdToken(token);
      return credential.user;
    } catch (err: unknown) {
      const formatted = formatAuthError(err);
      setError(formatted.message);
      throw err;
    }
  }, []);

  const signInWithGithub = useCallback(async (): Promise<User> => {
    setError(null);
    try {
      const provider = new GithubAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      const token = await credential.user.getIdToken();
      setUser(credential.user);
      setIdToken(token);
      return credential.user;
    } catch (err: unknown) {
      const formatted = formatAuthError(err);
      setError(formatted.message);
      throw err;
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setIdToken(null);
    } catch (err: unknown) {
      const formatted = formatAuthError(err);
      setError(formatted.message);
      throw err;
    }
  }, []);

  const updateUserProfile = useCallback(async (displayName: string, photoURL?: string): Promise<void> => {
    setError(null);
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: displayName.trim(),
          photoURL: photoURL || null,
        });
        // Create shallow clone with updated fields so React state triggers re-renders
        const updated = Object.assign(Object.create(Object.getPrototypeOf(auth.currentUser)), auth.currentUser, {
          displayName: displayName.trim(),
          photoURL: photoURL || null,
        });
        setUser(updated as User);
      } else if (user) {
        // Fallback for mock/test users
        const updated = Object.assign(Object.create(Object.getPrototypeOf(user)), user, {
          displayName: displayName.trim(),
          photoURL: photoURL || null,
        });
        setUser(updated as User);
      } else {
        throw new Error('No authenticated user session found');
      }
    } catch (err: unknown) {
      const formatted = formatAuthError(err);
      setError(formatted.message);
      throw err;
    }
  }, [user]);

  const updateUserPassword = useCallback(async (newPassword: string): Promise<void> => {
    setError(null);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
      } else if (!user) {
        throw new Error('No authenticated user session found');
      }
    } catch (err: unknown) {
      const formatted = formatAuthError(err);
      setError(formatted.message);
      throw err;
    }
  }, [user]);

  const value: AuthContextValue = {
    user,
    idToken,
    isLoading,
    isConfigured: isFirebaseConfigured,
    error,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithGithub,
    signOut,
    updateUserProfile,
    updateUserPassword,
    getIdToken,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
