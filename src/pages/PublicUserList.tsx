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
  alphabetic: "Alphabetic Order",
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
    <div className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-950/40 p-6 text-sm text-zinc-400">This list is empty for now.</div>
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

  return (
    <div className="min-h-screen bg-linear-to-b from-zinc-950 to-zinc-950 text-zinc-50">
      <Header query={query} onQueryChange={setQuery} onClearQuery={() => setQuery("")} />

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="space-y-8">
          <section>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-800 bg-zinc-900 text-base font-semibold text-zinc-200">
                  {avatarDataUrl ? (
                    <img src={avatarDataUrl} alt="" aria-hidden="true" className="h-full w-full object-cover" />
                  ) : (
                    (displayName ?? username ?? "U").charAt(0).toUpperCase()
                  )}
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-zinc-50">{displayName ?? username ?? "User"}</h2>
                  <p className="mt-1 text-sm text-zinc-400">{bio?.trim() ? bio : ANIME_LIST_STATUS_LABELS[normalizedStatus]}</p>
                </div>
              </div>

              <div className="flex flex-col items-start gap-3 sm:items-end">
                <span className="text-sm text-zinc-400">Lists</span>
                <div className="flex flex-wrap gap-2">
                  {(["plan-to-watch", "watching", "completed"] as const).map((listStatus) => (
                    <button
                      key={listStatus}
                      type="button"
                      onClick={() => navigate(`/u/${encodeURIComponent(username ?? "")}/${listStatus}`)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        normalizedStatus === listStatus
                          ? "border-zinc-500 bg-zinc-900 text-zinc-50"
                          : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                      }`}
                    >
                      {ANIME_LIST_STATUS_LABELS[listStatus]}
                    </button>
                  ))}
                </div>
                <span className="text-sm text-zinc-400">Order By</span>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSortBy(option)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        sortBy === option
                          ? "border-zinc-500 bg-zinc-900 text-zinc-50"
                          : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                      }`}
                    >
                      {SORT_LABELS[option]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {loading ? (
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/40 p-6 text-sm text-zinc-400">Loading list…</div>
          ) : error ? (
            <div className="rounded-3xl border border-red-900/50 bg-red-950/50 p-5 text-sm text-red-100 shadow-sm">
              <p className="text-base font-semibold text-red-50">{error}</p>
            </div>
          ) : showingSearch ? (
            <section>
              <div className="flex items-end justify-between gap-4">
                <h2 className="text-lg font-semibold">Search Results</h2>
              </div>
              <SearchResults query={query} onSelect={() => setQuery("")} />
            </section>
          ) : (
            <section>
              <ListSection anime={sortedItems} />
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
