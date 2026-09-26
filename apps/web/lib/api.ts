export type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  verified: boolean;
  demo: boolean;
  profile: Record<string, string | boolean>;
};
export type Startup = {
  id: string;
  name: string;
  industry: string;
  stage: string;
  website: string;
  description: string;
  public: boolean;
  demo: boolean;
  answers: Record<string, string>;
  version: number;
  created_at: string;
};
export type Entry = {
  id: string;
  body: string;
  created_at: string;
  kind?: string;
  from_status?: string;
  to_status?: string;
  scheduled_at?: string;
  location?: string;
};
export type Application = {
  id: string;
  startup_id: string;
  startup_name: string;
  industry: string;
  stage: string;
  status: string;
  cycle: string;
  submitted_at: string | null;
  updated_at: string;
  version: number;
  reviewer_id: string | null;
  demo: boolean;
  missing_fields: string[];
  next_states: string[];
  answers: {
    startup?: Startup;
    founder?: { name: string; data: Record<string, string> };
  };
  history?: Entry[];
  messages?: Entry[];
  notes?: Entry[];
  interviews?: Entry[];
};
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch("/api/v1" + path, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-Nexora-Request": "1",
      ...options.headers,
    },
  });
  const data = await response
    .json()
    .catch(() => ({ detail: "Service unavailable. Please try again." }));
  if (!response.ok) {
    const d = data.detail;
    const message =
      typeof d === "string"
        ? d
        : Array.isArray(d)
          ? d
              .map(
                (x: { loc: string[]; msg: string }) =>
                  `${x.loc.slice(1).join(".")}: ${x.msg}`,
              )
              .join("; ")
          : d?.message || "Unable to complete this request";
    throw new ApiError(response.status, message);
  }
  return data;
}
export const send = <T>(path: string, body: unknown, method = "POST") =>
  api<T>(path, { method, body: JSON.stringify(body) });
export const label = (s: string) =>
  s
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
export const date = (s: string | null | undefined) =>
  s
    ? new Date(
        s.endsWith("Z") || /[+-]\d\d:\d\d$/.test(s) ? s : s + "Z",
      ).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not yet";
export const roleHome = (role: string) =>
  ["ADMIN", "SUPER_ADMIN", "REVIEWER"].includes(role)
    ? "/admin"
    : role === "MENTOR"
      ? "/mentor"
      : role === "INVESTOR"
        ? "/investor"
        : "/dashboard";
