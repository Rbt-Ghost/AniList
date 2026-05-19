export type StreamMode = "sub" | "dub";

export type StreamSearchResult = {
  id: string;
  title: string;
  episodes: number | null;
  image: string | null;
};

export type StreamEpisode = {
  number: string;
  label: string;
};

export type StreamSource = {
  label: string;
  url: string;
  kind: "hls" | "mp4" | "iframe" | "link";
  referer?: string | null;
};

export type StreamSubtitle = {
  label: string;
  lang: string;
  url: string;
};

export type StreamDetails = {
  id: string;
  episode: string;
  mode: StreamMode;
  sources: StreamSource[];
  subtitles: StreamSubtitle[];
};

const DEV_BASE = "/stream-api";
const PROD_BASE = "https://ani-list-backend.vercel.app";
const envBase = import.meta.env.VITE_STREAM_API_BASE_URL?.trim();
const BASE = envBase
  ? envBase.startsWith("/") && !import.meta.env.DEV
    ? PROD_BASE
    : envBase
  : import.meta.env.DEV
    ? DEV_BASE
    : PROD_BASE;

async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${BASE}${path}`, { signal });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Stream API request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

type SearchResponse = {
  results: StreamSearchResult[];
};

type EpisodesResponse = {
  episodes: StreamEpisode[];
};

type StreamResponse = StreamDetails;

export async function searchAnime(query: string, mode: StreamMode, signal?: AbortSignal) {
  const normalized = query.trim();
  if (!normalized) return [];
  const data = await fetchJson<SearchResponse>(`/api/search?q=${encodeURIComponent(normalized)}&mode=${mode}`, signal);
  return data.results;
}

export async function getEpisodes(id: string, mode: StreamMode, signal?: AbortSignal) {
  const data = await fetchJson<EpisodesResponse>(`/api/episodes/${encodeURIComponent(id)}?mode=${mode}`, signal);
  return data.episodes;
}

export async function getStreamSources(id: string, episode: string, mode: StreamMode, signal?: AbortSignal) {
  const data = await fetchJson<StreamResponse>(
    `/api/stream/${encodeURIComponent(id)}/${encodeURIComponent(episode)}?mode=${mode}`,
    signal
  );
  return data;
}