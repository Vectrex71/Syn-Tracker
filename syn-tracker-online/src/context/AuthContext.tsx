/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  auth, 
  getMusicianProfile, 
  saveMusicianProfile, 
  MusicianProfile,
  isProUser
} from '../lib/firebase';

interface AuthContextType {
  currentUser: User | null;
  profile: MusicianProfile | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, username: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateMusicianProfile: (data: Partial<MusicianProfile>) => Promise<MusicianProfile | null>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<MusicianProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string, email?: string) => {
    try {
      let p = await getMusicianProfile(uid);
      const isHansjuerg = Boolean(email && (email.toLowerCase().includes('hj.wuethrich') || email.toLowerCase().includes('hjwuethrich')));

      if (!p && email) {
        // Auto-provision initial profile with clean defaults
        const defaultName = isHansjuerg ? 'Hansjuerg Wuethrich' : email.split('@')[0];
        const defaultUser = isHansjuerg ? 'vectrex71' : (email.split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '') || `producer_${uid.slice(0, 5)}`);
        p = await saveMusicianProfile(uid, {
          email,
          username: defaultUser,
          displayName: defaultName,
          isSupporter: isHansjuerg,
          supporterTier: isHansjuerg ? 'vip_backer' : null,
          supporterSince: isHansjuerg ? new Date().toISOString() : null,
        });
      } else if (p) {
        if (isHansjuerg) {
          // Seamlessly update Hansjuerg Wuethrich's profile from the raw email prefix 'hjwuethrich'
          // to his requested display name "Hansjuerg Wuethrich" and handle/avatar name "vectrex71"
          if (p.username === 'hjwuethrich' || p.displayName === 'hjwuethrich' || !p.isSupporter) {
            p = await saveMusicianProfile(uid, {
              username: 'vectrex71',
              displayName: 'Hansjuerg Wuethrich',
              isSupporter: true,
              supporterTier: 'vip_backer',
            });
          }
        } else if (!p.isSupporter && (p.supporterTier === 'monthly' || p.supporterTier === 'yearly' || p.supporterTier === 'lifetime')) {
          p = await saveMusicianProfile(uid, {
            isSupporter: true,
          });
        }
      }
      if (p && isProUser(p)) {
        p = { ...p, isSupporter: true };
      }
      setProfile(p);
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchProfile(user.uid, user.email || undefined);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, pass: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    await fetchProfile(userCredential.user.uid, userCredential.user.email || undefined);
  };

  const signUp = async (email: string, pass: string, username: string, displayName: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const newProfile = await saveMusicianProfile(userCredential.user.uid, {
      email,
      username,
      displayName,
      isSupporter: false,
    });
    setProfile(newProfile);
  };

  const signOut = async () => {
    await fbSignOut(auth);
    setCurrentUser(null);
    setProfile(null);
  };

  const updateMusicianProfile = async (data: Partial<MusicianProfile>): Promise<MusicianProfile | null> => {
    if (!currentUser) return null;
    const updated = await saveMusicianProfile(currentUser.uid, data);
    setProfile(updated);
    return updated;
  };

  const refreshProfile = async () => {
    if (currentUser) {
      await fetchProfile(currentUser.uid, currentUser.email || undefined);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        updateMusicianProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
