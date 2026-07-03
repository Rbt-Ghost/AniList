import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Hls from "hls.js";
import {
  getEpisodes,
  getStreamSources,
  searchAnime,
  type StreamDetails,
  type StreamEpisode,
  type StreamMode,
  type StreamSearchResult,
  type StreamSource,
} from "../api/aniCliStream.ts";

function formatEpisodeLabel(value: string) {
  return value.length > 3 ? `Ep ${value}` : value;
}

function getSourceKind(source: StreamSource | null) {
  if (!source) return null;
  return source.kind;
}

function getSourceLabel(source: StreamSource) {
  return source.label.trim().toLowerCase();
}

function isAllowedSource(source: StreamSource) {
  return source.kind === "mp4" || source.kind === "hls";
}

export default function StreamPage() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<StreamMode>("sub");
  const [results, setResults] = useState<StreamSearchResult[]>([]);
  const [selectedAnime, setSelectedAnime] = useState<StreamSearchResult | null>(null);
  const [episodes, setEpisodes] = useState<StreamEpisode[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<string>("");
  const [details, setDetails] = useState<StreamDetails | null>(null);
  const [selectedSourceIndex, setSelectedSourceIndex] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [streamLoading, setStreamLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const allowedSources = details?.sources.filter(isAllowedSource) ?? [];
  const selectedSource = allowedSources[selectedSourceIndex] ?? allowedSources[0] ?? null;
  const selectedSourceKind = getSourceKind(selectedSource);

  // Next/Prev logic
  const currentEpIndex = episodes.findIndex((ep) => ep.number === selectedEpisode);
  const hasPrev = currentEpIndex > 0;
  const hasNext = currentEpIndex >= 0 && currentEpIndex < episodes.length - 1;

  const handlePrev = () => {
    if (hasPrev) setSelectedEpisode(episodes[currentEpIndex - 1].number);
  };

  const handleNext = () => {
    if (hasNext) setSelectedEpisode(episodes[currentEpIndex + 1].number);
  };

  const handleClearSelection = () => {
    if (selectedEpisode) {
      setSelectedEpisode("");
      setDetails(null);
      setSelectedSourceIndex(0);
      setStreamLoading(false);
      setError(null);
      return;
    }

    setSelectedAnime(null);
    setSelectedEpisode("");
    setDetails(null);
    setSelectedSourceIndex(0);
    setError(null);
  };

  useEffect(() => {
    if (!selectedAnime) {
      setEpisodes([]);
      setSelectedEpisode("");
      setDetails(null);
      setSelectedSourceIndex(0);
      return;
    }

    const controller = new AbortController();
    setEpisodesLoading(true);
    setStreamLoading(false);
    setError(null);

    (async () => {
      try {
        const data = await getEpisodes(selectedAnime.id, mode, controller.signal);
        if (controller.signal.aborted) return;

        setEpisodes(data);
        setDetails(null);
        setSelectedSourceIndex(0);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Failed to load episodes.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setEpisodesLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [mode, selectedAnime]);

  useEffect(() => {
    const media = videoRef.current;
    if (!media || !selectedSource) return;

    let hls: Hls | null = null;

    media.pause();
    media.removeAttribute("src");
    media.load();

    if (selectedSource.kind === "mp4") {
      media.src = selectedSource.url;
      media.load();
      return () => undefined;
    }

    if (selectedSource.kind === "hls") {
      if (media.canPlayType("application/vnd.apple.mpegurl")) {
        media.src = selectedSource.url;
        media.load();
        return () => undefined;
      }

      if (Hls.isSupported()) {
        hls = new Hls({ lowLatencyMode: true });
        hls.loadSource(selectedSource.url);
        hls.attachMedia(media);
      }
    }

    return () => {
      hls?.destroy();
    };
  }, [selectedSource]);

  useEffect(() => {
    if (!selectedAnime || !selectedEpisode) {
      setDetails(null);
      return;
    }

    const controller = new AbortController();
    setStreamLoading(true);
    setError(null);

    (async () => {
      try {
        const data = await getStreamSources(selectedAnime.id, selectedEpisode, mode, controller.signal);
        if (controller.signal.aborted) return;

        const allowed = data.sources.filter(isAllowedSource);
        const mp4Index = allowed.findIndex((s) => s.kind === "mp4" || getSourceLabel(s) === "mp4");
        const defaultIndex = mp4Index >= 0 ? mp4Index : 0;

        setDetails(data);
        setSelectedSourceIndex(defaultIndex);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Failed to load stream sources.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setStreamLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [mode, selectedAnime, selectedEpisode]);

  const submitSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setError(null);
      return;
    }

    setSearchLoading(true);
    setError(null);
    setSelectedAnime(null); // Reset selection on new search

    try {
      const data = await searchAnime(trimmed, mode);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search anime.");
    } finally {
      setSearchLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setSelectedAnime(null);
    setSelectedEpisode("");
    setDetails(null);
    setSelectedSourceIndex(0);
    setError(null);
  };

  const hasVideoSource = selectedSourceKind === "mp4" || selectedSourceKind === "hls";
  const isEpisodeSwitchLoading = streamLoading;

  // Determine layout state
  const isIdle = !selectedAnime && results.length === 0 && !searchLoading;

  return (
    <div className="min-h-screen bg-linear-to-b from-zinc-950 to-zinc-950 text-zinc-50 pb-16 font-sans selection:bg-zinc-700">
      {/* Header */}
      <header className="mx-auto max-w-5xl px-4 sm:px-6 py-4 sm:py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-900/50 hover:text-zinc-100"
        >
          <span aria-hidden="true">&larr;</span> Back to Dashboard
        </Link>
      </header>

      <main className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Dynamic Centered Search Area */}
        <section
          className={`flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${
            isIdle ? "mt-[15vh] sm:mt-[20vh]" : "mt-2 sm:mt-4"
          }`}
        >
          <h1
            className={`font-bold tracking-tight text-zinc-100 transition-all duration-700 text-center ${
              isIdle ? "mb-6 sm:mb-8 text-3xl sm:text-4xl md:text-5xl" : "mb-4 text-xl sm:text-2xl"
            }`}
          >
            AniStream
          </h1>

          {/* RESPONSIVE SEARCH BAR */}
          <div className="w-full max-w-2xl relative flex items-center gap-1 sm:gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-1.5 shadow-sm backdrop-blur-md transition-all focus-within:border-zinc-600 focus-within:bg-zinc-900/80 focus-within:shadow-lg focus-within:shadow-zinc-950/50">
            {/* Subtle Sub/Dub Toggle */}
            <button
              type="button"
              onClick={() => setMode(mode === "sub" ? "dub" : "sub")}
              className="flex w-12 sm:w-16 shrink-0 items-center justify-center rounded-xl px-2 sm:px-3 py-2 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
              title={`Switch to ${mode === "sub" ? "Dub" : "Sub"}`}
            >
              {mode}
            </button>

            {/* Search Input */}
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void submitSearch();
                }
              }}
              placeholder="Search for an anime..."
              className="min-w-0 flex-1 bg-transparent px-2 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-zinc-100 outline-none placeholder:text-zinc-600"
              autoComplete="off"
            />

            {!!query || results.length > 0 || !!selectedAnime ? (
              <button
                type="button"
                onClick={clearSearch}
                className="inline-flex shrink-0 items-center justify-center rounded-xl px-2 sm:px-3 py-2 text-[10px] sm:text-xs font-semibold text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                aria-label="Clear search"
              >
                Clear
              </button>
            ) : null}

            {/* Search Button */}
            <button
              type="button"
              onClick={() => void submitSearch()}
              disabled={searchLoading || !query.trim()}
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-zinc-100 px-3 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-zinc-950 transition hover:bg-zinc-300 disabled:opacity-50"
            >
              {searchLoading ? (
                <span className="animate-pulse">...</span>
              ) : (
                <span className="hidden sm:inline">Search</span>
              )}
              {!searchLoading && (
                <svg className="h-4 w-4 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-6 w-full max-w-2xl rounded-2xl border border-red-900/50 bg-red-950/40 p-4 text-sm text-red-200">
              {error}
            </div>
          )}
        </section>

        {/* --- Search Results List (Text Only) --- */}
        {!selectedAnime && (results.length > 0 || searchLoading) && (
          <section className="mx-auto mt-8 sm:mt-12 w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="mb-3 sm:mb-4 text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-zinc-500 px-1">
              Results
            </h2>
            <div className="flex flex-col gap-2 rounded-3xl border border-zinc-800/60 bg-zinc-950/50 p-2 shadow-xl backdrop-blur-md">
              {searchLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 sm:h-14 animate-pulse rounded-2xl bg-zinc-800/30" />
                ))
              ) : results.length > 0 ? (
                results.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedAnime(item);
                      setSelectedEpisode("");
                    }}
                    className="flex w-full items-center justify-between rounded-2xl p-3 sm:p-4 text-left transition-colors hover:bg-zinc-900/80 focus:bg-zinc-900 focus:outline-none"
                  >
                    <span className="truncate text-xs sm:text-sm font-medium text-zinc-200">{item.title}</span>
                    <span className="ml-3 sm:ml-4 shrink-0 text-[10px] sm:text-xs font-medium text-zinc-600">
                      {item.episodes ? `${item.episodes} EPS` : "?? EPS"}
                    </span>
                  </button>
                ))
              ) : null}
            </div>
          </section>
        )}

        {/* --- Anime Details / Player Area --- */}
        {selectedAnime && (
          <section className="mt-8 sm:mt-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-zinc-100">{selectedAnime.title}</h2>
                <p className="mt-1 text-xs sm:text-sm font-medium text-zinc-500 uppercase tracking-widest">
                  {mode} • {episodes.length} Episodes
                </p>
              </div>
              <button
                onClick={handleClearSelection}
                className="self-start sm:self-auto inline-flex rounded-full border border-zinc-800 bg-zinc-900/30 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200"
              >
                {selectedEpisode ? "Back to Episodes" : "Back to Titles"}
              </button>
            </div>

            {/* Video Player Box */}
            {selectedEpisode && (
              <div className="mb-8 sm:mb-10 overflow-hidden rounded-2xl sm:rounded-3xl border border-zinc-800/80 bg-zinc-950 shadow-2xl">
                <div className="relative flex aspect-video w-full items-center justify-center bg-black">
                  {hasVideoSource ? (
                    <video
                      ref={videoRef}
                      controls
                      playsInline
                      autoPlay
                      className={`absolute inset-0 h-full w-full transition-all duration-300 ${
                        isEpisodeSwitchLoading ? "pointer-events-none opacity-35 blur-[1px]" : ""
                      }`}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-4">
                      {streamLoading ? (
                        <div className="flex flex-col items-center gap-3 sm:gap-4">
                          <div className="h-6 w-6 sm:h-8 sm:w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
                          <p className="text-xs sm:text-sm font-medium text-zinc-400">Loading secure stream...</p>
                        </div>
                      ) : (
                        <p className="text-xs sm:text-sm font-medium text-zinc-600">Select an episode below</p>
                      )}
                    </div>
                  )}

                  {isEpisodeSwitchLoading ? (
                    <div
                      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-zinc-950/70 px-6 text-center backdrop-blur-sm"
                      aria-live="polite"
                      aria-busy="true"
                    >
                      <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-100" />
                      <div>
                        <p className="text-sm font-semibold text-zinc-100">Loading EP {selectedEpisode}...</p>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Player Controls & Sources */}
                <div className="flex flex-col gap-4 border-t border-zinc-900 bg-zinc-950/80 p-3 sm:p-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* Prev/Next Episode Controls */}
                  <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-2">
                    <button
                      onClick={handlePrev}
                      disabled={!hasPrev || streamLoading}
                      className="inline-flex flex-1 sm:flex-none justify-center items-center gap-1 rounded-xl bg-zinc-900/50 px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <span>&larr;</span> Prev
                    </button>
                    <span className="px-1 sm:px-2 text-[10px] sm:text-xs font-bold text-zinc-500 uppercase whitespace-nowrap">
                      EP {selectedEpisode}
                    </span>
                    <button
                      onClick={handleNext}
                      disabled={!hasNext || streamLoading}
                      className="inline-flex flex-1 sm:flex-none justify-center items-center gap-1 rounded-xl bg-zinc-900/50 px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      Next <span>&rarr;</span>
                    </button>
                  </div>

                  {/* Server Sources */}
                  {allowedSources.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pt-1.5 sm:pt-0 border-t border-zinc-800/50 sm:border-0">
                      <span className="shrink-0 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-zinc-600 pl-1 sm:pl-0">
                        Servers
                      </span>
                      {allowedSources.map((source, index) => {
                        const active = index === selectedSourceIndex;
                        return (
                          <button
                            key={`${source.label}-${index}`}
                            type="button"
                            onClick={() => setSelectedSourceIndex(index)}
                            className={`whitespace-nowrap rounded-md border px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-semibold transition-colors ${
                              active
                                ? "border-zinc-600 bg-zinc-800 text-zinc-50"
                                : "border-transparent bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                            }`}
                          >
                            {source.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Episode Selection Grid */}
            {!selectedEpisode ? (
              <div className="rounded-2xl sm:rounded-3xl border border-zinc-800/60 bg-zinc-900/20 p-4 sm:p-6 backdrop-blur-md">
                <h3 className="mb-4 sm:mb-5 text-xs sm:text-sm font-semibold uppercase tracking-widest text-zinc-400">
                  Episodes
                </h3>

                {episodesLoading ? (
                  <div className="grid grid-cols-4 gap-2 sm:gap-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div key={i} className="h-8 sm:h-10 animate-pulse rounded-xl bg-zinc-800/40" />
                    ))}
                  </div>
                ) : episodes.length > 0 ? (
                  <div className="grid max-h-80 sm:max-h-100 grid-cols-4 gap-2 sm:gap-3 overflow-y-auto pr-1 sm:pr-2 [scrollbar-width:thin] scrollbar-thumb-zinc-700 scrollbar-track-transparent sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-300">
                    {episodes.map((episode) => {
                      const active = episode.number === selectedEpisode;
                      const pending = active && isEpisodeSwitchLoading;
                      return (
                        <button
                          key={episode.number}
                          type="button"
                          onClick={() => setSelectedEpisode(episode.number)}
                          className={`relative flex items-center justify-center rounded-xl p-1.5 sm:p-2 text-xs sm:text-sm font-medium transition-all motion-safe:duration-300 motion-safe:ease-out ${
                            active
                              ? "bg-zinc-100 text-zinc-950 shadow-md shadow-white/10"
                              : "bg-zinc-950/40 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 border border-zinc-800/50"
                          }`}
                        >
                          <span className="flex items-center gap-1">
                            {formatEpisodeLabel(episode.number)}
                            {pending ? <span className="h-1.5 w-1.5 rounded-full bg-zinc-950/80 animate-pulse" aria-hidden="true" /> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-xl sm:rounded-2xl border border-dashed border-zinc-800/60 bg-zinc-900/20 py-8 sm:py-10 text-center">
                    <p className="text-xs sm:text-sm text-zinc-500">No episodes found for this title.</p>
                  </div>
                )}
              </div>
            ) : null}
          </section>
        )}
      </main>
    </div>
  );
}