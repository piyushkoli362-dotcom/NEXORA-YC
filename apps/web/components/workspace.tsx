"use client";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState } from "react";
import {
  LayoutDashboard,
  Building2,
  FileText,
  Settings,
  LogOut,
  ArrowUpRight,
  Search,
  Bell,
  Menu,
  X,
  Sparkles,
  Users,
  Compass,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { Brand } from "./public";
import { api, User, Startup, roleHome, date } from "@/lib/api";
import { Badge, Button, ErrorState, Loading, Modal } from "./ui";
const UserContext = createContext<User | null>(null);
export const useUser = () => useContext(UserContext)!;
export function Workspace({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: string[];
}) {
  const router = useRouter(),
    path = usePathname(),
    cache = useQueryClient();
  const [mobile, setMobile] = useState(false);
  const [actionError, setActionError] = useState<unknown>();
  useEffect(() => {
    const media = window.matchMedia("(max-width: 640px)");
    const update = () => {
      setMobile(media.matches);
      setOpen(false);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const [open, setOpen] = useState(false),
    [q, setQ] = useState("");
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<User>("/auth/me"),
    retry: false,
  });
  const startups = useQuery({
    queryKey: ["startups"],
    queryFn: () => api<Startup[]>("/startups"),
    enabled: !!me.data,
  });
  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: () =>
      api<
        {
          id: string;
          title: string;
          body: string;
          read_at: string | null;
          created_at: string;
        }[]
      >("/notifications"),
    enabled: !!me.data,
  });
  const search = useQuery({
    queryKey: ["directory-search", q],
    queryFn: () =>
      api<Startup[]>(`/startups/public?q=${encodeURIComponent(q)}`),
    enabled: q.length > 1,
  });
  useEffect(() => {
    if (me.error && "status" in me.error && me.error.status === 401)
      router.replace("/login");
  }, [me.error, router]);
  useEffect(() => {
    setOpen(false);
  }, [path]);
  if (me.isPending) return <Loading />;
  if (me.error)
    return (
      <main id="main">
        <ErrorState error={me.error} retry={() => me.refetch()} />
        <Link href="/login">Sign in</Link>
      </main>
    );
  if (!me.data) return null;
  const user = me.data;
  const reviewer = ["ADMIN", "SUPER_ADMIN", "REVIEWER"].includes(user.role),
    founder = ["FOUNDER", "COFOUNDER"].includes(user.role);
  if (roles && !roles.includes(user.role))
    return (
      <main id="main" className="public-page">
        <ErrorState
          error={
            new Error("Your account does not have access to this workspace.")
          }
        />
        <Button asChild>
          <Link href={roleHome(user.role)}>Open your workspace</Link>
        </Button>
      </main>
    );
  const startup = startups.data?.[0];
  const nav = reviewer
    ? [
        ["/admin", "Review workspace", ShieldCheck],
        ["/settings", "Account settings", Settings],
      ]
    : founder
      ? [
          ["/dashboard", "Overview", LayoutDashboard],
          ["/startup", "Startup profile", Building2],
          ["/application", "My application", FileText],
          ["/onboarding", "Build your profile", Compass],
          ["/settings", "Account settings", Settings],
        ]
      : [
          [roleHome(user.role), "Overview", LayoutDashboard],
          ["/settings", "Account settings", Settings],
        ];
  async function logout() {
    await api("/auth/logout", { method: "POST" });
    cache.clear();
    router.replace("/login");
  }
  const sidebar = (
    <aside
      className={`sidebar ${mobile ? "mobile" : ""}`}
      aria-label="Workspace navigation"
    >
      {mobile && (
        <>
          <Dialog.Title className="sr-only">Workspace navigation</Dialog.Title>
          <Dialog.Description className="sr-only">
            Choose a page in your Nexora workspace.
          </Dialog.Description>
        </>
      )}
      <Brand />
      <button
        className="close-sidebar"
        aria-label="Close menu"
        onClick={() => setOpen(false)}
      >
        <X size={18} />
      </button>
      <div className="workspace-switch">
        <div
          className="startup-icon"
          style={{ width: 31, height: 31, fontSize: 15, borderRadius: 7 }}
        >
          {startup?.name.charAt(0) || "N"}
        </div>
        <div>
          {reviewer ? "Nexora team" : startup?.name || "Your workspace"}
          <small>
            {reviewer ? "Review & operations" : "Founder workspace"}
          </small>
        </div>
      </div>
      <div className="nav-label">WORKSPACE</div>
      <nav>
        {nav.map(([href, title, Icon]) => {
          const I = Icon as typeof Settings;
          return (
            <Link
              className={`side-link ${path === href ? "active" : ""}`}
              href={href as string}
              key={href as string}
            >
              <I size={17} />
              {title as string}
            </Link>
          );
        })}
      </nav>
      <div className="nav-label" style={{ marginTop: 25 }}>
        ECOSYSTEM
      </div>
      <Link className="side-link" href="/startups">
        <Compass size={17} />
        Explore startups <ArrowUpRight size={12} />
      </Link>
      <Link className="side-link" href="/founders">
        <Users size={17} />
        Founder directory <ArrowUpRight size={12} />
      </Link>
      <div className="sidebar-bottom">
        <div className="sidebar-note">
          <div className="row">
            <Sparkles size={15} className="accent" />
            <strong>Built for what’s next.</strong>
          </div>
          <p>
            AI Copilot, mentors, and more.
            <br />
            Your ecosystem is growing.
          </p>
          <Badge tone="green">Next up: Phase 2</Badge>
        </div>
        <div className="user-row">
          <div className="avatar">
            {user.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div>
            {user.name}
            <small>{user.role.replaceAll("_", " ").toLowerCase()}</small>
          </div>
          <button
            aria-label="Sign out"
            onClick={() => logout().catch(setActionError)}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
  return (
    <UserContext.Provider value={user}>
      <div className="workspace">
        {mobile ? (
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="drawer-overlay" />
              <Dialog.Content
                asChild
                onCloseAutoFocus={(event) => {
                  event.preventDefault();
                  document.getElementById("workspace-menu")?.focus();
                }}
              >
                {sidebar}
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        ) : (
          sidebar
        )}
        <header className="topbar">
          <div className="row">
            <button
              id="workspace-menu"
              aria-expanded={open}
              className="icon-button workspace-mobile-toggle"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              <Menu size={19} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={12} />
            <span style={{ color: "#d4ded7" }}>
              {path.slice(1).replaceAll("-", " ")}
            </span>
          </div>
          <div className="topbar-actions">
            <Modal
              title="Explore the ecosystem"
              description="Search opted-in public startup profiles. Private documents and investor data are not included."
              trigger={
                <button className="icon-button" aria-label="Search ecosystem">
                  <Search size={17} />
                  <span
                    className="topbar-search-label"
                    style={{ marginLeft: 8, fontSize: 11 }}
                  >
                    Search ecosystem
                  </span>
                </button>
              }
            >
              <input
                autoFocus
                aria-label="Search public startups"
                placeholder="Startup name or industry…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              {search.isFetching && <Loading />}
              {search.error && <ErrorState error={search.error} />}
              <div className="stack" style={{ marginTop: 20 }}>
                {search.data?.map((s) => (
                  <div key={s.id}>
                    <strong>{s.name}</strong>
                    <p style={{ fontSize: 12 }}>{s.description}</p>
                  </div>
                ))}
                {q.length > 1 && search.data?.length === 0 && (
                  <p>No public startups found.</p>
                )}
              </div>
            </Modal>
            <Modal
              title="Your notifications"
              description="Application updates and messages from the Nexora team."
              trigger={
                <button className="icon-button" aria-label="Open notifications">
                  <Bell size={18} />
                  {notifications.data?.some((n) => !n.read_at) && (
                    <span className="notification-dot" />
                  )}
                </button>
              }
            >
              {notifications.isPending ? (
                <Loading />
              ) : notifications.error ? (
                <ErrorState error={notifications.error} />
              ) : notifications.data?.length ? (
                notifications.data.map((n) => (
                  <div className="notification-item" key={n.id}>
                    <h3>{n.title}</h3>
                    <p>{n.body}</p>
                    <small>{date(n.created_at)}</small>
                    {!n.read_at && (
                      <button
                        className="text-link"
                        onClick={() =>
                          api(`/notifications/${n.id}/read`, {
                            method: "POST",
                          })
                            .then(() =>
                              cache.invalidateQueries({
                                queryKey: ["notifications"],
                              }),
                            )
                            .catch(setActionError)
                        }
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p>You’re all caught up.</p>
              )}
            </Modal>
            <div
              className="avatar"
              style={{ width: 29, height: 29, fontSize: 10 }}
            >
              {user.name[0]}
            </div>
          </div>
        </header>
        <main id="main" className="workspace-main">
          {actionError !== undefined && <ErrorState error={actionError} />}
          {user.demo && (
            <div className="notice" style={{ marginBottom: 20 }}>
              Development demo account · Seed data is illustrative.
            </div>
          )}
          {children}
        </main>
      </div>
    </UserContext.Provider>
  );
}
