import { FirebaseError } from "firebase/app";

export function getFriendlyAuthError(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/email-already-in-use":
        return "That email is already in use. Try logging in instead.";
      case "auth/weak-password":
        return "Password is too weak. Use at least 6 characters.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
      case "auth/invalid-login-credentials":
        return "Invalid email or password.";
      case "auth/too-many-requests":
        return "Too many attempts. Please wait a bit and try again.";
      case "auth/network-request-failed":
        return "Network error. Please check your connection.";
      case "auth/requires-recent-login":
        return "Please log in again, then retry this action.";
      default:
        return error.message;
    }
  }

  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Something went wrong. Please try again.";
}
