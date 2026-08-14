// When VITE_AUTH_API_BASE_URL is not set, use '' (empty string = relative URL).
// Vite proxy will forward /api/* to the FastAPI backend on port 8000.
// This avoids any CORS issue since requests are same-origin from the browser's perspective.
const AUTH_API_BASE_URL = (import.meta.env.VITE_AUTH_API_BASE_URL || '').replace(/\/$/, '');

let inMemoryToken = null;

export const setAuthToken = (token) => {
  inMemoryToken = token;
};

export const getAuthToken = () => {
  return inMemoryToken;
};

const buildAuthUrl = (path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${AUTH_API_BASE_URL}${normalizedPath}`;
};

const requestAuth = async (path, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (inMemoryToken) {
    headers['Authorization'] = `Bearer ${inMemoryToken}`;
  }

  const response = await fetch(buildAuthUrl(path), {
    credentials: 'include',  // Required so the httpOnly refresh cookie is sent/received
    headers,
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || data.detail || 'Request failed.');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

export const authApi = {
  me: () => requestAuth('/api/auth/me'),
  refresh: () => requestAuth('/api/auth/refresh', { method: 'POST' }),
  signup: (body) => requestAuth('/api/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => requestAuth('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => requestAuth('/api/auth/logout', { method: 'POST' }),
  updateProfile: (body) => requestAuth('/api/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),
};

export { AUTH_API_BASE_URL, buildAuthUrl };