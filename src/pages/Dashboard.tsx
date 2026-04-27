import { useEffect, useMemo, useState } from "react";
import { getTopAnime, searchAnime, type Anime } from "../api/Jikan.ts";

type AnimeCardData = Pick<Anime, "mal_id" | "title" | "title_english" | "images" | "score" | "year">;
type MyListEntry = AnimeCardData;

const STORAGE_KEY = "anilist.myList.v1";

function formatTitle(anime: AnimeCardData) {
  return anime.title_english || anime.title;
}

function getImageUrl(anime: AnimeCardData) {
  return anime.images?.jpg?.image_url;
}

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function AnimeCard({
  anime,
  action,
  actionLabel,
  actionDisabled,
}: {
  anime: AnimeCardData;
  action: () => void;
  actionLabel: string;
  actionDisabled?: boolean;
}) {
  const imageUrl = getImageUrl(anime);
  const title = formatTitle(anime);

  return (
    <div className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white/80 shadow-sm backdrop-blur transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className="flex">
        <div className="h-28 w-20 shrink-0 bg-zinc-100 dark:bg-zinc-900">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              loading="lazy"
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {title}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                {anime.year ? <span>{anime.year}</span> : null}
                {anime.score != null ? <span>★ {anime.score}</span> : <span>★ —</span>}
              </div>
            </div>
            <button
              type="button"
              onClick={action}
              disabled={actionDisabled}
              className="shrink-0 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-900 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              {actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex animate-pulse">
        <div className="h-28 w-20 shrink-0 bg-zinc-100 dark:bg-zinc-900" />
        <div className="flex-1 p-3">
          <div className="h-4 w-3/4 rounded bg-zinc-100 dark:bg-zinc-900" />
          <div className="mt-2 h-3 w-1/2 rounded bg-zinc-100 dark:bg-zinc-900" />
          <div className="mt-4 h-7 w-16 rounded bg-zinc-100 dark:bg-zinc-900" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({
  isDark,
  onToggleTheme,
}: {
  isDark: boolean;
  onToggleTheme: () => void;
}) {
  const [query, setQuery] = useState("");

  const [topAnime, setTopAnime] = useState<Anime[]>([]);
  const [topLoading, setTopLoading] = useState(true);
  const [topError, setTopError] = useState<string | null>(null);

  const [results, setResults] = useState<Anime[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [myList, setMyList] = useState<MyListEntry[]>(() => {
    if (typeof window === "undefined") return [];
    return safeJsonParse<MyListEntry[]>(localStorage.getItem(STORAGE_KEY), []);
  });

  const myListIds = useMemo(() => new Set(myList.map((a) => a.mal_id)), [myList]);
  const trimmedQuery = query.trim();
  const showingSearch = trimmedQuery.length > 0;

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(myList));
  }, [myList]);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        setTopLoading(true);
        setTopError(null);
        const data = await getTopAnime(controller.signal);
        setTopAnime(data);
      } catch (e) {
        if (!isAbortError(e)) setTopError((e as Error).message);
      } finally {
        setTopLoading(false);
      }
    })();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!showingSearch) return;

    const controller = new AbortController();
    const handle = window.setTimeout(() => {
      (async () => {
        try {
          setSearchLoading(true);
          setSearchError(null);
          const data = await searchAnime(trimmedQuery, controller.signal);
          setResults(data);
        } catch (e) {
          if (!isAbortError(e)) setSearchError((e as Error).message);
        } finally {
          setSearchLoading(false);
        }
      })();
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [showingSearch, trimmedQuery]);

  function addToMyList(anime: Anime) {
    setMyList((prev) => {
      if (prev.some((a) => a.mal_id === anime.mal_id)) return prev;
      const entry: MyListEntry = {
        mal_id: anime.mal_id,
        title: anime.title,
        title_english: anime.title_english,
        images: anime.images,
        score: anime.score,
        year: anime.year,
      };
      return [entry, ...prev];
    });
  }

  function removeFromMyList(id: number) {
    setMyList((prev) => prev.filter((a) => a.mal_id !== id));
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 text-zinc-900 dark:from-zinc-950 dark:to-zinc-950 dark:text-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/70 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/60">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">AniList</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Search anime and build your list.</p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onToggleTheme}
              className="inline-flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900 sm:w-auto"
              aria-label="Toggle theme"
            >
              {isDark ? "Light mode" : "Dark mode"}
            </button>

            <div className="w-full sm:w-[360px]">
            <label className="sr-only" htmlFor="anime-search">
              Search anime
            </label>
            <div className="relative">
              <input
                id="anime-search"
                value={query}
                onChange={(e) => {
                  const next = e.target.value;
                  setQuery(next);

                  if (next.trim().length === 0) {
                    setResults([]);
                    setSearchLoading(false);
                    setSearchError(null);
                  }
                }}
                placeholder="Search (e.g., Naruto, Frieren, One Piece)"
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 pr-10 text-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:placeholder:text-zinc-500 dark:focus:border-zinc-700"
              />
              {query.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setResults([]);
                    setSearchLoading(false);
                    setSearchError(null);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
                  aria-label="Clear search"
                >
                  Clear
                </button>
              ) : null}
            </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-lg font-semibold">My List</h2>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">{myList.length} saved</div>
            </div>

            {myList.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-dashed border-zinc-300 bg-white/70 p-6 text-sm text-zinc-600 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400">
                Your list is empty. Search above and add anime you want to track.
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4">
                {myList.map((a) => (
                  <AnimeCard
                    key={a.mal_id}
                    anime={a}
                    action={() => removeFromMyList(a.mal_id)}
                    actionLabel="Remove"
                  />
                ))}
              </div>
            )}
          </aside>

          <section>
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-lg font-semibold">{showingSearch ? "Search Results" : "Top Anime"}</h2>
              {showingSearch ? (
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  Showing results for “{trimmedQuery}”
                </div>
              ) : null}
            </div>

            {showingSearch ? (
              <div className="mt-4">
              {searchError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
                  {searchError}
                </div>
              ) : null}

              {searchLoading ? (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : results.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-zinc-200 bg-white/70 p-6 text-sm text-zinc-600 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400">
                  No matches yet. Try a different title.
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {results.map((a) => (
                    <AnimeCard
                      key={a.mal_id}
                      anime={a}
                      action={() => addToMyList(a)}
                      actionLabel={myListIds.has(a.mal_id) ? "Saved" : "Add"}
                      actionDisabled={myListIds.has(a.mal_id)}
                    />
                  ))}
                </div>
              )}
              </div>
            ) : (
              <div className="mt-4">
              {topError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
                  {topError}
                </div>
              ) : null}

              {topLoading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {topAnime.map((a) => (
                    <AnimeCard
                      key={a.mal_id}
                      anime={a}
                      action={() => addToMyList(a)}
                      actionLabel={myListIds.has(a.mal_id) ? "Saved" : "Add"}
                      actionDisabled={myListIds.has(a.mal_id)}
                    />
                  ))}
                </div>
              )}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}