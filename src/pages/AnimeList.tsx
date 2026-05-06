import { useMemo, useState } from "react";
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

type SortOption = "score" | "alphabetic" | "last-change";

const SORT_LABELS: Record<SortOption, string> = {
  score: "Score",
  alphabetic: "Alphabetic Order",
  "last-change": "Last Updated",
};

function isAnimeListStatus(value: string | undefined): value is AnimeListStatus {
  return value === "plan-to-watch" || value === "watching" || value === "completed";
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

function ListSection({anime }: { title: string; anime: AnimeListEntry[] }) {
  return (
    <section>
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
  const [sortBy, setSortBy] = useState<SortOption>("last-change");

  const trimmedQuery = query.trim();
  const showingSearch = trimmedQuery.length > 0;
  const items = getEntriesByStatus(isAnimeListStatus(status) ? status : "plan-to-watch");
  
  const sortedItems = useMemo(() => {
    const nextItems = [...items];

    switch (sortBy) {
      case "score":
        return nextItems.sort(compareScore);
      case "alphabetic":
        return nextItems.sort((left, right) => getAnimeSortTitle(left).localeCompare(getAnimeSortTitle(right)));
      case "last-change":
      default:
        return nextItems.sort((left, right) => right.updatedAt - left.updatedAt);
    }
  }, [items, sortBy]);

  if (!isAnimeListStatus(status)) {
    return <NotFound />;
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-zinc-950 to-zinc-950 text-zinc-50">
      <Header query={query} onQueryChange={setQuery} onClearQuery={() => setQuery("")} />

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="space-y-8">
          <section>
            <div className="flex flex-col items-start gap-3 sm:items-end">
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
          </section>

          {showingSearch ? (
            <section>
              <div className="flex items-end justify-between gap-4">
                <h2 className="text-lg font-semibold">Search Results</h2>
              </div>
              <SearchResults query={query} onSelect={() => setQuery("")} />
            </section>
          ) : (
            <ListSection title={ANIME_LIST_STATUS_LABELS[status]} anime={sortedItems} />
          )}
        </div>
      </main>
    </div>
  );
}
