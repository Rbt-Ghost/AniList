// src/api/Jikan.ts
const DEFAULT_BASE = "https://api.jikan.moe/v4";
const BASE = import.meta.env.VITE_JIKAN_BASE_URL ?? DEFAULT_BASE;

type JikanEnvelope<T> = { data: T };

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
  images?: { jpg?: { image_url?: string } };
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
  return jikanGet<Anime[]>("/top/anime", signal).then((items) => items.filter(isSfwAnime));
}

export function searchAnime(q: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ q, limit: "12" });
  return jikanGet<Anime[]>(`/anime?${params}`, signal).then((items) => items.filter(isSfwAnime));
}

export function getAnimeById(id: number, signal?: AbortSignal) {
  return jikanGet<Anime>(`/anime/${id}`, signal);
}