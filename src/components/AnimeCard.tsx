import { useNavigate } from "react-router-dom";
import type { Anime } from "../api/Jikan.ts";
import { formatAnimeTitle, getCardImageUrl } from "../utils/animeMedia.ts";

type Props = {
  anime: Anime;
  onSelect?: (anime: Anime) => void;
};

function getAnimeTags(anime: Anime): string[] {
  const tags = [
    ...(anime.themes ?? []),
    ...(anime.genres ?? []),
    ...(anime.demographics ?? []),
  ]
    .map((g) => g.name)
    .filter(Boolean);

  return Array.from(new Set(tags)).slice(0, 3);
}

export default function AnimeCard({ anime, onSelect }: Props) {
  const navigate = useNavigate();
  const imageUrl = getCardImageUrl(anime);
  const title = formatAnimeTitle(anime);
  const tags = getAnimeTags(anime);
  const scoreText = anime.score != null ? anime.score.toFixed(2) : "N/A";
  const episodesText = anime.episodes != null ? String(anime.episodes) : "?";

  const handleClick = () => {
    onSelect?.(anime);
    navigate(`/anime/${anime.mal_id}`);
  };

  return (
    <article 
      onClick={handleClick}
      className="group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/40 shadow-sm backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:border-zinc-700 hover:shadow-md focus-within:ring-2 focus-within:ring-zinc-600/60 cursor-pointer"
    >
      <div className="flex items-stretch">
        <div className="w-24 shrink-0 self-stretch bg-zinc-900">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-zinc-900 to-zinc-800 px-2 text-center text-[11px] font-semibold text-zinc-300">
              No Cover
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 p-3">
          <div className="flex min-h-full items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3
                className="text-sm font-semibold leading-5 text-zinc-50"
                title={title}
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {title}
              </h3>

              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
                {anime.year ? (
                  <span className="inline-flex items-center gap-1.5">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5 text-zinc-500"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M8 2v3" />
                      <path d="M16 2v3" />
                      <path d="M3 9h18" />
                      <path d="M5 5h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
                    </svg>
                    {anime.year}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900/80 px-1.5 py-0.5 text-zinc-200">
                  ★ {scoreText}
                </span>
                <span>{episodesText} eps</span>
              </div>

              {anime.synopsis ? (
                <p
                  className="mt-2 text-xs leading-relaxed text-zinc-400"
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

              {tags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[11px] font-medium text-zinc-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
