import type { Anime } from "../api/Jikan.ts";

type Props = {
  anime: Anime;
};

function formatTitle(anime: Anime) {
  return anime.title_english || anime.title;
}

function getImageUrl(anime: Anime) {
  return anime.images?.jpg?.image_url;
}

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

export default function AnimeCard({ anime }: Props) {
  const imageUrl = getImageUrl(anime);
  const title = formatTitle(anime);
  const tags = getAnimeTags(anime);

  return (
    <div className="group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/40 shadow-sm backdrop-blur transition hover:shadow-md">
      <div className="flex">
        <div className="h-32 w-24 shrink-0 bg-zinc-900">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              loading="lazy"
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="min-w-0 truncate text-sm font-semibold text-zinc-50">{title}</div>

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
                {anime.score != null ? <span>★ {anime.score}</span> : <span>★ —</span>}
              </div>

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
    </div>
  );
}
