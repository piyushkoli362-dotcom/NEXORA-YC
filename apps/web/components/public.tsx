"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  Sparkles,
  Layers3,
  Network,
  Rocket,
  Target,
  ShieldCheck,
  Compass,
  Lightbulb,
  Menu,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api, date } from "@/lib/api";
import { Badge, Button, Card, Loading, ErrorState, Empty, Modal } from "./ui";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Nexora home">
      <span className="brand-symbol">N</span>NEXORA
    </Link>
  );
}
export function PublicHeader() {
  return (
    <header className="public-header">
      <Brand />
      <nav className="public-nav" aria-label="Main navigation">
        <Link href="/how-it-works">How it works</Link>
        <Link href="/startups">Ecosystem</Link>
        <Link href="/programs">Programs</Link>
        <Link href="/resources">Resources</Link>
      </nav>
      <div className="nav-actions">
        <Modal
          title="Explore Nexora"
          description="Find your next step in the startup ecosystem."
          trigger={
            <button
              className="icon-button mobile-menu"
              aria-label="Open site menu"
            >
              <Menu size={19} />
            </button>
          }
        >
          <nav aria-label="Mobile site navigation" className="stack">
            {[
              ["/how-it-works", "How it works"],
              ["/startups", "Ecosystem"],
              ["/programs", "Programs"],
              ["/resources", "Resources"],
              ["/about", "About"],
              ["/login", "Log in"],
            ].map(([href, title]) => (
              <Link key={href} href={href} className="side-link">
                {title}
                <ArrowUpRight size={14} />
              </Link>
            ))}
          </nav>
        </Modal>
        <Link href="/login" className="public-login">
          Log in
        </Link>
        <Button asChild>
          <Link href="/apply">
            Apply to Nexora <ArrowUpRight size={15} />
          </Link>
        </Button>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="footer">
      <div>
        <Brand />
        <p style={{ fontSize: 12, margin: "15px 0 0" }}>
          Built for the ones building what’s next.
        </p>
      </div>
      <nav className="footer-links" aria-label="Footer">
        <Link href="/about">About</Link>
        <Link href="/founders">Founders</Link>
        <Link href="/investors">Investors</Link>
        <Link href="/challenges">Challenges</Link>
        <Link href="/pricing">Pricing</Link>
      </nav>
      <small>© {new Date().getFullYear()} Nexora</small>
    </footer>
  );
}
function Orbit() {
  return (
    <div className="hero-art" aria-hidden="true">
      <svg className="orbital" viewBox="0 0 500 440">
        <defs>
          <radialGradient id="glow">
            <stop stopColor="#bded76" stopOpacity=".15" />
            <stop offset="1" stopColor="#bded76" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="250" cy="220" r="205" fill="url(#glow)" />
        {[100, 153, 204].map((r) => (
          <circle
            key={r}
            cx="250"
            cy="220"
            r={r}
            fill="none"
            stroke="#405132"
            strokeWidth=".7"
            strokeDasharray={r === 153 ? "3 7" : undefined}
          />
        ))}
        <ellipse
          cx="250"
          cy="220"
          rx="224"
          ry="90"
          transform="rotate(-35 250 220)"
          fill="none"
          stroke="#789b51"
          strokeWidth=".8"
        />
        <ellipse
          cx="250"
          cy="220"
          rx="224"
          ry="90"
          transform="rotate(35 250 220)"
          fill="none"
          stroke="#35432d"
          strokeWidth=".8"
        />
        {[
          [88, 118],
          [422, 111],
          [401, 351],
          [101, 322],
          [250, 16],
          [250, 424],
        ].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="8" fill="#b9e778" fillOpacity=".07" />
            <circle cx={x} cy={y} r="3" fill="#9ec264" />
          </g>
        ))}
      </svg>
      <div className="orbital-center">N</div>
      <div className="orbit-label one">
        <Lightbulb size={22} />
        <div>
          Your next big idea<small>It all starts with a possibility</small>
        </div>
      </div>
      <div className="orbit-label two">
        <Sparkles size={20} />
        <div>
          Intelligence, on your side<small>Built around your ambition</small>
        </div>
      </div>
      <div className="orbit-label three">
        <Network size={20} />
        <div>
          A connected ecosystem<small>Founders · Mentors · Investors</small>
        </div>
      </div>
    </div>
  );
}
export function Home() {
  return (
    <>
      <PublicHeader />
      <main id="main" className="landing">
        <section className="hero">
          <div className="hero-copy">
            <span className="hero-kicker">
              <span className="live-dot" /> THE NEXT CHAPTER OF STARTUP BUILDING{" "}
              <ArrowUpRight size={12} />
            </span>
            <h1>
              Build the next
              <br />
              great company.
              <br />
              <span>With AI.</span>
            </h1>
            <p>
              Nexora helps founders turn ideas into validated, scalable
              businesses. One connected ecosystem. Every step of the journey.
            </p>
            <div className="hero-actions">
              <Button asChild>
                <Link href="/apply">
                  Apply to Nexora <ArrowUpRight size={16} />
                </Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/startups">
                  Explore ecosystem <ArrowRight size={16} />
                </Link>
              </Button>
            </div>
            <div className="hero-footnote">
              <ShieldCheck size={14} /> Founder-first. Human-led. Built for the
              long term.
            </div>
          </div>
          <Orbit />
        </section>
        <div className="platform-strip">
          <span>
            One ecosystem.
            <br />
            Endless possibility.
          </span>
          <div className="platform-word">
            <Compass size={19} /> Discover
          </div>
          <div className="platform-word">
            <Target size={19} /> Validate
          </div>
          <div className="platform-word">
            <Layers3 size={19} /> Build
          </div>
          <div className="platform-word">
            <Network size={19} /> Connect
          </div>
          <div className="platform-word">
            <Rocket size={19} /> Scale
          </div>
        </div>
        <section className="section">
          <div className="section-top">
            <div>
              <div className="eyebrow">From what if. To what’s next.</div>
              <h2>
                A big vision deserves
                <br />a better starting point.
              </h2>
            </div>
            <p>
              Less guesswork. More momentum.
              <br />A clear path from your first idea to your next milestone.
            </p>
          </div>
          <div className="grid-4">
            {[
              [
                Lightbulb,
                "01",
                "Start with your idea",
                "Put your ambition into words. Build your founder profile and tell us what you want to change.",
              ],
              [
                Target,
                "02",
                "Find your conviction",
                "Structure your problem, market, and assumptions into an application ready for human review.",
              ],
              [
                Layers3,
                "03",
                "Build with direction",
                "A connected workspace for your startup. AI planning and evidence-based guidance arrive in Phase 2.",
              ],
              [
                Network,
                "04",
                "Grow your circle",
                "Co-founder matching, mentor support, and investor discovery are coming in future phases.",
              ],
            ].map(([Icon, n, title, body]) => {
              const I = Icon as typeof Lightbulb;
              return (
                <article className="step-card" key={n as string}>
                  <span className="step-number">{n as string} /</span>
                  <div className="step-icon">
                    <I size={21} />
                  </div>
                  <h3>{title as string}</h3>
                  <p>{body as string}</p>
                </article>
              );
            })}
          </div>
        </section>
        <section className="feature-panel">
          <div>
            <div className="eyebrow">Intelligence meets ambition</div>
            <h2>
              Your vision.
              <br />
              An unfair advantage.
            </h2>
            <p>
              Great companies start with better questions. Nexora is being built
              to bring context, research, and clarity to your most important
              decisions.
            </p>
            <div className="feature-list">
              <div>
                <Check size={16} /> Your startup context, connected
              </div>
              <div>
                <Check size={16} /> Evidence before recommendations
              </div>
              <div>
                <Check size={16} /> Humans at the heart of every decision
              </div>
            </div>
            <Link
              className="accent"
              href="/how-it-works"
              style={{ fontSize: 13 }}
            >
              Meet your future founder OS{" "}
              <ArrowUpRight size={14} style={{ display: "inline" }} />
            </Link>
          </div>
          <div className="insight-preview">
            <div className="row between">
              <div className="row">
                <Sparkles size={17} className="accent" />
                <span style={{ fontSize: 13 }}>Nexora intelligence</span>
              </div>
              <Badge>Phase 2 preview</Badge>
            </div>
            <div className="subtle-rule" />
            <Badge tone="green">EVIDENCE → INSIGHT → ACTION</Badge>
            <h4>Build conviction, not just a pitch.</h4>
            <p>
              Future recommendations will explain what the AI found, why it
              matters, and what to do next.
            </p>
            <div className="mini-bars" aria-hidden="true">
              {[22, 36, 30, 48, 44, 62, 76].map((h, i) => (
                <span key={i} style={{ height: h }} />
              ))}
            </div>
            <small>Illustrative interface · No AI analysis performed</small>
            <div className="subtle-rule" />
            <div className="row">
              <ShieldCheck size={15} className="accent" />
              <small>Your private startup data stays private.</small>
            </div>
          </div>
        </section>
        <section className="section">
          <div className="section-top">
            <div>
              <div className="eyebrow">Different ideas. Shared ambition.</div>
              <h2>
                There’s no one way
                <br />
                to build something great.
              </h2>
            </div>
            <Button variant="secondary" asChild>
              <Link href="/founders">
                Meet the ecosystem <ArrowUpRight size={15} />
              </Link>
            </Button>
          </div>
          <div className="grid-3">
            {[
              [
                "01",
                "The first-time founder",
                "A problem you can’t stop thinking about. A blank page. Start with a clear, structured foundation.",
              ],
              [
                "02",
                "The technical builder",
                "You can build the product. Bring the customer, business model, and market into focus.",
              ],
              [
                "03",
                "The ambitious team",
                "You have early momentum. Make your next chapter more deliberate, together.",
              ],
            ].map(([n, t, d]) => (
              <article className="story" key={n}>
                <small>FOUNDER JOURNEYS / {n}</small>
                <h3>{t}</h3>
                <p style={{ fontSize: 14 }}>{d}</p>
                <Link href="/apply" className="accent" style={{ fontSize: 13 }}>
                  Start your story{" "}
                  <ArrowUpRight size={14} style={{ display: "inline" }} />
                </Link>
              </article>
            ))}
          </div>
        </section>
        <div className="grid-2">
          <Card>
            <div className="eyebrow">Real problems. New possibilities.</div>
            <h3>Challenges worth solving.</h3>
            <p>
              Explore example challenge briefs across climate, health, and
              technology. Submissions open in Phase 3.
            </p>
            <Button variant="secondary" asChild>
              <Link href="/challenges">
                Explore challenges <ArrowUpRight size={15} />
              </Link>
            </Button>
          </Card>
          <Card>
            <div className="eyebrow">Built on meaningful connections</div>
            <h3>The right people. At the right time.</h3>
            <p>
              Our planned investor network will put founder consent first.
              Private information stays in your control.
            </p>
            <Button variant="secondary" asChild>
              <Link href="/investors">
                Our investor approach <ArrowUpRight size={15} />
              </Link>
            </Button>
          </Card>
        </div>
        <section className="cta-panel">
          <div className="eyebrow">Your next chapter starts here</div>
          <h2>The future doesn’t build itself.</h2>
          <p>You bring the ambition. Let’s build what comes next.</p>
          <Button asChild>
            <Link href="/apply">
              Apply to Nexora <ArrowUpRight size={16} />
            </Link>
          </Button>
        </section>
      </main>
      <Footer />
    </>
  );
}

const copy: Record<
  string,
  { tag: string; title: string; intro: string; items: [string, string][] }
> = {
  about: {
    tag: "Our purpose",
    title: "More possibility. Less friction.",
    intro:
      "Nexora is an AI-native startup ecosystem designed to help founders discover, validate, build, fund and scale companies.",
    items: [
      [
        "Founder-first by design",
        "You control your startup profile and what appears publicly. Your private application stays private.",
      ],
      [
        "Intelligence with accountability",
        "AI will support research and preparation. Humans remain responsible for review and acceptance.",
      ],
      [
        "One connected journey",
        "We are building the platform in deliberate phases, starting with a strong application and review foundation.",
      ],
    ],
  },
  "how-it-works": {
    tag: "Your path forward",
    title: "From first idea to a clear next step.",
    intro:
      "Start with your profile. Build a thoughtful application. Follow every step of its review.",
    items: [
      [
        "01 — Introduce yourself",
        "Create an account, verify your email, and tell us about your background and strengths.",
      ],
      [
        "02 — Shape your startup",
        "Work through twelve short sections. Save a draft and return whenever you’re ready.",
      ],
      [
        "03 — Submit with confidence",
        "Review required information and submit a snapshot for the Nexora team.",
      ],
      [
        "04 — Stay in the loop",
        "Track review progress, respond to information requests, and see interview details in your workspace.",
      ],
    ],
  },
  investors: {
    tag: "The investor network · Phase 4",
    title: "Meet ambition with conviction.",
    intro:
      "Investor discovery and private data rooms are planned for Phase 4. Explore opted-in public startup profiles today.",
    items: [
      [
        "Permission before access",
        "Founders will explicitly grant access to sensitive information. Being an investor never grants blanket access.",
      ],
      [
        "Context beyond a pitch",
        "Future opportunities will bring founder-shared traction, business models, and market evidence together.",
      ],
      [
        "Connections, responsibly",
        "Nexora does not process securities transactions. Investment workflows require appropriate legal review before launch.",
      ],
    ],
  },
  programs: {
    tag: "Build with direction",
    title: "A stronger foundation for your startup.",
    intro:
      "Open applications are available now. Cohort invitations follow human review; no acceptance or funding is guaranteed.",
    items: [
      [
        "Open applications",
        "Founders at idea, validation, MVP, early traction, or growth stage can submit a structured startup application.",
      ],
      [
        "Thoughtful review",
        "Your application progresses through screening and human review, with requests for information when needed.",
      ],
      [
        "Cohort support",
        "Accepted startups can be assigned to cohorts by the Nexora team. Mentor and milestone tools arrive in Phase 3.",
      ],
    ],
  },
  resources: {
    tag: "The founder field guide",
    title: "Better questions. Stronger foundations.",
    intro: "Practical prompts to help you prepare a clear startup application.",
    items: [
      [
        "Define the problem",
        "Who faces the problem? How often does it happen? What do people use today, and what does that cost them?",
      ],
      [
        "Understand the market",
        "Name a specific customer segment. Separate bottom-up market assumptions from verified customer evidence.",
      ],
      [
        "Make traction meaningful",
        "State the period, source, and definition for each metric. Zero revenue or pre-launch is a valid starting point.",
      ],
      [
        "Tell an honest team story",
        "Describe who owns product, sales, and operations. Be clear about the gaps you still need to fill.",
      ],
      [
        "Prepare for review",
        "Explain pricing, competitors, differentiation, funding needs, and how you would use the funds.",
      ],
    ],
  },
  pricing: {
    tag: "Clear expectations",
    title: "Start with your ambition.",
    intro:
      "Account creation and the Phase 1 application workspace are available without a payment flow. Future paid plans have not been announced.",
    items: [
      [
        "Available today",
        "Founder profile, draft onboarding, startup application, review timeline, and founder-visible messages.",
      ],
      [
        "Coming in later phases",
        "AI research, copilot, co-founder matching, mentoring, investor workflows, and MVP planning.",
      ],
      [
        "No hidden commitment",
        "Submitting an application does not constitute an investment offer or guarantee admission or funding.",
      ],
    ],
  },
};
export function PublicPage({ slug }: { slug: string }) {
  const [q, setQ] = useState("");
  const isDirectory = ["startups", "founders", "challenges"].includes(slug);
  const query = useQuery({
    queryKey: ["public", slug, q],
    queryFn: () =>
      api<Record<string, unknown>[]>(
        slug === "startups"
          ? `/startups/public?q=${encodeURIComponent(q)}`
          : slug === "founders"
            ? "/founders/public"
            : "/challenges",
      ),
    enabled: isDirectory,
  });
  const c = copy[slug];
  return (
    <>
      <PublicHeader />
      <main id="main" className="public-page">
        {c ? (
          <>
            <header>
              <div className="eyebrow">{c.tag}</div>
              <h1>{c.title}</h1>
              <p>{c.intro}</p>
            </header>
            <div className="grid-2">
              {c.items.map(([t, d]) => (
                <Card key={t}>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </Card>
              ))}
            </div>
            <div style={{ marginTop: 35 }}>
              <Button asChild>
                <Link href={slug === "investors" ? "/startups" : "/apply"}>
                  {slug === "investors"
                    ? "Explore public startups"
                    : "Start your application"}{" "}
                  <ArrowRight size={16} />
                </Link>
              </Button>
            </div>
          </>
        ) : (
          <>
            <header>
              <div className="eyebrow">The Nexora ecosystem</div>
              <h1>
                {slug === "startups"
                  ? "Ideas with somewhere to go."
                  : slug === "founders"
                    ? "Meet the people building next."
                    : "Big problems need bold thinkers."}
              </h1>
              <p>
                {slug === "challenges"
                  ? "Explore challenge briefs. Demonstration challenges are labeled; submission workflows launch in Phase 3."
                  : "Discover profiles that founders have chosen to share. Demo profiles are clearly marked."}
              </p>
            </header>
            {slug === "startups" && (
              <div className="search-input">
                <input
                  aria-label="Search startups"
                  placeholder="Search startups, industries, or ideas…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            )}
            {query.isPending ? (
              <Loading />
            ) : query.error ? (
              <ErrorState error={query.error} retry={() => query.refetch()} />
            ) : query.data?.length ? (
              <div className="grid-3">
                {query.data.map((item) => (
                  <Card key={String(item.id)} className="directory-card">
                    <div className="row between">
                      <div className="startup-icon">
                        {String(item.name || item.title).charAt(0)}
                      </div>
                      {Boolean(item.demo) && (
                        <Badge tone="amber">Demo profile</Badge>
                      )}
                    </div>
                    <h3>{String(item.name || item.title)}</h3>
                    <p>{String(item.description || item.bio || "")}</p>
                    <div className="row">
                      <Badge>
                        {String(item.industry || item.location || "Founder")}
                      </Badge>
                      {Boolean(item.stage) && (
                        <Badge tone="green">{String(item.stage)}</Badge>
                      )}
                    </div>
                    {Boolean(item.deadline) && (
                      <small>
                        Example deadline · {date(String(item.deadline))}
                        <br />
                        Submissions are a Phase 3 feature.
                      </small>
                    )}
                    {Boolean(item.website) && (
                      <a
                        href={String(item.website)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="accent"
                        style={{ fontSize: 12 }}
                      >
                        Visit website ↗
                      </a>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <Empty
                title="The next chapter is yours"
                body="No public profiles match yet. Private founder information is never shown here."
              >
                <Button asChild>
                  <Link href="/apply">Start your profile</Link>
                </Button>
              </Empty>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
