/**
 * API client for FastAPI backend
 */

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function fetchJSON<T>(path: string): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    cache: "no-store", // Always fetch fresh data for Server Components
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `API error: ${res.status} ${res.statusText} - ${text || "No response body"}`
    );
  }

  return res.json();
}
