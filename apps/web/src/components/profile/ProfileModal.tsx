import React, { useState } from 'react';
import {
  X,
  User as UserIcon,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { Button } from '../ui/Button.js';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, updateUserProfile, updateUserPassword, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  if (!isOpen || !user) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setStatusMessage({ type: 'error', text: 'Display name cannot be empty.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      await updateUserProfile(displayName.trim());
      setStatusMessage({
        type: 'success',
        text: 'Profile name successfully updated.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile name.';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      setStatusMessage({ type: 'error', text: 'Please enter a new password.' });
      return;
    }
    if (newPassword.length < 6) {
      setStatusMessage({
        type: 'error',
        text: 'Password must be at least 6 characters long.',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatusMessage({
        type: 'error',
        text: 'New password and confirmation password do not match.',
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      await updateUserPassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setStatusMessage({
        type: 'success',
        text: 'Password updated successfully.',
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to update password. If this error persists, please sign out and sign back in to re-authenticate.';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'CF';
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-surface rounded-lg border border-border-strong shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-bold text-primary">
              Account & Profile Settings
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-primary-muted hover:text-primary p-1 rounded hover:bg-surface-subtle transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Identity Summary Card */}
        <div className="p-4 bg-surface-subtle/50 border-b border-border-subtle shrink-0 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-accent/15 border border-accent/30 text-accent font-bold flex items-center justify-center text-sm tracking-wider shrink-0">
            {getInitials(user.displayName, user.email)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-primary truncate">
              {user.displayName || 'No Name Set'}
            </div>
            <div className="text-xs text-primary-muted font-mono truncate flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3 h-3 text-primary-muted shrink-0" />
              <span>{user.email}</span>
            </div>
            <div className="text-[10px] text-primary-muted font-mono truncate mt-0.5">
              UID: {user.uid}
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-border-subtle px-4 shrink-0 bg-surface">
          <button
            type="button"
            onClick={() => {
              setActiveTab('profile');
              setStatusMessage(null);
            }}
            className={`py-2 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'profile'
                ? 'border-accent text-accent'
                : 'border-transparent text-primary-muted hover:text-primary'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            General Profile
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('password');
              setStatusMessage(null);
            }}
            className={`py-2 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'password'
                ? 'border-accent text-accent'
                : 'border-transparent text-primary-muted hover:text-primary'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Security & Password
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Status Alert Banner */}
          {statusMessage && (
            <div
              className={`p-3 rounded border text-xs flex items-start gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{statusMessage.text}</span>
            </div>
          )}

          {activeTab === 'profile' ? (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-primary block mb-1">
                  Full Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Manas Gandhi"
                  className="w-full bg-surface-subtle text-xs text-primary rounded px-3 py-2 border border-border-strong focus:outline-none focus:border-link"
                  required
                />
                <p className="text-[11px] text-primary-muted mt-1">
                  This name is displayed across your investigations, evidence citations, and team reviews.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-primary block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user.email || ''}
                  disabled
                  className="w-full bg-surface-subtle/50 text-xs text-primary-muted rounded px-3 py-2 border border-border-subtle cursor-not-allowed font-mono"
                />
                <p className="text-[11px] text-primary-muted mt-1">
                  Managed via Firebase authentication identity provider.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? 'Saving Name...' : 'Save Name Changes'}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="p-2.5 rounded bg-surface-subtle border border-border-subtle flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <p className="text-[11px] text-primary-secondary leading-relaxed">
                  Update your authentication password. Minimum 6 characters. If you signed in via OAuth (Google/GitHub), update your credentials directly with the provider.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-primary block mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface-subtle text-xs text-primary rounded px-3 py-2 border border-border-strong focus:outline-none focus:border-link font-mono"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-primary block mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface-subtle text-xs text-primary rounded px-3 py-2 border border-border-strong focus:outline-none focus:border-link font-mono"
                  required
                  minLength={6}
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? 'Updating Password...' : 'Update Password'}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="flex items-center justify-between px-4 py-3 bg-surface-subtle border-t border-border-subtle shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={async () => {
              onClose();
              await signOut();
            }}
            leftIcon={<LogOut className="w-3.5 h-3.5 text-danger" />}
            className="text-danger hover:text-danger border-border-subtle hover:border-danger/40 text-xs"
          >
            Sign Out
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
