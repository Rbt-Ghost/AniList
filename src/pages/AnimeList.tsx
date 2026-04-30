import { useState } from "react";
import { useParams } from "react-router-dom";
import AnimeCard from "../components/AnimeCard.tsx";
import Header from "../components/Header.tsx";
import SearchResults from "../components/SearchResults.tsx";
import {
  ANIME_LIST_STATUS_LABELS,
  type AnimeListEntry,
  type AnimeListStatus,
  useAnimeList,
} from "../context/AnimeListContext.tsx";
import NotFound from "./NotFound.tsx";

function isAnimeListStatus(value: string | undefined): value is AnimeListStatus {
  return value === "plan-to-watch" || value === "watching" || value === "completed";
}

function ListSection({ title, anime }: { title: string; anime: AnimeListEntry[] }) {
  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-lg font-semibold text-zinc-50">{title}</h2>
        <span className="text-xs uppercase tracking-wide text-zinc-500">{anime.length} titles</span>
      </div>

      {anime.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {anime.map((item) => (
            <AnimeCard key={item.anime.mal_id} anime={item.anime} userScore={item.score ?? undefined} />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-950/40 p-6 text-sm text-zinc-400">
          This list is empty for now.
        </div>
      )}
    </section>
  );
}

export default function AnimeListPage() {
  const { status } = useParams<{ status: string }>();
  const { getEntriesByStatus } = useAnimeList();
  const [query, setQuery] = useState("");

  const trimmedQuery = query.trim();
  const showingSearch = trimmedQuery.length > 0;

  if (!isAnimeListStatus(status)) {
    return <NotFound />;
  }

  const items = getEntriesByStatus(status);

  return (
    <div className="min-h-screen bg-linear-to-b from-zinc-950 to-zinc-950 text-zinc-50">
      <Header query={query} onQueryChange={setQuery} onClearQuery={() => setQuery("")} />

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="space-y-8">
          <section>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">My Lists</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50">
                  {ANIME_LIST_STATUS_LABELS[status]}
                </h1>
              </div>
              <span className="text-sm text-zinc-400">{items.length} anime tracked locally</span>
            </div>
          </section>

          {showingSearch ? (
            <section>
              <div className="flex items-end justify-between gap-4">
                <h2 className="text-lg font-semibold">Search Results</h2>
              </div>
              <SearchResults query={query} onSelect={() => setQuery("")} />
            </section>
          ) : (
            <ListSection title={ANIME_LIST_STATUS_LABELS[status]} anime={items} />
          )}
        </div>
      </main>
    </div>
  );
}
