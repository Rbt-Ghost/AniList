// src/api/Jikan.ts
const DEFAULT_BASE = "https://api.jikan.moe/v4";
const envBase = import.meta.env.VITE_JIKAN_BASE_URL?.trim();
const BASE = envBase
  ? envBase.startsWith("/") && !import.meta.env.DEV
    ? DEFAULT_BASE
    : envBase
  : DEFAULT_BASE;

// Simple cache for anime by ID (prevents refetching during navigation)
const animeCache = new Map<number, Anime>();
const MAX_CACHE_SIZE = 50;
const SEARCH_CACHE_TTL_MS = 60_000;
const searchCache = new Map<string, { value: Anime[]; expiresAt: number }>();

// Keep a small gap between requests to avoid bursting the free Jikan API.
const MIN_REQUEST_INTERVAL_MS = 350;
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 500;
let lastRequestAt = 0;
let requestQueue: Promise<void> = Promise.resolve();

type JikanEnvelope<T> = { data: T };
type JikanPagedEnvelope<T> = {
  data: T;
  pagination?: {
    has_next_page?: boolean;
  };
};

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      if (signal) {
        signal.removeEventListener("abort", onAbort);
      }
      resolve();
    }, ms);

    const onAbort = () => {
      window.clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
      reject(new DOMException("Aborted", "AbortError"));
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function scheduleRequest<T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  const run = async () => {
    const elapsed = Date.now() - lastRequestAt;
    const wait = Math.max(0, MIN_REQUEST_INTERVAL_MS - elapsed);
    if (wait > 0) {
      await sleep(wait, signal);
    }

    lastRequestAt = Date.now();
    return task();
  };

  const scheduled = requestQueue.then(run, run);
  requestQueue = scheduled.then(
    () => undefined,
    () => undefined
  );
  return scheduled;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

async function fetchWithRetry(path: string, signal?: AbortSignal): Promise<Response> {
  const url = `${BASE}${path}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await scheduleRequest(() => fetch(url, { signal }), signal);
      if (response.ok || !isRetryableStatus(response.status) || attempt === MAX_RETRIES) {
        return response;
      }
    } catch (error) {
      if (isAbortError(error)) throw error;
      if (attempt === MAX_RETRIES) {
        throw new Error("Jikan request failed due to a network error. Please try again.", { cause: error });
      }
    }

    const jitter = Math.floor(Math.random() * 150);
    const backoff = RETRY_BASE_DELAY_MS * (attempt + 1) + jitter;
    await sleep(backoff, signal);
  }

  throw new Error("Jikan request failed after retries.");
}

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

function dedupeAnimeById(items: Anime[]) {
  const seen = new Set<number>();

  return items.filter((anime) => {
    if (seen.has(anime.mal_id)) return false;
    seen.add(anime.mal_id);
    return true;
  });
}

function normalizeAnimeList(items: Anime[]) {
  return dedupeAnimeById(items.map(normalizeTrailer));
}

function cacheAnime(anime: Anime): void {
  if (animeCache.size >= MAX_CACHE_SIZE) {
    const firstKey = animeCache.keys().next().value;
    if (firstKey !== undefined) animeCache.delete(firstKey);
  }
  animeCache.set(anime.mal_id, anime);
}

function getCachedAnime(id: number): Anime | undefined {
  return animeCache.get(id);
}

async function jikanGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetchWithRetry(path, signal);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Jikan ${res.status}: ${text || res.statusText}`);
  }
  const json = (await res.json()) as JikanEnvelope<T>;
  return json.data;
}

async function jikanGetPaged<T>(path: string, signal?: AbortSignal): Promise<{ data: T; hasNextPage: boolean }> {
  const res = await fetchWithRetry(path, signal);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Jikan ${res.status}: ${text || res.statusText}`);
  }

  const json = (await res.json()) as JikanPagedEnvelope<T>;
  return {
    data: json.data,
    hasNextPage: json.pagination?.has_next_page ?? false,
  };
}

// Minimal types (expand as you need)
type NamedResource = { name: string };

export type AnimeRelation = {
  relation?: string | null;
  entry?: Array<{
    mal_id: number;
    type?: string | null;
    name: string;
    url?: string | null;
  }>;
};

export type AnimeCharacter = {
  character: {
    mal_id: number;
    name: string;
    url?: string | null;
    images?: {
      jpg?: {
        image_url?: string | null;
      };
    };
  };
  role?: string | null;
  favorites?: number | null;
  voice_actors?: Array<{
    person: {
      mal_id: number;
      name: string;
      url?: string | null;
      images?: {
        jpg?: {
          image_url?: string | null;
        };
      };
    };
    language?: string | null;
  }>;
};

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
  relations?: AnimeRelation[];
  characters?: AnimeCharacter[];
};

export function isSfwAnime(anime: Anime): boolean {
  const rating = (anime.rating ?? "").toLowerCase();
  if (rating.startsWith("rx")) return false;
  if (rating.includes("hentai")) return false;

  const allGenres = [...(anime.genres ?? []), ...(anime.explicit_genres ?? [])];
  return !allGenres.some((g) => g.name.toLowerCase() === "hentai");
}

export function getTopAnime(signal?: AbortSignal) {
  const params = new URLSearchParams({
    page: "1",
    limit: "20",
    sfw: "true",
  });

  return jikanGetPaged<Anime[]>(`/top/anime?${params}`, signal).then(({ data, hasNextPage }) => ({
    items: normalizeAnimeList(data).filter(isSfwAnime),
    hasNextPage,
  }));
}

export function getTopAnimePage(page: number, limit = 20, signal?: AbortSignal) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sfw: "true",
  });

  return jikanGetPaged<Anime[]>(`/top/anime?${params}`, signal).then(({ data, hasNextPage }) => ({
    items: normalizeAnimeList(data).filter(isSfwAnime),
    hasNextPage,
  }));
}

export function getOngoingAnime(signal?: AbortSignal) {
  const params = new URLSearchParams({ limit: "15" });
  return jikanGet<Anime[]>(`/seasons/now?${params}`, signal).then((items) => normalizeAnimeList(items).filter(isSfwAnime));
}

export function searchAnime(q: string, signal?: AbortSignal) {
  const normalizedQuery = q.trim().toLowerCase();
  const cached = searchCache.get(normalizedQuery);
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.value);
  }

  const params = new URLSearchParams({ q, limit: "12", sfw: "true" });
  return jikanGet<Anime[]>(`/anime?${params}`, signal).then((items) => {
    const normalized = normalizeAnimeList(items).filter(isSfwAnime);
    searchCache.set(normalizedQuery, {
      value: normalized,
      expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
    });
    return normalized;
  });
}

export function getAnimeById(id: number, signal?: AbortSignal) {
  const cached = getCachedAnime(id);
  if (cached) {
    return Promise.resolve(normalizeTrailer(cached));
  }
  return jikanGet<Anime>(`/anime/${id}/full`, signal).then((anime) => {
    const normalized = normalizeTrailer(anime);
    cacheAnime(normalized);
    return normalized;
  });
}

export function getAnimeCharacters(id: number, signal?: AbortSignal) {
  return jikanGet<AnimeCharacter[]>(`/anime/${id}/characters`, signal);
}