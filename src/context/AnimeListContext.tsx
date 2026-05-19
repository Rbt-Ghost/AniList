/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import type { Anime } from "../api/Jikan.ts";
import { db } from "../firebase/firebase.ts";
import { getErrorMessage, isFirestoreBlockedError } from "../utils/errors.ts";
import { useAuth } from "./AuthContext.tsx";

const ANIME_LIST_STATUSES = ["plan-to-watch", "watching", "completed"] as const;
type AnimeListStatus = (typeof ANIME_LIST_STATUSES)[number];

const ANIME_LIST_STATUS_LABELS: Record<AnimeListStatus, string> = {
  "plan-to-watch": "Plan to watch",
  watching: "Watching",
  completed: "Completed",
};

const MAL_SCORE_LABELS: Record<number, string> = {
  10: "Masterpiece",
  9: "Great",
  8: "Very good",
  7: "Good",
  6: "Fine",
  5: "Average",
  4: "Bad",
  3: "Very bad",
  2: "Horrible",
  1: "Appalling",
};

const ANIME_LIST_SCORE_OPTIONS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((score) => ({
  value: score,
  label: `${score} - ${MAL_SCORE_LABELS[score]}`,
}));

// Export types for external use
export type { AnimeListStatus };
export { ANIME_LIST_STATUSES, ANIME_LIST_STATUS_LABELS, ANIME_LIST_SCORE_OPTIONS };

type AnimeListEntry = {
  anime: Anime;
  status: AnimeListStatus;
  watchedEpisodes: number;
  score: number | null;
  updatedAt: number;
};

export type { AnimeListEntry };

type AnimeListInput = {
  status: AnimeListStatus;
  watchedEpisodes: number;
  score: number | null;
};

type AnimeListContextValue = {
  entries: AnimeListEntry[];
  isLoading: boolean;
  syncError: string | null;
  isOfflineFallback: boolean;
  retrySync: () => void;
  getEntry: (animeId: number) => AnimeListEntry | undefined;
  getEntriesByStatus: (status: AnimeListStatus) => AnimeListEntry[];
  saveAnime: (anime: Anime, input: AnimeListInput) => void;
  removeAnime: (animeId: number) => void;
};

const STORAGE_KEY = "anilist:list-state:v1";
const USER_STORAGE_KEY_PREFIX = "anilist:list-state:user:";
const FIRESTORE_VERSION = 1;

const AnimeListContext = createContext<AnimeListContextValue | null>(null);

function sanitizeForStorage<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function clampEpisodes(watchedEpisodes: number, totalEpisodes?: number | null) {
  const safeWatched = Number.isFinite(watchedEpisodes) ? Math.max(0, Math.floor(watchedEpisodes)) : 0;

  if (typeof totalEpisodes === "number" && Number.isFinite(totalEpisodes)) {
    return Math.min(safeWatched, Math.max(0, Math.floor(totalEpisodes)));
  }

  return safeWatched;
}

function normalizeScore(score: number | null) {
  if (score == null) return null;
  if (!Number.isFinite(score)) return null;

  const rounded = Math.floor(score);
  if (rounded < 1 || rounded > 10) return null;
  return rounded;
}

function normalizeStatus(status: string | null | undefined): AnimeListStatus {
  if (status === "plan-to-watch" || status === "watching" || status === "completed") {
    return status;
  }

  return "plan-to-watch";
}

function readEntriesFromUnknown(rawEntries: unknown): AnimeListEntry[] {
  if (!Array.isArray(rawEntries)) return [];

  return rawEntries
    .map((entry): AnimeListEntry | null => {
      if (!entry || typeof entry !== "object") return null;

      const candidate = entry as Partial<AnimeListEntry> & { anime?: Partial<Anime> };
      if (!candidate.anime?.mal_id || !candidate.anime?.title) return null;

      return {
        anime: candidate.anime as Anime,
        status: normalizeStatus(candidate.status),
        watchedEpisodes: clampEpisodes(candidate.watchedEpisodes ?? 0, candidate.anime.episodes),
        score: normalizeScore(candidate.score ?? null),
        updatedAt: typeof candidate.updatedAt === "number" ? candidate.updatedAt : Date.now(),
      };
    })
    .filter((entry): entry is AnimeListEntry => entry !== null)
    .reduce<AnimeListEntry[]>((acc, entry) => {
      const existingIndex = acc.findIndex((candidate) => candidate.anime.mal_id === entry.anime.mal_id);
      if (existingIndex >= 0) {
        acc[existingIndex] = entry;
        return acc;
      }

      acc.push(entry);
      return acc;
    }, []);
}

function readGuestEntries(): AnimeListEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    return readEntriesFromUnknown(parsed);
  } catch {
    return [];
  }
}

function getUserStorageKey(uid: string): string {
  return `${USER_STORAGE_KEY_PREFIX}${uid}`;
}

function readCachedUserEntries(uid: string): AnimeListEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getUserStorageKey(uid));
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    return readEntriesFromUnknown(parsed);
  } catch {
    return [];
  }
}

function writeCachedUserEntries(uid: string, entries: AnimeListEntry[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getUserStorageKey(uid), JSON.stringify(entries));
  } catch {
    // Ignore storage quota and privacy-mode failures.
  }
}

function toStoredAnime(anime: Anime): Anime {
  const stored: Partial<Anime> = {
    mal_id: anime.mal_id,
    title: anime.title,
    title_english: anime.title_english,
    title_japanese: anime.title_japanese,
    images: anime.images,
    trailer: anime.trailer,
    synopsis: anime.synopsis,
    score: anime.score,
    episodes: anime.episodes,
    status: anime.status,
    rating: anime.rating,
    year: anime.year,
    season: anime.season,
    studios: anime.studios,
    genres: anime.genres,
    themes: anime.themes,
    demographics: anime.demographics,
    explicit_genres: anime.explicit_genres,
  };

  return sanitizeForStorage(stored) as Anime;
}

async function persistUserEntries(uid: string, entries: AnimeListEntry[]) {
  try {
    const ref = doc(db, "users", uid, "animeList", "state");
    const storedEntries = entries.map((entry) => ({
      ...entry,
      anime: toStoredAnime(entry.anime),
    }));

    await setDoc(
      ref,
      {
        version: FIRESTORE_VERSION,
        updatedAt: Date.now(),
        entries: sanitizeForStorage(storedEntries),
      },
      { merge: true }
    );
  } catch (e) {
    console.error("Failed to persist AniList entries to Firestore", e);
  }
}

export function AnimeListProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [guestEntries, setGuestEntries] = useState<AnimeListEntry[]>(() => readGuestEntries());
  const [userEntries, setUserEntries] = useState<AnimeListEntry[]>([]);
  const [hasResolvedRemote, setHasResolvedRemote] = useState(!uid);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncRevision, setSyncRevision] = useState(0);
  const clearedGuestForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Persist only guest lists to localStorage.
    if (uid) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(guestEntries));
  }, [guestEntries, uid]);

  useEffect(() => {
    if (!uid) {
      setUserEntries([]);
      setHasResolvedRemote(true);
      setSyncError(null);
      return;
    }

    // When a user logs in: clear guest storage and switch to per-user Firestore storage.
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }

    if (clearedGuestForUserRef.current !== uid) {
      clearedGuestForUserRef.current = uid;
      setGuestEntries([]);
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUserEntries([]);
    setHasResolvedRemote(false);
    setSyncError(null);

    const cachedEntries = readCachedUserEntries(uid);
    if (cachedEntries.length > 0) {
      setUserEntries(cachedEntries);
    }

    const ref = doc(db, "users", uid, "animeList", "state");
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data() as { entries?: unknown } | undefined;
        const next = readEntriesFromUnknown(data?.entries);
        setUserEntries(next);
        writeCachedUserEntries(uid, next);
        setHasResolvedRemote(true);
        setSyncError(null);
      },
      (error) => {
        if (isFirestoreBlockedError(error)) {
          setSyncError("Firestore is blocked by your browser or an extension. Using your cached list.");
        } else {
          console.error("Failed to load AniList entries from Firestore", error);
          setSyncError(getErrorMessage(error));
        }

        setHasResolvedRemote(true);

        if (cachedEntries.length === 0) {
          setUserEntries(readCachedUserEntries(uid));
        }
      }
    );

    return unsubscribe;
  }, [syncRevision, uid]);

  const entries = uid ? userEntries : guestEntries;
  const isLoading = Boolean(uid) && !hasResolvedRemote && entries.length === 0;
  const isOfflineFallback = Boolean(uid) && hasResolvedRemote && syncError !== null && entries.length > 0;

  const value = useMemo<AnimeListContextValue>(() => {
    return {
      entries,
      isLoading,
      syncError,
      isOfflineFallback,
      retrySync: () => {
        if (!uid) return;
        setHasResolvedRemote(false);
        setSyncError(null);
        setSyncRevision((value) => value + 1);
      },
      getEntry: (animeId) => entries.find((entry) => entry.anime.mal_id === animeId),
      getEntriesByStatus: (status) =>
        entries
          .filter((entry) => entry.status === status)
          .sort((left, right) => right.updatedAt - left.updatedAt),
      saveAnime: (anime, input) => {
        const update = (current: AnimeListEntry[]) => {
          const normalizedScore = normalizeScore(input.score);
          const watchedEpisodes = clampEpisodes(
            input.status === "completed" ? anime.episodes ?? input.watchedEpisodes : input.watchedEpisodes,
            anime.episodes
          );

          const nextEntry: AnimeListEntry = {
            anime,
            status: input.status,
            watchedEpisodes:
              input.status === "completed" && typeof anime.episodes === "number" ? anime.episodes : watchedEpisodes,
            score: normalizedScore,
            updatedAt: Date.now(),
          };

          const nextEntries = current.filter((entry) => entry.anime.mal_id !== anime.mal_id);
          nextEntries.push(nextEntry);
          return nextEntries;
        };

        if (uid) {
          setUserEntries((current) => {
            const next = update(current);
            writeCachedUserEntries(uid, next);
            void persistUserEntries(uid, next);
            return next;
          });
          return;
        }

        setGuestEntries((current) => update(current));
      },
      removeAnime: (animeId) => {
        if (uid) {
          setUserEntries((current) => {
            const next = current.filter((entry) => entry.anime.mal_id !== animeId);
            writeCachedUserEntries(uid, next);
            void persistUserEntries(uid, next);
            return next;
          });
          return;
        }

        setGuestEntries((current) => current.filter((entry) => entry.anime.mal_id !== animeId));
      },
    };
  }, [entries, isLoading, isOfflineFallback, syncError, uid]);

  return <AnimeListContext.Provider value={value}>{children}</AnimeListContext.Provider>;
}

export function useAnimeList() {
  const context = useContext(AnimeListContext);
  if (!context) {
    throw new Error("useAnimeList must be used within an AnimeListProvider");
  }

  return context;
}
