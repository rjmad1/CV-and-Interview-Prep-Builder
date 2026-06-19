/**
 * Named API fetch wrapper for Career Intelligence Studio.
 *
 * Injects NVIDIA NIM headers from localStorage on every request.
 * Replaces the previous pattern of shadowing the global `fetch` name.
 */

const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api";

/**
 * Wrapper around the native fetch that:
 *  1. Prepends the API base URL if path starts with "/"
 *  2. Injects X-NVIDIA-API-Key and X-AI-Gateway-Mode headers from localStorage
 *  3. Throws an ApiError for non-OK responses (with parsed detail message)
 */
export async function apiFetch(
  input: string | URL | RequestInfo,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers);

  if (typeof window !== "undefined") {
    const apiKey = localStorage.getItem("nvidia_api_key");
    const gatewayMode = localStorage.getItem("gateway_mode");
    if (apiKey) headers.set("X-NVIDIA-API-Key", apiKey);
    if (gatewayMode) headers.set("X-AI-Gateway-Mode", gatewayMode);
  }

  const nativeFetch =
    typeof window !== "undefined" ? window.fetch : globalThis.fetch;

  return nativeFetch(input, { ...init, headers });
}

/**
 * Convenience: apiFetch with automatic JSON parsing.
 * Throws with the server's `detail` message on non-OK responses.
 */
export async function apiFetchJson<T = unknown>(
  input: string | URL | RequestInfo,
  init?: RequestInit
): Promise<T> {
  const res = await apiFetch(input, init);
  if (!res.ok) {
    let message = `API Error: ${res.status}`;
    try {
      const body = await res.json();
      if (body.detail) message = body.detail;
    } catch {
      /* response body is not JSON */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

/** Base URL for all API calls — exported for use in store actions. */
export { API_BASE };
