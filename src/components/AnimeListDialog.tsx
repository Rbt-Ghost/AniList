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
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-zinc-950/75 px-4 py-4 backdrop-blur sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close list dialog"
        onClick={onClose}
      />

      <section className="relative w-full max-w-2xl overflow-visible rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40">
        <div className="border-b border-zinc-800 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Add to my list</p>
              <h2 className="mt-1 text-lg font-semibold text-zinc-50">{anime.title_english || anime.title}</h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-900"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="block">
            <span className="text-sm font-medium text-zinc-200">Status</span>
            <div className="relative mt-2">
              <button
                type="button"
                onClick={() => setStatusMenuOpen((s) => !s)}
                aria-haspopup="listbox"
                aria-expanded={statusMenuOpen}
                className="w-full flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-50 outline-none transition focus:border-zinc-600"
              >
                <span className="truncate">{ANIME_LIST_STATUS_LABELS[status]}</span>
                <svg className="ml-3 h-4 w-4 text-zinc-400" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {statusMenuOpen ? (
                <div
                  role="listbox"
                  tabIndex={-1}
                  className="absolute z-50 mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2 shadow-lg"
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
                      className={`w-full text-left px-4 py-2 text-sm ${
                        status === item ? "bg-zinc-900 text-zinc-50 font-semibold" : "text-zinc-200 hover:bg-zinc-900"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{ANIME_LIST_STATUS_LABELS[item]}</span>
                        {status === item ? (
                          <span className="text-xs text-zinc-400">Selected</span>
                        ) : null}
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-200">Episodes watched</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {totalEpisodes != null ? `Out of ${totalEpisodes} episodes` : "No episode cap available"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-900/50 px-2 py-1 flex items-center justify-center text-center text-lg font-semibold leading-none text-zinc-50 sm:w-16 sm:text-base">
                    <span className="block truncate">{status === "completed" && totalEpisodes != null ? totalEpisodes : watchedEpisodes}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => stepEpisode(-1)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={watchedEpisodes <= 0}
                    aria-label="Decrease watched episodes"
                  >
                    <span className="text-base leading-none">-</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => stepEpisode(1)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!canIncrementEpisodes}
                    aria-label="Increase watched episodes"
                  >
                    <span className="text-base leading-none">+</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <span className="block text-sm font-medium text-zinc-200">Score</span>
              <div className="relative mt-2">
                <button
                  type="button"
                  onClick={() => setScoreMenuOpen((s) => !s)}
                  aria-haspopup="listbox"
                  aria-expanded={scoreMenuOpen}
                  className="flex w-full items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-50 outline-none transition focus:border-zinc-600"
                >
                  <span className="truncate">
                    {score === "" ? "Not scored" : ANIME_LIST_SCORE_OPTIONS.find((option) => option.value === score)?.label ?? "Not scored"}
                  </span>
                  <svg className="ml-3 h-4 w-4 text-zinc-400" viewBox="0 0 20 20" fill="none" aria-hidden>
                    <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {scoreMenuOpen ? (
                  <div
                    role="listbox"
                    tabIndex={-1}
                    className="absolute z-50 mt-2 w-full max-h-60 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 py-2 shadow-lg"
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={score === ""}
                      onClick={() => {
                        setScore("");
                        setScoreMenuOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm ${score === "" ? "bg-zinc-900 font-semibold text-zinc-50" : "text-zinc-200 hover:bg-zinc-900"}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>Not scored</span>
                        <span className="flex items-center gap-2">
                          {score === "" ? <span className="text-xs text-zinc-400">Selected</span> : null}
                          <span className={`h-3 w-3 rounded-full border ${getScorePreviewClass("")}`} aria-hidden="true" />
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
                        className={`w-full px-4 py-2 text-left text-sm ${score === option.value ? "bg-zinc-900 font-semibold text-zinc-50" : "text-zinc-200 hover:bg-zinc-900"}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span>{option.label}</span>
                          <span className="flex items-center gap-2">
                            {score === option.value ? <span className="text-xs text-zinc-400">Selected</span> : null}
                            <span className={`h-3 w-3 rounded-full border ${getScorePreviewClass(option.value)}`} aria-hidden="true" />
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
            <button
              type="button"
              onClick={handleRemove}
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-900"
            >
              Remove from list
            </button>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-zinc-800 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-xl border border-zinc-700 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-200"
          >
            Save
          </button>
        </div>
      </section>
    </div>
  );
}
