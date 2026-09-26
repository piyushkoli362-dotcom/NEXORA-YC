"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Check, Save } from "lucide-react";
import { api, send, User, Startup, Application } from "@/lib/api";
import { steps } from "@/lib/onboarding";
import { useUser } from "./workspace";
import { Button, Card, Field, ErrorState, Loading, Badge } from "./ui";
const blank = {
  name: "",
  industry: "",
  stage: "Idea",
  website: "",
  description: "",
  public: false,
  answers: {} as Record<string, string>,
};
export function Onboarding() {
  const user = useUser(),
    cache = useQueryClient(),
    router = useRouter();
  const query = useQuery({
    queryKey: ["startups"],
    queryFn: () => api<Startup[]>("/startups"),
  });
  const [step, setStep] = useState(0),
    [profile, setProfile] = useState<Record<string, string | boolean>>({
      name: user.name,
      ...user.profile,
    }),
    [startup, setStartup] = useState<Partial<Startup> & typeof blank>(blank),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [saved, setSaved] = useState(""),
    [dirty, setDirty] = useState(false);
  const initialized = useRef(false);
  useEffect(() => {
    if (query.data && !initialized.current) {
      if (query.data[0]) setStartup(query.data[0]);
      initialized.current = true;
    }
  }, [query.data]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const current = steps[step];
  function change(key: string, value: string | boolean) {
    setDirty(true);
    setSaved("");
    if (step === 0) setProfile((p) => ({ ...p, [key]: value }));
    else if (step === 1) setStartup((s) => ({ ...s, [key]: value }));
    else
      setStartup((s) => ({
        ...s,
        answers: { ...s.answers, [key]: String(value) },
      }));
  }
  async function save(next = false) {
    setBusy(true);
    setError(undefined);
    try {
      const { name, ...data } = profile;
      await send<User>("/users/me", { name, data }, "PATCH");
      let existing = startup;
      if (startup.name.trim().length >= 2) {
        const {
          name,
          industry,
          stage,
          website,
          description,
          public: isPublic,
          answers,
        } = startup;
        const payload = {
          name,
          industry,
          stage,
          website,
          description,
          public: isPublic,
          answers,
        };
        existing = await send<Startup>(
          startup.id ? `/startups/${startup.id}` : "/startups",
          startup.id ? { ...payload, version: startup.version } : payload,
          startup.id ? "PATCH" : "POST",
        );
        setStartup(existing);
        await send<Application>("/applications", { startup_id: existing.id });
      } else if (step > 0) {
        throw new Error(
          "Add a startup name in step 2 before saving startup details.",
        );
      }
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["me"] }),
        cache.invalidateQueries({ queryKey: ["startups"] }),
        cache.invalidateQueries({ queryKey: ["applications"] }),
      ]);
      setDirty(false);
      setSaved("Draft saved to your account.");
      if (next) {
        if (step < 11) setStep(step + 1);
        else router.push("/application");
      }
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  if (query.isPending) return <Loading />;
  if (query.error)
    return <ErrorState error={query.error} retry={() => query.refetch()} />;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            Every great company starts here<span className="accent">.</span>
          </h1>
          <p>
            A clear story. A strong foundation. Build yours, at your own pace.
          </p>
        </div>
        <Badge tone="green">Step {step + 1} of 12</Badge>
      </div>
      <div className="onboard-grid">
        <nav className="onboard-steps" aria-label="Onboarding steps">
          {steps.map((s, i) => (
            <button
              key={s.title}
              className={`step-button ${i === step ? "active" : ""}`}
              onClick={() => {
                setStep(i);
                setError(undefined);
              }}
              aria-current={i === step ? "step" : undefined}
            >
              <span>
                {i < step ? (
                  <Check size={12} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              {s.title}
            </button>
          ))}
        </nav>
        <Card className="onboard-body">
          <div className="eyebrow">
            Your application / {String(step + 1).padStart(2, "0")}
          </div>
          <h2>
            {current.title === "Founder"
              ? "Let’s start with you."
              : current.title === "Review"
                ? "Your story, all together."
                : current.title}
          </h2>
          <p style={{ fontSize: 13, marginBottom: 30 }}>
            {current.description}
          </p>
          {step === 10 && (
            <div className="notice" style={{ marginBottom: 24 }}>
              Links are kept in your private application and are not fetched by
              Nexora. Share only references you intend reviewers to access.
            </div>
          )}
          {step < 11 ? (
            <div className="field-grid">
              {current.fields.map((f) => {
                const value =
                  step === 0
                    ? profile[f.key]
                    : step === 1
                      ? startup[f.key as keyof typeof startup]
                      : startup.answers[f.key];
                return (
                  <div key={f.key} className={f.long ? "wide" : ""}>
                    <Field
                      label={f.label + (f.optional ? " (optional)" : " *")}
                      hint={f.hint}
                    >
                      {f.key === "stage" ? (
                        <select
                          value={String(value || "Idea")}
                          onChange={(e) => change(f.key, e.target.value)}
                        >
                          {[
                            "Idea",
                            "Validation",
                            "MVP",
                            "Early traction",
                            "Growth",
                          ].map((x) => (
                            <option key={x}>{x}</option>
                          ))}
                        </select>
                      ) : f.long ? (
                        <textarea
                          value={String(value || "")}
                          onChange={(e) => change(f.key, e.target.value)}
                          maxLength={
                            f.key === "bio" || f.key === "experience"
                              ? 2000
                              : f.key === "description"
                                ? 3000
                                : 5000
                          }
                        />
                      ) : (
                        <input
                          value={String(value || "")}
                          onChange={(e) => change(f.key, e.target.value)}
                          maxLength={
                            step === 0
                              ? f.key === "name"
                                ? 100
                                : f.key === "location"
                                  ? 120
                                  : f.key === "skills"
                                    ? 500
                                    : 1000
                              : step === 1
                                ? f.key === "name"
                                  ? 120
                                  : f.key === "industry"
                                    ? 80
                                    : 500
                                : 5000
                          }
                          type={
                            [
                              "linkedin",
                              "portfolio",
                              "photo_url",
                              "website",
                              "pitch_deck",
                              "business_plan",
                              "demo",
                              "other_documents",
                            ].includes(f.key)
                              ? "url"
                              : "text"
                          }
                          placeholder={
                            [
                              "linkedin",
                              "portfolio",
                              "photo_url",
                              "website",
                              "pitch_deck",
                              "business_plan",
                              "demo",
                              "other_documents",
                            ].includes(f.key)
                              ? "https://…"
                              : undefined
                          }
                        />
                      )}
                    </Field>
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              {steps.slice(0, 11).map((s, i) => (
                <section className="review-section" key={s.title}>
                  <div className="row between">
                    <h3>{s.title}</h3>
                    <button className="text-link" onClick={() => setStep(i)}>
                      Edit
                    </button>
                  </div>
                  {s.fields.map((f) => (
                    <div className="review-pair" key={f.key}>
                      <span>{f.label}</span>
                      <span>
                        {String(
                          (i === 0
                            ? profile[f.key]
                            : i === 1
                              ? startup[f.key as keyof typeof startup]
                              : startup.answers[f.key]) || "Not provided",
                        )}
                      </span>
                    </div>
                  ))}
                </section>
              ))}
              <div className="notice" style={{ marginTop: 20 }}>
                Your draft remains editable. Continue to the application page to
                check completeness and submit for human review.
              </div>
            </>
          )}
          {step === 0 && (
            <label className="checkbox-row" style={{ marginTop: 24 }}>
              <input
                type="checkbox"
                checked={Boolean(profile.public)}
                onChange={(e) => change("public", e.target.checked)}
              />
              Show my name, bio, skills, and location in the public founder
              directory.
            </label>
          )}
          {step === 1 && (
            <label className="checkbox-row" style={{ marginTop: 24 }}>
              <input
                type="checkbox"
                checked={startup.public}
                onChange={(e) => change("public", e.target.checked)}
              />
              Publish my startup summary. Application answers remain private.
            </label>
          )}
          {error !== undefined && <ErrorState error={error} />}
          <div aria-live="polite" className="success">
            {saved}
            {dirty && !saved && (
              <span className="muted">You have unsaved changes.</span>
            )}
          </div>
          <div className="form-actions">
            <Button
              variant="ghost"
              disabled={step === 0 || busy}
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft size={15} />
              Back
            </Button>
            <div className="row">
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => save()}
              >
                <Save size={15} />
                {busy ? "Saving…" : "Save draft"}
              </Button>
              <Button disabled={busy} onClick={() => save(true)}>
                {step === 11 ? "Review application" : "Save & continue"}{" "}
                <ArrowRight size={15} />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
