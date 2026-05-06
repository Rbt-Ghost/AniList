let lockCount = 0;
const previousOverflow: string[] = [];

export function lockScroll(): void {
  try {
    lockCount += 1;
    if (lockCount === 1) {
      // Save current value and lock
      previousOverflow.push(document.body.style.overflow || "");
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    }
  } catch {
    // Ignore failures (e.g., SSR or restricted environments)
  }
}

export function unlockScroll(): void {
  try {
    if (lockCount <= 0) return;
    lockCount -= 1;
    if (lockCount === 0) {
      const prev = previousOverflow.pop() ?? "";
      document.body.style.overflow = prev as string;
      document.documentElement.style.overflow = "";
    }
  } catch {
    // Ignore failures
  }
}

export function clearAllLocks(): void {
  try {
    lockCount = 0;
    previousOverflow.length = 0;
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  } catch {}
}
