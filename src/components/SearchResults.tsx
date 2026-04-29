import { useEffect, useMemo, useState } from "react";
import { searchAnime, type Anime } from "../api/Jikan.ts";
import AnimeCard from "./AnimeCard.tsx";

type SearchResultsProps = {
  query: string;
  debounceMs?: number;
  emptyMessage?: string;
  onSelect?: (anime: Anime) => void;
};

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

export default function SearchResults({
  query,
  debounceMs = 350,
  emptyMessage = "No matches yet. Try a different title.",
  onSelect,
}: SearchResultsProps) {
  const [results, setResults] = useState<Anime[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const trimmedQuery = useMemo(() => query.trim(), [query]);
  const showingSearch = trimmedQuery.length > 0;

  useEffect(() => {
    if (!showingSearch) {
      setResults([]);
      setSearchLoading(false);
      setSearchError(null);
      return;
    }

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

  if (!showingSearch) return null;

  return (
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