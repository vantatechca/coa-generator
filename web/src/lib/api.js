// Thin fetch wrapper. The admin token lives in sessionStorage so it is gone when the tab closes.
const KEY = 'coa_token';
export const getToken = () => { try { return sessionStorage.getItem(KEY) || ''; } catch { return ''; } };
export const setToken = (t) => { try { t ? sessionStorage.setItem(KEY, t) : sessionStorage.removeItem(KEY); } catch { /* storage blocked */ } };

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

export class ApiError extends Error {
  constructor(message, status, body) { super(message); this.status = status; this.body = body; }
}

export async function api(path, { method = 'GET', json, body, headers = {}, token } = {}) {
  const h = { 'x-admin-token': token ?? getToken(), ...headers };
  let payload = body;
  if (json !== undefined) { h['content-type'] = 'application/json'; payload = JSON.stringify(json); }
  const res = await fetch(path, { method, headers: h, body: payload });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    if (res.status === 401) onUnauthorized();
    throw new ApiError((data && data.error) || `Request failed (${res.status})`, res.status, data);
  }
  return data;
}
