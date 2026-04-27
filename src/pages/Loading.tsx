export default function LoadingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 text-zinc-900 dark:from-zinc-950 dark:to-zinc-950 dark:text-zinc-50">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"
            aria-hidden="true"
          />
          <div>
            <div className="text-xl font-semibold tracking-tight">AniList</div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading your dashboard…</div>
          </div>
        </div>

        <div className="mt-10 w-full">
          <div className="h-10 w-full rounded-xl bg-white/70 ring-1 ring-zinc-200 backdrop-blur dark:bg-zinc-950/60 dark:ring-zinc-800" />
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-44 rounded-xl bg-white/70 ring-1 ring-zinc-200 backdrop-blur dark:bg-zinc-950/60 dark:ring-zinc-800"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}