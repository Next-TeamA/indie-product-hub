import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * 인증된 API 요청을 보내는 헬퍼.
 * Supabase 세션에서 access_token을 꺼내 Authorization 헤더에 넣습니다.
 *
 * 사용법:
 *   const data = await apiFetch("/api/projects");
 *   const created = await apiFetch("/api/projects", { method: "POST", body: { name: "foo" } });
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    params?: Record<string, string>;
  } = {}
): Promise<T> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Not authenticated");
  }

  const url = new URL(path, API_URL);
  if (options.params) {
    Object.entries(options.params).forEach(([k, v]) =>
      url.searchParams.set(k, v)
    );
  }

  const res = await fetch(url.toString(), {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API error: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
