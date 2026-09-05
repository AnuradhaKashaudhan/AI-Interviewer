import { buildApiUrl } from '../utils/apiConfig.js';

let inMemoryToken = null;
let refreshPromise = null;
let tokenRefreshSubscribers = [];

export const setAuthToken = (token) => {
  inMemoryToken = token;
};

export const getAuthToken = () => {
  return inMemoryToken;
};

export const onTokenRefresh = (callback) => {
  tokenRefreshSubscribers.push(callback);
  return () => {
    tokenRefreshSubscribers = tokenRefreshSubscribers.filter((cb) => cb !== callback);
  };
};

const notifyTokenRefreshed = (data) => {
  tokenRefreshSubscribers.forEach((cb) => {
    try {
      cb(data);
    } catch (e) {
      console.error('Token refresh subscriber error:', e);
    }
  });
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

export const refreshAuthToken = async () => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const data = await authApi.refresh();
      if (data && data.access_token) {
        setAuthToken(data.access_token);
        notifyTokenRefreshed(data);
        return data.access_token;
      }
      throw new Error('No access token returned from refresh endpoint.');
    } catch (err) {
      setAuthToken(null);
      throw err;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

export const apiFetch = async (url, options = {}) => {
  const targetUrl = url.startsWith('http') ? url : buildApiUrl(url);
  const token = getAuthToken();
  const headers = { ...(options.headers || {}) };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchOptions = {
    credentials: 'include',
    ...options,
    headers,
  };

  let response = await fetch(targetUrl, fetchOptions);

  // Intercept 401 Unauthorized for automatic token refresh (skip retry if the call itself was the refresh endpoint)
  if (response.status === 401 && !targetUrl.includes('/api/auth/refresh')) {
    try {
      const newToken = await refreshAuthToken();
      if (newToken) {
        const retryHeaders = {
          ...(options.headers || {}),
          Authorization: `Bearer ${newToken}`,
        };
        response = await fetch(targetUrl, {
          ...options,
          credentials: 'include',
          headers: retryHeaders,
        });
      }
    } catch (refreshErr) {
      console.warn('Automatic token refresh failed:', refreshErr.message);
    }
  }

  return response;
};

const AUTH_API_BASE_URL = buildApiUrl('');

export { AUTH_API_BASE_URL, buildAuthUrl };