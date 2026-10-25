/**
 * CodeForensics - Human-friendly Firebase & Authentication Error Formatter
 * Translates raw Firebase SDK codes (e.g., auth/unauthorized-domain) into
 * clear, professional, actionable messages.
 */

export interface FormattedAuthError {
  title: string;
  message: string;
  actionHint?: string;
}

export function formatAuthError(err: unknown): FormattedAuthError {
  if (!err) {
    return {
      title: 'Authentication Error',
      message: 'An unknown authentication error occurred. Please try again.',
    };
  }

  const raw = err instanceof Error ? err.message : String(err);

  // Extract Firebase error code if present: "auth/unauthorized-domain" or "(auth/xxx)"
  const codeMatch = raw.match(/auth\/([a-z0-9-]+)/i);
  const code = codeMatch ? codeMatch[1].toLowerCase() : null;

  switch (code) {
    case 'unauthorized-domain':
      return {
        title: 'Domain Not Authorized',
        message: 'This web domain is not authorized in your Firebase Authentication settings.',
        actionHint:
          'To fix this, go to Firebase Console → Authentication → Settings → Authorized domains, and add this domain (e.g. your Vercel URL).',
      };

    case 'invalid-credential':
    case 'wrong-password':
    case 'user-not-found':
      return {
        title: 'Invalid Credentials',
        message: 'The email address or password you entered is incorrect.',
        actionHint: 'Please verify your credentials or create an account if you are a new maintainer.',
      };

    case 'email-already-in-use':
      return {
        title: 'Account Already Exists',
        message: 'An account is already registered with this email address.',
        actionHint: 'Please switch to Sign In with your existing password or identity provider.',
      };

    case 'weak-password':
      return {
        title: 'Password Too Weak',
        message: 'The provided password does not meet security requirements.',
        actionHint: 'Please choose a stronger password with at least 6 characters.',
      };

    case 'invalid-email':
      return {
        title: 'Invalid Email Format',
        message: 'The provided email address is not properly formatted.',
        actionHint: 'Please enter a valid email address (e.g. maintainer@domain.org).',
      };

    case 'user-disabled':
      return {
        title: 'Account Disabled',
        message: 'This account has been disabled by an administrator.',
        actionHint: 'Contact your organization administrator to restore access.',
      };

    case 'too-many-requests':
      return {
        title: 'Too Many Attempts',
        message: 'Access to this account has been temporarily disabled due to multiple failed sign-in attempts.',
        actionHint: 'Please wait a few minutes before trying again or reset your password.',
      };

    case 'operation-not-allowed':
      return {
        title: 'Sign-in Method Disabled',
        message: 'This authentication provider is not enabled in the Firebase project.',
        actionHint: 'Enable Email/Password or OAuth in Firebase Console → Authentication → Sign-in method.',
      };

    case 'popup-closed-by-user':
      return {
        title: 'Sign-in Cancelled',
        message: 'The authentication window was closed before completing the sign-in.',
        actionHint: 'Click the provider button again and complete the authorization prompt.',
      };

    case 'popup-blocked':
      return {
        title: 'Popup Window Blocked',
        message: 'Your web browser blocked the authentication pop-up window.',
        actionHint: 'Please allow pop-ups for this website in your browser address bar and retry.',
      };

    case 'network-request-failed':
      return {
        title: 'Network Connection Issue',
        message: 'Unable to reach the authentication servers.',
        actionHint: 'Please check your internet connection and try again.',
      };

    case 'configuration-not-found':
      return {
        title: 'Firebase Project Configuration Missing',
        message: 'Authentication configuration was not found for this environment.',
        actionHint: 'Verify that VITE_FIREBASE_* environment variables are set in your deployment settings.',
      };

    default: {
      // Clean up generic "Firebase: Error (...)" prefix if present
      const cleanMessage = raw
        .replace(/^Firebase:\s*/i, '')
        .replace(/^Error\s*\(([^)]+)\)\.?/i, '$1')
        .replace(/^Error:\s*/i, '')
        .trim();

      return {
        title: 'Authentication Failed',
        message: cleanMessage || 'An unexpected error occurred during authentication.',
      };
    }
  }
}
