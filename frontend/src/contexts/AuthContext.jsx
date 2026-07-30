import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const API = import.meta.env.PUBLIC_API_URL || "http://localhost:1002/api/v1";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("rag_token"));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem("rag_refresh"));
  const [loading, setLoading] = useState(true);

  const saveTokens = (access, refresh) => {
    setToken(access);
    setRefreshToken(refresh);
    localStorage.setItem("rag_token", access);
    localStorage.setItem("rag_refresh", refresh);
  };

  const clearAuth = useCallback(() => {
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    localStorage.removeItem("rag_token");
    localStorage.removeItem("rag_refresh");
  }, []);

  const fetchMe = useCallback(async (accessToken) => {
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Unauthorized");
      const json = await res.json();
      setUser(json.data);
      return true;
    } catch {
      return false;
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${API}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) throw new Error("Refresh failed");
      const json = await res.json();
      saveTokens(json.data.access_token, json.data.refresh_token);
      await fetchMe(json.data.access_token);
      return true;
    } catch {
      clearAuth();
      return false;
    }
  }, [refreshToken, fetchMe, clearAuth]);

  // Initial auth check
  useEffect(() => {
    (async () => {
      if (token) {
        const ok = await fetchMe(token);
        if (!ok) await refresh();
      }
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email, password) => {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || "Login failed");
    }
    const json = await res.json();
    saveTokens(json.data.access_token, json.data.refresh_token);
    await fetchMe(json.data.access_token);
  };

  const register = async ({ email, password, full_name, tenant_name }) => {
    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name, tenant_name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || "Registration failed");
    }
    const json = await res.json();
    saveTokens(json.data.access_token, json.data.refresh_token);
    await fetchMe(json.data.access_token);
  };

  const joinTenant = async ({ email, password, full_name, tenant_code }) => {
    const res = await fetch(`${API}/auth/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name, tenant_code }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || "Join failed");
    }
    const json = await res.json();
    saveTokens(json.data.access_token, json.data.refresh_token);
    await fetchMe(json.data.access_token);
  };

  const logout = () => clearAuth();

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    login,
    register,
    joinTenant,
    logout,
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
