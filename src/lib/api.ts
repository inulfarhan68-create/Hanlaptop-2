import { syncChannel } from './broadcast';

/**
 * Centralized API client for making authenticated requests.
 * 
 * Replaces the dangerous global `window.fetch` monkey-patch that was
 * injecting x-store-id headers into ALL requests (including third-party).
 * 
 * Usage:
 *   import { apiFetch } from '@/lib/api';
 *   const data = await apiFetch('/api/inventory');
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Wrapper around fetch that automatically includes:
 * - credentials: 'include' (for session cookies)
 * - x-store-id header (from localStorage)
 * - Content-Type: application/json for POST/PUT/PATCH
 * 
 * Only applies these to our own API endpoints, never to third-party URLs.
 */
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const storeId = localStorage.getItem('selectedStoreId') || 'all';
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  const headers: Record<string, string> = {
    'x-store-id': storeId,
    ...(options.headers as Record<string, string> || {}),
  };

  // Add JSON content-type for mutating requests (unless sending FormData)
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
      credentials: 'include',
      headers,
    });

    // Cross-Tab Sync: Broadcast if it's a successful mutation
    if (options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method.toUpperCase()) && res.ok) {
      let routePath = endpoint;
      if (routePath.startsWith('http')) {
         routePath = new URL(routePath).pathname;
      }
      routePath = routePath.split('?')[0]; // Strip query parameters
      
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

/**
 * SWR-compatible fetcher that uses the safe API client.
 */
export async function swrFetcher(url: string) {
  const res = await apiFetch(url);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: res.statusText }));
    const error = new Error(errorBody.error || `HTTP ${res.status}`);
    (error as any).status = res.status;
    (error as any).info = errorBody;
    throw error;
  }
  return res.json();
}
