import * as SecureStore from "expo-secure-store";

// En dev, remplace par l'IP de ta machine (ex: 192.168.1.X:8000)
// En prod, mets l'URL de ton API déployée
export const API_BASE = "http://192.168.1.100:8000/api";

const TOKEN_KEY = "luggo_access";
const REFRESH_KEY = "luggo_refresh";
const ROLE_KEY = "luggo_role";

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function saveTokens(access: string, refresh: string, role: string) {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEY, access),
    SecureStore.setItemAsync(REFRESH_KEY, refresh),
    SecureStore.setItemAsync(ROLE_KEY, role),
  ]);
}

export async function getRole(): Promise<string | null> {
  return SecureStore.getItemAsync(ROLE_KEY);
}

export async function logout() {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
    SecureStore.deleteItemAsync(ROLE_KEY),
  ]);
}

export async function authHeader(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const headers = await authHeader();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...(options.headers as Record<string, string> ?? {}),
    },
  });
  return res;
}

export async function fetchMe() {
  const res = await apiFetch("/me/");
  if (!res.ok) throw new Error("Non authentifié");
  return res.json();
}
