import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export const API_BASE = Platform.OS === "web"
  ? "https://luggo-production.up.railway.app/api"
  : "https://luggo-production.up.railway.app/api";

export const WEB_BASE = "http://localhost:3000";

const TOKEN_KEY = "luggo_access";
const REFRESH_KEY = "luggo_refresh";
const ROLE_KEY = "luggo_role";

// Stockage compatible web + native
async function setItem(key: string, value: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function removeItem(key: string) {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

export async function getAccessToken(): Promise<string | null> {
  return getItem(TOKEN_KEY);
}

export async function saveTokens(access: string, refresh: string, role: string) {
  await Promise.all([
    setItem(TOKEN_KEY, access),
    setItem(REFRESH_KEY, refresh),
    setItem(ROLE_KEY, role),
  ]);
}

export async function getRole(): Promise<string | null> {
  return getItem(ROLE_KEY);
}

export async function logout() {
  await Promise.all([
    removeItem(TOKEN_KEY),
    removeItem(REFRESH_KEY),
    removeItem(ROLE_KEY),
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

export async function apiUpload(path: string, formData: FormData, method = "POST") {
  const headers = await authHeader();
  return fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: formData,
  });
}

export async function fetchMe() {
  const res = await apiFetch("/me/");
  if (!res.ok) throw new Error("Non authentifié");
  return res.json();
}
