import { useEffect, useRef, useState } from "react";

type Props = {
  imageSrc?: string;
  audioSrc?: string;
};

export default function PeakFiction({
  imageSrc = "/peak-fiction/scene.jpg",
  audioSrc = "/peak-fiction/ost.mp3",
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 1;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
    } catch {
      // Ignore playback errors (e.g., missing file).
    }
  }

  return (
    <div className="min-h-dvh bg-linear-to-b from-zinc-950 to-zinc-950 text-zinc-50">
      <audio
        ref={audioRef}
        className="hidden"
        src={audioSrc}
        loop
        preload="auto"
      />

      <main className="mx-auto w-full sm:max-w-5xl sm:px-6 sm:py-10">
        <div className="relative h-dvh w-full overflow-hidden bg-zinc-950/60 sm:h-auto sm:rounded-3xl sm:border sm:border-zinc-800 sm:backdrop-blur">
          <img
            src={imageSrc}
            alt="Peak Fiction scene"
            className="h-full w-full object-cover object-center sm:aspect-video sm:h-auto"
          />

          {/* Mobile: overlay control */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-zinc-950/80 to-transparent p-4 sm:hidden">
            <div className="pointer-events-auto mx-auto flex w-full max-w-sm items-center justify-center">
              <button
                type="button"
                onClick={togglePlayback}
                className="inline-flex items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/80 px-5 py-2.5 text-sm font-semibold text-zinc-50 backdrop-blur transition hover:bg-zinc-900"
                aria-label={isPlaying ? "Pause music" : "Play music"}
              >
                {isPlaying ? "Pause" : "Play"}
              </button>
            </div>
          </div>
        </div>

        {/* Desktop: button under image */}
        <div className="mt-6 hidden items-center justify-center sm:flex">
          <button
            type="button"
            onClick={togglePlayback}
            className="inline-flex items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/80 px-6 py-3 text-sm font-semibold text-zinc-50 backdrop-blur transition hover:bg-zinc-900"
            aria-label={isPlaying ? "Pause music" : "Play music"}
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
        </div>
      </main>
    </div>
  );
}
