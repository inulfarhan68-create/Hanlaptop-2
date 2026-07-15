"use client";

import { syncChannel } from './broadcast';

export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const storeId = typeof window !== 'undefined' ? localStorage.getItem('selectedStoreId') || 'all' : 'all';
  let url = endpoint;
  if (url.startsWith('/') && !url.startsWith('/_/backend')) {
    url = `/_/backend${url}`;
  }

  const headers: Record<string, string> = {
    'x-store-id': storeId,
    ...(options.headers as Record<string, string> || {}),
  };

  // Add JSON content-type for mutating requests
  if (
    options.body &&
    typeof options.body === 'string' &&
    !headers['Content-Type']
  ) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(url, {
      ...options,
      credentials: 'same-origin', // Ensure we send cookies for same-origin
      headers,
    });

    if (options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method.toUpperCase()) && res.ok) {
      let routePath = endpoint;
      if (routePath.startsWith('http')) {
        routePath = new URL(routePath).pathname;
      }
      routePath = routePath.split('?')[0];

      syncChannel.broadcastMutation(routePath, options.method.toUpperCase());
    }

    return res;
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      return new Response(
        JSON.stringify({ error: "Koneksi terputus. Silakan periksa jaringan internet Anda." }),
        {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    throw error;
  }
}

export async function fetcher(args: string | any[]) {
  const url = Array.isArray(args) ? args[0] : args;
  if (!url || typeof url !== 'string') throw new Error("Invalid fetcher URL");
  
  const res = await apiFetch(url);
  if (!res.ok) {
    // If unauthorized, session expired or logged out. Send to the Next app's
    // login (under the transitional basePath) — same target the server-side
    // redirect("/login") resolves to — so both auth bounces land in one place.
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.href = "/_/backend/login";
    }
    const errorBody = await res.json().catch(() => ({ error: res.statusText }));
    const error = new Error(errorBody.error || `HTTP ${res.status}`);
    (error as any).status = res.status;
    (error as any).info = errorBody;
    throw error;
  }
  return res.json();
}
