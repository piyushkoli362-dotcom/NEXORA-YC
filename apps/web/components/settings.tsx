"use client";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api, send, date } from "@/lib/api";
import { useUser } from "./workspace";
import { Button, Badge, Card, ErrorState, Loading, Field } from "./ui";
export function SettingsScreen() {
  const user = useUser(),
    cache = useQueryClient();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [message, setMessage] = useState(""),
    [devLink, setDevLink] = useState("");
  const sessions = useQuery({
    queryKey: ["sessions"],
    queryFn: () =>
      api<
        {
          id: string;
          current: boolean;
          created_at: string;
          expires_at: string;
        }[]
      >("/auth/sessions"),
  });
  useEffect(() => {
    setDevLink(sessionStorage.getItem("nexora_dev_verify") || "");
  }, []);
  async function resend() {
    setBusy(true);
    setError(undefined);
    try {
      const r = await api<{ message: string; development_link?: string }>(
        "/auth/resend-verification",
        { method: "POST" },
      );
      setMessage(r.message);
      if (r.development_link) setDevLink(r.development_link);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Your account. Your control.</h1>
          <p>Manage identity, verification, and active sessions.</p>
        </div>
      </div>
      {error !== undefined && <ErrorState error={error} />}
      <div className="success" role="status">
        {message}
      </div>
      <div className="grid-2">
        <Card>
          <h3>Account details</h3>
          <div className="review-pair">
            <span>Name</span>
            <span>{user.name}</span>
          </div>
          <div className="review-pair">
            <span>Email</span>
            <span>{user.email}</span>
          </div>
          <div className="review-pair">
            <span>Role</span>
            <span>{user.role}</span>
          </div>
          <div className="subtle-rule" />
          <Badge tone={user.verified ? "green" : "amber"}>
            {user.verified ? "Email verified" : "Email verification required"}
          </Badge>
          {!user.verified && (
            <>
              <p style={{ fontSize: 13, marginTop: 20 }}>
                Verify your email to submit your application.
              </p>
              <Button variant="secondary" disabled={busy} onClick={resend}>
                Send verification email
              </Button>
              {devLink && (
                <div className="notice" style={{ marginTop: 15 }}>
                  <Badge tone="amber">Development only</Badge>
                  <p style={{ margin: "10px 0 0" }}>
                    <a className="accent" href={devLink}>
                      Open local verification link →
                    </a>
                  </p>
                </div>
              )}
            </>
          )}
          <div className="subtle-rule" />
          <Button asChild variant="secondary">
            <Link href="/forgot-password">Reset your password</Link>
          </Button>
        </Card>
        <Card>
          <h3>Active sessions</h3>
          <p style={{ fontSize: 12 }}>
            Sessions expire after 12 hours. Resetting your password revokes all
            sessions.
          </p>
          {sessions.isPending ? (
            <Loading />
          ) : sessions.error ? (
            <ErrorState error={sessions.error} />
          ) : (
            sessions.data?.map((s) => (
              <div className="task-row" key={s.id}>
                <div>
                  {s.current ? "This device" : "Another session"}
                  <p>
                    Created {date(s.created_at)} · Expires {date(s.expires_at)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError(undefined);
                    try {
                      await api(`/auth/sessions/${s.id}`, { method: "DELETE" });
                      if (s.current) {
                        cache.clear();
                        window.location.assign("/login");
                      } else await sessions.refetch();
                    } catch (err) {
                      setError(err);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Revoke
                </Button>
              </div>
            ))
          )}
        </Card>
      </div>
    </>
  );
}
export function RoleLanding({ role }: { role: "MENTOR" | "INVESTOR" }) {
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            {role === "MENTOR"
              ? "Experience, with a purpose."
              : "Discover what founders are building."}
          </h1>
          <p>Your account is ready. Private access is permission-based.</p>
        </div>
        <Badge>Phase {role === "MENTOR" ? "3" : "4"}</Badge>
      </div>
      <Card>
        <h3>
          {role === "MENTOR"
            ? "Mentor workspace is coming in Phase 3."
            : "Investor workspace is coming in Phase 4."}
        </h3>
        <p>
          {role === "MENTOR"
            ? "Assigned startup access, meeting tools, feedback, and milestones will be introduced together."
            : "Watchlists, introduction requests, and founder-approved data sharing will be introduced together."}
        </p>
        <p>
          Today, you can explore profiles founders have explicitly chosen to
          make public.
        </p>
        <Button asChild>
          <Link href="/startups">Explore public startups ↗</Link>
        </Button>
      </Card>
    </>
  );
}
