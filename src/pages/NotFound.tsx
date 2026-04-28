import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-zinc-950 text-zinc-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(245,158,11,0.16),transparent_38%),radial-gradient(circle_at_84%_10%,rgba(59,130,246,0.12),transparent_44%),radial-gradient(circle_at_55%_82%,rgba(16,185,129,0.1),transparent_36%)]" />

      <main className="relative mx-auto flex w-full max-w-6xl items-center px-6 py-10 sm:py-14">
        <div className="grid w-full gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <section className="nf-fade-up order-2 lg:order-1">
            <p className="inline-flex rounded-full border border-zinc-700/80 bg-zinc-900/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-300 backdrop-blur">
              Error 404
            </p>

            <h1 className="mt-4 max-w-lg text-4xl font-black leading-tight tracking-tight text-zinc-100 sm:text-5xl">
              That anime episode does not exist.
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-300 sm:text-base">
              The page you requested got lost between seasons. Head back to the dashboard and keep exploring top picks.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/"
                className="inline-flex items-center rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-300"
              >
                Back To Dashboard
              </Link>

              <Link
                to="/peak-fiction"
                className="inline-flex items-center rounded-xl border border-zinc-700 bg-zinc-900/70 px-5 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900"
              >
                View Peak Fiction
              </Link>
            </div>
          </section>

          <section className="nf-fade-up-delay order-1 lg:order-2">
            <div className="group relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70 shadow-[0_18px_70px_rgba(0,0,0,0.45)]">
              <img
                src="/rengoku.jpg"
                alt="Dramatic anime scene"
                className="h-80 w-full object-cover object-center transition duration-500 group-hover:scale-[1.03] sm:h-[30rem]"
              />
              <div className="absolute inset-0 bg-linear-to-t from-zinc-950/85 via-zinc-950/25 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
                  AniList Emergency Broadcast
                </p>
                <p className="mt-1 text-xl font-bold text-zinc-100 sm:text-2xl">
                  Continue your quest from home base.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
