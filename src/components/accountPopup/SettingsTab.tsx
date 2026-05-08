function LogOutIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

type Props = {
  displayName: string;
  currentDisplayName: string | null;
  busy: boolean;
  onDisplayNameChange: (value: string) => void;
  onSaveSettings: () => void;
  onLogOut: () => void;
  onOpenDeleteConfirm: () => void;
};

export default function SettingsTab({
  displayName,
  currentDisplayName,
  busy,
  onDisplayNameChange,
  onSaveSettings,
  onLogOut,
  onOpenDeleteConfirm,
}: Props) {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300 sm:mt-4 sm:gap-8">
      <div className="block">
        <label className="mb-2 block text-sm font-medium text-zinc-400">Username</label>
        <div className="flex flex-row gap-2 sm:gap-3">
          <input
            value={displayName}
            onChange={(event) => onDisplayNameChange(event.target.value)}
            placeholder="Your username"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-zinc-600 focus:bg-zinc-900 focus:ring-4 focus:ring-zinc-800/50"
          />
          <button
            type="button"
            disabled={busy || displayName.trim() === currentDisplayName}
            onClick={onSaveSettings}
            className="shrink-0 rounded-xl bg-zinc-800 px-4 py-2.5 sm:px-5 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Update
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-red-900/20 bg-red-950/10 p-4 sm:p-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-red-500/80 sm:mb-4">Danger Zone</h3>

        <div className="mb-3 flex flex-row items-center justify-between gap-3 border-b border-zinc-800/60 pb-3 sm:mb-4 sm:pb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-zinc-200">Log Out</p>
            <p className="mt-0.5 text-xs text-zinc-500">Sign out of your session.</p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onLogOut}
            className="inline-flex w-28 sm:w-32 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
          >
            <LogOutIcon />
            <span>Log out</span>
          </button>
        </div>

        <div className="flex flex-row items-center justify-between gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-red-400">Delete Account</p>
            <p className="mt-0.5 text-xs text-zinc-500">Permanently delete your account.</p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onOpenDeleteConfirm}
            className="inline-flex w-28 sm:w-32 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-red-900/40 bg-red-950/40 px-3 py-2 text-xs font-medium text-red-300 transition hover:bg-red-900/60 disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
          >
            <TrashIcon />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
