export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export type ApiError = { detail?: string };

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("resume_filter_token");
}

export function setToken(token: string) {
  window.localStorage.setItem("resume_filter_token", token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("resume_filter_token");
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  const next = `${window.location.pathname}${window.location.search}`;
  window.location.href = `/login?next=${encodeURIComponent(next)}`;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch {
    throw new Error(`Backend is not reachable at ${API_BASE}. Please make sure Docker backend is running.`);
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiError;
    if (response.status === 401) {
      clearToken();
      redirectToLogin();
      throw new Error("Please sign in again.");
    }
    throw new Error(body.detail ?? `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function exportUrl(jobId: string, decision?: string) {
  const params = new URLSearchParams({ job_id: jobId });
  if (decision) params.set("decision", decision);
  return `${API_BASE}/exports/csv?${params.toString()}`;
}
