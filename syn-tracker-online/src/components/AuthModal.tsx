/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  LogIn, 
  UserPlus, 
  Mail, 
  Lock, 
  User, 
  AlertCircle, 
  Disc
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
  onSuccess,
}) => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        if (!username.trim()) {
          throw new Error('Please enter a username.');
        }
        const cleanUsername = username
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_-]/g, '');
        if (cleanUsername.length < 3) {
          throw new Error('Username must be at least 3 characters (letters, numbers, - and _).');
        }
        await signUp(email, password, cleanUsername, displayName.trim() || cleanUsername);
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      let msg = err.message || 'An error occurred.';
      if (err.code === 'auth/operation-not-allowed') {
        msg = 'Email/Password sign-in is not enabled yet in your Firebase Console. Go to Firebase Console → Authentication → Sign-in method and enable "Email/Password".';
      } else if (err.code === 'auth/unauthorized-domain') {
        msg = 'This domain is not authorized in Firebase Authentication. Add it in Firebase Console → Authentication → Settings → Authorized domains.';
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        msg = 'Invalid email address or incorrect password.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'This email address is already in use.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password is too weak (at least 6 characters required).';
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-[#0b1017] border border-sky-500/30 rounded-2xl p-6 text-slate-100 shadow-2xl shadow-sky-950/50 overflow-hidden"
        >
          {/* Neon Header Accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 via-amber-400 to-sky-400" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Title & Icon */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-inner">
              <Disc className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                {mode === 'signin' ? 'Musician Sign In' : 'Create Musician Account'}
              </h2>
              <p className="text-xs text-slate-400">
                {mode === 'signin' 
                  ? 'Manage your retro portfolio & published tracks' 
                  : 'Create your musician profile & share your tracker works'}
              </p>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Handle / Username (for your Portfolio)
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. captain_amiga"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-slate-700/80 focus:border-sky-400 rounded-lg text-sm text-white placeholder-slate-500 outline-none transition-all"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                    Your URL: syn-tracker.online/?u=<b>{username.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '') || 'your_name'}</b>
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Artist Name (Display Name)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DJ Commodore"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700/80 focus:border-sky-400 rounded-lg text-sm text-white placeholder-slate-500 outline-none transition-all"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-slate-700/80 focus:border-sky-400 rounded-lg text-sm text-white placeholder-slate-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-slate-700/80 focus:border-sky-400 rounded-lg text-sm text-white placeholder-slate-500 outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold rounded-lg shadow-lg shadow-sky-600/30 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : mode === 'signin' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Register Free</span>
                </>
              )}
            </button>
          </form>

          {/* Toggle between Sign In / Sign Up */}
          <div className="mt-5 pt-4 border-t border-slate-800 text-center">
            {mode === 'signin' ? (
              <p className="text-xs text-slate-400">
                Don't have a musician account yet?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(null); }}
                  className="text-sky-400 hover:text-sky-300 font-semibold underline underline-offset-2 ml-1 cursor-pointer"
                >
                  Register now
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-400">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError(null); }}
                  className="text-sky-400 hover:text-sky-300 font-semibold underline underline-offset-2 ml-1 cursor-pointer"
                >
                  Sign in here
                </button>
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
