import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { User } from "firebase/auth";
import { collection, deleteDoc, doc, getDoc, onSnapshot, query, runTransaction, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { useAuth } from "../context/AuthContext.tsx";
import { getFriendlyAuthError } from "../utils/firebaseAuthErrors.ts";
import { lockScroll, unlockScroll } from "../utils/scrollLock";
import { db } from "../firebase/firebase.ts";
import { friendshipDocId, makeFriendSnapshot, type FriendshipRecord, type UserDirectoryEntry, usernameDocId } from "../utils/social.ts";
import UserTab from "./accountPopup/UserTab.tsx";
import FriendsTab from "./accountPopup/FriendsTab.tsx";
import SettingsTab from "./accountPopup/SettingsTab.tsx";
import AboutTab from "./accountPopup/AboutTab.tsx";

type Props = {
  open: boolean;
  user: User;
  onClose: () => void;
};

type TabId = "user" | "friends" | "settings" | "about";

const MAX_AVATAR_SIZE_BYTES = 1_000_000;

// --- High Quality SVG Icons ---

function UserIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function FriendsIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}

// --- Component ---

export default function AccountPopup({ open, user, onClose }: Props) {
  const navigate = useNavigate();
  const { userProfile, updateUserProfile, logOut, deleteAccount } = useAuth();

  const [activeTab, setActiveTab] = useState<TabId>("user");
  const [busy, setBusy] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);

  const [friendQuery, setFriendQuery] = useState("");
  const [friendSearchResult, setFriendSearchResult] = useState<UserDirectoryEntry | null>(null);
  const [friendships, setFriendships] = useState<FriendshipRecord[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [friendActionMenuUid, setFriendActionMenuUid] = useState<string | null>(null);

  const bioRef = useRef<HTMLTextAreaElement>(null);
  const friendMenuRef = useRef<HTMLDivElement | null>(null);

  const userLabel = useMemo(() => {
    return (user.displayName?.trim() || user.email?.trim() || "User").trim();
  }, [user.displayName, user.email]);

  const userInitial = userLabel.length > 0 ? userLabel[0]!.toUpperCase() : "U";

  useEffect(() => {
    if (!open) return;

    lockScroll();

    setDisplayName(user.displayName ?? "");
    setBio(userProfile.bio ?? "");
    setAvatarDataUrl(userProfile.avatarDataUrl ?? null);
    setActiveTab("user");

    return () => {
      unlockScroll();
    };
  }, [open, user.displayName, userProfile.avatarDataUrl, userProfile.bio]);

  // Auto-resize the bio textarea whenever its value changes or the tab is active
  useEffect(() => {
    if (activeTab === "user" && bioRef.current) {
      bioRef.current.style.height = "auto";
      bioRef.current.style.height = `${bioRef.current.scrollHeight}px`;
    }
  }, [bio, activeTab]);

  useEffect(() => {
    if (!open || activeTab !== "friends") return;

    setFriendsLoading(true);

    const friendshipsQuery = query(collection(db, "friendships"), where("participants", "array-contains", user.uid));
    const unsubscribe = onSnapshot(
      friendshipsQuery,
      (snapshot) => {
        const nextFriendships = snapshot.docs
          .map((relationshipDoc) => relationshipDoc.data() as FriendshipRecord)
          .sort((left, right) => right.updatedAt - left.updatedAt);

        setFriendships(nextFriendships);
        setFriendsLoading(false);
      },
      (snapshotError) => {
        console.error("Failed to load friendships", snapshotError);
        toast.error("Failed to load your friends list.");
        setFriendsLoading(false);
      }
    );

    return unsubscribe;
  }, [activeTab, open, user.uid]);

  useEffect(() => {
    if (!friendActionMenuUid) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (friendMenuRef.current?.contains(target)) return;
      setFriendActionMenuUid(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFriendActionMenuUid(null);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [friendActionMenuUid]);

  useEffect(() => {
    if (!open) return;
    clearMessages();
    setBusy(false);
    setDeleteConfirmOpen(false);
    setDeleteConfirmText("");
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (deleteConfirmOpen) {
          setDeleteConfirmOpen(false);
          return;
        }

        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteConfirmOpen, onClose, open]);

  if (!open) return null;

  const clearMessages = () => {
    toast.dismiss();
  };

  const getRelationshipForUser = (targetUid: string) => {
    return friendships.find((relationship) => relationship.participants.includes(targetUid));
  };

  const getOtherSnapshot = (relationship: FriendshipRecord) => {
    if (relationship.requesterSnapshot.uid === user.uid) {
      return relationship.recipientSnapshot;
    }

    return relationship.requesterSnapshot;
  };

  const handleSearchFriend = async () => {
    const nextQuery = friendQuery.trim();
    if (!nextQuery) {
      toast.error("Enter a username to search.");
      return;
    }

    try {
      setBusy(true);
      clearMessages();
      const result = await getDoc(doc(db, "usernames", usernameDocId(nextQuery)));

      if (!result.exists()) {
        setFriendSearchResult(null);
        toast.error("No user found with that username.");
        return;
      }

      const data = result.data() as Partial<UserDirectoryEntry>;
      if (!data.uid || !data.displayName) {
        setFriendSearchResult(null);
        toast.error("This username is missing profile data.");
        return;
      }

      if (data.uid === user.uid) {
        setFriendSearchResult(null);
        toast.error("You cannot add yourself as a friend.");
        return;
      }

      setFriendSearchResult({
        uid: data.uid,
        displayName: data.displayName,
        avatarDataUrl: typeof data.avatarDataUrl === "string" ? data.avatarDataUrl : null,
        bio: typeof data.bio === "string" ? data.bio : undefined,
      });
    } catch (searchError) {
      console.error("Failed to search user", searchError);
      setFriendSearchResult(null);
      toast.error("Could not search for that user.");
    } finally {
      setBusy(false);
    }
  };

  const handleSendFriendRequest = async (target: UserDirectoryEntry) => {
    const relationshipRef = doc(db, "friendships", friendshipDocId(user.uid, target.uid));
    const requesterSnapshot = makeFriendSnapshot(user.uid, userLabel, userProfile.avatarDataUrl, userProfile.bio);
    const recipientSnapshot = makeFriendSnapshot(target.uid, target.displayName, target.avatarDataUrl, target.bio);

    try {
      setBusy(true);
      clearMessages();

      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(relationshipRef);

        if (!snapshot.exists()) {
          transaction.set(relationshipRef, {
            participants: [user.uid, target.uid],
            requestedByUid: user.uid,
            status: "pending",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            requesterSnapshot,
            recipientSnapshot,
          });
          return;
        }

        const existing = snapshot.data() as FriendshipRecord;

        if (existing.status === "accepted") {
          throw new Error("You are already friends with this user.");
        }

        if (existing.requestedByUid === user.uid) {
          throw new Error("A friend request is already pending.");
        }

        transaction.update(relationshipRef, {
          status: "accepted",
          updatedAt: Date.now(),
          requesterSnapshot: existing.requestedByUid === user.uid ? requesterSnapshot : recipientSnapshot,
          recipientSnapshot: existing.requestedByUid === user.uid ? recipientSnapshot : requesterSnapshot,
        });
      });

      toast.success("Friend request sent.");
      setFriendSearchResult(null);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Could not send the friend request.";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const handleAcceptFriendRequest = async (relationship: FriendshipRecord) => {
    const relationshipRef = doc(db, "friendships", friendshipDocId(relationship.participants[0], relationship.participants[1]));

    try {
      setBusy(true);
      clearMessages();

      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(relationshipRef);
        if (!snapshot.exists()) return;

        const existing = snapshot.data() as FriendshipRecord;
        if (existing.status === "accepted") return;
        if (existing.requestedByUid === user.uid) {
          throw new Error("This request was sent by you.");
        }

        transaction.update(relationshipRef, {
          status: "accepted",
          updatedAt: Date.now(),
        });
      });

      toast.success("Friend request accepted.");
    } catch (acceptError) {
      const message = acceptError instanceof Error ? acceptError.message : "Could not accept the request.";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveRelationship = async (relationship: FriendshipRecord, message: string) => {
    const relationshipRef = doc(db, "friendships", friendshipDocId(relationship.participants[0], relationship.participants[1]));

    try {
      setBusy(true);
      clearMessages();
      await deleteDoc(relationshipRef);
      toast.success(message);
    } catch (removeError) {
      const nextMessage = removeError instanceof Error ? removeError.message : "Could not update this friendship.";
      toast.error(nextMessage);
    } finally {
      setBusy(false);
    }
  };

  const handleOpenFriendList = (username: string, listStatus: "plan-to-watch" | "watching" | "completed") => {
    setFriendActionMenuUid(null);
    onClose();
    navigate(`/u/${encodeURIComponent(username)}/${listStatus}`);
  };

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    clearMessages();

    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      toast.error("Image is too large. Use a file under 1MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      setAvatarDataUrl(result);
    };
    reader.onerror = () => {
      toast.error("Could not read image file.");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleSaveUserTab = async () => {
    try {
      clearMessages();
      setBusy(true);
      await updateUserProfile({ bio, avatarDataUrl });
      toast.success("Profile saved successfully.");
    } catch (e) {
      toast.error(getFriendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleSaveSettingsTab = async () => {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      toast.error("Username cannot be empty.");
      return;
    }

    try {
      clearMessages();
      setBusy(true);
      await updateUserProfile({ displayName: trimmedName });
      toast.success("Username updated successfully.");
    } catch (e) {
      toast.error(getFriendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleLogOut = async () => {
    try {
      clearMessages();
      setBusy(true);
      await logOut();
      onClose();
    } catch (e) {
      toast.error(getFriendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleOpenDeleteConfirm = () => {
    clearMessages();
    setDeleteConfirmOpen(true);
    setDeleteConfirmText("");
  };

  const handleDeleteAccount = async () => {
    try {
      clearMessages();
      setBusy(true);
      await deleteAccount();
      setDeleteConfirmOpen(false);
      setDeleteConfirmText("");
      onClose();
    } catch (e) {
      toast.error(getFriendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const DELETE_CONFIRM_PHRASE = "DELETE";
  const canConfirmDelete = deleteConfirmText.trim().toUpperCase() === DELETE_CONFIRM_PHRASE;

  const acceptedFriends = friendships.filter((relationship) => relationship.status === "accepted");
  const incomingFriendRequests = friendships.filter(
    (relationship) => relationship.status === "pending" && relationship.requestedByUid !== user.uid
  );
  const outgoingFriendRequests = friendships.filter(
    (relationship) => relationship.status === "pending" && relationship.requestedByUid === user.uid
  );
  const currentSearchRelationship = friendSearchResult ? getRelationshipForUser(friendSearchResult.uid) : undefined;

  return (
    // pb-8 prevents overlaying on iOS home bars, fallback to pb-4 on desktop
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/80 px-4 pb-8 pt-4 backdrop-blur-sm sm:items-center sm:pb-4">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close account popup"
        className="absolute inset-0 cursor-default"
      />

      {/* Main Container - max-h ensures it doesn't overflow the viewport */}
      <section className="relative flex w-full max-w-2xl max-h-[90dvh] flex-col overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-950 shadow-2xl shadow-black/60 sm:max-h-[85vh] sm:rounded-4xl">
        
        {/* Floating Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-50 rounded-full bg-zinc-950/50 p-2 text-zinc-400 backdrop-blur-sm transition hover:bg-zinc-800 hover:text-zinc-100 sm:right-4 sm:top-4"
          aria-label="Close"
        >
          <CloseIcon />
        </button>

        {/* Body Container */}
        <div className="flex flex-1 flex-col overflow-hidden min-h-120 sm:min-h-105 sm:flex-row">
          
          {/* Navigation Sidebar / Topbar */}
          <nav className="flex shrink-0 flex-row gap-2 overflow-x-auto border-b border-zinc-800/80 bg-zinc-900/20 p-2 pr-14 sm:w-20 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-r sm:p-3 sm:pr-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              title="Profile"
              onClick={() => {
                setActiveTab("user");
                clearMessages();
              }}
              className={`flex flex-1 sm:flex-none items-center justify-center rounded-xl p-3 sm:p-4 text-sm font-medium transition-all sm:mb-2 ${
                activeTab === "user" ? "bg-zinc-800 text-zinc-50 shadow-sm" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
            >
              <UserIcon />
            </button>

            <button
              type="button"
              title="Friends"
              onClick={() => {
                setActiveTab("friends");
                clearMessages();
              }}
              className={`flex flex-1 sm:flex-none items-center justify-center rounded-xl p-3 sm:p-4 text-sm font-medium transition-all sm:mb-2 ${
                activeTab === "friends" ? "bg-zinc-800 text-zinc-50 shadow-sm" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
            >
              <FriendsIcon />
            </button>

            <button
              type="button"
              title="Settings"
              onClick={() => {
                setActiveTab("settings");
                clearMessages();
              }}
              className={`flex flex-1 sm:flex-none items-center justify-center rounded-xl p-3 sm:p-4 text-sm font-medium transition-all sm:mb-2 ${
                activeTab === "settings" ? "bg-zinc-800 text-zinc-50 shadow-sm" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
            >
              <SettingsIcon />
            </button>

            <button
              type="button"
              title="About"
              onClick={() => {
                setActiveTab("about");
                clearMessages();
              }}
              className={`flex flex-1 sm:flex-none items-center justify-center rounded-xl p-3 sm:p-4 text-sm font-medium transition-all ${
                activeTab === "about" ? "bg-zinc-800 text-zinc-50 shadow-sm" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
            >
              <InfoIcon />
            </button>
          </nav>

          {/* Content Area - Scrollable */}
          <div className="flex-1 overflow-y-auto p-5 pt-6 sm:p-8 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            
            {/* TAB: USER */}
            {activeTab === "user" ? (
              <UserTab
                avatarDataUrl={avatarDataUrl}
                userInitial={userInitial}
                userLabel={userLabel}
                userEmailVerified={user.emailVerified}
                bio={bio}
                bioRef={bioRef}
                busy={busy}
                onBioChange={setBio}
                onAvatarFileChange={handleAvatarFileChange}
                onSave={() => void handleSaveUserTab()}
              />
            ) : null}

            {/* TAB: FRIENDS */}
            {activeTab === "friends" ? (
              <FriendsTab
                friendQuery={friendQuery}
                onFriendQueryChange={setFriendQuery}
                friendSearchResult={friendSearchResult}
                currentSearchRelationship={currentSearchRelationship}
                acceptedFriends={acceptedFriends}
                incomingFriendRequests={incomingFriendRequests}
                outgoingFriendRequests={outgoingFriendRequests}
                friendActionMenuUid={friendActionMenuUid}
                friendMenuRef={friendMenuRef}
                friendsLoading={friendsLoading}
                busy={busy}
                userUid={user.uid}
                getOtherSnapshot={getOtherSnapshot}
                onSearchFriend={handleSearchFriend}
                onSendFriendRequest={handleSendFriendRequest}
                onAcceptFriendRequest={handleAcceptFriendRequest}
                onRemoveRelationship={handleRemoveRelationship}
                onOpenFriendList={handleOpenFriendList}
                onToggleFriendActionMenu={setFriendActionMenuUid}
              />
            ) : null}

            {/* TAB: SETTINGS */}
            {activeTab === "settings" ? (
              <SettingsTab
                displayName={displayName}
                currentDisplayName={user.displayName}
                busy={busy}
                onDisplayNameChange={setDisplayName}
                onSaveSettings={() => void handleSaveSettingsTab()}
                onLogOut={() => void handleLogOut()}
                onOpenDeleteConfirm={handleOpenDeleteConfirm}
              />
            ) : null}

            {/* TAB: ABOUT */}
            {activeTab === "about" ? <AboutTab /> : null}

          </div>
        </div>
      </section>

      {deleteConfirmOpen ? (
        <div className="absolute inset-0 z-60 flex items-center justify-center bg-zinc-950/70 px-4 backdrop-blur-sm">
          <section className="w-full max-w-md rounded-2xl border border-red-900/40 bg-zinc-950 p-5 shadow-2xl shadow-black/60">
            <h3 className="text-base font-semibold text-red-300">Delete account permanently?</h3>
            <p className="mt-2 text-sm text-zinc-400">
              This will remove your profile and anime list data. This action cannot be undone.
            </p>

            <label className="mt-4 block">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Type DELETE to confirm
              </span>
              <input
                value={deleteConfirmText}
                onChange={(event) => setDeleteConfirmText(event.target.value)}
                autoFocus
                placeholder="DELETE"
                className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-zinc-600 focus:bg-zinc-900 focus:ring-4 focus:ring-zinc-800/50"
              />
            </label>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setDeleteConfirmText("");
                }}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !canConfirmDelete}
                onClick={handleDeleteAccount}
                className="rounded-xl border border-red-900/50 bg-red-950/60 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-900/70 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Deleting..." : "Delete account"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}