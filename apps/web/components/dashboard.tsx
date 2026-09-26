"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  FileText,
  Target,
  Sparkles,
  Users,
  Rocket,
  ShieldCheck,
  CircleDashed,
  Building2,
} from "lucide-react";
import { api, Application, Startup, label, date } from "@/lib/api";
import { Badge, Button, Card, ErrorState, Loading } from "./ui";
import { useUser } from "./workspace";
import { steps } from "@/lib/onboarding";
export function Dashboard() {
  const user = useUser();
  const startups = useQuery({
    queryKey: ["startups"],
    queryFn: () => api<Startup[]>("/startups"),
  });
  const apps = useQuery({
    queryKey: ["applications"],
    queryFn: () => api<Application[]>("/applications"),
  });
  if (startups.isPending || apps.isPending) return <Loading />;
  if (startups.error || apps.error)
    return (
      <ErrorState
        error={startups.error || apps.error}
        retry={() => {
          startups.refetch();
          apps.refetch();
        }}
      />
    );
  const startup = startups.data?.[0],
    application = apps.data?.find((a) => a.startup_id === startup?.id);
  const submitted = !!application && application.status !== "DRAFT";
  const requiredQuestions = steps
    .slice(2, 10)
    .flatMap((step) => step.fields)
    .filter((field) => !field.optional);
  const completed = requiredQuestions.filter((field) =>
    startup?.answers[field.key]?.trim(),
  ).length;
  const progress = Math.round((completed / requiredQuestions.length) * 100);
  const tasks = [
    {
      title: "Verify your email",
      desc: "Secure your account before submitting.",
      done: user.verified,
      href: "/settings",
    },
    {
      title: "Complete your founder profile",
      desc: "Help us understand your experience and strengths.",
      done: ["bio", "location", "skills", "experience"].every((key) =>
        Boolean(user.profile?.[key]),
      ),
      href: "/onboarding",
    },
    {
      title: "Shape your startup application",
      desc: "Tell the story behind your next big idea.",
      done:
        submitted || (!!application && application.missing_fields.length === 0),
      href: "/onboarding",
    },
    {
      title: "Submit for human review",
      desc: "Take the next step in your startup journey.",
      done: submitted,
      href: "/application",
    },
  ];
  return (
    <>
      <div className="welcome-date">
        {new Date().toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </div>
      <div className="page-heading">
        <div>
          <h1>
            Let’s build what’s next, {user.name.split(" ")[0]}
            <span className="accent">.</span>
          </h1>
          <p>
            Your ambition, with a little more direction. Here’s where things
            stand.
          </p>
        </div>
        <Button asChild>
          <Link href="/onboarding">
            {startup ? "Continue building" : "Start your profile"}{" "}
            <ArrowUpRight size={15} />
          </Link>
        </Button>
      </div>
      <div className="grid-4">
        <Card className="stat">
          <div className="stat-label">
            Startup stage <Building2 size={16} />
          </div>
          <div className="stat-value">{startup?.stage || "Your next idea"}</div>
          <div className="stat-foot">
            {startup?.name || "Every great company starts somewhere"}
          </div>
        </Card>
        <Card className="stat">
          <div className="stat-label">
            Application status <FileText size={16} />
          </div>
          <div className="stat-value" style={{ fontSize: 23 }}>
            {application ? label(application.status) : "Not started"}
          </div>
          <div className="stat-foot">
            {submitted
              ? "Submitted " + date(application.submitted_at)
              : "Build at your own pace"}
          </div>
        </Card>
        <Card className="stat">
          <div className="stat-label">
            Application progress <Target size={16} />
          </div>
          <div className="stat-value">
            {submitted ? 100 : progress}
            <span className="muted" style={{ fontSize: 17 }}>
              {" "}
              %
            </span>
          </div>
          <div className="stat-foot">
            {submitted
              ? "Your application is with the team"
              : `${completed} startup answers saved`}
          </div>
        </Card>
        <Card className="stat">
          <div className="stat-label">
            Next milestone <CircleDashed size={16} />
          </div>
          <div className="stat-value" style={{ fontSize: 23 }}>
            {submitted ? "Human review" : "Submit application"}
          </div>
          <div className="stat-foot">
            {submitted
              ? "We’ll keep you in the loop"
              : "A stronger foundation starts here"}
          </div>
        </Card>
      </div>
      <div className="dashboard-grid">
        <div className="stack">
          <Card className="journey-card">
            <div className="card-heading">
              <h3>Your startup journey</h3>
              <Badge tone="green">{startup?.name || "The beginning"}</Badge>
            </div>
            <p style={{ fontSize: 12 }}>
              One step at a time. Every step moves you forward.
            </p>
            <div className="journey">
              {[
                ["Profile", !!startup],
                ["Application", submitted],
                [
                  "Review",
                  !!application &&
                    [
                      "HUMAN_REVIEW",
                      "INTERVIEW",
                      "SHORTLISTED",
                      "ACCEPTED",
                    ].includes(application.status),
                ],
                ["Next chapter", application?.status === "ACCEPTED"],
              ].map(([t, done], i) => (
                <div
                  key={String(t)}
                  className={`journey-step ${done ? "complete" : ""}`}
                >
                  <div className="node">
                    {done ? <Check size={13} /> : i + 1}
                  </div>
                  <strong>{t as string}</strong>
                  <small>
                    {done
                      ? "Completed"
                      : i === 0
                        ? "Start here"
                        : i === 1
                          ? "Your next step"
                          : "Ahead of you"}
                  </small>
                </div>
              ))}
            </div>
            <div className="subtle-rule" />
            <div className="row between">
              <div style={{ fontSize: 12 }}>
                <span className="accent">
                  {submitted
                    ? "Your application is on its way."
                    : "Make your idea impossible to ignore."}
                </span>
                <p style={{ fontSize: 11, margin: "4px 0 0" }}>
                  A thoughtful application is your first building block.
                </p>
              </div>
              <Link
                href="/application"
                aria-label="Open application"
                className="icon-button"
              >
                <ArrowRight size={19} />
              </Link>
            </div>
          </Card>
          <Card>
            <div className="card-heading">
              <h3>Your next moves</h3>
              <small>
                {tasks.filter((t) => t.done).length} of {tasks.length} complete
              </small>
            </div>
            {tasks.map((task) => (
              <Link href={task.href} className="task-row" key={task.title}>
                <div className="row">
                  <span className={`task-circle ${task.done ? "done" : ""}`}>
                    {task.done && <Check size={12} />}
                  </span>
                  <div>
                    {task.title}
                    <p>{task.desc}</p>
                  </div>
                </div>
                <ArrowUpRight size={14} className="muted" />
              </Link>
            ))}
          </Card>
        </div>
        <div className="stack">
          <Card>
            <div className="card-heading">
              <div className="row">
                <Sparkles size={18} className="accent" />
                <h3>Your AI advantage</h3>
              </div>
              <Badge>Phase 2</Badge>
            </div>
            <div className="insight-empty">
              <Badge tone="green">INTELLIGENCE, WITH CONTEXT</Badge>
              <h3 style={{ fontSize: 19, margin: "18px 0 9px" }}>
                Better questions.
                <br />
                More confident next steps.
              </h3>
              <p>
                AI recommendations will use your authorized startup context and
                show the evidence behind each suggestion.
              </p>
            </div>
            <div className="row">
              <ShieldCheck size={15} className="muted" />
              <small>No AI analysis has been performed.</small>
            </div>
          </Card>
          <Card>
            <div className="card-heading">
              <h3>Startup health</h3>
              <Badge>Not assessed</Badge>
            </div>
            <p style={{ fontSize: 12 }}>
              Future AI-generated indicators, supported by evidence. Never an
              absolute score of your potential.
            </p>
            <div className="health-grid">
              {[
                "Product",
                "Traction",
                "Revenue",
                "Growth",
                "Team",
                "Market",
                "Fundraising",
              ].map((t) => (
                <div className="health-item" key={t}>
                  <div className="row between">
                    <span>{t}</span>
                    <span>—</span>
                  </div>
                  <div className="health-track" />
                </div>
              ))}
            </div>
            <small>Available with the Phase 2 evaluation engine.</small>
          </Card>
        </div>
      </div>
      <div
        className="section-top"
        style={{ margin: "32px 0 18px", alignItems: "center" }}
      >
        <h3 style={{ fontSize: 18, margin: 0 }}>Your ecosystem is growing</h3>
        <Link href="/how-it-works" className="accent" style={{ fontSize: 11 }}>
          See the journey ↗
        </Link>
      </div>
      <div className="feature-roadmap">
        {[
          [
            Users,
            "Find your other half",
            "Co-founder matching based on complementary strengths.",
            "Phase 3",
          ],
          [
            ShieldCheck,
            "Learn from experience",
            "Mentor guidance, connected to your startup journey.",
            "Phase 3",
          ],
          [
            Rocket,
            "Prepare for your next round",
            "A thoughtful workspace for fundraising readiness.",
            "Phase 4",
          ],
        ].map(([Icon, t, d, p]) => {
          const I = Icon as typeof Users;
          return (
            <Card key={t as string}>
              <div className="row between">
                <I size={20} className="muted" />
                <Badge>{p as string}</Badge>
              </div>
              <h3>{t as string}</h3>
              <p>{d as string}</p>
            </Card>
          );
        })}
      </div>
    </>
  );
}
