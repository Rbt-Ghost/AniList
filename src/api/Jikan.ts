// src/api/Jikan.ts
const DEFAULT_BASE = "https://api.jikan.moe/v4";
const BASE = import.meta.env.VITE_JIKAN_BASE_URL ?? DEFAULT_BASE;

type JikanEnvelope<T> = { data: T };

function getYouTubeIdFromEmbedUrl(embedUrl?: string | null): string | null {
  if (!embedUrl) return null;

  try {
    const url = new URL(embedUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    const embedIndex = parts.indexOf("embed");
    if (embedIndex >= 0) {
      return parts[embedIndex + 1] ?? null;
    }
  } catch {
    // Fallback for malformed URLs.
  }

  const match = embedUrl.match(/\/embed\/([^?&#/]+)/);
  return match?.[1] ?? null;
}

function getYouTubeThumbnailUrls(youtubeId: string) {
  return {
    image_url: `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`,
    small_image_url: `https://i.ytimg.com/vi/${youtubeId}/default.jpg`,
    medium_image_url: `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`,
    large_image_url: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
    maximum_image_url: `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`,
  };
}

function normalizeTrailer(anime: Anime): Anime {
  const trailer = anime.trailer;
  if (!trailer) return anime;

  const youtubeId = trailer.youtube_id || getYouTubeIdFromEmbedUrl(trailer.embed_url);
  if (!youtubeId) return anime;

  const fallbackImages = getYouTubeThumbnailUrls(youtubeId);
  const images = {
    image_url: trailer.images?.image_url ?? fallbackImages.image_url,
    small_image_url: trailer.images?.small_image_url ?? fallbackImages.small_image_url,
    medium_image_url: trailer.images?.medium_image_url ?? fallbackImages.medium_image_url,
    large_image_url: trailer.images?.large_image_url ?? fallbackImages.large_image_url,
    maximum_image_url: trailer.images?.maximum_image_url ?? fallbackImages.maximum_image_url,
  };

  return {
    ...anime,
    trailer: {
      ...trailer,
      youtube_id: youtubeId,
      images,
    },
  };
}

function normalizeAnimeList(items: Anime[]) {
  return items.map(normalizeTrailer);
}

async function jikanGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { signal });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Jikan ${res.status}: ${text || res.statusText}`);
  }
  const json = (await res.json()) as JikanEnvelope<T>;
  return json.data;
}

// Minimal types (expand as you need)
type NamedResource = { name: string };

export type Anime = {
  mal_id: number;
  rank?: number | null;
  title: string;
  title_english?: string | null;
  title_japanese?: string | null;
  images?: { jpg?: { image_url?: string; small_image_url?: string; large_image_url?: string } };
  trailer?: {
    youtube_id?: string | null;
    url?: string | null;
    embed_url?: string | null;
    images?: {
      image_url?: string | null;
      small_image_url?: string | null;
      medium_image_url?: string | null;
      large_image_url?: string | null;
      maximum_image_url?: string | null;
    };
  };
  synopsis?: string | null;
  score?: number | null;
  episodes?: number | null;
  status?: string | null;
  rating?: string | null;
  year?: number | null;
  season?: string | null;
  studios?: NamedResource[];
  genres?: NamedResource[];
  explicit_genres?: NamedResource[];
  themes?: NamedResource[];
  demographics?: NamedResource[];
};

export function isSfwAnime(anime: Anime): boolean {
  const rating = (anime.rating ?? "").toLowerCase();
  if (rating.startsWith("rx")) return false;
  if (rating.includes("hentai")) return false;

  const allGenres = [...(anime.genres ?? []), ...(anime.explicit_genres ?? [])];
  return !allGenres.some((g) => g.name.toLowerCase() === "hentai");
}

export function getTopAnime(signal?: AbortSignal) {
  return jikanGet<Anime[]>("/top/anime", signal).then((items) => normalizeAnimeList(items).filter(isSfwAnime));
}

export function getOngoingAnime(signal?: AbortSignal) {
  const params = new URLSearchParams({ limit: "15" });
  return jikanGet<Anime[]>(`/seasons/now?${params}`, signal).then((items) => normalizeAnimeList(items).filter(isSfwAnime));
}

export function searchAnime(q: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ q, limit: "12" });
  return jikanGet<Anime[]>(`/anime?${params}`, signal).then((items) => normalizeAnimeList(items).filter(isSfwAnime));
}

export function getAnimeById(id: number, signal?: AbortSignal) {
  return jikanGet<Anime>(`/anime/${id}`, signal).then(normalizeTrailer);
}