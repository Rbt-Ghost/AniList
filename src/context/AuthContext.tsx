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
import { deleteDoc, doc } from "firebase/firestore";

import { auth, db } from "../firebase/firebase.ts";

type SignUpInput = {
  email: string;
  password: string;
  displayName?: string;
};

type AuthContextValue = {
  user: User | null;
  authLoading: boolean;
  signUp: (input: SignUpInput) => Promise<User>;
  signIn: (email: string, password: string) => Promise<User>;
  logOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
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

        await deleteUser(current);
      },
      refreshUser: async () => {
        const current = auth.currentUser;
        if (!current) return;

        await current.reload();
        setUser(auth.currentUser);
      },
    };
  }, [authLoading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
