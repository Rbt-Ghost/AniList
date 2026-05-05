import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ANIME_LIST_STATUS_LABELS, useAnimeList } from "../context/AnimeListContext.tsx";
import { useAuth } from "../context/AuthContext.tsx";
import { getFriendlyAuthError } from "../utils/firebaseAuthErrors.ts";
import AuthDialog from "./AuthDialog.tsx";

type HeaderProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onClearQuery: () => void;
};

export default function Header({
  query,
  onQueryChange,
  onClearQuery,
}: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { getEntriesByStatus } = useAnimeList();
  const { user, deleteAccount, logOut } = useAuth();

  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [accountBusy, setAccountBusy] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!userMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (!userMenuRef.current) return;
      if (userMenuRef.current.contains(target)) return;

      setUserMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [userMenuOpen]);

  const userLabel = (user?.displayName?.trim() || user?.email?.trim() || "User").trim();
  const userInitial = userLabel.length > 0 ? userLabel[0]!.toUpperCase() : "U";

  const handleGoHome = () => {
    if (location.pathname === "/") {
      window.location.reload();
      return;
    }

    navigate("/");
  };

  const handleLogout = async () => {
    try {
      setAccountBusy(true);
      await logOut();
      setUserMenuOpen(false);
    } catch (e) {
      console.error(e);
      window.alert(getFriendlyAuthError(e));
    } finally {
      setAccountBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setAccountBusy(true);
      await deleteAccount();
      setUserMenuOpen(false);
    } catch (e) {
      console.error(e);
      window.alert(getFriendlyAuthError(e));
    } finally {
      setAccountBusy(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleGoHome}
            className="inline-flex w-fit cursor-pointer items-center gap-3 rounded-lg text-left transition-opacity hover:opacity-90"
            aria-label="Go to home"
          >
            <img
              src="/cloud.png"
              alt=""
              aria-hidden="true"
              className="h-11 w-11 shrink-0 invert brightness-200 opacity-90 sm:h-12 sm:w-12"
            />
            <div>
              <h1 className="text-xl font-semibold tracking-tight">AniList</h1>
              <p className="text-sm text-zinc-400">Search anime and build your list.</p>
            </div>
          </button>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <div className="w-full sm:w-96">
              <label className="sr-only" htmlFor="anime-search">
                Search anime
              </label>
              <div className="relative">
                <input
                  id="anime-search"
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  placeholder="What are you watching today?"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 pr-10 text-sm text-zinc-50 outline-none ring-0 placeholder:text-zinc-500 focus:border-zinc-700"
                />
                {query.length > 0 ? (
                  <button
                    type="button"
                    onClick={onClearQuery}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-900"
                    aria-label="Clear search"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>

            <div className="group relative w-full sm:w-auto">
              <button
                type="button"
                className="inline-flex w-full items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-zinc-100 transition hover:border-zinc-700 hover:bg-zinc-900 sm:w-40"
              >
                <span>My AniList</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              <div className="invisible absolute right-0 top-full z-20 mt-0 w-full min-w-72 opacity-0 transition duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 sm:w-80">
                <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-xl shadow-black/40">
                  {(["plan-to-watch", "watching", "completed"] as const).map((status) => {
                    const items = getEntriesByStatus(status);
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => navigate(`/lists/${status}`)}
                        className="flex w-full items-center justify-between gap-4 border-b border-zinc-800 px-4 py-3 text-left transition last:border-b-0 hover:bg-zinc-900"
                      >
                        <div>
                          <div className="text-sm font-semibold text-zinc-50">{ANIME_LIST_STATUS_LABELS[status]}</div>
                          <div className="text-xs text-zinc-500">Open the list to track your {ANIME_LIST_STATUS_LABELS[status].toLowerCase()} anime</div>
                        </div>
                        <span className="shrink-0 rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-zinc-300">
                          {items.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {user ? (
              <div className="relative flex w-full justify-end sm:w-auto" ref={userMenuRef}>
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  onClick={() => setUserMenuOpen((current) => !current)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950 text-sm font-semibold text-zinc-50 transition hover:bg-zinc-900"
                  aria-label="Open account menu"
                >
                  {userInitial}
                </button>

                {userMenuOpen ? (
                  <div className="absolute right-0 top-full z-30 mt-2 w-56">
                    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-xl shadow-black/40">
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={accountBusy}
                        className="flex w-full items-center justify-between gap-4 border-b border-zinc-800 px-4 py-3 text-left text-sm text-zinc-200 transition last:border-b-0 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Logout
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteAccount}
                        disabled={accountBusy}
                        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm text-red-200 transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Delete account
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthDialogOpen(true)}
                className="inline-flex w-full items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-zinc-100 transition hover:border-zinc-700 hover:bg-zinc-900 sm:w-auto"
              >
                Log in
              </button>
            )}
          </div>
        </div>
      </header>

      {authDialogOpen ? <AuthDialog open onClose={() => setAuthDialogOpen(false)} /> : null}
    </>
  );
}