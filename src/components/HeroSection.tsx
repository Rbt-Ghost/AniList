import { useEffect, useState } from "react";
import type { Anime } from "../api/Jikan.ts";
import { formatAnimeTitle, getCardImageUrl, getHeroImageCandidates } from "../utils/animeMedia.ts";

export default function HeroSection({ items }: { items: Anime[] }) {
  const [index, setIndex] = useState(0);
  const [seed, setSeed] = useState(0);
  const [bgSrc, setBgSrc] = useState<string | null>(null);

  const count = items.length;
  const clampedIndex = count === 0 ? 0 : ((index % count) + count) % count;
  const anime = items[clampedIndex];

  useEffect(() => {
    if (count === 0) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, 15000);

    return () => window.clearInterval(id);
  }, [count, seed]);

  if (!anime) return null;

  const title = formatAnimeTitle(anime);
  const bgCandidates = getHeroImageCandidates(anime);
  const bgUrl = bgSrc ?? bgCandidates[0] ?? null;
  const coverUrl = getCardImageUrl(anime);

  useEffect(() => {
    setBgSrc(bgCandidates[0] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anime.mal_id, seed]);

  const scoreText = anime.score != null ? `${anime.score}` : "—";
  const episodesText = anime.episodes != null ? `${anime.episodes}` : "—";

  const bottomFacts = [
    { label: "Score", value: scoreText },
    { label: "Episodes", value: episodesText },
    ...(anime.status ? [{ label: "Status", value: anime.status }] : []),
    ...(anime.year ? [{ label: "Year", value: `${anime.year}` }] : []),
  ].slice(0, 4);

  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-sm">
      <div className="relative h-80 sm:h-135">
        {bgUrl ? (
          <img
            src={bgUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
            onError={() => {
              const currentIndex = bgCandidates.indexOf(bgUrl);
              const next = bgCandidates[currentIndex + 1] ?? null;
              setBgSrc(next);
            }}
          />
        ) : null}

        <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/30" />

        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <div className="flex items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="h-32 w-24 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 sm:h-36 sm:w-28">
                {coverUrl ? (
                  <img src={coverUrl} alt={title} className="h-full w-full object-cover" />
                ) : null}
              </div>

              <div className="min-w-0">
                <div className="text-sm font-medium text-zinc-400">Featuring</div>
                <h2
                  className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {title}
                </h2>

                {anime.synopsis ? (
                  <p
                    className="mt-2 max-w-2xl text-sm text-zinc-300/90"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {anime.synopsis}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  {bottomFacts.map((f) => (
                    <span
                      key={f.label}
                      className="rounded-full border border-zinc-800 bg-zinc-950/40 px-2.5 py-1 text-xs text-zinc-200"
                    >
                      <span className="text-zinc-400">{f.label}:</span> {f.value}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIndex((i) => (i - 1 + count) % count);
                  setSeed((s) => s + 1);
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/50 text-zinc-200 backdrop-blur hover:bg-zinc-900/50"
                aria-label="Previous featured anime"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIndex((i) => (i + 1) % count);
                  setSeed((s) => s + 1);
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/50 text-zinc-200 backdrop-blur hover:bg-zinc-900/50"
                aria-label="Next featured anime"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 h-1 bg-zinc-900/70">
          <div
            key={`${clampedIndex}-${seed}`}
            className="featuring-progress h-full w-full bg-zinc-50/80"
          />
        </div>
      </div>
    </div>
  );
}
