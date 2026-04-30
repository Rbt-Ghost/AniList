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

  const [status, setStatus] = useState<AnimeListStatus>(existingEntry?.status ?? "plan-to-watch");
  const [watchedEpisodes, setWatchedEpisodes] = useState(0);
  const [score, setScore] = useState<number | "">("");

  const totalEpisodes = anime.episodes ?? null;
  const canIncrementEpisodes = totalEpisodes == null || watchedEpisodes < totalEpisodes;

  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    setStatus(existingEntry?.status ?? "plan-to-watch");
    setWatchedEpisodes(existingEntry?.watchedEpisodes ?? 0);
    setScore(existingEntry?.score ?? "");
  }, [existingEntry?.score, existingEntry?.status, existingEntry?.watchedEpisodes, open]);

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

      <section className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40">
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

            <label className="block space-y-2 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <span className="block text-sm font-medium text-zinc-200">Score</span>
              <select
                value={score}
                onChange={(event) => setScore(event.target.value === "" ? "" : Number(event.target.value))}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-50 outline-none transition focus:border-zinc-600"
              >
                <option value="">Not scored</option>
                {ANIME_LIST_SCORE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
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
