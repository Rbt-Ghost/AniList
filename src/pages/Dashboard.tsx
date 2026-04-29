import { useEffect, useRef, useState } from "react";
import { getOngoingAnime, getTopAnimePage, searchAnime, type Anime } from "../api/Jikan.ts";
import AnimeCard from "../components/AnimeCard.tsx";
import HeroSection from "../components/HeroSection.tsx";

const TOP_PAGE_SIZE = 20;

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-sm">
      <div className="flex animate-pulse">
        <div className="h-32 w-24 shrink-0 bg-zinc-900" />
        <div className="flex-1 p-3">
          <div className="h-4 w-3/4 rounded bg-zinc-900" />
          <div className="mt-2 h-3 w-1/2 rounded bg-zinc-900" />
          <div className="mt-4 h-7 w-16 rounded bg-zinc-900" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [query, setQuery] = useState("");
  const [hasUserScrolled, setHasUserScrolled] = useState(false);

  const [ongoingAnime, setOngoingAnime] = useState<Anime[]>([]);
  const [ongoingLoading, setOngoingLoading] = useState(true);
  const [ongoingError, setOngoingError] = useState<string | null>(null);

  const [topAnime, setTopAnime] = useState<Anime[]>([]);
  const [topHasNextPage, setTopHasNextPage] = useState(true);
  const [topLoading, setTopLoading] = useState(true);
  const [topLoadingMore, setTopLoadingMore] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const topLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const nextTopPageRef = useRef(2);

  const [results, setResults] = useState<Anime[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const trimmedQuery = query.trim();
  const showingSearch = trimmedQuery.length > 0;

  useEffect(() => {
    const markScrolled = () => {
      setHasUserScrolled(true);
    };

    window.addEventListener("scroll", markScrolled, { passive: true });
    return () => window.removeEventListener("scroll", markScrolled);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        setTopLoading(true);
        setTopError(null);
        const { items, hasNextPage } = await getTopAnimePage(1, TOP_PAGE_SIZE, controller.signal);
        setTopAnime(items);
        setTopHasNextPage(hasNextPage);
        nextTopPageRef.current = 2;
      } catch (e) {
        if (!isAbortError(e)) setTopError((e as Error).message);
      } finally {
        setTopLoading(false);
      }
    })();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (showingSearch || topLoading || topLoadingMore || topError || !topHasNextPage || !hasUserScrolled) return;

    const target = topLoadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;

        observer.unobserve(first.target);

        const pageToLoad = nextTopPageRef.current;
        if (pageToLoad < 2) return;

        const controller = new AbortController();
        setTopLoadingMore(true);

        (async () => {
          try {
            const { items, hasNextPage } = await getTopAnimePage(pageToLoad, TOP_PAGE_SIZE, controller.signal);
            setTopAnime((prev) => {
              const seen = new Set(prev.map((a) => a.mal_id));
              const uniqueNewItems = items.filter((a) => !seen.has(a.mal_id));
              return [...prev, ...uniqueNewItems];
            });
            setTopHasNextPage(hasNextPage);
            nextTopPageRef.current = pageToLoad + 1;
          } catch (e) {
            if (!isAbortError(e)) setTopError((e as Error).message);
          } finally {
            setTopLoadingMore(false);
          }
        })();

        return () => controller.abort();
      },
      { rootMargin: "260px 0px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [showingSearch, topLoading, topLoadingMore, topError, topHasNextPage, hasUserScrolled]);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        setOngoingLoading(true);
        setOngoingError(null);
        const data = await getOngoingAnime(controller.signal);
        setOngoingAnime(data);
      } catch (e) {
        if (!isAbortError(e)) setOngoingError((e as Error).message);
      } finally {
        setOngoingLoading(false);
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

  return (
    <div className="min-h-screen bg-linear-to-b from-zinc-950 to-zinc-950 text-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
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
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <div className="w-full sm:w-96">
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
                  placeholder="What are you watching today?"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 pr-10 text-sm text-zinc-50 outline-none ring-0 placeholder:text-zinc-500 focus:border-zinc-700"
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-900"
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
        <div className="space-y-8">
          {!showingSearch ? (
            <section>
              {ongoingError ? (
                <div className="rounded-2xl border border-red-900/50 bg-red-950/40 p-4 text-sm text-red-100">
                  {ongoingError}
                </div>
              ) : ongoingLoading ? (
                <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-sm">
                  <div className="relative h-80 animate-pulse sm:h-135">
                    <div className="absolute inset-0 bg-zinc-900" />
                    <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                      <div className="flex items-end justify-between gap-4">
                        <div className="flex items-end gap-4">
                          <div className="h-32 w-24 rounded-2xl bg-zinc-900 sm:h-36 sm:w-28" />
                          <div className="flex-1">
                            <div className="h-3 w-20 rounded bg-zinc-900" />
                            <div className="mt-2 h-6 w-2/3 rounded bg-zinc-900" />
                            <div className="mt-3 h-4 w-3/5 rounded bg-zinc-900" />
                            <div className="mt-4 flex gap-2">
                              <div className="h-7 w-24 rounded-full bg-zinc-900" />
                              <div className="h-7 w-24 rounded-full bg-zinc-900" />
                              <div className="h-7 w-24 rounded-full bg-zinc-900" />
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <div className="h-10 w-10 rounded-xl bg-zinc-900" />
                          <div className="h-10 w-10 rounded-xl bg-zinc-900" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : ongoingAnime.length > 0 ? (
                <HeroSection items={ongoingAnime} />
              ) : null}
            </section>
          ) : null}

          <section>
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-lg font-semibold">{showingSearch ? "Search Results" : "Top Anime"}</h2>
            </div>

            {showingSearch ? (
              <div className="mt-4">
                {searchError ? (
                  <div className="rounded-2xl border border-red-900/50 bg-red-950/40 p-4 text-sm text-red-100">
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
                  <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 text-sm text-zinc-400 backdrop-blur">
                    No matches yet. Try a different title.
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {results.map((a) => (
                      <AnimeCard key={a.mal_id} anime={a} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4">
                {topError ? (
                  <div className="rounded-2xl border border-red-900/50 bg-red-950/40 p-4 text-sm text-red-100">
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
                  <div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {topAnime.map((a) => (
                        <AnimeCard key={a.mal_id} anime={a} />
                      ))}
                    </div>

                    {topLoadingMore ? (
                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <SkeletonCard key={`top-load-${i}`} />
                        ))}
                      </div>
                    ) : null}

                    {topHasNextPage ? <div ref={topLoadMoreRef} className="h-1" aria-hidden="true" /> : null}
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