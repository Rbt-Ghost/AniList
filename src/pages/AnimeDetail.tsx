import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getAnimeById, type Anime } from "../api/Jikan.ts";
import Header from "../components/Header.tsx";
import SearchResults from "../components/SearchResults.tsx";
import { formatAnimeTitle, getCardImageUrl, getHeroImageCandidates } from "../utils/animeMedia.ts";
import LoadingPage from "./Loading.tsx";
import NotFound from "./NotFound.tsx";

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export default function AnimeDetail() {
  const { id } = useParams<{ id: string }>();
  const [anime, setAnime] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const showingSearch = query.trim().length > 0;

  useEffect(() => {
    setLoading(true);
    setError(null);
    setAnime(null);

    if (!id || isNaN(Number(id))) {
      setError("Invalid anime ID");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        const data = await getAnimeById(Number(id), controller.signal);
        setAnime(data);
      } catch (e) {
        if (!isAbortError(e)) {
          setError((e as Error).message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [id]);

  if (loading) {
    return <LoadingPage />;
  }

  if (error || !anime) {
    return <NotFound />;
  }

  const title = formatAnimeTitle(anime);
  const bgCandidates = getHeroImageCandidates(anime);
  const bgUrl = bgCandidates[0] ?? null;
  const coverUrl = getCardImageUrl(anime);
  const scoreText = anime.score != null ? anime.score.toFixed(1) : "N/A";
  const episodesText = anime.episodes != null ? String(anime.episodes) : "?";

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
        {showingSearch ? (
          <section>
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-lg font-semibold">Search Results</h2>
            </div>
            <SearchResults query={query} onSelect={handleClearQuery} />
          </section>
        ) : (
          <div className="space-y-8">
            {/* Hero Section */}
            <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-sm">
              <div className="relative h-56 xs:h-64 sm:h-80 md:h-96">
                {bgUrl ? (
                  <img
                    src={bgUrl}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="eager"
                  />
                ) : null}

                <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/30" />

                <div className="absolute inset-x-0 bottom-0 p-3 xs:p-4 sm:p-5 md:p-6">
                  <div className="flex flex-col gap-3 xs:gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="flex gap-3 xs:gap-4 min-w-0">
                      <div className="h-28 w-20 xs:h-32 xs:w-24 sm:h-36 sm:w-28 shrink-0 overflow-hidden rounded-xl xs:rounded-2xl border border-zinc-800 bg-zinc-900">
                        {coverUrl ? (
                          <img src={coverUrl} alt={title} className="h-full w-full object-cover" />
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h2 className="text-xl xs:text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">
                          {title}
                        </h2>

                        <div className="mt-3 xs:mt-4 flex flex-wrap gap-2">
                          {anime.score != null ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900/80 px-2 xs:px-2.5 py-1 text-xs xs:text-sm text-zinc-200">
                              ★ {scoreText}
                            </span>
                          ) : null}
                          {anime.rank != null ? (
                            <span className="rounded-full border border-zinc-800 bg-zinc-950/40 px-2 xs:px-2.5 py-1 text-xs text-zinc-200 whitespace-nowrap">
                              Rank #{anime.rank}
                            </span>
                          ) : null}
                          {anime.episodes != null ? (
                            <span className="rounded-full border border-zinc-800 bg-zinc-950/40 px-2 xs:px-2.5 py-1 text-xs text-zinc-200 whitespace-nowrap">
                              {episodesText} episodes
                            </span>
                          ) : null}
                          {anime.status ? (
                            <span className="rounded-full border border-zinc-800 bg-zinc-950/40 px-2 xs:px-2.5 py-1 text-xs text-zinc-200 whitespace-nowrap">
                              {anime.status}
                            </span>
                          ) : null}
                          {anime.year != null ? (
                            <span className="rounded-full border border-zinc-800 bg-zinc-950/40 px-2 xs:px-2.5 py-1 text-xs text-zinc-200 whitespace-nowrap">
                              {anime.year}
                            </span>
                          ) : null}
                          {anime.rating ? (
                            <span className="rounded-full border border-zinc-800 bg-zinc-950/40 px-2 xs:px-2.5 py-1 text-xs text-zinc-200 whitespace-nowrap">
                              {anime.rating}
                            </span>
                          ) : null}
                        </div>

                        {(anime.genres && anime.genres.length > 0) || (anime.themes && anime.themes.length > 0) ? (
                          <div className="mt-3 xs:mt-4 flex flex-wrap gap-2">
                            {anime.genres?.map((g) => (
                              <span
                                key={`genre-${g.name}`}
                                className="rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-xs xs:text-sm font-medium text-zinc-200"
                              >
                                {g.name}
                              </span>
                            ))}
                            {anime.themes?.map((t) => (
                              <span
                                key={`theme-${t.name}`}
                                className="rounded-full border border-zinc-700 bg-zinc-800/50 px-3 py-1 text-xs xs:text-sm font-medium text-zinc-300"
                              >
                                {t.name}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Details Section */}
            <div className="space-y-6">
              {/* Main Content */}
              <div className="space-y-6">
                {/* Synopsis */}
                {anime.synopsis ? (
                  <section className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 xs:p-5 sm:p-6 backdrop-blur">
                    <h3 className="text-lg font-semibold mb-3">Synopsis</h3>
                    <p className="text-sm xs:text-base text-zinc-300/90 leading-relaxed">{anime.synopsis}</p>
                  </section>
                ) : null}

                {/* Trailer */}
                {anime.trailer?.youtube_id ? (
                  <section className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 xs:p-5 sm:p-6 backdrop-blur overflow-hidden">
                    <h3 className="text-lg font-semibold mb-4">Trailer</h3>
                    <div className="relative aspect-video bg-zinc-900 rounded-lg overflow-hidden">
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube-nocookie.com/embed/${anime.trailer.youtube_id}`}
                        title="Anime Trailer"
                        allowFullScreen
                        className="absolute inset-0"
                      />
                    </div>
                  </section>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
