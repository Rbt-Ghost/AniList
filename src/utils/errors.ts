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
 * Hook-friendly async error handler that filters abort errors
 */
export function handleAsyncError(error: unknown, onError: (message: string) => void): void {
  if (!isAbortError(error)) {
    onError(getErrorMessage(error));
  }
}
