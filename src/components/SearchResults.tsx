import { useEffect, useMemo, useState } from "react";
import { searchAnime, type Anime } from "../api/Jikan.ts";
import AnimeCard from "./AnimeCard.tsx";
import { SkeletonCard } from "./SkeletonCard.tsx";
import { getTemporaryApiOutageMessage, handleAsyncError, isTemporaryApiOutage } from "../utils/errors.ts";

type SearchResultsProps = {
  query: string;
  debounceMs?: number;
  emptyMessage?: string;
  onSelect?: (anime: Anime) => void;
};

export default function SearchResults({
  query,
  debounceMs = 350,
  emptyMessage = "No matches yet. Try a different title.",
  onSelect,
}: SearchResultsProps) {
  const [results, setResults] = useState<Anime[]>([]);
  // Default to true so the very first search instantly shows skeletons
  const [searchLoading, setSearchLoading] = useState(true);
  const [searchError, setSearchError] = useState<string | null>(null);
  const trimmedQuery = useMemo(() => query.trim(), [query]);
  const showingSearch = trimmedQuery.length > 0;

  useEffect(() => {
    if (!showingSearch) {
      setResults([]);
      return;
    }

    // Instantly trigger loading and clear errors while the user is typing
    // to prevent the "No matches" flash during the debounce delay.
    setSearchLoading(true);
    setSearchError(null);

    const controller = new AbortController();
    const handle = window.setTimeout(() => {
      (async () => {
        try {
          const data = await searchAnime(trimmedQuery, controller.signal);
          setResults(data);
        } catch (e) {
          handleAsyncError(e, setSearchError);
        } finally {
          if (!controller.signal.aborted) {
            setSearchLoading(false);
          }
        }
      })();
    }, debounceMs);

    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [debounceMs, showingSearch, trimmedQuery]);

  if (!showingSearch) {
    return null;
  }

  const isOutage = searchError ? isTemporaryApiOutage(searchError) : false;

  return (
    <div className="mt-4">
      {searchError ? (
        <div className="rounded-3xl border border-red-900/50 bg-red-950/50 p-5 text-sm text-red-100 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">Temporary outage</div>
          <p className="mt-2 text-base font-semibold text-red-50">
            {isOutage ? getTemporaryApiOutageMessage() : searchError}
          </p>
          {isOutage ? <p className="mt-2 text-sm text-red-200/90">The upstream anime API is currently failing with an Internal Server Error.</p> : null}
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
          {emptyMessage}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {results.map((a) => (
            <AnimeCard key={a.mal_id} anime={a} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}