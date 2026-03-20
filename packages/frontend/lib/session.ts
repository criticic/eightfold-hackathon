export type SessionUser = {
  id: number;
  username: string;
  role: "candidate" | "recruiter";
  created_at: number;
};

const KEY = "truthtalent_user";

export function getSessionUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function setSessionUser(user: SessionUser): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(user));
}

export function clearSessionUser(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
