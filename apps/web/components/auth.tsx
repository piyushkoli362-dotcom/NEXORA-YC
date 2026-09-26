"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { Brand } from "./public";
import { Button, ErrorState, Field, Badge } from "./ui";
import { send, User, roleHome } from "@/lib/api";

export function AuthScreen({ mode }: { mode: string }) {
  const router = useRouter(),
    cache = useQueryClient();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [message, setMessage] = useState(""),
    [devLink, setDevLink] = useState(""),
    [token, setToken] = useState("");
  useEffect(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get(
      "token",
    );
    if (value) {
      setToken(value);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);
  const register = mode === "register",
    login = mode === "login",
    forgot = mode === "forgot-password",
    verify = mode === "verify-email";
  const title = register
    ? "Your next chapter starts here."
    : login
      ? "Welcome back."
      : forgot
        ? "Let’s get you back in."
        : verify
          ? "Verify your email."
          : "Create a new password.";
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    setMessage("");
    const form = new FormData(e.currentTarget);
    try {
      if (register || login) {
        const body = register
          ? {
              name: form.get("name"),
              email: form.get("email"),
              password: form.get("password"),
              role: "FOUNDER",
            }
          : { email: form.get("email"), password: form.get("password") };
        const user = await send<User & { development_link?: string }>(
          `/auth/${mode}`,
          body,
        );
        cache.clear();
        if (user.development_link)
          sessionStorage.setItem("nexora_dev_verify", user.development_link);
        router.push(register ? "/onboarding" : roleHome(user.role));
      } else {
        const path = forgot
          ? "/auth/forgot-password"
          : verify
            ? "/auth/verify-email"
            : "/auth/reset-password";
        const body = forgot
          ? { email: form.get("email") }
          : verify
            ? { token }
            : { token, password: form.get("password") };
        const result = await send<{
          message: string;
          development_link?: string;
        }>(path, body);
        setMessage(result.message);
        setDevLink(result.development_link || "");
        cache.invalidateQueries({ queryKey: ["me"] });
      }
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main" className="auth-wrap">
      <aside className="auth-story">
        <Brand />
        <div>
          <div className="eyebrow">A home for your ambition</div>
          <h1>
            Big things start
            <br />
            with a small
            <br />
            <span className="accent">first step.</span>
          </h1>
          <p>
            Bring your ideas, your questions, and your determination. Let’s
            build what comes next.
          </p>
          <div
            className="row"
            style={{ marginTop: 35, color: "#9dac93", fontSize: 12 }}
          >
            <ShieldCheck size={17} /> Your ideas are yours. Your data stays
            private.
          </div>
        </div>
        <small>NEXORA / THE AI STARTUP ECOSYSTEM</small>
      </aside>
      <div className="auth-content">
        <div className="auth-form">
          <div className="login-mobile-brand">
            <Brand />
          </div>
          <h2>{title}</h2>
          <p>
            {register
              ? "Create your founder account. No payment details required."
              : login
                ? "Your startup journey is right where you left it."
                : verify
                  ? "Use the link from your email to confirm your address."
                  : "We’ll help you securely recover your account."}
          </p>
          {message ? (
            <div className="stack">
              <div className="notice" role="status">
                {message}
              </div>
              {devLink && (
                <div className="notice">
                  <Badge tone="amber">Development only</Badge>
                  <p style={{ margin: "10px 0" }}>
                    <a href={devLink} className="accent">
                      Open local recovery link →
                    </a>
                  </p>
                </div>
              )}
              <Button asChild>
                <Link href={verify ? "/dashboard" : "/login"}>
                  {verify ? "Go to your workspace" : "Back to sign in"}
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={submit}>
              {register && (
                <Field label="Full name">
                  <input
                    name="name"
                    autoComplete="name"
                    minLength={2}
                    maxLength={100}
                    required
                    placeholder="Your name"
                  />
                </Field>
              )}
              {(register || login || forgot) && (
                <Field label="Email address">
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@yourcompany.com"
                  />
                </Field>
              )}
              {(register || login || mode === "reset-password") && (
                <Field
                  label="Password"
                  hint={
                    !login
                      ? "Use at least 12 characters. A passphrase works well."
                      : undefined
                  }
                >
                  <input
                    name="password"
                    type="password"
                    autoComplete={login ? "current-password" : "new-password"}
                    minLength={login ? 1 : 12}
                    maxLength={128}
                    required
                    placeholder={
                      login ? "Enter your password" : "Create a strong password"
                    }
                  />
                </Field>
              )}
              {(verify || mode === "reset-password") && !token && (
                <div className="notice">
                  Open the secure link in your email first. If it expired,
                  request a new one from{" "}
                  {verify ? "your workspace settings" : "the recovery page"}.
                </div>
              )}
              {login && (
                <Link
                  href="/forgot-password"
                  className="accent"
                  style={{ fontSize: 12, textAlign: "right" }}
                >
                  Forgot password?
                </Link>
              )}
              {error !== undefined && <ErrorState error={error} />}
              <Button
                disabled={
                  busy || ((verify || mode === "reset-password") && !token)
                }
                type="submit"
              >
                {busy
                  ? "Please wait…"
                  : register
                    ? "Create founder account"
                    : login
                      ? "Sign in"
                      : forgot
                        ? "Send reset link"
                        : verify
                          ? "Verify email"
                          : "Update password"}{" "}
                <ArrowUpRight size={16} />
              </Button>
              {register && (
                <small>
                  Public discovery is opt-in. You can save your application
                  before you submit.
                </small>
              )}
            </form>
          )}
          <div className="auth-bottom">
            {login ? (
              <>
                New to Nexora?{" "}
                <Link className="accent" href="/register">
                  Create an account
                </Link>
              </>
            ) : register ? (
              <>
                Already building with us?{" "}
                <Link className="accent" href="/login">
                  Sign in
                </Link>
              </>
            ) : (
              <Link className="accent" href="/login">
                Return to sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
