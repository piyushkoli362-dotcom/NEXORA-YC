"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  LayoutGrid,
  List,
  ShieldCheck,
  Search,
} from "lucide-react";
import { api, send, Application, User, label, date } from "@/lib/api";
import {
  Button,
  Badge,
  Card,
  ErrorState,
  Field,
  Loading,
  Empty,
  Modal,
} from "./ui";
import { useUser } from "./workspace";
type AdminUser = User & { suspended: boolean };
export function AdminScreen() {
  const user = useUser(),
    cache = useQueryClient(),
    admin = user.role !== "REVIEWER";
  const [tab, setTab] = useState("Applications"),
    [selected, setSelected] = useState(""),
    [board, setBoard] = useState(false),
    [q, setQ] = useState(""),
    [error, setError] = useState<unknown>(),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const applications = useQuery({
    queryKey: ["applications"],
    queryFn: () => api<Application[]>("/applications"),
  });
  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api<AdminUser[]>("/admin/users"),
    enabled: admin,
  });
  const audits = useQuery({
    queryKey: ["audit"],
    queryFn: () =>
      api<
        {
          id: string;
          action: string;
          resource_id: string;
          created_at: string;
          actor_id: string;
        }[]
      >("/admin/audit"),
    enabled: admin && tab === "Audit logs",
  });
  const cohorts = useQuery({
    queryKey: ["cohorts"],
    queryFn: () =>
      api<
        { id: string; name: string; description: string; members: string[] }[]
      >("/cohorts"),
    enabled: admin && tab === "Cohorts",
  });
  const detail = useQuery({
    queryKey: ["application", selected],
    queryFn: () => api<Application>(`/applications/${selected}`),
    enabled: !!selected,
  });
  async function action(
    fn: () => Promise<unknown>,
    success = "Changes saved.",
  ) {
    setBusy(true);
    setError(undefined);
    setNotice("");
    try {
      await fn();
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["applications"] }),
        cache.invalidateQueries({ queryKey: ["application", selected] }),
        cache.invalidateQueries({ queryKey: ["admin-users"] }),
        cache.invalidateQueries({ queryKey: ["audit"] }),
        cache.invalidateQueries({ queryKey: ["cohorts"] }),
      ]);
      setNotice(success);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  const a = detail.data,
    items =
      applications.data?.filter((x) =>
        `${x.startup_name} ${x.industry} ${x.status}`
          .toLowerCase()
          .includes(q.toLowerCase()),
      ) || [];
  if (applications.isPending) return <Loading />;
  if (applications.error)
    return (
      <ErrorState
        error={applications.error}
        retry={() => applications.refetch()}
      />
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            Nexora / {admin ? "Operations" : "Assigned reviews"}
          </div>
          <h1>
            {selected
              ? "A closer look."
              : "Potential deserves a thoughtful review."}
          </h1>
          <p>
            {admin
              ? "Manage applications, support founders, and keep every decision accountable."
              : "Your assigned applications. Your context. Your feedback."}
          </p>
        </div>
        <Badge tone="green">
          <ShieldCheck size={12} />
          {label(user.role)}
        </Badge>
      </div>
      {error !== undefined && <ErrorState error={error} />}
      <div className="success" role="status">
        {notice}
      </div>
      {selected ? (
        <>
          <Button
            variant="ghost"
            onClick={() => {
              setSelected("");
              setNotice("");
              setError(undefined);
            }}
          >
            <ArrowLeft size={15} />
            Back to applications
          </Button>
          {detail.isPending ? (
            <Loading />
          ) : detail.error ? (
            <ErrorState error={detail.error} />
          ) : (
            a && (
              <>
                <div className="card-heading" style={{ marginTop: 25 }}>
                  <h2 style={{ fontSize: 28, margin: 0 }}>{a.startup_name}</h2>
                  <Badge tone="green">{label(a.status)}</Badge>
                </div>
                <div className="admin-detail">
                  <div className="stack">
                    <Card>
                      <h3>Application snapshot</h3>
                      <p style={{ fontSize: 12 }}>
                        {a.status === "DRAFT"
                          ? "This founder has not submitted yet."
                          : "Submitted " +
                            date(a.submitted_at) +
                            " · " +
                            a.cycle}
                      </p>
                      {a.answers.founder && (
                        <div className="review-section">
                          <h3>{a.answers.founder.name}</h3>
                          {Object.entries(a.answers.founder.data).map(
                            ([k, v]) => (
                              <div className="review-pair" key={k}>
                                <span>{label(k)}</span>
                                <span>{String(v)}</span>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                      {Object.entries(a.answers.startup?.answers || {}).map(
                        ([k, v]) => (
                          <div className="review-pair" key={k}>
                            <span>{label(k)}</span>
                            <span style={{ whiteSpace: "pre-wrap" }}>
                              {v || "Not provided"}
                            </span>
                          </div>
                        ),
                      )}
                    </Card>
                    <Card>
                      <h3>Review history</h3>
                      <ol className="timeline">
                        {a.history?.map((h) => (
                          <li key={h.id}>
                            {label(h.from_status || "")} →{" "}
                            {label(h.to_status || "")}
                            <small>{date(h.created_at)}</small>
                          </li>
                        ))}
                      </ol>
                      {!a.history?.length && <p>No status changes yet.</p>}
                    </Card>
                  </div>
                  <div className="stack">
                    {admin && (
                      <Card>
                        <h3>Review controls</h3>
                        <p style={{ fontSize: 12 }}>
                          Final decisions are always made by a human reviewer
                          with administrative permission.
                        </p>
                        <form
                          className="stack"
                          key={a.version}
                          onSubmit={(e) => {
                            e.preventDefault();
                            const f = new FormData(e.currentTarget);
                            const status = f.get("status"),
                              reviewer = f.get("reviewer");
                            action(() =>
                              send(
                                `/admin/applications/${a.id}`,
                                {
                                  version: a.version,
                                  ...(status ? { status } : {}),
                                  ...(reviewer
                                    ? { reviewer_id: reviewer }
                                    : {}),
                                },
                                "PATCH",
                              ),
                            );
                          }}
                        >
                          <Field label="Next status">
                            <select name="status" defaultValue="">
                              <option value="">Keep current status</option>
                              {a.next_states
                                .filter((s) => s !== "SUBMITTED")
                                .map((s) => (
                                  <option key={s} value={s}>
                                    {label(s)}
                                  </option>
                                ))}
                            </select>
                          </Field>
                          <Field label="Assigned reviewer">
                            <select
                              name="reviewer"
                              defaultValue={a.reviewer_id || ""}
                            >
                              <option value="">Select reviewer</option>
                              {users.data
                                ?.filter(
                                  (u) => u.role === "REVIEWER" && !u.suspended,
                                )
                                .map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.name}
                                  </option>
                                ))}
                            </select>
                          </Field>
                          {users.error && <ErrorState error={users.error} />}
                          <Button disabled={busy} type="submit">
                            Save review changes
                          </Button>
                        </form>
                      </Card>
                    )}
                    <Card>
                      <h3>Private reviewer notes</h3>
                      <Badge tone="amber">Never shared with founders</Badge>
                      {a.notes?.map((n) => (
                        <div className="message" key={n.id}>
                          <small>{date(n.created_at)}</small>
                          <p>{n.body}</p>
                        </div>
                      ))}
                      <form
                        className="stack"
                        style={{ marginTop: 18 }}
                        onSubmit={(e) => {
                          e.preventDefault();
                          const form = e.currentTarget;
                          const body = new FormData(form).get("body");
                          action(async () => {
                            await send(`/admin/applications/${a.id}/notes`, {
                              body,
                            });
                            form.reset();
                          }, "Private note saved.");
                        }}
                      >
                        <Field label="Review note">
                          <textarea name="body" required maxLength={5000} />
                        </Field>
                        <Button
                          type="submit"
                          disabled={busy}
                          variant="secondary"
                        >
                          Add private note
                        </Button>
                      </form>
                    </Card>
                    <Card>
                      <h3>Information requests</h3>
                      <Badge tone="green">Visible to founder</Badge>
                      {a.messages?.map((m) => (
                        <div className="message" key={m.id}>
                          <small>
                            {m.kind === "request" ? "Review team" : "Founder"} ·{" "}
                            {date(m.created_at)}
                          </small>
                          <p>{m.body}</p>
                        </div>
                      ))}
                      <form
                        className="stack"
                        style={{ marginTop: 18 }}
                        onSubmit={(e) => {
                          e.preventDefault();
                          const form = e.currentTarget;
                          const body = new FormData(form).get("body");
                          action(async () => {
                            await send(`/applications/${a.id}/messages`, {
                              body,
                            });
                            form.reset();
                          }, "Information request sent.");
                        }}
                      >
                        <Field label="Request information">
                          <textarea name="body" required maxLength={5000} />
                        </Field>
                        <Button
                          type="submit"
                          disabled={busy}
                          variant="secondary"
                        >
                          Send to founder <ArrowUpRight size={14} />
                        </Button>
                      </form>
                    </Card>
                    {admin && (
                      <Card>
                        <h3>Schedule an interview</h3>
                        {a.interviews?.map((i) => (
                          <div key={i.id} className="message">
                            <small>
                              {new Date(i.scheduled_at + "Z").toLocaleString()}
                            </small>
                            <p>{i.location}</p>
                          </div>
                        ))}
                        <form
                          className="stack"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.currentTarget,
                              f = new FormData(form);
                            action(async () => {
                              await send(
                                `/admin/applications/${a.id}/interviews`,
                                {
                                  scheduled_at: new Date(
                                    String(f.get("scheduled_at")),
                                  ).toISOString(),
                                  location: f.get("location"),
                                },
                              );
                              form.reset();
                            }, "Interview scheduled and founder notified.");
                          }}
                        >
                          <Field label="Date and time (your local timezone)">
                            <input
                              name="scheduled_at"
                              type="datetime-local"
                              required
                            />
                          </Field>
                          <Field label="Meeting link or location">
                            <input
                              name="location"
                              required
                              minLength={3}
                              maxLength={500}
                            />
                          </Field>
                          <Button
                            type="submit"
                            variant="secondary"
                            disabled={busy}
                          >
                            Schedule interview
                          </Button>
                        </form>
                      </Card>
                    )}
                  </div>
                </div>
              </>
            )
          )}
        </>
      ) : (
        <>
          <div className="grid-4" style={{ marginBottom: 27 }}>
            {[
              ["Applications", applications.data?.length || 0],
              [
                "In review",
                applications.data?.filter((a) =>
                  ["SCREENING", "AI_REVIEW", "HUMAN_REVIEW"].includes(a.status),
                ).length || 0,
              ],
              [
                "Interviews",
                applications.data?.filter((a) => a.status === "INTERVIEW")
                  .length || 0,
              ],
              [
                "Accepted",
                applications.data?.filter((a) => a.status === "ACCEPTED")
                  .length || 0,
              ],
            ].map(([t, n]) => (
              <Card className="stat" key={t}>
                <div className="stat-label">{t}</div>
                <div className="stat-value">{n}</div>
                <div className="stat-foot">
                  Current application page · up to 100
                </div>
              </Card>
            ))}
          </div>
          <div
            className="tabs"
            role="tablist"
            aria-label="Administration sections"
          >
            {(admin
              ? ["Applications", "People", "Cohorts", "Audit logs"]
              : ["Applications"]
            ).map((t) => (
              <button
                role="tab"
                aria-selected={tab === t}
                className={`tab ${tab === t ? "active" : ""}`}
                onClick={() => {
                  setTab(t);
                  setNotice("");
                  setError(undefined);
                }}
                key={t}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === "Applications" && (
            <>
              <div className="row between" style={{ marginBottom: 22 }}>
                <div
                  className="search-input"
                  style={{ marginBottom: 0, flex: 1 }}
                >
                  <Search size={16} />
                  <input
                    aria-label="Filter applications"
                    placeholder="Search applications…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
                <Button variant="secondary" onClick={() => setBoard(!board)}>
                  {board ? <List size={15} /> : <LayoutGrid size={15} />}
                  <span>{board ? "List view" : "Board view"}</span>
                </Button>
              </div>
              {items.length ? (
                board ? (
                  <div className="kanban">
                    {[
                      "DRAFT",
                      "SUBMITTED",
                      "SCREENING",
                      "AI_REVIEW",
                      "HUMAN_REVIEW",
                      "INTERVIEW",
                      "SHORTLISTED",
                      "ACCEPTED",
                      "WAITLISTED",
                      "REJECTED",
                    ].map((status) => (
                      <section className="kanban-column" key={status}>
                        <h3>
                          {label(status)}{" "}
                          <span className="muted">
                            {items.filter((a) => a.status === status).length}
                          </span>
                        </h3>
                        {items
                          .filter((a) => a.status === status)
                          .map((a) => (
                            <button
                              className="kanban-card"
                              key={a.id}
                              onClick={() => setSelected(a.id)}
                            >
                              <strong>{a.startup_name}</strong>
                              <p>
                                {a.industry} · {a.stage}
                              </p>
                              <Badge>
                                {a.demo ? "Demo application" : a.cycle}
                              </Badge>
                            </button>
                          ))}
                      </section>
                    ))}
                  </div>
                ) : (
                  <Card className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Startup</th>
                          <th>Stage</th>
                          <th>Status</th>
                          <th>Submitted</th>
                          <th>Review</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((a) => (
                          <tr key={a.id}>
                            <td>
                              <strong>{a.startup_name}</strong>
                              <small>
                                {a.industry}
                                {a.demo ? " · Demo" : ""}
                              </small>
                            </td>
                            <td>{a.stage}</td>
                            <td>
                              <Badge
                                tone={
                                  a.status === "ACCEPTED" ? "green" : "neutral"
                                }
                              >
                                {label(a.status)}
                              </Badge>
                            </td>
                            <td>{date(a.submitted_at)}</td>
                            <td>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelected(a.id)}
                                aria-label={`Review ${a.startup_name}`}
                              >
                                Review <ArrowRight size={14} />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Card>
                )
              ) : (
                <Empty
                  title="No applications here yet"
                  body="New submissions will appear here. Reviewers see only their assigned applications."
                />
              )}
            </>
          )}
          {tab === "People" &&
            (users.isPending ? (
              <Loading />
            ) : users.error ? (
              <ErrorState error={users.error} />
            ) : (
              <Card className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Person</th>
                      <th>Role</th>
                      <th>Account</th>
                      <th>Manage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.data?.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <strong>{u.name}</strong>
                          <small>{u.email}</small>
                        </td>
                        <td>{label(u.role)}</td>
                        <td>
                          <Badge tone={u.suspended ? "amber" : "green"}>
                            {u.suspended ? "Suspended" : "Active"}
                          </Badge>
                        </td>
                        <td>
                          {u.id === user.id ? (
                            <small>Your account</small>
                          ) : (
                            <Modal
                              title={`Manage ${u.name}`}
                              description="Permission changes apply immediately to existing sessions. All changes are audited."
                              trigger={
                                <Button variant="secondary" size="sm">
                                  Manage
                                </Button>
                              }
                            >
                              <form
                                className="stack"
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  const f = new FormData(e.currentTarget);
                                  action(
                                    () =>
                                      send(
                                        `/admin/users/${u.id}`,
                                        {
                                          suspended:
                                            f.get("suspended") === "on",
                                          ...(user.role === "SUPER_ADMIN"
                                            ? { role: f.get("role") }
                                            : {}),
                                        },
                                        "PATCH",
                                      ),
                                    "Account permissions updated.",
                                  );
                                }}
                              >
                                {user.role === "SUPER_ADMIN" && (
                                  <Field label="Role">
                                    <select name="role" defaultValue={u.role}>
                                      {[
                                        "FOUNDER",
                                        "COFOUNDER",
                                        "INVESTOR",
                                        "MENTOR",
                                        "REVIEWER",
                                        "ADMIN",
                                        "SUPER_ADMIN",
                                      ].map((r) => (
                                        <option key={r}>{r}</option>
                                      ))}
                                    </select>
                                  </Field>
                                )}
                                <label className="checkbox-row">
                                  <input
                                    name="suspended"
                                    type="checkbox"
                                    defaultChecked={u.suspended}
                                  />
                                  Suspend account access
                                </label>
                                <Button disabled={busy} type="submit">
                                  Update permissions
                                </Button>
                                {error !== undefined && (
                                  <ErrorState error={error} />
                                )}
                                <div role="status" className="success">
                                  {notice}
                                </div>
                              </form>
                            </Modal>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            ))}
          {tab === "Cohorts" && (
            <div className="grid-2">
              <Card>
                <h3>Create a cohort</h3>
                <form
                  className="stack"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget,
                      f = new FormData(form);
                    action(async () => {
                      await send("/cohorts", {
                        name: f.get("name"),
                        description: f.get("description"),
                      });
                      form.reset();
                    }, "Cohort created.");
                  }}
                >
                  <Field label="Cohort name">
                    <input name="name" required minLength={2} maxLength={100} />
                  </Field>
                  <Field label="Description">
                    <textarea name="description" maxLength={2000} />
                  </Field>
                  <Button disabled={busy} type="submit">
                    Create cohort
                  </Button>
                </form>
              </Card>
              <div className="stack">
                {cohorts.isPending ? (
                  <Loading />
                ) : cohorts.error ? (
                  <ErrorState error={cohorts.error} />
                ) : !cohorts.data?.length ? (
                  <Empty
                    title="A new class of builders"
                    body="Create a cohort, then add accepted startups."
                  />
                ) : (
                  cohorts.data.map((c) => (
                    <Card key={c.id}>
                      <h3>{c.name}</h3>
                      <p>{c.description}</p>
                      <Badge>{c.members.length} startups</Badge>
                      {c.members.map((id) => (
                        <p key={id} style={{ fontSize: 12, marginTop: 10 }}>
                          {applications.data?.find((a) => a.startup_id === id)
                            ?.startup_name || id}
                        </p>
                      ))}
                      <form
                        className="stack"
                        style={{ marginTop: 20 }}
                        onSubmit={(e) => {
                          e.preventDefault();
                          const id = new FormData(e.currentTarget).get(
                            "startup_id",
                          );
                          action(
                            () =>
                              send(`/cohorts/${c.id}/members`, {
                                startup_id: id,
                              }),
                            "Accepted startup added.",
                          );
                        }}
                      >
                        <Field label="Add an accepted startup">
                          <select name="startup_id" required defaultValue="">
                            <option value="" disabled>
                              Select startup
                            </option>
                            {applications.data
                              ?.filter(
                                (a) =>
                                  a.status === "ACCEPTED" &&
                                  !c.members.includes(a.startup_id),
                              )
                              .map((a) => (
                                <option key={a.id} value={a.startup_id}>
                                  {a.startup_name}
                                </option>
                              ))}
                          </select>
                        </Field>
                        <Button
                          variant="secondary"
                          type="submit"
                          disabled={busy}
                        >
                          Add to cohort
                        </Button>
                      </form>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}
          {tab === "Audit logs" &&
            (audits.isPending ? (
              <Loading />
            ) : audits.error ? (
              <ErrorState error={audits.error} />
            ) : (
              <Card className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Resource</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audits.data?.map((e) => (
                      <tr key={e.id}>
                        <td>{e.action}</td>
                        <td style={{ fontFamily: "monospace", fontSize: 10 }}>
                          {e.resource_id || "—"}
                        </td>
                        <td>{date(e.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ fontSize: 11, margin: "20px 0 0" }}>
                  Latest 100 events. Audit records do not contain application
                  text, private notes, passwords, or tokens.
                </p>
              </Card>
            ))}
        </>
      )}
    </>
  );
}
