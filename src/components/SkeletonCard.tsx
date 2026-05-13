/**
 * Animated skeleton card component used for loading states
 */
export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/70 shadow-sm">
      <div className="flex animate-pulse">
        <div className="h-36 w-24 shrink-0 bg-zinc-900 sm:h-40" />
        <div className="min-w-0 flex-1 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="h-4 w-3/4 rounded bg-zinc-900" />
            <div className="h-5 w-10 rounded-full bg-zinc-900" />
          </div>
          <div className="mt-2 flex gap-2">
            <div className="h-3 w-12 rounded bg-zinc-900" />
            <div className="h-3 w-16 rounded bg-zinc-900" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-3 w-full rounded bg-zinc-900" />
            <div className="h-3 w-5/6 rounded bg-zinc-900" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <div className="h-5 w-14 rounded-full bg-zinc-900" />
            <div className="h-5 w-12 rounded-full bg-zinc-900" />
            <div className="h-5 w-10 rounded-full bg-zinc-900" />
          </div>
        </div>
      </div>
    </div>
  );
}
