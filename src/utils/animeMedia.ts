import type { Anime } from "../api/Jikan.ts";

export function formatAnimeTitle(anime: Anime): string {
  return anime.title_english || anime.title;
}

export function getCardImageUrl(anime: Anime): string | undefined {
  return anime.images?.jpg?.image_url;
}

export function getHeroImageCandidates(anime: Anime): string[] {
  const trailerImages = anime.trailer?.images;
  const trailerImageCandidates = [
    trailerImages?.maximum_image_url,
    trailerImages?.large_image_url,
    trailerImages?.medium_image_url,
    trailerImages?.small_image_url,
    trailerImages?.image_url,
  ].filter((u): u is string => Boolean(u));

  const posterCandidates = [anime.images?.jpg?.large_image_url, anime.images?.jpg?.image_url].filter(
    (u): u is string => Boolean(u)
  );

  return [...trailerImageCandidates, ...posterCandidates];
}
