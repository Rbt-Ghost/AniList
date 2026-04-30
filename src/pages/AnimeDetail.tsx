import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getAnimeById, getAnimeCharacters } from "../api/Jikan.ts";
import type { Anime, AnimeCharacter, AnimeRelation } from "../api/Jikan.ts";
import AnimeCard from "../components/AnimeCard.tsx";
import AnimeListDialog from "../components/AnimeListDialog.tsx";
import Header from "../components/Header.tsx";
import SearchResults from "../components/SearchResults.tsx";
import { formatAnimeTitle, getCardImageUrl, getHeroImageCandidates } from "../utils/animeMedia.ts";
import { isAbortError, handleAsyncError } from "../utils/errors.ts";
import LoadingPage from "./Loading.tsx";
import NotFound from "./NotFound.tsx";
import { useAnimeList } from "../context/AnimeListContext.tsx";

function getRelationEntries(relations: AnimeRelation[] | undefined, relationName: string) {
  return (relations ?? [])
    .filter((relation) => relation.relation?.toLowerCase() === relationName.toLowerCase())
    .flatMap((relation) => relation.entry ?? [])
    .filter((entry) => entry.type?.toLowerCase() === "anime");
}

function getCharacterImageUrl(character: AnimeCharacter): string | undefined {
  return character.character.images?.jpg?.image_url ?? undefined;
}

function getCharacterVoiceDescription(character: AnimeCharacter): string | null {
  const voiceActor = character.voice_actors?.[0];
  const role = character.role ? character.role : null;

  if (voiceActor?.person?.name && voiceActor.language) {
    return `${role ?? "Character"} - voiced by ${voiceActor.person.name} (${voiceActor.language})`;
  }

  if (voiceActor?.person?.name) {
    return `${role ?? "Character"} - voiced by ${voiceActor.person.name}`;
  }

  return role;
}

export default function AnimeDetail() {
  const { id } = useParams<{ id: string }>();
  const { getEntry } = useAnimeList();
  const [anime, setAnime] = useState<Anime | null>(null);
  const [relatedAnime, setRelatedAnime] = useState<{ prequel: Anime | null; sequel: Anime | null }>({
    prequel: null,
    sequel: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [listDialogOpen, setListDialogOpen] = useState(false);
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
        const animeId = Number(id);
        const [data, characters] = await Promise.all([
          getAnimeById(animeId, controller.signal),
          getAnimeCharacters(animeId, controller.signal).catch(() => []),
        ]);
        setAnime({ ...data, characters });
      } catch (e) {
        handleAsyncError(e, setError);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    setRelatedAnime({ prequel: null, sequel: null });

    if (!anime) {
      return;
    }

    const controller = new AbortController();
    const prequelId = getRelationEntries(anime.relations, "prequel")[0]?.mal_id ?? null;
    const sequelId = getRelationEntries(anime.relations, "sequel")[0]?.mal_id ?? null;

    (async () => {
      try {
        const [prequel, sequel] = await Promise.all([
          prequelId ? getAnimeById(prequelId, controller.signal).catch(() => null) : Promise.resolve(null),
          sequelId ? getAnimeById(sequelId, controller.signal).catch(() => null) : Promise.resolve(null),
        ]);

        if (!controller.signal.aborted) {
          setRelatedAnime({ prequel, sequel });
        }
      } catch (e) {
        // Silently ignore related anime fetch errors
        if (!isAbortError(e)) {
          console.debug("Failed to fetch related anime", e);
        }
      }
    })();

    return () => controller.abort();
  }, [anime]);

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
  const scoreText = anime.score != null ? anime.score.toFixed(2) : "N/A";
  const episodesText = anime.episodes != null ? String(anime.episodes) : "?";
  const importantCharacters = [...(anime.characters ?? [])]
    .sort((left, right) => (right.favorites ?? 0) - (left.favorites ?? 0))
    .slice(0, 6);
  const listEntry = getEntry(anime.mal_id);

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

                        <div className="mt-3 xs:mt-4 hidden md:flex flex-wrap gap-2">
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
                          {anime.year != null ? (
                            <span className="rounded-full border border-zinc-800 bg-zinc-950/40 px-2 xs:px-2.5 py-1 text-xs text-zinc-200 whitespace-nowrap">
                              {anime.year}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-3 hidden md:flex flex-wrap gap-2">
                          {anime.genres?.map((g) => (
                            <span
                              key={`genre-desktop-${g.name}`}
                              className="rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-xs xs:text-sm font-medium text-zinc-200"
                            >
                              {g.name}
                            </span>
                          ))}
                          {anime.themes?.map((t) => (
                            <span
                              key={`theme-desktop-${t.name}`}
                              className="rounded-full border border-zinc-700 bg-zinc-800/50 px-3 py-1 text-xs xs:text-sm font-medium text-zinc-300"
                            >
                              {t.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 md:mt-0 flex w-full md:w-auto items-center justify-start md:justify-end">
                      <button
                        type="button"
                        onClick={() => setListDialogOpen(true)}
                        className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-zinc-700 bg-zinc-950/80 px-4 py-2 text-sm font-semibold text-zinc-50 shadow-lg shadow-black/20 backdrop-blur transition hover:border-zinc-500 hover:bg-zinc-900"
                      >
                        <span className="text-lg leading-none">+</span>
                        <span>{listEntry ? "Update my list" : "Add to my list"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hero metadata (score, rank, episodes, year, genres/themes) */}
            <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 xs:p-5 sm:p-6 backdrop-blur md:hidden">
              <div className="flex flex-wrap items-center gap-2">
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

                {anime.year != null ? (
                  <span className="rounded-full border border-zinc-800 bg-zinc-950/40 px-2 xs:px-2.5 py-1 text-xs text-zinc-200 whitespace-nowrap">
                    {anime.year}
                  </span>
                ) : null}
              </div>

              {(anime.genres && anime.genres.length > 0) || (anime.themes && anime.themes.length > 0) ? (
                <div className="mt-3 flex flex-wrap gap-2">
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
            </section>

            {/* Details Section */}
            <div className="space-y-6">
              {anime.synopsis ? (
                <section className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 xs:p-5 sm:p-6 backdrop-blur">
                  <h3 className="text-lg font-semibold mb-3">Synopsis</h3>
                  <p className="text-sm xs:text-base text-zinc-300/90 leading-relaxed">{anime.synopsis}</p>
                </section>
              ) : null}

              {relatedAnime.prequel || relatedAnime.sequel ? (
                <section className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 xs:p-5 sm:p-6 backdrop-blur">
                  <div className="grid gap-4 md:grid-cols-2">
                    {relatedAnime.prequel ? (
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Prequel</h4>
                        <AnimeCard anime={relatedAnime.prequel} />
                      </div>
                    ) : null}

                    {relatedAnime.sequel ? (
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Sequel</h4>
                        <AnimeCard anime={relatedAnime.sequel} />
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : null}

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

              {importantCharacters.length > 0 ? (
                <section className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 xs:p-5 sm:p-6 backdrop-blur">
                  <div className="flex items-end justify-between gap-4">
                    <h3 className="text-lg font-semibold">Cast</h3>
                    <span className="text-xs uppercase tracking-wide text-zinc-500">
                      Top {importantCharacters.length} by favorites
                    </span>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {importantCharacters.map((character) => {
                      const imageUrl = getCharacterImageUrl(character);
                      const description = getCharacterVoiceDescription(character);

                      return (
                        <article key={character.character.mal_id} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/70">
                          <div className="flex gap-4 p-4">
                            <div className="h-24 w-20 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={character.character.name}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : null}
                            </div>

                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-semibold text-zinc-50">{character.character.name}</h4>
                              {description ? (
                                <p className="mt-1 text-xs leading-relaxed text-zinc-400">{description}</p>
                              ) : null}

                              {character.favorites != null ? (
                                <p className="mt-2 text-xs text-zinc-500">{character.favorites.toLocaleString()} favorites</p>
                              ) : null}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        )}
      </main>

      {anime ? <AnimeListDialog anime={anime} open={listDialogOpen} onClose={() => setListDialogOpen(false)} /> : null}
    </div>
  );
}
