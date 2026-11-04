import React, { createContext, useContext, useState, useEffect } from "react";
import { apiRequest } from "../services/api";

const AuthContext = createContext();

export const DEMO_USERS = [
  { label: "👑 Super Admin", username: "superadmin", role: "SUPER_ADMIN" },
  { label: "🏢 Dr. Amilcar (HQ Director)", username: "hq.admin", role: "HQ_ADMIN" },
  { label: "📍 Venkatesh Joshi (Mulemba Supervisor)", username: "venkatesh.j", role: "SUPERVISOR" },
  { label: "📦 Carlos Mendes (Carton Staff)", username: "carlos.m", role: "CARTON_STAFF" },
  { label: "🧴 Antonio Silva (Loose Staff)", username: "antonio.s", role: "LOOSE_STAFF" },
  { label: "🖼️ Joao Pinto (Display Staff)", username: "joao.p", role: "DISPLAY_STAFF" },
  { label: "📍 Manuel K. (Palanca Supervisor)", username: "manuel.k", role: "SUPERVISOR" },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("allisons_token"));
  const [authorizedTiles, setAuthorizedTiles] = useState([]);
  const [activeWarehouse, setActiveWarehouse] = useState({ id: 1, code: "MULEMBA", name: "Mulemba Warehouse" });
  const [loading, setLoading] = useState(true);

  async function login(username, password = "admin123") {
    try {
      const data = await apiRequest("/auth/login", "POST", { username, password });
      localStorage.setItem("allisons_token", data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      setAuthorizedTiles(data.authorized_tiles || []);
      if (data.user.warehouse) {
        setActiveWarehouse(data.user.warehouse);
      }
      return data;
    } catch (err) {
      console.error("Login failed:", err);
      throw err;
    }
  }

  function logout() {
    localStorage.removeItem("allisons_token");
    setToken(null);
    setUser(null);
    setAuthorizedTiles([]);
  }

  function canAccessTile(tileKey) {
    if (!user) return false;
    if (user.role.code === "SUPER_ADMIN") return true;
    return authorizedTiles.some((t) => t.key === tileKey);
  }

  useEffect(() => {
    // Auto-login with default superadmin on initial launch if no active user
    login("superadmin", "admin123").finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        authorizedTiles,
        activeWarehouse,
        setActiveWarehouse,
        login,
        logout,
        canAccessTile,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

