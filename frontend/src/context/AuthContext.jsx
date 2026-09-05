import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi, setAuthToken, getAuthToken, onTokenRefresh } from '../services/authApi.js';
import { buildApiUrl } from '../utils/apiConfig.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [entitlements, setEntitlements] = useState(null);

  const fetchEntitlements = async (authToken) => {
    const currentToken = authToken || getAuthToken() || localStorage.getItem('access_token');
    if (!currentToken) {
      setEntitlements(null);
      return;
    }
    try {
      const res = await fetch(buildApiUrl('/api/user/entitlements'), {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEntitlements(data);
      }
    } catch (err) {
      console.error('Failed to fetch user entitlements:', err);
    }
  };

  const handleAuthResponse = (response) => {
    if (response && response.access_token) {
      setToken(response.access_token);
      setAuthToken(response.access_token);
      setUser(response.user);
      fetchEntitlements(response.access_token);
    }
  };

  const silentRefresh = async () => {
    try {
      const response = await authApi.refresh();
      handleAuthResponse(response);
      return response.user;
    } catch (error) {
      setToken(null);
      setAuthToken(null);
      setUser(null);
      setEntitlements(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    silentRefresh();

    // Subscribe to auto-refresh events triggered by apiFetch interceptor
    const unsubscribe = onTokenRefresh((data) => {
      handleAuthResponse(data);
    });

    // Setup silent refresh before token expires (50 mins for a 60 min token)
    const interval = setInterval(() => {
      const currentToken = getAuthToken() || localStorage.getItem('access_token');
      if (currentToken) {
        authApi.refresh().then(handleAuthResponse).catch(() => {
          setToken(null);
          setAuthToken(null);
          setUser(null);
          setEntitlements(null);
        });
      }
    }, 50 * 60 * 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const signup = async (payload) => {
    const response = await authApi.signup(payload);
    return response;
  };

  const login = async (payload) => {
    const response = await authApi.login(payload);
    handleAuthResponse(response);
    return response;
  };

  const updateProfile = async (payload) => {
    const response = await authApi.updateProfile(payload);
    setUser(response.user);
    return response;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setToken(null);
      setAuthToken(null);
      setEntitlements(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, entitlements, fetchEntitlements, signup, login, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return context;
};