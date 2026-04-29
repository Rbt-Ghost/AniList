import { useEffect, useRef, useState } from "react";
import { getOngoingAnime, getTopAnimePage, type Anime } from "../api/Jikan.ts";
import AnimeCard from "../components/AnimeCard.tsx";
import Header from "../components/Header.tsx";
import HeroSection from "../components/HeroSection.tsx";
import SearchResults from "../components/SearchResults.tsx";
import { SkeletonCard } from "../components/SkeletonCard.tsx";
import { isAbortError } from "../utils/errors.ts";

const TOP_PAGE_SIZE = 20;

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

  const handleQueryChange = (next: string) => {
    setQuery(next);
  };

  const handleClearQuery = () => {
    setQuery("");
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-zinc-950 to-zinc-950 text-zinc-50">
      <Header query={query} onQueryChange={handleQueryChange} onClearQuery={handleClearQuery} />

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
              <SearchResults query={query} onSelect={handleClearQuery} />
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