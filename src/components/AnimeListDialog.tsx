import { useEffect, useState } from "react";
import type { Anime } from "../api/Jikan.ts";
import {
  ANIME_LIST_SCORE_OPTIONS,
  ANIME_LIST_STATUS_LABELS,
  ANIME_LIST_STATUSES,
  type AnimeListStatus,
  useAnimeList,
} from "../context/AnimeListContext.tsx";

type Props = {
  anime: Anime;
  open: boolean;
  onClose: () => void;
};

export default function AnimeListDialog({ anime, open, onClose }: Props) {
  const { getEntry, saveAnime, removeAnime } = useAnimeList();
  const existingEntry = getEntry(anime.mal_id);

  const [status, setStatus] = useState<AnimeListStatus>(() => existingEntry?.status ?? "plan-to-watch");
  const [watchedEpisodes, setWatchedEpisodes] = useState(() => existingEntry?.watchedEpisodes ?? 0);
  const [score, setScore] = useState<number | "">(() => existingEntry?.score ?? "");

  const totalEpisodes = anime.episodes ?? null;
  const canIncrementEpisodes = totalEpisodes == null || watchedEpisodes < totalEpisodes;

  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [scoreMenuOpen, setScoreMenuOpen] = useState(false);

  const getScorePreviewClass = (value: number | "") => {
    if (value === "") {
      return "border-zinc-500 bg-zinc-400/30 shadow-[0_0_6px_rgba(161,161,170,0.18)]";
    }

    switch (value) {
      case 10:
        return "border-amber-300/70 bg-amber-300/20 shadow-[0_0_6px_rgba(252,211,77,0.14)]";
      case 9:
        return "border-lime-300/70 bg-lime-300/20 shadow-[0_0_6px_rgba(190,242,100,0.14)]";
      case 8:
        return "border-emerald-300/70 bg-emerald-300/20 shadow-[0_0_6px_rgba(110,231,183,0.14)]";
      case 7:
        return "border-cyan-300/70 bg-cyan-300/20 shadow-[0_0_6px_rgba(103,232,249,0.14)]";
      case 6:
        return "border-sky-300/70 bg-sky-300/20 shadow-[0_0_6px_rgba(125,211,252,0.14)]";
      case 5:
        return "border-violet-300/70 bg-violet-300/20 shadow-[0_0_6px_rgba(196,181,253,0.14)]";
      case 4:
        return "border-fuchsia-300/70 bg-fuchsia-300/20 shadow-[0_0_6px_rgba(240,171,252,0.14)]";
      case 3:
        return "border-orange-300/70 bg-orange-300/20 shadow-[0_0_6px_rgba(253,186,116,0.14)]";
      case 2:
        return "border-rose-300/70 bg-rose-300/20 shadow-[0_0_6px_rgba(252,165,165,0.14)]";
      case 1:
        return "border-red-300/70 bg-red-300/20 shadow-[0_0_6px_rgba(248,113,113,0.14)]";
      default:
        return "border-zinc-500 bg-zinc-400/30 shadow-[0_0_6px_rgba(161,161,170,0.18)]";
    }
  };

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (status !== "completed") return;
    if (totalEpisodes == null) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWatchedEpisodes(totalEpisodes);
  }, [status, totalEpisodes]);

  if (!open) return null;

  const handleSubmit = () => {
    saveAnime(anime, {
      status,
      watchedEpisodes: status === "completed" && totalEpisodes != null ? totalEpisodes : watchedEpisodes,
      score: score === "" ? null : score,
    });
    onClose();
  };

  const handleRemove = () => {
    removeAnime(anime.mal_id);
    onClose();
  };

  const stepEpisode = (delta: number) => {
    if (status === "completed" && totalEpisodes != null) {
      setWatchedEpisodes(totalEpisodes);
      return;
    }

    setWatchedEpisodes((current) => {
      const next = Math.max(0, current + delta);
      if (totalEpisodes == null) return next;
      return Math.min(totalEpisodes, next);
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-zinc-950/80 px-4 pb-16 pt-4 backdrop-blur-sm sm:items-center sm:pb-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close list dialog"
        onClick={onClose}
      />

      <section className="relative w-full max-w-lg overflow-visible rounded-3xl border border-zinc-800/60 bg-zinc-950/95 shadow-2xl shadow-black/60 backdrop-blur-xl sm:rounded-4xl">
        <div className="border-b border-zinc-800/60 px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">Edit Entry</p>
              <h2 className="mt-1.5 text-lg font-medium tracking-tight text-zinc-50 line-clamp-1 sm:text-xl">{anime.title_english || anime.title}</h2>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5 sm:space-y-6 sm:px-6 sm:py-6">
          {/* Status Dropdown */}
          <div className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 sm:text-xs">Status</span>
            <div className="relative mt-2">
              <button
                type="button"
                onClick={() => {
                  setStatusMenuOpen((s) => !s);
                  setScoreMenuOpen(false); // Close the other menu if open
                }}
                aria-haspopup="listbox"
                aria-expanded={statusMenuOpen}
                className="flex w-full items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/30 px-4 py-2.5 text-sm text-zinc-100 outline-none transition hover:border-zinc-700 hover:bg-zinc-900/50 focus:border-zinc-600 sm:py-3"
              >
                <span className="truncate font-medium">{ANIME_LIST_STATUS_LABELS[status]}</span>
                <svg className={`ml-3 h-4 w-4 text-zinc-400 transition-transform ${statusMenuOpen ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {statusMenuOpen ? (
                <div
                  role="listbox"
                  tabIndex={-1}
                  className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/95 py-1.5 shadow-xl backdrop-blur-md"
                >
                  {ANIME_LIST_STATUSES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      role="option"
                      aria-selected={status === item}
                      onClick={() => {
                        setStatus(item);
                        setStatusMenuOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                        status === item ? "bg-zinc-800/50 font-semibold text-zinc-50" : "text-zinc-300 hover:bg-zinc-800/30 hover:text-zinc-100"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{ANIME_LIST_STATUS_LABELS[item]}</span>
                        {status === item && (
                          <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
            {/* Redesigned Premium Episode Tracker */}
            <div className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 sm:text-xs">Progress</span>
              <div className="mt-2 flex w-full items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-1.5 transition hover:border-zinc-700">
                <button
                  type="button"
                  onClick={() => stepEpisode(-1)}
                  disabled={watchedEpisodes <= 0}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-30 sm:h-9 sm:w-9"
                  aria-label="Decrease watched episodes"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                  </svg>
                </button>
                
                <div className="flex items-baseline gap-1.5 px-3 font-mono text-sm tracking-tight">
                  <span className="text-base font-semibold text-zinc-100">
                    {status === "completed" && totalEpisodes != null ? totalEpisodes : watchedEpisodes}
                  </span>
                  <span className="text-zinc-600">/</span>
                  <span className="text-zinc-400">{totalEpisodes ?? "?"}</span>
                </div>

                <button
                  type="button"
                  onClick={() => stepEpisode(1)}
                  disabled={!canIncrementEpisodes}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-30 sm:h-9 sm:w-9"
                  aria-label="Increase watched episodes"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Score Dropdown */}
            <div className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 sm:text-xs">Score</span>
              <div className="relative mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setScoreMenuOpen((s) => !s);
                    setStatusMenuOpen(false); // Close the other menu if open
                  }}
                  aria-haspopup="listbox"
                  aria-expanded={scoreMenuOpen}
                  className="flex w-full items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/30 px-4 py-2.5 text-sm text-zinc-100 outline-none transition hover:border-zinc-700 hover:bg-zinc-900/50 focus:border-zinc-600 sm:py-3"
                >
                  <span className="truncate font-medium">
                    {score === "" ? "Not scored" : ANIME_LIST_SCORE_OPTIONS.find((option) => option.value === score)?.label ?? "Not scored"}
                  </span>
                  <svg className={`ml-3 h-4 w-4 text-zinc-400 transition-transform ${scoreMenuOpen ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="none" aria-hidden>
                    <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {scoreMenuOpen ? (
                  <div
                    role="listbox"
                    tabIndex={-1}
                    /* Added [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden to hide scrollbars natively */
                    className="absolute left-0 bottom-full z-50 mb-2 w-full max-h-[40vh] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden rounded-xl border border-zinc-800/80 bg-zinc-950/95 py-1.5 shadow-xl backdrop-blur-md sm:bottom-auto sm:top-full sm:mb-0 sm:mt-2 sm:max-h-56"
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={score === ""}
                      onClick={() => {
                        setScore("");
                        setScoreMenuOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm transition-colors sm:py-2.5 ${score === "" ? "bg-zinc-800/50 font-semibold text-zinc-50" : "text-zinc-300 hover:bg-zinc-800/30 hover:text-zinc-100"}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>Not scored</span>
                        <span className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full border ${getScorePreviewClass("")}`} aria-hidden="true" />
                        </span>
                      </div>
                    </button>

                    {ANIME_LIST_SCORE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={score === option.value}
                        onClick={() => {
                          setScore(option.value);
                          setScoreMenuOpen(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm transition-colors sm:py-2.5 ${score === option.value ? "bg-zinc-800/50 font-semibold text-zinc-50" : "text-zinc-300 hover:bg-zinc-800/30 hover:text-zinc-100"}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span>{option.label}</span>
                          <span className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full border ${getScorePreviewClass(option.value)}`} aria-hidden="true" />
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {existingEntry ? (
            <div className="pt-1 sm:pt-2">
              <button
                type="button"
                onClick={handleRemove}
                className="w-full rounded-xl border border-red-900/30 bg-red-950/20 px-4 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-950/40 hover:text-red-300 sm:py-3"
              >
                Remove from list
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-zinc-800/60 px-5 py-4 sm:px-6 sm:py-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-400 transition hover:text-zinc-200 sm:py-2.5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-xl bg-zinc-100 px-5 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-white hover:shadow-lg hover:shadow-white/10 sm:px-6 sm:py-2.5"
          >
            Save changes
          </button>
        </div>
      </section>
    </div>
  );
}