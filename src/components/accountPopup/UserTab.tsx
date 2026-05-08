import { type ChangeEvent, type RefObject } from "react";

type Props = {
  avatarDataUrl: string | null;
  userInitial: string;
  userLabel: string;
  userEmailVerified: boolean;
  bio: string;
  bioRef: RefObject<HTMLTextAreaElement | null>;
  busy: boolean;
  onBioChange: (value: string) => void;
  onAvatarFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
};

function CameraIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-zinc-200">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
    </svg>
  );
}

function VerifiedIcon() {
  return (
    <svg fill="currentColor" viewBox="0 0 24 24" strokeWidth={0} className="h-3 w-3 text-blue-400">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
    </svg>
  );
}

export default function UserTab({
  avatarDataUrl,
  userInitial,
  userLabel,
  userEmailVerified,
  bio,
  bioRef,
  busy,
  onBioChange,
  onAvatarFileChange,
  onSave,
}: Props) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300 sm:mt-4">
      <div className="flex flex-col items-center gap-2">
        <label className="group relative flex h-24 w-24 sm:h-28 sm:w-28 shrink-0 cursor-pointer overflow-hidden rounded-full border-2 border-zinc-800 bg-zinc-900 shadow-inner transition duration-300 hover:border-zinc-500">
          {avatarDataUrl ? (
            <img src={avatarDataUrl} alt="Profile" className="h-full w-full object-cover transition duration-300 group-hover:opacity-40" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-zinc-300 transition duration-300 group-hover:opacity-40">
              {userInitial}
            </div>
          )}

          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/40 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100">
            <CameraIcon />
          </div>

          <input type="file" accept="image/*" className="hidden" onChange={onAvatarFileChange} />
        </label>
      </div>

      <div className="block w-full text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          {userEmailVerified ? (
            <div className="flex items-center justify-center h-5 w-5 rounded-full border-2 border-blue-400">
              <VerifiedIcon />
            </div>
          ) : null}
          <label className="block text-sm font-medium text-zinc-400">{userLabel}</label>
        </div>
        <textarea
          ref={bioRef}
          value={bio}
          onChange={(event) => onBioChange(event.target.value.slice(0, 100))}
          rows={1}
          placeholder="Empty bio..."
          className="w-full resize-none overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-center text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-zinc-600 focus:bg-zinc-900 focus:ring-4 focus:ring-zinc-800/50"
        />
        <div className="mt-2 text-xs text-zinc-500">{bio.length} / 100</div>
      </div>

      <div className="mt-2 flex w-full justify-center">
        <button
          type="button"
          disabled={busy}
          onClick={onSave}
          className="w-full sm:w-auto rounded-xl bg-zinc-100 px-8 py-3 sm:py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-white hover:shadow-lg hover:shadow-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save profile
        </button>
      </div>
    </div>
  );
}
