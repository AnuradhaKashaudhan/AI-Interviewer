import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi, setAuthToken, getAuthToken } from '../services/authApi.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleAuthResponse = (response) => {
    if (response && response.access_token) {
      setToken(response.access_token);
      setAuthToken(response.access_token);
      setUser(response.user);
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
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    silentRefresh();
    
    // Setup silent refresh before token expires (e.g. 14 mins for a 15 min token)
    const interval = setInterval(() => {
      if (getAuthToken()) {
        authApi.refresh().then(handleAuthResponse).catch(() => {
           setToken(null);
           setAuthToken(null);
           setUser(null);
        });
      }
    }, 14 * 60 * 1000);
    
    return () => clearInterval(interval);
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
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, signup, login, updateProfile, logout }}>
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