/**
 * Check if an error is an abort error from AbortController
 */
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/**
 * Get a user-friendly error message from an error object
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unexpected error occurred";
}

/**
 * Detect a backend outage from Jikan-style error messages.
 */
export function isTemporaryApiOutage(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes("jikan 500") || message.includes("internal server error") || message.includes("connectiontimeoutexception");
}

/**
 * Standard copy for temporary service outages.
 */
export function getTemporaryApiOutageMessage(): string {
  return "AniList is temporarily down because the anime API is returning an Internal Server Error. Please try again in a few minutes.";
}

/**
 * Hook-friendly async error handler that filters abort errors
 */
export function handleAsyncError(error: unknown, onError: (message: string) => void): void {
  if (!isAbortError(error)) {
    onError(getErrorMessage(error));
  }
}
