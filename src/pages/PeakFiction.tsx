import { useEffect, useRef } from "react";

type Props = {
  imageSrc?: string;
  audioSrc?: string;
};

export default function PeakFiction({
  imageSrc = "/peak-fiction/scene.jpg",
  audioSrc = "/peak-fiction/ost.mp3",
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 1;

    // Autoplay can be blocked by browsers; we still attempt it.
    const tryPlay = () => {
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          // Ignore autoplay errors (usually user-gesture restrictions).
        });
      }
    };

    tryPlay();

    // If autoplay is blocked, start on first interaction.
    const resume = () => tryPlay();
    window.addEventListener("pointerdown", resume, { once: true });
    window.addEventListener("keydown", resume, { once: true });

    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-b from-zinc-950 to-zinc-950 text-zinc-50">
      <audio
        ref={audioRef}
        className="hidden"
        src={audioSrc}
        autoPlay
        loop
        preload="auto"
      />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/60 backdrop-blur">
          <img
            src={imageSrc}
            alt="Peak Fiction scene"
            className="w-full object-cover"
          />
        </div>
      </main>
    </div>
  );
}
