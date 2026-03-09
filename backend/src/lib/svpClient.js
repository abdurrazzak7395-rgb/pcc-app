export async function svpRequest(path, { method='GET', token, body } = {}) {
  const base = process.env.SVP_BASE_URL;
  const locale = process.env.SVP_LOCALE || 'en';
  const url = `${base}${path}${path.includes('?') ? '&' : '?'}locale=${encodeURIComponent(locale)}`;

  const headers = {
    'Accept': 'application/json',
  };
  if (body) headers['Content-Type'] = 'application/json;charset=UTF-8';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

  if (!res.ok) {
    const err = new Error(`SVP request failed: ${res.status}`);
    err.statusCode = res.status;
    err.details = data;
    throw err;
  }
  return data;
}
