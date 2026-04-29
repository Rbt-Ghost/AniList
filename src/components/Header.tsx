import { useLocation, useNavigate } from "react-router-dom";

type HeaderProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onClearQuery: () => void;
};

export default function Header({
  query,
  onQueryChange,
  onClearQuery,
}: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleGoHome = () => {
    if (location.pathname === "/") {
      window.location.reload();
      return;
    }

    navigate("/");
  };

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/60 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={handleGoHome}
          className="inline-flex w-fit cursor-pointer items-center gap-3 rounded-lg text-left transition-opacity hover:opacity-90"
          aria-label="Go to home"
        >
          <img
            src="/cloud.png"
            alt=""
            aria-hidden="true"
            className="h-11 w-11 shrink-0 invert brightness-200 opacity-90 sm:h-12 sm:w-12"
          />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">AniList</h1>
            <p className="text-sm text-zinc-400">Search anime and build your list.</p>
          </div>
        </button>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <div className="w-full sm:w-96">
            <label className="sr-only" htmlFor="anime-search">
              Search anime
            </label>
            <div className="relative">
              <input
                id="anime-search"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="What are you watching today?"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 pr-10 text-sm text-zinc-50 outline-none ring-0 placeholder:text-zinc-500 focus:border-zinc-700"
              />
              {query.length > 0 ? (
                <button
                  type="button"
                  onClick={onClearQuery}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-900"
                  aria-label="Clear search"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}