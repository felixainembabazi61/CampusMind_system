const API_BASE = import.meta.env.VITE_API_URL || '';

export async function api<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({
    error: 'The server returned an invalid response.'
  }));

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data as T;
}

export const post = (path: string, body: unknown) =>
  api(path, { method: 'POST', body: JSON.stringify(body) });

export const patch = (path: string, body: unknown) =>
  api(path, { method: 'PATCH', body: JSON.stringify(body) });

export const del = (path: string) =>
  api(path, { method: 'DELETE' });
