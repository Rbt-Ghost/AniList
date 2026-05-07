import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

import { ANIME_LIST_STATUS_LABELS, type AnimeListEntry, type AnimeListStatus } from "../context/AnimeListContext.tsx";
import Header from "../components/Header.tsx";
import AnimeCard from "../components/AnimeCard.tsx";
import SearchResults from "../components/SearchResults.tsx";
import NotFound from "./NotFound.tsx";
import { db } from "../firebase/firebase.ts";
import { usernameDocId } from "../utils/social.ts";

type SortOption = "score" | "alphabetic" | "last-change";

const SORT_LABELS: Record<SortOption, string> = {
  score: "Score",
  alphabetic: "Alphabetic",
  "last-change": "Last Updated",
};

function isAnimeListStatus(value: string | undefined): value is AnimeListStatus {
  return value === "plan-to-watch" || value === "watching" || value === "completed";
}

function readAnimeEntries(rawEntries: unknown): AnimeListEntry[] {
  if (!Array.isArray(rawEntries)) return [];

  return rawEntries
    .map((entry): AnimeListEntry | null => {
      if (!entry || typeof entry !== "object") return null;

      const candidate = entry as Partial<AnimeListEntry>;
      const anime = candidate.anime;
      if (!anime?.mal_id || !anime?.title) return null;

      const normalizedStatus = isAnimeListStatus(candidate.status) ? candidate.status : "plan-to-watch";
      const watchedEpisodes = Number.isFinite(candidate.watchedEpisodes)
        ? Math.max(0, Math.floor(candidate.watchedEpisodes ?? 0))
        : 0;
      const score = typeof candidate.score === "number" && candidate.score >= 1 && candidate.score <= 10 ? Math.floor(candidate.score) : null;

      return {
        anime,
        status: normalizedStatus,
        watchedEpisodes: anime.episodes != null ? Math.min(watchedEpisodes, Math.max(0, anime.episodes)) : watchedEpisodes,
        score,
        updatedAt: typeof candidate.updatedAt === "number" ? candidate.updatedAt : Date.now(),
      };
    })
    .filter((entry): entry is AnimeListEntry => entry !== null);
}

function getAnimeSortTitle(item: AnimeListEntry) {
  return (item.anime.title_english ?? item.anime.title ?? "").toLowerCase();
}

function compareScore(left: AnimeListEntry, right: AnimeListEntry) {
  const leftScore = left.score ?? -1;
  const rightScore = right.score ?? -1;

  if (leftScore !== rightScore) {
    return rightScore - leftScore;
  }

  return getAnimeSortTitle(left).localeCompare(getAnimeSortTitle(right));
}

function ListSection({ anime }: { anime: AnimeListEntry[] }) {
  return anime.length > 0 ? (
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {anime.map((item) => (
        <AnimeCard key={item.anime.mal_id} anime={item.anime} userScore={item.score ?? undefined} />
      ))}
    </div>
  ) : (
    <div className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-950/40 p-6 text-sm text-zinc-400">
      This list is empty for now.
    </div>
  );
}

export default function PublicUserListPage() {
  const navigate = useNavigate();
  const { username, status } = useParams<{ username: string; status?: string }>();
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("last-change");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [bio, setBio] = useState<string | null>(null);
  const [entries, setEntries] = useState<AnimeListEntry[]>([]);
  const [notFound, setNotFound] = useState(false);

  const normalizedStatus = isAnimeListStatus(status) ? status : "plan-to-watch";
  const trimmedQuery = query.trim();
  const showingSearch = trimmedQuery.length > 0;

  useEffect(() => {
    if (!username) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let active = true;
    let unsubscribe: (() => void) | undefined;

    const loadUser = async () => {
      setLoading(true);
      setError(null);
      setNotFound(false);

      try {
        const userDoc = await getDoc(doc(db, "usernames", usernameDocId(username)));
        if (!active) return;

        if (!userDoc.exists()) {
          setNotFound(true);
          setDisplayName(null);
          setAvatarDataUrl(null);
          setBio(null);
          setEntries([]);
          setLoading(false);
          return;
        }

        const userData = userDoc.data() as {
          displayName?: unknown;
          uid?: unknown;
          avatarDataUrl?: unknown;
          bio?: unknown;
        };
        const nextDisplayName = typeof userData.displayName === "string" ? userData.displayName : username;
        const uid = typeof userData.uid === "string" ? userData.uid : null;
        const nextAvatarDataUrl = typeof userData.avatarDataUrl === "string" ? userData.avatarDataUrl : null;
        const nextBio = typeof userData.bio === "string" ? userData.bio : null;

        setDisplayName(nextDisplayName);
        setAvatarDataUrl(nextAvatarDataUrl);
        setBio(nextBio);

        if (!uid) {
          setEntries([]);
          setError("This profile is missing a linked account.");
          setLoading(false);
          return;
        }

        const listRef = doc(db, "users", uid, "animeList", "state");
        unsubscribe = onSnapshot(
          listRef,
          (snap) => {
            const data = snap.data() as { entries?: unknown } | undefined;
            setEntries(readAnimeEntries(data?.entries));
            setLoading(false);
          },
          (snapshotError) => {
            console.error("Failed to load public anime list", snapshotError);
            if (active) {
              setError("Failed to load this anime list.");
              setLoading(false);
            }
          }
        );
      } catch (loadError) {
        console.error("Failed to resolve user profile", loadError);
        if (active) {
          setError("Failed to load this profile.");
          setNotFound(true);
          setLoading(false);
        }
      }
    };

    void loadUser();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [username]);

  const sortedItems = useMemo(() => {
    const nextItems = entries.filter((item) => item.status === normalizedStatus);

    switch (sortBy) {
      case "score":
        return nextItems.sort(compareScore);
      case "alphabetic":
        return nextItems.sort((left, right) => getAnimeSortTitle(left).localeCompare(getAnimeSortTitle(right)));
      case "last-change":
      default:
        return nextItems.sort((left, right) => right.updatedAt - left.updatedAt);
    }
  }, [entries, normalizedStatus, sortBy]);

  if (notFound) {
    return <NotFound />;
  }

  const userInitial = (displayName ?? username ?? "U").charAt(0).toUpperCase();
  const userLabel = displayName ?? username ?? "User";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 pb-16">
      <Header query={query} onQueryChange={setQuery} onClearQuery={() => setQuery("")} />

      <main className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 sm:pt-8">
        <div className="space-y-6 sm:space-y-8">
          
          {loading ? (
            <div className="flex min-h-[40vh] items-center justify-center rounded-3xl border border-zinc-800/80 bg-zinc-900/20 p-6 text-sm text-zinc-500">
              <div className="flex flex-col items-center gap-3">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300"></div>
                <p>Loading profile…</p>
              </div>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-900/30 bg-red-950/20 p-5 text-sm font-medium text-red-400 backdrop-blur-sm">
              {error}
            </div>
          ) : (
            <>
              {/* Minimalist Profile Header Card */}
              <section className="flex items-center justify-between gap-5 rounded-2xl border border-zinc-800/60 bg-zinc-900/20 p-5 sm:px-6 sm:py-6">
                <div className="flex items-center gap-5 overflow-hidden">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-800 text-xl font-medium text-zinc-300 sm:h-20 sm:w-20 sm:text-2xl">
                    {avatarDataUrl ? (
                      <img src={avatarDataUrl} alt="" aria-hidden="true" className="h-full w-full object-cover" />
                    ) : (
                      userInitial
                    )}
                  </div>

                  {/* Middle Section: Name & Bio */}
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-xl font-semibold tracking-tight text-zinc-100 sm:text-2xl">
                      {userLabel}
                    </h2>
                    {bio?.trim() ? (
                      <p className="mt-1 truncate text-sm text-zinc-400 sm:text-base">
                        {bio}
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Right Section: Stats */}
                <div className="ml-auto flex shrink-0 items-center pl-5 text-right sm:pl-8">
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-xs font-medium text-zinc-500">Total</span>
                    <span className="text-2xl font-semibold text-zinc-100 sm:text-3xl">{sortedItems.length}</span>
                  </div>
                </div>
              </section>

              {showingSearch ? (
                <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-zinc-100">Search Results</h2>
                  </div>
                  <SearchResults query={query} onSelect={() => setQuery("")} />
                </section>
              ) : (
                <div className="flex flex-col gap-6">
                  
                  {/* Filter Toolbar */}
                  <section className="flex flex-col gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-2 sm:flex-row sm:items-center sm:justify-between">
                    
                    {/* Lists Segmented Control */}
                    <nav className="flex w-full overflow-x-auto rounded-xl border border-zinc-800/50 bg-zinc-950/50 p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:w-auto">
                      {(["plan-to-watch", "watching", "completed"] as const).map((listStatus) => (
                        <button
                          key={listStatus}
                          type="button"
                          onClick={() => navigate(`/u/${encodeURIComponent(username ?? "")}/${listStatus}`)}
                          className={`flex-1 sm:flex-none whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                            normalizedStatus === listStatus
                              ? "bg-zinc-800 text-zinc-50 shadow-sm"
                              : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                          }`}
                        >
                          {ANIME_LIST_STATUS_LABELS[listStatus]}
                        </button>
                      ))}
                    </nav>

                    {/* Sort Segmented Control */}
                    <div className="flex items-center gap-3 pl-1 sm:pl-0">
                      <span className="hidden shrink-0 text-xs font-semibold uppercase tracking-wider text-zinc-500 sm:block">
                        Sort
                      </span>
                      <nav className="flex w-full overflow-x-auto rounded-xl border border-zinc-800/50 bg-zinc-950/50 p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:w-auto">
                        {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setSortBy(option)}
                            className={`flex-1 sm:flex-none whitespace-nowrap rounded-lg px-4 py-2 text-xs font-medium transition-all ${
                              sortBy === option
                                ? "bg-zinc-800 text-zinc-50 shadow-sm"
                                : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                            }`}
                          >
                            {SORT_LABELS[option]}
                          </button>
                        ))}
                      </nav>
                    </div>
                  </section>

                  {/* Anime Grid */}
                  <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <ListSection anime={sortedItems} />
                  </section>
                  
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}