/**
 * Centralized API Configuration & URL Resolver for CareerPilot AI
 */

const resolveApiBaseUrl = () => {
  // 1. Check build-time Vite environment variables
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_AUTH_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/$/, '');
  }

  // 2. Production Render Fallback: If deployed on Render and env var was omitted during build,
  // resolve to the live FastAPI backend instance instead of falling back to localhost or static domain.
  if (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')) {
    return 'https://careerpilot-api-8z6c.onrender.com';
  }

  // 3. Local Development Fallback (empty string uses Vite dev proxy on /api)
  return '';
};

export const API_BASE_URL = resolveApiBaseUrl();

export const buildApiUrl = (path) => {
  if (!path) return API_BASE_URL;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE_URL) return normalizedPath;
  return `${API_BASE_URL}${normalizedPath}`;
};
