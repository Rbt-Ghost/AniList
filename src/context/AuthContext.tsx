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
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase/firebase.ts";
import { makeFriendSnapshot, normalizeUsername, usernameDocId } from "../utils/social.ts";

type SignUpInput = {
  email: string;
  password: string;
  displayName?: string;
};

type UserProfile = {
  bio: string;
  avatarDataUrl: string | null;
};

type CachedProfile = UserProfile;

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

const PROFILE_CACHE_PREFIX = "anilist:user-profile:";

function getProfileCacheKey(uid: string): string {
  return `${PROFILE_CACHE_PREFIX}${uid}`;
}

function readCachedProfile(uid: string): CachedProfile | null {
  try {
    const raw = window.localStorage.getItem(getProfileCacheKey(uid));
    if (!raw) return null;

    return normalizeProfile(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeCachedProfile(uid: string, profile: UserProfile): void {
  try {
    window.localStorage.setItem(getProfileCacheKey(uid), JSON.stringify(profile));
  } catch {
    // Ignore storage quota / privacy mode failures.
  }
}

function clearCachedProfile(uid: string): void {
  try {
    window.localStorage.removeItem(getProfileCacheKey(uid));
  } catch {
    // Ignore storage failures.
  }
}

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

async function syncUsernameDirectoryEntry(
  uid: string,
  previousDisplayName: string | null,
  nextDisplayName: string,
  avatarDataUrl: string | null,
  emailVerified: boolean,
  bio: string
) {
  const nextDocId = usernameDocId(nextDisplayName);
  if (!nextDocId) {
    throw new Error("Username cannot be empty.");
  }

  const previousDocId = previousDisplayName ? usernameDocId(previousDisplayName) : null;

  await runTransaction(db, async (transaction) => {
    const nextRef = doc(db, "usernames", nextDocId);
    const nextSnap = await transaction.get(nextRef);

    if (nextSnap.exists() && nextSnap.data().uid !== uid) {
      throw new Error("That username is already taken.");
    }

    if (previousDocId && previousDocId !== nextDocId) {
      const previousRef = doc(db, "usernames", previousDocId);
      const previousSnap = await transaction.get(previousRef);

      if (previousSnap.exists() && previousSnap.data().uid === uid) {
        transaction.delete(previousRef);
      }
    }

    transaction.set(
      nextRef,
      {
        uid,
        displayName: nextDisplayName,
        avatarDataUrl,
        emailVerified,
        bio,
        normalizedName: normalizeUsername(nextDisplayName),
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  });
}

async function refreshFriendshipSnapshots(
  uid: string,
  displayName: string,
  avatarDataUrl: string | null,
  emailVerified: boolean,
  bio: string
) {
  try {
    const snapshotQuery = query(collection(db, "friendships"), where("participants", "array-contains", uid));
    const snapshot = await getDocs(snapshotQuery);

    await Promise.all(
      snapshot.docs.map((relationshipDoc) => {
        const data = relationshipDoc.data() as { requestedByUid?: string } | undefined;
        const snapshotData = makeFriendSnapshot(uid, displayName, avatarDataUrl, emailVerified, bio);

        if (data?.requestedByUid === uid) {
          return updateDoc(relationshipDoc.ref, {
            requesterSnapshot: snapshotData,
            updatedAt: Date.now(),
          });
        }

        return updateDoc(relationshipDoc.ref, {
          recipientSnapshot: snapshotData,
          updatedAt: Date.now(),
        });
      })
    );
  } catch (error) {
    console.warn("Failed to refresh friendship snapshots", error);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [profileLoading, setProfileLoading] = useState(false);

  const uid = user?.uid ?? null;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      if (nextUser) {
        setUserProfile(readCachedProfile(nextUser.uid) ?? EMPTY_PROFILE);
      } else {
        setUserProfile(EMPTY_PROFILE);
      }

      setUser(nextUser);
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!uid) {
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
        writeCachedProfile(uid, nextProfile);
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

  useEffect(() => {
    if (!uid) return;

    const resolvedDisplayName = user?.displayName?.trim() || null;
    if (!resolvedDisplayName) return;

    void syncUsernameDirectoryEntry(
      uid,
      resolvedDisplayName,
      resolvedDisplayName,
      userProfile.avatarDataUrl,
      user?.emailVerified ?? false,
      userProfile.bio
    ).catch((error) => {
      console.warn("Failed to refresh username directory entry", error);
    });

    void refreshFriendshipSnapshots(uid, resolvedDisplayName, userProfile.avatarDataUrl, user?.emailVerified ?? false, userProfile.bio).catch(
      (error) => {
        console.warn("Failed to refresh friendship snapshots", error);
      }
    );
  }, [uid, user?.displayName, user?.emailVerified, userProfile.avatarDataUrl, userProfile.bio]);

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      userProfile,
      profileLoading,
      authLoading,
      signUp: async ({ email, password, displayName }) => {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const resolvedDisplayName = (displayName?.trim() || email.split("@")[0] || "User").trim();

        await updateProfile(result.user, { displayName: resolvedDisplayName });

        try {
          await syncUsernameDirectoryEntry(result.user.uid, null, resolvedDisplayName, null, false, "");
        } catch (error) {
          try {
            await deleteUser(result.user);
          } catch {
            // Ignore rollback failures.
          }

          throw error;
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

        const currentDisplayName = current.displayName?.trim() || null;

        // Best-effort cleanup of user data before deleting the auth user.
        try {
          await deleteDoc(doc(db, "users", current.uid, "animeList", "state"));
        } catch (e) {
          console.warn("Failed to delete user anime list from Firestore", e);
        }

        try {
          await deleteDoc(doc(db, "users", current.uid, "profile", "state"));
          clearCachedProfile(current.uid);
        } catch (e) {
          console.warn("Failed to delete user profile from Firestore", e);
        }

        try {
          const friendshipsQuery = query(collection(db, "friendships"), where("participants", "array-contains", current.uid));
          const friendshipsSnapshot = await getDocs(friendshipsQuery);
          await Promise.all(friendshipsSnapshot.docs.map((relationshipDoc) => deleteDoc(relationshipDoc.ref)));
        } catch (e) {
          console.warn("Failed to delete user friendships from Firestore", e);
        }

        if (currentDisplayName) {
          try {
            await deleteDoc(doc(db, "usernames", usernameDocId(currentDisplayName)));
          } catch (e) {
            console.warn("Failed to delete username index from Firestore", e);
          }
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

        const previousDisplayName = current.displayName?.trim() || null;
        const currentEmailVerified = current.emailVerified;
        const nextDisplayName = typeof input.displayName === "string" ? input.displayName.trim() : null;
        const nextAvatarDataUrl = input.avatarDataUrl !== undefined ? input.avatarDataUrl : userProfile.avatarDataUrl;
        const nextBio = input.bio !== undefined ? input.bio.trim().slice(0, 240) : userProfile.bio;

        if (nextDisplayName !== null) {
          await updateProfile(current, { displayName: nextDisplayName });
          await current.reload();
          setUser(auth.currentUser);
        }

        if (input.bio !== undefined || input.avatarDataUrl !== undefined) {
          const profileRef = doc(db, "users", current.uid, "profile", "state");
          const nextProfile: Partial<UserProfile> = {};

          if (input.bio !== undefined) {
            nextProfile.bio = nextBio;
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

          writeCachedProfile(current.uid, {
            ...userProfile,
            ...nextProfile,
          });
        }

        const resolvedDisplayName = nextDisplayName ?? previousDisplayName;
        if (resolvedDisplayName) {
          try {
            await syncUsernameDirectoryEntry(
              current.uid,
              previousDisplayName,
              resolvedDisplayName,
              nextAvatarDataUrl,
              currentEmailVerified,
              nextBio
            );
            await refreshFriendshipSnapshots(current.uid, resolvedDisplayName, nextAvatarDataUrl, currentEmailVerified, nextBio);
          } catch (error) {
            if (nextDisplayName !== null && previousDisplayName) {
              try {
                await updateProfile(current, { displayName: previousDisplayName });
                await current.reload();
                setUser(auth.currentUser);
              } catch {
                // Ignore rollback failures.
              }
            }

            throw error;
          }
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
