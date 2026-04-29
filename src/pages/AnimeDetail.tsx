import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAnimeById, type Anime } from "../api/Jikan.ts";
import { formatAnimeTitle, getCardImageUrl, getHeroImageCandidates } from "../utils/animeMedia.ts";
import LoadingPage from "./Loading.tsx";
import NotFound from "./NotFound.tsx";

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export default function AnimeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [anime, setAnime] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || isNaN(Number(id))) {
      setError("Invalid anime ID");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAnimeById(Number(id), controller.signal);
        setAnime(data);
      } catch (e) {
        if (!isAbortError(e)) {
          setError((e as Error).message);
        }
      } finally {
        setLoading(false);
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

  return (
    <div className="min-h-screen bg-linear-to-b from-zinc-950 to-zinc-950 text-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900/50 transition-colors"
            aria-label="Go back"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back
          </button>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
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

                      {anime.synopsis ? (
                        <p className="mt-2 xs:mt-3 text-xs xs:text-sm text-zinc-300/90 leading-snug line-clamp-3">
                          {anime.synopsis}
                        </p>
                      ) : null}

                      <div className="mt-3 xs:mt-4 flex flex-wrap gap-2">
                        {anime.score != null ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900/80 px-2 xs:px-2.5 py-1 text-xs xs:text-sm text-zinc-200">
                            ★ {scoreText}
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
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Main Content */}
            <div className="md:col-span-2 space-y-6">
              {/* Synopsis */}
              {anime.synopsis ? (
                <section className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 xs:p-5 sm:p-6 backdrop-blur">
                  <h3 className="text-lg font-semibold mb-3">Synopsis</h3>
                  <p className="text-sm xs:text-base text-zinc-300/90 leading-relaxed">{anime.synopsis}</p>
                </section>
              ) : null}

              {/* Genres and Themes */}
              {(anime.genres && anime.genres.length > 0) || (anime.themes && anime.themes.length > 0) ? (
                <section className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 xs:p-5 sm:p-6 backdrop-blur">
                  <h3 className="text-lg font-semibold mb-4">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {anime.genres?.map((g) => (
                      <span key={`genre-${g.name}`} className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs xs:text-sm font-medium text-zinc-200">
                        {g.name}
                      </span>
                    ))}
                    {anime.themes?.map((t) => (
                      <span key={`theme-${t.name}`} className="rounded-full border border-zinc-700 bg-zinc-800/50 px-3 py-1 text-xs xs:text-sm font-medium text-zinc-300">
                        {t.name}
                      </span>
                    ))}
                  </div>
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

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Info Card */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 xs:p-5 backdrop-blur">
                <h3 className="text-sm font-semibold text-zinc-400 mb-4">Information</h3>
                <div className="space-y-3">
                  {anime.score != null && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Score</p>
                      <p className="text-lg font-semibold text-zinc-50">{scoreText}</p>
                    </div>
                  )}
                  {anime.rank && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Rank</p>
                      <p className="text-lg font-semibold text-zinc-50">#{anime.rank}</p>
                    </div>
                  )}
                  {anime.episodes != null && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Episodes</p>
                      <p className="text-lg font-semibold text-zinc-50">{episodesText}</p>
                    </div>
                  )}
                  {anime.status && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Status</p>
                      <p className="text-sm font-semibold text-zinc-200">{anime.status}</p>
                    </div>
                  )}
                  {anime.year && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Year</p>
                      <p className="text-lg font-semibold text-zinc-50">{anime.year}</p>
                    </div>
                  )}
                  {anime.season && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Season</p>
                      <p className="text-sm font-semibold text-zinc-200 capitalize">{anime.season}</p>
                    </div>
                  )}
                  {anime.rating && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Rating</p>
                      <p className="text-sm font-semibold text-zinc-200">{anime.rating}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Studios */}
              {anime.studios && anime.studios.length > 0 && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 xs:p-5 backdrop-blur">
                  <h3 className="text-sm font-semibold text-zinc-400 mb-3">Studios</h3>
                  <div className="space-y-2">
                    {anime.studios.map((s) => (
                      <p key={`studio-${s.name}`} className="text-sm text-zinc-300">
                        {s.name}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
