// HPERD CMS — API client used by every admin screen.
const API_BASE = '../api';

/**
 * JSON GET/POST helper. Auth is handled by the PHP session cookie
 * (see includes/auth-middleware.php) — `credentials: 'include'` makes the
 * browser send/receive that cookie on every request. The `auth` option is
 * kept for call-site clarity (e.g. login/signup pass `auth: false`) but no
 * longer changes the request itself.
 */
async function apiCall(path, { method = 'GET', body = null, auth = true, isForm = false } = {}) {
  const headers = {};
  if (!isForm && body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: isForm ? body : (body ? JSON.stringify(body) : undefined),
  });

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Server returned an unexpected response (HTTP ${res.status})`);
  }

  if (!res.ok || !json.success) {
    if (res.status === 401 && auth) {
      window.location.href = 'login.html';
    }
    throw new Error(json.error || `Request failed (HTTP ${res.status})`);
  }
  return json.data;
}

/** Uploads a single File via multipart/form-data to the given endpoint. */
async function uploadFile(path, file, fieldName = 'file') {
  const fd = new FormData();
  fd.append(fieldName, file);
  return apiCall(path, { method: 'POST', body: fd, isForm: true });
}
