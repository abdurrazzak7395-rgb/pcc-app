const BASE = process.env.NEXT_PUBLIC_BACKEND_URL;

async function doFetch(path, opts) {
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { res, data };
}

export async function api(path, { method='GET', body, token } = {}) {
  // Auto-load access token from localStorage (browser)
  let access = token || (typeof window !== "undefined" ? localStorage.getItem("accessToken") : null);

  const makeOpts = (accessToken) => ({
    method,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    credentials: "include", // IMPORTANT for refresh cookie
    body: body ? JSON.stringify(body) : undefined,
  });

  // 1st try
  let { res, data } = await doFetch(path, makeOpts(access));

  // If access token expired -> refresh -> retry once
  if (res.status === 401) {
    const r = await doFetch("/api/auth/refresh", makeOpts(null));
    if (r.res.ok && r.data?.accessToken) {
      access = r.data.accessToken;
      if (typeof window !== "undefined") localStorage.setItem("accessToken", access);
      ({ res, data } = await doFetch(path, makeOpts(access)));
    }
  }

  if (!res.ok) throw Object.assign(new Error("Request failed"), { status: res.status, data });
  return data;
}

export async function apiWithMeta(path, { method='GET', body, token } = {}) {
  let access = token || (typeof window !== "undefined" ? localStorage.getItem("accessToken") : null);

  const makeOpts = (accessToken) => ({
    method,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  let { res, data } = await doFetch(path, makeOpts(access));

  if (res.status === 401) {
    const r = await doFetch("/api/auth/refresh", makeOpts(null));
    if (r.res.ok && r.data?.accessToken) {
      access = r.data.accessToken;
      if (typeof window !== "undefined") localStorage.setItem("accessToken", access);
      ({ res, data } = await doFetch(path, makeOpts(access)));
    }
  }

  if (!res.ok) throw Object.assign(new Error("Request failed"), { status: res.status, data });
  return { status: res.status, data };
}
