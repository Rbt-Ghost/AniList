/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";

import { auth, db } from "../firebase/firebase.ts";

type SignUpInput = {
  email: string;
  password: string;
  displayName?: string;
};

type UserProfile = {
  bio: string;
  avatarDataUrl: string | null;
};

type AuthContextValue = {
  user: User | null;
  userProfile: UserProfile;
  profileLoading: boolean;
  authLoading: boolean;
  signUp: (input: SignUpInput) => Promise<User>;
  signIn: (email: string, password: string) => Promise<User>;
  logOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUserProfile: (input: { displayName?: string; bio?: string; avatarDataUrl?: string | null }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const EMPTY_PROFILE: UserProfile = {
  bio: "",
  avatarDataUrl: null,
};

function normalizeProfile(raw: unknown): UserProfile {
  if (!raw || typeof raw !== "object") {
    return EMPTY_PROFILE;
  }

  const candidate = raw as { bio?: unknown; avatarDataUrl?: unknown };
  return {
    bio: typeof candidate.bio === "string" ? candidate.bio : "",
    avatarDataUrl: typeof candidate.avatarDataUrl === "string" ? candidate.avatarDataUrl : null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [profileLoading, setProfileLoading] = useState(false);

  const uid = user?.uid ?? null;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!uid) {
      setUserProfile(EMPTY_PROFILE);
      setProfileLoading(false);
      return;
    }

    let active = true;

    const loadProfile = async () => {
      setProfileLoading(true);

      try {
        const profileRef = doc(db, "users", uid, "profile", "state");
        const snap = await getDoc(profileRef);
        if (!active) return;

        const nextProfile = normalizeProfile(snap.data());
        setUserProfile(nextProfile);
      } catch {
        if (active) {
          setUserProfile(EMPTY_PROFILE);
        }
      } finally {
        if (active) {
          setProfileLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [uid]);

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      userProfile,
      profileLoading,
      authLoading,
      signUp: async ({ email, password, displayName }) => {
        const result = await createUserWithEmailAndPassword(auth, email, password);

        if (displayName && displayName.trim().length > 0) {
          await updateProfile(result.user, { displayName: displayName.trim() });
        }

        await sendEmailVerification(result.user);
        await result.user.reload();
        setUser(auth.currentUser);

        return result.user;
      },
      signIn: async (email, password) => {
        const result = await signInWithEmailAndPassword(auth, email, password);
        await result.user.reload();
        setUser(auth.currentUser);
        return result.user;
      },
      logOut: async () => {
        await signOut(auth);
      },
      sendPasswordReset: async (email) => {
        await sendPasswordResetEmail(auth, email);
      },
      sendVerificationEmail: async () => {
        const current = auth.currentUser;
        if (!current) {
          throw new Error("You must be logged in to verify your email.");
        }

        await sendEmailVerification(current);
      },
      deleteAccount: async () => {
        const current = auth.currentUser;
        if (!current) return;

        // Best-effort cleanup of user data before deleting the auth user.
        try {
          await deleteDoc(doc(db, "users", current.uid, "animeList", "state"));
        } catch (e) {
          console.warn("Failed to delete user anime list from Firestore", e);
        }

        try {
          await deleteDoc(doc(db, "users", current.uid, "profile", "state"));
        } catch (e) {
          console.warn("Failed to delete user profile from Firestore", e);
        }

        await deleteUser(current);
      },
      refreshUser: async () => {
        const current = auth.currentUser;
        if (!current) return;

        await current.reload();
        setUser(auth.currentUser);
      },
      updateUserProfile: async (input) => {
        const current = auth.currentUser;
        if (!current) {
          throw new Error("You must be logged in to update your profile.");
        }

        if (typeof input.displayName === "string") {
          const trimmedDisplayName = input.displayName.trim();
          await updateProfile(current, { displayName: trimmedDisplayName });
          await current.reload();
          setUser(auth.currentUser);
        }

        if (input.bio !== undefined || input.avatarDataUrl !== undefined) {
          const profileRef = doc(db, "users", current.uid, "profile", "state");
          const nextProfile: Partial<UserProfile> = {};

          if (input.bio !== undefined) {
            nextProfile.bio = input.bio.trim().slice(0, 240);
          }

          if (input.avatarDataUrl !== undefined) {
            nextProfile.avatarDataUrl = input.avatarDataUrl;
          }

          await setDoc(
            profileRef,
            {
              ...nextProfile,
              updatedAt: Date.now(),
            },
            { merge: true }
          );

          setUserProfile((currentProfile) => ({
            ...currentProfile,
            ...nextProfile,
          }));
        }
      },
    };
  }, [authLoading, profileLoading, user, userProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
