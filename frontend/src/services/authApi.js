import { buildApiUrl } from '../utils/apiConfig.js';

let inMemoryToken = null;

export const setAuthToken = (token) => {
  inMemoryToken = token;
};

export const getAuthToken = () => {
  return inMemoryToken;
};

const buildAuthUrl = (path) => {
  return buildApiUrl(path);
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

const AUTH_API_BASE_URL = buildApiUrl('');

export { AUTH_API_BASE_URL, buildAuthUrl };