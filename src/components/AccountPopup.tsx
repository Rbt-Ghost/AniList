import { useEffect, useMemo, useState, useRef, type ChangeEvent } from "react";
import type { User } from "firebase/auth";

import { useAuth } from "../context/AuthContext.tsx";
import { getFriendlyAuthError } from "../utils/firebaseAuthErrors.ts";
import { lockScroll, unlockScroll } from "../utils/scrollLock";

type Props = {
  open: boolean;
  user: User;
  onClose: () => void;
};

type TabId = "user" | "settings" | "about";

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

function CameraIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-zinc-200">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
    </svg>
  );
}

function LogOutIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
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

function ExternalLinkIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 opacity-50">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  );
}

// --- Component ---

export default function AccountPopup({ open, user, onClose }: Props) {
  const { userProfile, updateUserProfile, logOut, deleteAccount } = useAuth();

  const [activeTab, setActiveTab] = useState<TabId>("user");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);

  const bioRef = useRef<HTMLTextAreaElement>(null);

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
    if (!open) return;
    clearMessages();
    setBusy(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    clearMessages();

    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setError("Image is too large. Use a file under 1MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      setAvatarDataUrl(result);
    };
    reader.onerror = () => {
      setError("Could not read image file.");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleSaveUserTab = async () => {
    try {
      clearMessages();
      setBusy(true);
      await updateUserProfile({ bio, avatarDataUrl });
      setSuccess("Profile saved successfully.");
    } catch (e) {
      setError(getFriendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleSaveSettingsTab = async () => {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError("Username cannot be empty.");
      return;
    }

    try {
      clearMessages();
      setBusy(true);
      await updateUserProfile({ displayName: trimmedName });
      setSuccess("Username updated successfully.");
    } catch (e) {
      setError(getFriendlyAuthError(e));
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
      setError(getFriendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm("Are you sure you want to delete your account? This action cannot be undone.");
    if (!confirmed) return;

    try {
      clearMessages();
      setBusy(true);
      await deleteAccount();
      onClose();
    } catch (e) {
      setError(getFriendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

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
          <div className="flex-1 overflow-y-auto p-5 pt-6 sm:p-8">
            
            {/* Alerts */}
            {error ? (
              <div className="mb-6 rounded-xl border border-red-900/30 bg-red-950/20 px-4 py-3 text-sm font-medium text-red-400 backdrop-blur-sm">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="mb-6 rounded-xl border border-emerald-900/30 bg-emerald-950/20 px-4 py-3 text-sm font-medium text-emerald-400 backdrop-blur-sm">
                {success}
              </div>
            ) : null}

            {/* TAB: USER */}
            {activeTab === "user" ? (
              <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300 sm:mt-4">
                <div className="flex flex-col items-center gap-2">
                  <label className="group relative flex h-24 w-24 sm:h-28 sm:w-28 shrink-0 cursor-pointer overflow-hidden rounded-full border-2 border-zinc-800 bg-zinc-900 shadow-inner transition duration-300 hover:border-zinc-500">
                    {avatarDataUrl ? (
                      <img src={avatarDataUrl} alt="Profile" className="h-full w-full object-cover transition duration-300 group-hover:opacity-40" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-zinc-300 transition duration-300 group-hover:opacity-40">
                        {userInitial}
                      </div>
                    )}
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/40 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100">
                      <CameraIcon />
                    </div>

                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarFileChange} />
                  </label>
                </div>

                <div className="block w-full text-center">
                  <label className="mb-2 block text-sm font-medium text-zinc-400">{userLabel}</label>
                  <textarea
                    ref={bioRef}
                    value={bio}
                    onChange={(event) => setBio(event.target.value.slice(0, 100))}
                    rows={1}
                    placeholder="Empty bio..."
                    className="w-full resize-none overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-center text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-zinc-600 focus:bg-zinc-900 focus:ring-4 focus:ring-zinc-800/50"
                  />
                  <div className="mt-2 text-xs text-zinc-500">{bio.length} / 100</div>
                </div>

                <div className="mt-2 flex w-full justify-center">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleSaveUserTab}
                    className="w-full sm:w-auto rounded-xl bg-zinc-100 px-8 py-3 sm:py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-white hover:shadow-lg hover:shadow-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Save profile
                  </button>
                </div>
              </div>
            ) : null}

            {/* TAB: SETTINGS */}
            {activeTab === "settings" ? (
              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300 sm:mt-4 sm:gap-8">
                <div className="block">
                  <label className="mb-2 block text-sm font-medium text-zinc-400">Username</label>
                  <div className="flex flex-row gap-2 sm:gap-3">
                    <input
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder="Your username"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-zinc-600 focus:bg-zinc-900 focus:ring-4 focus:ring-zinc-800/50"
                    />
                    <button
                      type="button"
                      disabled={busy || displayName.trim() === user.displayName}
                      onClick={handleSaveSettingsTab}
                      className="shrink-0 rounded-xl bg-zinc-800 px-4 py-2.5 sm:px-5 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Update
                    </button>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="rounded-2xl border border-red-900/20 bg-red-950/10 p-4 sm:p-5">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-red-500/80 sm:mb-4">Danger Zone</h3>
                  
                  <div className="mb-3 flex flex-row items-center justify-between gap-3 border-b border-zinc-800/60 pb-3 sm:mb-4 sm:pb-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-200">Log Out</p>
                      <p className="mt-0.5 text-xs text-zinc-500">Sign out of your session.</p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleLogOut}
                      className="inline-flex w-28 sm:w-32 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
                    >
                      <LogOutIcon />
                      <span>Log out</span>
                    </button>
                  </div>

                  <div className="flex flex-row items-center justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-400">Delete Account</p>
                      <p className="mt-0.5 text-xs text-zinc-500">Permanently delete your account.</p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleDeleteAccount}
                      className="inline-flex w-28 sm:w-32 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-red-900/40 bg-red-950/40 px-3 py-2 text-xs font-medium text-red-300 transition hover:bg-red-900/60 disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
                    >
                      <TrashIcon />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* TAB: ABOUT */}
            {activeTab === "about" ? (
              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300 sm:mt-4">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-100">AniList</h3>
                  <p className="mt-1 text-sm text-zinc-400">A modern anime tracking application built with React, Tailwind CSS, and Firebase.</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <a
                    href="https://jikan.moe/"
                    target="_blank"
                    rel="noreferrer"
                    className="group flex flex-col items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 transition hover:border-zinc-700 hover:bg-zinc-800/50"
                  >
                    <div className="flex w-full items-center justify-between text-zinc-100">
                      <span className="font-medium">Jikan API</span>
                      <ExternalLinkIcon />
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed">Powered by the unofficial MyAnimeList REST API.</p>
                  </a>
                  
                  <a
                    href="https://github.com/Rbt-Ghost/AniList"
                    target="_blank"
                    rel="noreferrer"
                    className="group flex flex-col items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 transition hover:border-zinc-700 hover:bg-zinc-800/50"
                  >
                    <div className="flex w-full items-center justify-between text-zinc-100">
                      <span className="font-medium">Source Code</span>
                      <ExternalLinkIcon />
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed">View the open-source repository on GitHub.</p>
                  </a>
                </div>
              </div>
            ) : null}

          </div>
        </div>
      </section>
    </div>
  );
}