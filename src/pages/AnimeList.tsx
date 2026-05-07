import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AnimeCard from "../components/AnimeCard.tsx";
import Header from "../components/Header.tsx";
import SearchResults from "../components/SearchResults.tsx";
import {
  ANIME_LIST_STATUS_LABELS,
  type AnimeListEntry,
  type AnimeListStatus,
  useAnimeList,
} from "../context/AnimeListContext.tsx";
import { useAuth } from "../context/AuthContext.tsx";
import NotFound from "./NotFound.tsx";

type SortOption = "score" | "alphabetic" | "last-change";

const SORT_LABELS: Record<SortOption, string> = {
  score: "Score",
  alphabetic: "Alphabetic",
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

function ListSection({ anime }: { anime: AnimeListEntry[] }) {
  return (
    <section>
      {anime.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {anime.map((item) => (
            <AnimeCard key={item.anime.mal_id} anime={item.anime} userScore={item.score ?? undefined} />
          ))}
        </div>
      ) : (
        <div className="mt-4 flex min-h-[40vh] items-center justify-center rounded-3xl border border-zinc-800/80 bg-zinc-900/20 p-6 text-sm text-zinc-500">
          This list is empty.
        </div>
      )}
    </section>
  );
}

export default function AnimeListPage() {
  const navigate = useNavigate();
  const { status } = useParams<{ status: string }>();
  const { getEntriesByStatus } = useAnimeList();
  const { user, userProfile } = useAuth();
  
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("last-change");

  const trimmedQuery = query.trim();
  const showingSearch = trimmedQuery.length > 0;
  
  const normalizedStatus = isAnimeListStatus(status) ? status : "plan-to-watch";
  const items = getEntriesByStatus(normalizedStatus);
  
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

  // Profile data
  const userLabel = (user?.displayName?.trim() || user?.email?.trim() || "User").trim();
  const userInitial = userLabel.length > 0 ? userLabel[0]!.toUpperCase() : "U";

  return (
    <div className="min-h-screen bg-linear-to-b from-zinc-950 to-zinc-950 text-zinc-50 pb-16">
      <Header query={query} onQueryChange={setQuery} onClearQuery={() => setQuery("")} />

      <main className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 sm:pt-8">
        <div className="space-y-6 sm:space-y-8">
          
          {/* Profile Header Card (Slightly larger with stats) */}
          {user ? (
            <section className="relative flex items-center justify-between gap-5 overflow-hidden rounded-3xl border border-zinc-800/60 bg-linear-to-br from-zinc-900/80 to-zinc-950/80 p-5 shadow-lg backdrop-blur-md sm:px-6 sm:py-6">
              {/* Subtle top highlight */}
              <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-zinc-600/30 to-transparent" />
              
              {/* Background glows */}
              <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-zinc-700/10 blur-3xl" />
              <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-zinc-800/20 blur-3xl" />
              
              <div className="flex items-center gap-5 overflow-hidden">
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700/50 bg-zinc-800 text-xl font-bold text-zinc-200 shadow-md sm:h-20 sm:w-20 sm:text-2xl">
                  {userProfile?.avatarDataUrl ? (
                    <img src={userProfile.avatarDataUrl} alt="" aria-hidden="true" className="h-full w-full object-cover" />
                  ) : (
                    userInitial
                  )}
                </div>

                {/* Middle Section: Name & Bio */}
                <div className="relative min-w-0 flex-1">
                  <h2 className="truncate text-xl font-bold tracking-tight text-transparent bg-clip-text bg-linear-to-r from-zinc-50 to-zinc-400 sm:text-2xl">
                    {userLabel}
                  </h2>
                  {userProfile?.bio?.trim() ? (
                    <p className="mt-1 truncate text-sm text-zinc-400 sm:text-base">
                      {userProfile.bio}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Right Section: Stats filling the unused space */}
              <div className="relative ml-auto flex shrink-0 items-center gap-5 border-l border-zinc-800/60 pl-5 text-right sm:pl-8">
                <div className="flex flex-col items-center justify-center">
                  <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">Total</span>
                  <span className="text-2xl font-bold leading-tight text-zinc-200 sm:text-3xl">{items.length}</span>
                </div>
              </div>
            </section>
          ) : null}

          {showingSearch ? (
            <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-100">Search Results</h2>
              </div>
              <SearchResults query={query} onSelect={() => setQuery("")} />
            </section>
          ) : (
            <div className="flex flex-col gap-6">
              
              {/* Filter Toolbar */}
              <section className="flex flex-col gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-2 sm:flex-row sm:items-center sm:justify-between">
                
                {/* Lists Segmented Control */}
                <nav className="flex w-full overflow-x-auto rounded-xl border border-zinc-800/50 bg-zinc-950/50 p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:w-auto">
                  {(["plan-to-watch", "watching", "completed"] as const).map((listStatus) => (
                    <button
                      key={listStatus}
                      type="button"
                      onClick={() => navigate(`/lists/${listStatus}`)}
                      className={`flex-1 sm:flex-none whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                        normalizedStatus === listStatus
                          ? "bg-zinc-800 text-zinc-50 shadow-sm"
                          : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                      }`}
                    >
                      {ANIME_LIST_STATUS_LABELS[listStatus]}
                    </button>
                  ))}
                </nav>

                {/* Sort Segmented Control */}
                <div className="flex items-center gap-3 pl-1 sm:pl-0">
                  <span className="hidden shrink-0 text-xs font-semibold uppercase tracking-wider text-zinc-500 sm:block">
                    Sort
                  </span>
                  <nav className="flex w-full overflow-x-auto rounded-xl border border-zinc-800/50 bg-zinc-950/50 p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:w-auto">
                    {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setSortBy(option)}
                        className={`flex-1 sm:flex-none whitespace-nowrap rounded-lg px-4 py-2 text-xs font-medium transition-all ${
                          sortBy === option
                            ? "bg-zinc-800 text-zinc-50 shadow-sm"
                            : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                        }`}
                      >
                        {SORT_LABELS[option]}
                      </button>
                    ))}
                  </nav>
                </div>
              </section>

              {/* Anime Grid */}
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <ListSection anime={sortedItems} />
              </section>
              
            </div>
          )}
        </div>
      </main>
    </div>
  );
}