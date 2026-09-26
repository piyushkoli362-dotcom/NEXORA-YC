"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Check, Clock, FileText } from "lucide-react";
import { api, send, Application, Startup, label, date } from "@/lib/api";
import {
  Button,
  Badge,
  Card,
  Empty,
  ErrorState,
  Field,
  Loading,
  Modal,
} from "./ui";
import { useUser } from "./workspace";
export function ApplicationScreen() {
  const user = useUser(),
    cache = useQueryClient();
  const list = useQuery({
    queryKey: ["applications"],
    queryFn: () => api<Application[]>("/applications"),
  });
  const [selected, setSelected] = useState(""),
    [error, setError] = useState<unknown>(),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const id = selected || list.data?.[0]?.id;
  const detail = useQuery({
    queryKey: ["application", id],
    queryFn: () => api<Application>(`/applications/${id}`),
    enabled: !!id,
  });
  const a = detail.data;
  async function submit() {
    setBusy(true);
    setError(undefined);
    try {
      await api(`/applications/${id}/submit`, { method: "POST" });
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["applications"] }),
        cache.invalidateQueries({ queryKey: ["application", id] }),
        cache.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  async function reply(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await send(`/applications/${id}/messages`, { body: message });
      setMessage("");
      await detail.refetch();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  if (list.isPending) return <Loading />;
  if (list.error)
    return <ErrorState error={list.error} retry={() => list.refetch()} />;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            Your next chapter, in motion<span className="accent">.</span>
          </h1>
          <p>
            One place for your application, review progress, and conversations.
          </p>
        </div>
        <Button variant="secondary" asChild>
          <Link href="/onboarding">
            Edit startup profile <ArrowUpRight size={15} />
          </Link>
        </Button>
      </div>
      {!id ? (
        <Card>
          <Empty
            title="Your story is waiting to be told"
            body="Complete your startup profile to create an application draft."
          >
            <Button asChild>
              <Link href="/onboarding">Start your application</Link>
            </Button>
          </Empty>
        </Card>
      ) : detail.isPending ? (
        <Loading />
      ) : detail.error ? (
        <ErrorState error={detail.error} retry={() => detail.refetch()} />
      ) : (
        a && (
          <>
            {(list.data?.length || 0) > 1 && (
              <Field label="Select application">
                <select
                  value={id}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  {list.data?.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.startup_name} — {x.cycle}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <div className="grid-3" style={{ marginTop: 20, marginBottom: 24 }}>
              <Card>
                <small>CURRENT STATUS</small>
                <h2 style={{ fontSize: 27, margin: "15px 0" }}>
                  {label(a.status)}
                </h2>
                <Badge tone="green">{a.startup_name}</Badge>
              </Card>
              <Card>
                <small>SUBMITTED</small>
                <h3 style={{ margin: "18px 0 8px" }}>{date(a.submitted_at)}</h3>
                <p style={{ fontSize: 12, margin: 0 }}>{a.cycle}</p>
              </Card>
              <Card>
                <small>LAST UPDATED</small>
                <h3 style={{ margin: "18px 0 8px" }}>{date(a.updated_at)}</h3>
                <p style={{ fontSize: 12, margin: 0 }}>
                  We’ll notify you when your status changes.
                </p>
              </Card>
            </div>
            {error !== undefined && <ErrorState error={error} />}
            <div className="grid-2">
              <div className="stack">
                <Card>
                  <div className="card-heading">
                    <h3>
                      {a.status === "DRAFT"
                        ? "Ready for your next step?"
                        : "Application timeline"}
                    </h3>
                    <Clock size={18} className="muted" />
                  </div>
                  {a.status === "DRAFT" ? (
                    <>
                      <p style={{ fontSize: 13 }}>
                        Submission creates a fixed snapshot for reviewers. You
                        can continue editing your startup profile afterward.
                      </p>
                      {!user.verified && (
                        <div className="notice">
                          Verify your email in{" "}
                          <Link className="accent" href="/settings">
                            account settings
                          </Link>{" "}
                          before submitting.
                        </div>
                      )}
                      {a.missing_fields.length > 0 ? (
                        <>
                          <p style={{ margin: "20px 0 10px", fontSize: 13 }}>
                            Complete these required fields:
                          </p>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 7,
                            }}
                          >
                            {a.missing_fields.map((f) => (
                              <Badge key={f}>{label(f)}</Badge>
                            ))}
                          </div>
                          <Button
                            asChild
                            variant="secondary"
                            style={{ marginTop: 24 }}
                          >
                            <Link href="/onboarding">
                              Continue your draft <ArrowUpRight size={15} />
                            </Link>
                          </Button>
                        </>
                      ) : (
                        <div className="notice row">
                          <Check size={16} />
                          Your required information is complete.
                        </div>
                      )}
                      <div style={{ marginTop: 22 }}>
                        <Modal
                          title="Submit your application?"
                          description="Your current founder and startup information will be saved as a review snapshot. This does not guarantee acceptance or funding."
                          trigger={
                            <Button
                              disabled={
                                !user.verified ||
                                a.missing_fields.length > 0 ||
                                busy
                              }
                            >
                              Submit for human review <ArrowUpRight size={15} />
                            </Button>
                          }
                        >
                          <p>
                            Make sure your answers are accurate and any
                            estimates are clearly labeled.
                          </p>
                          <Button disabled={busy} onClick={submit}>
                            {busy ? "Submitting…" : "Confirm submission"}
                          </Button>
                          {error !== undefined && <ErrorState error={error} />}
                        </Modal>
                      </div>
                    </>
                  ) : (
                    <>
                      <ol className="timeline">
                        {a.history?.map((h) => (
                          <li key={h.id}>
                            {label(h.to_status || "")}
                            <small>{date(h.created_at)}</small>
                          </li>
                        ))}
                      </ol>
                      <div className="notice">
                        {a.status === "ACCEPTED"
                          ? "You’ve been accepted. The team will share the next steps."
                          : a.status === "REJECTED"
                            ? "The team has completed its review. See any shared feedback below."
                            : a.status === "WAITLISTED"
                              ? "Your application is on the waitlist. We’ll notify you about updates."
                              : "Next step: the team will review your application and contact you if more information is needed."}
                      </div>
                    </>
                  )}
                </Card>
                {a.status !== "DRAFT" && (
                  <Card>
                    <div className="card-heading">
                      <h3>Submitted snapshot</h3>
                      <FileText size={18} />
                    </div>
                    <p style={{ fontSize: 12 }}>
                      This is what the review team received.
                    </p>
                    {Object.entries(a.answers.startup?.answers || {}).map(
                      ([k, v]) => (
                        <div className="review-pair" key={k}>
                          <span>{label(k)}</span>
                          <span>{v || "Not provided"}</span>
                        </div>
                      ),
                    )}
                  </Card>
                )}
              </div>
              <div className="stack">
                <Card>
                  <div className="card-heading">
                    <h3>Conversations with the team</h3>
                    <Badge>Shared with you</Badge>
                  </div>
                  {a.messages?.length ? (
                    a.messages.map((m) => (
                      <div className="message" key={m.id}>
                        <small>
                          {m.kind === "request" ? "Nexora team" : "Your reply"}{" "}
                          · {date(m.created_at)}
                        </small>
                        <p>{m.body}</p>
                      </div>
                    ))
                  ) : (
                    <p style={{ fontSize: 13 }}>
                      No information requests yet. Messages from the review team
                      will appear here.
                    </p>
                  )}
                  <form
                    onSubmit={reply}
                    className="stack"
                    style={{ marginTop: 20 }}
                  >
                    <Field label="Message the review team">
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                        maxLength={5000}
                        placeholder="Share an update or answer a request…"
                      />
                    </Field>
                    <Button
                      variant="secondary"
                      disabled={busy || !message.trim()}
                      type="submit"
                    >
                      Send message <ArrowUpRight size={14} />
                    </Button>
                  </form>
                </Card>
                <Card>
                  <h3>Upcoming interviews</h3>
                  {a.interviews?.length ? (
                    a.interviews.map((i) => (
                      <div className="message" key={i.id}>
                        <strong>
                          {new Date(
                            (i.scheduled_at || "") + "Z",
                          ).toLocaleString()}
                        </strong>
                        <p>{i.location}</p>
                      </div>
                    ))
                  ) : (
                    <p style={{ fontSize: 13, margin: 0 }}>
                      No interviews scheduled. Any invitations will appear here
                      and in your notifications.
                    </p>
                  )}
                </Card>
              </div>
            </div>
          </>
        )
      )}
    </>
  );
}
export function StartupProfile() {
  const query = useQuery({
    queryKey: ["startups"],
    queryFn: () => api<Startup[]>("/startups"),
  });
  if (query.isPending) return <Loading />;
  if (query.error)
    return <ErrorState error={query.error} retry={() => query.refetch()} />;
  const s = query.data?.[0];
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            Your startup, clearly defined<span className="accent">.</span>
          </h1>
          <p>Your working profile evolves with your company.</p>
        </div>
        <Button asChild>
          <Link href="/onboarding">
            {s ? "Edit profile" : "Create profile"} <ArrowUpRight size={15} />
          </Link>
        </Button>
      </div>
      {s ? (
        <>
          <Card>
            <div className="row between">
              <div className="row">
                <div className="startup-icon">{s.name[0]}</div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 30 }}>{s.name}</h2>
                  <small>
                    {s.industry} · {s.stage}
                  </small>
                </div>
              </div>
              <Badge tone={s.public ? "green" : "neutral"}>
                {s.public ? "Public summary" : "Private profile"}
              </Badge>
            </div>
            <p style={{ marginTop: 25 }}>
              {s.description || "Add a description in your startup profile."}
            </p>
            {s.website && (
              <a
                className="accent"
                href={s.website}
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit website ↗
              </a>
            )}
          </Card>
          <div className="grid-2" style={{ marginTop: 24 }}>
            {Object.entries(s.answers)
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <Card key={k}>
                  <small>{label(k).toUpperCase()}</small>
                  <p
                    style={{
                      margin: "12px 0 0",
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {v}
                  </p>
                </Card>
              ))}
          </div>
        </>
      ) : (
        <Card>
          <Empty
            title="Make room for your big idea"
            body="Your startup profile brings your problem, solution, market, and team together."
          />
        </Card>
      )}
    </>
  );
}
