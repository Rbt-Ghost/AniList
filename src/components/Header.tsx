import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ANIME_LIST_STATUS_LABELS, useAnimeList } from "../context/AnimeListContext.tsx";
import { useAuth } from "../context/AuthContext.tsx";
import AuthDialog from "./AuthDialog.tsx";
import AccountPopup from "./AccountPopup.tsx";

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
  const { user, userProfile } = useAuth();

  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [accountPopupOpen, setAccountPopupOpen] = useState(false);
  const [aniListDropdownOpen, setAniListDropdownOpen] = useState(false);

  const aniListDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!aniListDropdownOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (aniListDropdownRef.current?.contains(target)) {
        return;
      }

      setAniListDropdownOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAniListDropdownOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [aniListDropdownOpen]);

  const userLabel = (user?.displayName?.trim() || user?.email?.trim() || "User").trim();
  const userInitial = userLabel.length > 0 ? userLabel[0]!.toUpperCase() : "U";

  const userAvatar = userProfile.avatarDataUrl;

  const handleGoHome = () => {
    if (location.pathname === "/") {
      window.location.reload();
      return;
    }

    navigate("/");
  };

  // Extract the auth block to reuse it in both mobile and desktop layouts.
  const renderAuth = () => {
    return user ? (
      <div className="relative shrink-0">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={accountPopupOpen}
          onClick={() => {
            setAccountPopupOpen(true);
            setAniListDropdownOpen(false);
          }}
          className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-zinc-800 bg-zinc-950 text-sm font-semibold text-zinc-50 transition hover:bg-zinc-900"
          aria-label="Open account popup"
        >
          {userAvatar ? (
            <img src={userAvatar} alt="" aria-hidden="true" className="h-full w-full object-cover" />
          ) : (
            userInitial
          )}
        </button>
      </div>
    ) : (
      <button
        type="button"
        onClick={() => setAuthDialogOpen(true)}
        className="inline-flex shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-zinc-100 transition hover:border-zinc-700 hover:bg-zinc-900"
      >
        Log in
      </button>
    );
  };

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-3 sm:flex-none">
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

            {/* Mobile Auth - Visible only on mobile (< sm breakpoint) */}
            <div className="sm:hidden flex shrink-0">
              {renderAuth()}
            </div>
          </div>

          <div className="flex w-full items-center gap-3 sm:flex-1 sm:min-w-0 sm:justify-end">
            <button
              type="button"
              onClick={() => navigate("/stream")}
              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-zinc-100 transition hover:border-zinc-700 hover:bg-zinc-900"
            >
              Stream
            </button>

            <div className="min-w-0 flex-1 sm:max-w-96">
              <label className="sr-only" htmlFor="anime-search">
                Search anime
              </label>
              <div className="relative">
                <input
                  id="anime-search"
                  name="anime-search"
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  placeholder="Search your next title..."
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  autoCapitalize="off"
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

            <div className="relative shrink-0" ref={aniListDropdownRef}>
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={aniListDropdownOpen}
                onClick={() => {
                  setAniListDropdownOpen((current) => !current);
                  setAccountPopupOpen(false);
                }}
                className="inline-flex w-auto items-center justify-between gap-2 whitespace-nowrap rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-zinc-100 transition hover:border-zinc-700 hover:bg-zinc-900"
              >
                <span>My AniList</span>
                {/* SVG dynamically rotates when the menu is open */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${aniListDropdownOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {aniListDropdownOpen ? (
                <div className="absolute right-0 top-full z-20 mt-2 w-full min-w-72 sm:w-80">
                  <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-xl shadow-black/40">
                    {(["plan-to-watch", "watching", "completed"] as const).map((status) => {
                      const items = getEntriesByStatus(status);
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => {
                            setAniListDropdownOpen(false);
                            navigate(`/lists/${status}`);
                          }}
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
              ) : null}
            </div>

            {/* Desktop Auth - Hidden on mobile, visible on sm and larger */}
            <div className="hidden sm:flex shrink-0">
              {renderAuth()}
            </div>
          </div>
        </div>
      </header>

      {authDialogOpen ? <AuthDialog open onClose={() => setAuthDialogOpen(false)} /> : null}
      {user && accountPopupOpen ? (
        <AccountPopup open user={user} onClose={() => setAccountPopupOpen(false)} />
      ) : null}
    </>
  );
}