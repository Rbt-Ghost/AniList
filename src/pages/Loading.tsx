export default function LoadingPage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-zinc-950 to-zinc-950 text-zinc-50">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-100"
            aria-hidden="true"
          />
          <div>
            <div className="text-xl font-semibold tracking-tight">AniList</div>
            <div className="text-sm text-zinc-400">Loading your dashboard…</div>
          </div>
        </div>

        <div className="mt-10 w-full">
          <div className="h-10 w-full rounded-xl bg-zinc-950/60 ring-1 ring-zinc-800 backdrop-blur" />
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-44 rounded-xl bg-zinc-950/60 ring-1 ring-zinc-800 backdrop-blur"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}