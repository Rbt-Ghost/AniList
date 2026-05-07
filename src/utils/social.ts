export type UserDirectoryEntry = {
  uid: string;
  displayName: string;
  avatarDataUrl: string | null;
  bio?: string;
};

export type FriendshipStatus = "pending" | "accepted";

export type FriendSnapshot = {
  uid: string;
  displayName: string;
  avatarDataUrl: string | null;
  bio?: string;
};

export type FriendshipRecord = {
  participants: [string, string];
  requestedByUid: string;
  status: FriendshipStatus;
  createdAt: number;
  updatedAt: number;
  requesterSnapshot: FriendSnapshot;
  recipientSnapshot: FriendSnapshot;
};

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function usernameDocId(value: string) {
  return normalizeUsername(value).replaceAll("/", "-");
}

export function friendshipDocId(leftUid: string, rightUid: string) {
  return [leftUid, rightUid].sort().join("__");
}

export function makeFriendSnapshot(
  uid: string,
  displayName: string,
  avatarDataUrl: string | null,
  bio?: string
): FriendSnapshot {
  return {
    uid,
    displayName,
    avatarDataUrl,
    bio,
  };
}
