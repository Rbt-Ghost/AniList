import { type RefObject } from "react";

import type { FriendSnapshot, FriendshipRecord, UserDirectoryEntry } from "../../utils/social.ts";

type ListStatus = "plan-to-watch" | "watching" | "completed";

type Props = {
  friendQuery: string;
  onFriendQueryChange: (value: string) => void;
  friendSearchResult: UserDirectoryEntry | null;
  currentSearchRelationship: FriendshipRecord | undefined;
  acceptedFriends: FriendshipRecord[];
  incomingFriendRequests: FriendshipRecord[];
  outgoingFriendRequests: FriendshipRecord[];
  friendActionMenuUid: string | null;
  friendMenuRef: RefObject<HTMLDivElement | null>;
  friendsLoading: boolean;
  busy: boolean;
  userUid: string;
  getOtherSnapshot: (relationship: FriendshipRecord) => FriendSnapshot;
  onSearchFriend: () => void | Promise<void>;
  onSendFriendRequest: (target: UserDirectoryEntry) => void | Promise<void>;
  onAcceptFriendRequest: (relationship: FriendshipRecord) => void | Promise<void>;
  onRemoveRelationship: (relationship: FriendshipRecord, message: string) => void | Promise<void>;
  onOpenFriendList: (username: string, listStatus: ListStatus) => void;
  onToggleFriendActionMenu: (uid: string | null) => void;
};

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default function FriendsTab({
  friendQuery,
  onFriendQueryChange,
  friendSearchResult,
  currentSearchRelationship,
  acceptedFriends,
  incomingFriendRequests,
  outgoingFriendRequests,
  friendActionMenuUid,
  friendMenuRef,
  friendsLoading,
  busy,
  userUid,
  getOtherSnapshot,
  onSearchFriend,
  onSendFriendRequest,
  onAcceptFriendRequest,
  onRemoveRelationship,
  onOpenFriendList,
  onToggleFriendActionMenu,
}: Props) {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300 sm:mt-2">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-400">Add Friend</h3>
        </div>
        <div className="flex flex-row items-center gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-1.5 focus-within:border-zinc-600 focus-within:ring-4 focus-within:ring-zinc-800/50 transition">
          <input
            value={friendQuery}
            onChange={(event) => onFriendQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void onSearchFriend();
            }}
            placeholder="Search username..."
            className="w-full bg-transparent px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void onSearchFriend()}
            className="shrink-0 rounded-xl bg-zinc-100 px-4 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Search
          </button>
        </div>

        {friendSearchResult ? (
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900/20 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-800 text-sm font-semibold text-zinc-200">
                {friendSearchResult.avatarDataUrl ? (
                  <img src={friendSearchResult.avatarDataUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  friendSearchResult.displayName[0]?.toUpperCase() ?? "U"
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-zinc-100">{friendSearchResult.displayName}</div>
                {friendSearchResult.bio ? (
                  <div className="truncate text-xs text-zinc-500">{friendSearchResult.bio}</div>
                ) : null}
              </div>
            </div>

            {currentSearchRelationship?.status === "accepted" ? (
              <button
                type="button"
                onClick={() => onOpenFriendList(friendSearchResult.displayName, "plan-to-watch")}
                className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700"
              >
                View list
              </button>
            ) : currentSearchRelationship?.status === "pending" && currentSearchRelationship.requestedByUid === userUid ? (
              <span className="rounded-full bg-zinc-800/50 px-3 py-1 text-xs text-zinc-400">Request sent</span>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void onSendFriendRequest(friendSearchResult)}
                className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add friend
              </button>
            )}
          </div>
        ) : null}
      </section>

      {friendsLoading ? (
        <div className="flex py-8 items-center justify-center gap-3 text-sm text-zinc-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300"></div>
          Loading friends...
        </div>
      ) : (
        <>
          {incomingFriendRequests.length > 0 || outgoingFriendRequests.length > 0 ? (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-400">Requests</h3>
                <span className="text-xs text-zinc-600">{incomingFriendRequests.length + outgoingFriendRequests.length}</span>
              </div>
              <div className="flex flex-col gap-1">
                {incomingFriendRequests.map((relationship) => {
                  const friend = getOtherSnapshot(relationship);
                  return (
                    <div key={`${relationship.participants[0]}-${relationship.participants[1]}-incoming`} className="group flex items-center justify-between gap-3 rounded-2xl p-2 transition hover:bg-zinc-900/40">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-800 text-sm font-semibold text-zinc-200">
                          {friend.avatarDataUrl ? (
                            <img src={friend.avatarDataUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            friend.displayName[0]?.toUpperCase() ?? "U"
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-zinc-100">{friend.displayName}</div>
                          {friend.bio ? (
                            <div className="truncate text-xs text-zinc-500">{friend.bio}</div>
                          ) : (
                            <div className="text-xs text-zinc-500">Wants to be friends</div>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void onAcceptFriendRequest(relationship)}
                          className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-white disabled:opacity-50"
                          disabled={busy}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => void onRemoveRelationship(relationship, "Friend request declined.")}
                          className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700 disabled:opacity-50"
                          disabled={busy}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  );
                })}

                {outgoingFriendRequests.map((relationship) => {
                  const friend = getOtherSnapshot(relationship);
                  return (
                    <div key={`${relationship.participants[0]}-${relationship.participants[1]}-outgoing`} className="group flex items-center justify-between gap-3 rounded-2xl p-2 transition hover:bg-zinc-900/40">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-800 text-sm font-semibold text-zinc-200">
                          {friend.avatarDataUrl ? (
                            <img src={friend.avatarDataUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            friend.displayName[0]?.toUpperCase() ?? "U"
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-zinc-100">{friend.displayName}</div>
                          {friend.bio ? (
                            <div className="truncate text-xs text-zinc-500">{friend.bio}</div>
                          ) : (
                            <div className="text-xs text-zinc-500">Request sent</div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void onRemoveRelationship(relationship, "Friend request canceled.")}
                        className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700 disabled:opacity-50"
                        disabled={busy}
                      >
                        Cancel
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-400">Friends</h3>
              <span className="text-xs text-zinc-600">{acceptedFriends.length}</span>
            </div>
            <div className="flex flex-col gap-1">
              {acceptedFriends.length > 0 ? (
                acceptedFriends.map((relationship) => {
                  const friend = getOtherSnapshot(relationship);
                  const actionMenuOpen = friendActionMenuUid === friend.uid;

                  return (
                    <div key={`${relationship.participants[0]}-${relationship.participants[1]}`} className="group relative flex items-center justify-between gap-3 rounded-2xl p-2 transition hover:bg-zinc-900/40">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-800 text-sm font-semibold text-zinc-200">
                          {friend.avatarDataUrl ? (
                            <img src={friend.avatarDataUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            friend.displayName[0]?.toUpperCase() ?? "U"
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-zinc-100">{friend.displayName}</div>
                          {friend.bio ? (
                            <div className="truncate text-xs text-zinc-500">{friend.bio}</div>
                          ) : null}
                        </div>
                      </div>

                      <div className="relative shrink-0" ref={actionMenuOpen ? friendMenuRef : undefined}>
                        <button
                          type="button"
                          onClick={() => onToggleFriendActionMenu(actionMenuOpen ? null : friend.uid)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700"
                        >
                          View list
                          <ChevronDownIcon open={actionMenuOpen} />
                        </button>

                        {actionMenuOpen ? (
                          <div className="absolute bottom-full right-0 z-20 mb-2 w-44 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-xl shadow-black/40 sm:bottom-auto sm:top-full sm:mb-0 sm:mt-2">
                            {(["plan-to-watch", "watching", "completed"] as const).map((listStatus) => (
                              <button
                                key={listStatus}
                                type="button"
                                onClick={() => onOpenFriendList(friend.displayName, listStatus)}
                                className="flex w-full items-center justify-between border-b border-zinc-800/50 px-4 py-3 text-left text-xs font-medium text-zinc-300 transition last:border-b-0 hover:bg-zinc-800 hover:text-zinc-50"
                              >
                                {listStatus === "plan-to-watch"
                                  ? "Plan to watch"
                                  : listStatus === "watching"
                                    ? "Watching"
                                    : "Completed"}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => void onRemoveRelationship(relationship, "Friend removed.")}
                              className="flex w-full items-center justify-between bg-red-950/10 px-4 py-3 text-left text-xs font-medium text-red-400 transition hover:bg-red-950/40 hover:text-red-300"
                            >
                              Unfriend
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-4 text-center text-sm text-zinc-600">No friends yet.</div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
