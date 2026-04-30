import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Anime } from "../api/Jikan.ts";

export const ANIME_LIST_STATUSES = ["plan-to-watch", "watching", "completed"] as const;
export type AnimeListStatus = (typeof ANIME_LIST_STATUSES)[number];

export const ANIME_LIST_STATUS_LABELS: Record<AnimeListStatus, string> = {
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

export const ANIME_LIST_SCORE_OPTIONS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((score) => ({
  value: score,
  label: `${score} - ${MAL_SCORE_LABELS[score]}`,
}));

export type AnimeListEntry = {
  anime: Anime;
  status: AnimeListStatus;
  watchedEpisodes: number;
  score: number | null;
  updatedAt: number;
};

type AnimeListInput = {
  status: AnimeListStatus;
  watchedEpisodes: number;
  score: number | null;
};

type AnimeListContextValue = {
  entries: AnimeListEntry[];
  getEntry: (animeId: number) => AnimeListEntry | undefined;
  getEntriesByStatus: (status: AnimeListStatus) => AnimeListEntry[];
  saveAnime: (anime: Anime, input: AnimeListInput) => void;
  removeAnime: (animeId: number) => void;
};

const STORAGE_KEY = "anilist:list-state:v1";

const AnimeListContext = createContext<AnimeListContextValue | null>(null);

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

function readInitialEntries(): AnimeListEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
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
  } catch {
    return [];
  }
}

export function AnimeListProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<AnimeListEntry[]>(() => readInitialEntries());

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  const value = useMemo<AnimeListContextValue>(() => {
    return {
      entries,
      getEntry: (animeId) => entries.find((entry) => entry.anime.mal_id === animeId),
      getEntriesByStatus: (status) =>
        entries
          .filter((entry) => entry.status === status)
          .sort((left, right) => right.updatedAt - left.updatedAt),
      saveAnime: (anime, input) => {
        setEntries((current) => {
          const normalizedScore = normalizeScore(input.score);
          const watchedEpisodes = clampEpisodes(
            input.status === "completed" ? anime.episodes ?? input.watchedEpisodes : input.watchedEpisodes,
            anime.episodes
          );

          const nextEntry: AnimeListEntry = {
            anime,
            status: input.status,
            watchedEpisodes: input.status === "completed" && typeof anime.episodes === "number" ? anime.episodes : watchedEpisodes,
            score: normalizedScore,
            updatedAt: Date.now(),
          };

          const nextEntries = current.filter((entry) => entry.anime.mal_id !== anime.mal_id);
          nextEntries.push(nextEntry);
          return nextEntries;
        });
      },
      removeAnime: (animeId) => {
        setEntries((current) => current.filter((entry) => entry.anime.mal_id !== animeId));
      },
    };
  }, [entries]);

  return <AnimeListContext.Provider value={value}>{children}</AnimeListContext.Provider>;
}

export function useAnimeList() {
  const context = useContext(AnimeListContext);
  if (!context) {
    throw new Error("useAnimeList must be used within an AnimeListProvider");
  }

  return context;
}
