// src/lib/api.ts
const API_URL =
  process.env.NEXT_PUBLIC_API_URL_LOCAL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:5173'; // your Bridge Service

export async function authFetch(path: string, init: RequestInit = {}) {
  // Only run on client; localStorage is undefined on the server.
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const headers = new Headers(init.headers || {});

  // Only attach Authorization if we actually have a token.
  // Avoid "Bearer null" which yields framework 401s.
  if (token) headers.set('Authorization', `Bearer ${token}`);

  // If body is FormData, do NOT set Content-Type (browser sets the boundary).
  const sendingFormData =
    typeof FormData !== 'undefined' && init.body instanceof FormData;

  if (!sendingFormData && init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  return res;
}