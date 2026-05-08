function ExternalLinkIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 opacity-50">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  );
}

export default function AboutTab() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300 sm:mt-4">
      <div>
        <h3 className="text-lg font-semibold text-zinc-100">AniList</h3>
        <p className="mt-1 text-sm text-zinc-400">A modern anime tracking application built with React, Tailwind CSS, and Firebase.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href="https://jikan.moe/"
          target="_blank"
          rel="noreferrer"
          className="group flex flex-col items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 transition hover:border-zinc-700 hover:bg-zinc-800/50"
        >
          <div className="flex w-full items-center justify-between text-zinc-100">
            <span className="font-medium">Jikan API</span>
            <ExternalLinkIcon />
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">Powered by the unofficial MyAnimeList REST API.</p>
        </a>

        <a
          href="https://github.com/Rbt-Ghost/AniList"
          target="_blank"
          rel="noreferrer"
          className="group flex flex-col items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 transition hover:border-zinc-700 hover:bg-zinc-800/50"
        >
          <div className="flex w-full items-center justify-between text-zinc-100">
            <span className="font-medium">Source Code</span>
            <ExternalLinkIcon />
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">View the open-source repository on GitHub.</p>
        </a>
      </div>
    </div>
  );
}
