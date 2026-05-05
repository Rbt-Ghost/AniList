import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../context/AuthContext.tsx";
import { getFriendlyAuthError } from "../utils/firebaseAuthErrors.ts";

type AuthDialogView = "sign-in" | "sign-up" | "reset" | "verify-sent" | "reset-sent";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function AuthDialog({ open, onClose }: Props) {
  const { signIn, signUp, sendPasswordReset, sendVerificationEmail } = useAuth();

  const [view, setView] = useState<AuthDialogView>("sign-in");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const title = useMemo(() => {
    switch (view) {
      case "sign-up":
        return "Create account";
      case "reset":
        return "Reset password";
      case "verify-sent":
        return "Verify your email";
      case "reset-sent":
        return "Email sent";
      case "sign-in":
      default:
        return "Log in";
    }
  }, [view]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleSignIn = async () => {
    clearMessages();

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setBusy(true);
      await signIn(email.trim(), password);
      onClose();
    } catch (e) {
      setError(getFriendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async () => {
    clearMessages();

    if (!email.trim() || !password || !confirmPassword) {
      setError("Please enter your email and password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setBusy(true);
      await signUp({
        email: email.trim(),
        password,
        displayName: displayName.trim() ? displayName.trim() : undefined,
      });

      setSuccess("Verification email sent. Please check your inbox.");
      setView("verify-sent");
    } catch (e) {
      setError(getFriendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    clearMessages();

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setBusy(true);
      await sendPasswordReset(email.trim());
      setView("reset-sent");
      setSuccess("Password reset email sent. Please check your inbox.");
    } catch (e) {
      setError(getFriendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleResendVerification = async () => {
    clearMessages();

    try {
      setBusy(true);
      await sendVerificationEmail();
      setSuccess("Verification email re-sent.");
    } catch (e) {
      setError(getFriendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-zinc-950/75 px-4 py-4 backdrop-blur sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close authentication dialog"
        onClick={onClose}
      />

      <section className="relative w-full max-w-md overflow-visible rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40">
        <div className="border-b border-zinc-800 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Account</p>
              <h2 className="mt-1 text-lg font-semibold text-zinc-50">{title}</h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-900"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5">
          {error ? (
            <div className="rounded-2xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100">
              {success}
            </div>
          ) : null}

          {view === "sign-in" ? (
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-zinc-200">Email</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-50 outline-none transition focus:border-zinc-600"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-zinc-200">Password</span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-50 outline-none transition focus:border-zinc-600"
                />
              </label>

              <button
                type="button"
                disabled={busy}
                onClick={handleSignIn}
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-50 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Logging in…" : "Log in"}
              </button>

              <div className="flex items-center justify-between gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    clearMessages();
                    setView("reset");
                  }}
                  className="text-zinc-300 hover:text-zinc-50"
                >
                  Forgot password?
                </button>

                <button
                  type="button"
                  onClick={() => {
                    clearMessages();
                    setView("sign-up");
                  }}
                  className="text-zinc-300 hover:text-zinc-50"
                >
                  Create account
                </button>
              </div>
            </div>
          ) : null}

          {view === "sign-up" ? (
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-zinc-200">Display name</span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  type="text"
                  autoComplete="nickname"
                  placeholder="username123"
                  className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-50 outline-none transition focus:border-zinc-600"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-zinc-200">Email</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-50 outline-none transition focus:border-zinc-600"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-zinc-200">Password</span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-50 outline-none transition focus:border-zinc-600"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-zinc-200">Confirm password</span>
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-50 outline-none transition focus:border-zinc-600"
                />
              </label>

              <button
                type="button"
                disabled={busy}
                onClick={handleSignUp}
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-50 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Creating…" : "Create account"}
              </button>

              <div className="flex items-center justify-between gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    clearMessages();
                    setView("sign-in");
                  }}
                  className="text-zinc-300 hover:text-zinc-50"
                >
                  Already have an account?
                </button>
              </div>
            </div>
          ) : null}

          {view === "reset" ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-400">
                Enter your email and we’ll send a password reset link.
              </p>

              <label className="block">
                <span className="text-sm font-medium text-zinc-200">Email</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-50 outline-none transition focus:border-zinc-600"
                />
              </label>

              <button
                type="button"
                disabled={busy}
                onClick={handleReset}
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-50 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Sending…" : "Send reset email"}
              </button>

              <button
                type="button"
                onClick={() => {
                  clearMessages();
                  setView("sign-in");
                }}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-zinc-900"
              >
                Back to login
              </button>
            </div>
          ) : null}

          {view === "verify-sent" ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-400">
                We sent a verification email to <span className="font-semibold text-zinc-200">{email.trim()}</span>.
                Follow the link in that email to verify your address.
              </p>

              <button
                type="button"
                disabled={busy}
                onClick={handleResendVerification}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Sending…" : "Resend verification email"}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-50 transition hover:bg-zinc-800"
              >
                Done
              </button>
            </div>
          ) : null}

          {view === "reset-sent" ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-400">
                If an account exists for <span className="font-semibold text-zinc-200">{email.trim()}</span>, you’ll receive a reset email shortly.
              </p>

              <button
                type="button"
                onClick={() => {
                  clearMessages();
                  setView("sign-in");
                }}
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-50 transition hover:bg-zinc-800"
              >
                Back to login
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
