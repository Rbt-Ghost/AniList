import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Anime } from "../api/Jikan.ts";
import { formatAnimeTitle, getCardImageUrl, getHeroImageCandidates } from "../utils/animeMedia.ts";

export default function HeroSection({ items }: { items: Anime[] }) {
  const navigate = useNavigate();
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

  useEffect(() => {
    if (!anime) return;
    const bgCandidates = getHeroImageCandidates(anime);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBgSrc(bgCandidates[0] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anime.mal_id, seed]);

  if (!anime) return null;

  const title = formatAnimeTitle(anime);
  const bgCandidates = getHeroImageCandidates(anime);
  const bgUrl = bgSrc ?? bgCandidates[0] ?? null;
  const coverUrl = getCardImageUrl(anime);

  const scoreText = anime.score != null ? `${anime.score}` : "—";
  const episodesText = anime.episodes != null ? `${anime.episodes}` : "—";

  // Show fewer facts on mobile
  const allFacts = [
    { label: "Score", value: scoreText },
    { label: "Episodes", value: episodesText },
    ...(anime.status ? [{ label: "Status", value: anime.status }] : []),
    ...(anime.year ? [{ label: "Year", value: `${anime.year}` }] : []),
  ];
  
  const bottomFacts = allFacts.slice(0, 4);
  const mobileBottomFacts = allFacts.slice(0, 2);

  const handleCardClick = () => {
    navigate(`/anime/${anime.mal_id}`);
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-sm cursor-pointer" onClick={handleCardClick}>
      <div className="relative h-48 xs:h-56 sm:h-80 md:h-135">
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

        <div className="absolute inset-x-0 bottom-0 p-3 xs:p-4 sm:p-5 md:p-6">
          <div className="flex flex-col gap-3 xs:gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex gap-3 xs:gap-4 min-w-0">
              <div className="h-20 w-16 xs:h-24 xs:w-18 sm:h-32 sm:w-24 md:h-36 md:w-28 shrink-0 overflow-hidden rounded-xl xs:rounded-2xl border border-zinc-800 bg-zinc-900">
                {coverUrl ? (
                  <img src={coverUrl} alt={title} className="h-full w-full object-cover" />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-xs xs:text-sm font-medium text-zinc-400">Featuring</div>
                <h2
                  className="mt-1 text-base xs:text-lg sm:text-xl md:text-2xl font-semibold tracking-tight leading-tight"
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
                    className="mt-1 xs:mt-2 text-xs xs:text-sm text-zinc-300/90 leading-snug"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {anime.synopsis}
                  </p>
                ) : null}

                <div className="mt-2 xs:mt-3 flex flex-wrap gap-1.5 xs:gap-2">
                  {mobileBottomFacts.map((f) => (
                    <span
                      key={f.label}
                      className="rounded-full border border-zinc-800 bg-zinc-950/40 px-2 xs:px-2.5 py-0.5 xs:py-1 text-xs text-zinc-200 whitespace-nowrap"
                    >
                      <span className="text-zinc-400">{f.label}:</span> {f.value}
                    </span>
                  ))}
                </div>

                {/* Show additional facts on larger screens */}
                {bottomFacts.length > 2 ? (
                  <div className="hidden sm:flex mt-2 flex-wrap gap-2">
                    {bottomFacts.slice(2).map((f) => (
                      <span
                        key={f.label}
                        className="rounded-full border border-zinc-800 bg-zinc-950/40 px-2.5 py-1 text-xs text-zinc-200"
                      >
                        <span className="text-zinc-400">{f.label}:</span> {f.value}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end md:justify-start shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => {
                  setIndex((i) => (i - 1 + count) % count);
                  setSeed((s) => s + 1);
                }}
                className="inline-flex h-9 xs:h-10 w-9 xs:w-10 items-center justify-center rounded-lg xs:rounded-xl border border-zinc-800 bg-zinc-950/50 text-zinc-200 backdrop-blur hover:bg-zinc-900/50 transition-colors active:bg-zinc-800/80"
                aria-label="Previous featured anime"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 xs:h-5 w-4 xs:w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIndex((i) => (i + 1) % count);
                  setSeed((s) => s + 1);
                }}
                className="inline-flex h-9 xs:h-10 w-9 xs:w-10 items-center justify-center rounded-lg xs:rounded-xl border border-zinc-800 bg-zinc-950/50 text-zinc-200 backdrop-blur hover:bg-zinc-900/50 transition-colors active:bg-zinc-800/80"
                aria-label="Next featured anime"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 xs:h-5 w-4 xs:w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
