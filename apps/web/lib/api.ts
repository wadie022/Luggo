// apps/web/lib/api.ts
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export type Role = "CLIENT" | "AGENCY" | "ADMIN";

export function saveTokens(access: string, refresh?: string) {
  localStorage.setItem("access", access);
  if (refresh) localStorage.setItem("refresh", refresh);
}

export function getAccessToken() {
  return typeof window === "undefined" ? null : localStorage.getItem("access");
}

export function getRefreshToken() {
  return typeof window === "undefined" ? null : localStorage.getItem("refresh");
}

export function saveRole(role: Role) {
  localStorage.setItem("role", role);
}

export function getRole(): Role | null {
  return typeof window === "undefined"
    ? null
    : (localStorage.getItem("role") as Role | null);
}

export function logout() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("role");
}

/** Retourne Authorization header avec access token */
export function authHeader(): Record<string, string> {
  const t = getAccessToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/** Refresh access token si expiré */
export async function refreshAccessToken(): Promise<string> {
  const refresh = getRefreshToken();
  if (!refresh) throw new Error("No refresh token");

  const res = await fetch(`${API_BASE}/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.access) {
    throw new Error(data?.detail || "Refresh failed");
  }

  localStorage.setItem("access", data.access);
  return data.access;
}

/** Fetch helper qui retry 1 fois après refresh si 401 */
export async function apiFetch(input: string, init?: RequestInit) {
  const doFetch = async () => {
    const headers = {
      ...(init?.headers || {}),
      ...authHeader(),
    };
    return fetch(input, { ...init, headers });
  };

  let res = await doFetch();

  // si access expiré → tente refresh → retry
  if (res.status === 401) {
    try {
      await refreshAccessToken();
      res = await doFetch();
    } catch {
      logout();
      throw new Error("Session expirée, reconnecte-toi.");
    }
  }

  return res;
}

export async function login(username: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || "Login invalide");

  // ✅ important : access + refresh
  saveTokens(data.access, data.refresh);
  return data;
}

export async function register(username: string, email: string, password: string, role: Role) {
  const res = await fetch(`${API_BASE}/auth/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password, role }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || "Inscription invalide");
  return data;
}

export async function fetchMe() {
  const res = await apiFetch(`${API_BASE}/me/`);

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // si jamais
    logout();
    throw new Error(data?.detail || "Impossible de récupérer /me");
  }
  return data;
}
