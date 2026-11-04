import React, { createContext, useContext, useState, useEffect } from "react";
import { apiRequest } from "../services/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("allisons_token"));
  const [authorizedTiles, setAuthorizedTiles] = useState([]);
  const [activeWarehouse, setActiveWarehouse] = useState(null);
  const [loading, setLoading] = useState(true);

  // Authenticate with user credentials (username/email and password)
  async function login(username, password) {
    try {
      const data = await apiRequest("/auth/login", "POST", { username, password });
      localStorage.setItem("allisons_token", data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      setAuthorizedTiles(data.authorized_tiles || []);
      if (data.user.warehouse) {
        setActiveWarehouse(data.user.warehouse);
      } else {
        // HQ or Super Admin without assigned warehouse defaults to Mulemba or national view
        setActiveWarehouse({ id: 1, code: "MULEMBA", name: "Mulemba Warehouse (Luanda North)" });
      }
      return data;
    } catch (err) {
      console.error("Login failed:", err);
      throw err;
    }
  }

  // Explicit user logout
  function logout() {
    localStorage.removeItem("allisons_token");
    setToken(null);
    setUser(null);
    setAuthorizedTiles([]);
    setActiveWarehouse(null);
  }

  // Check if current user is authorized to view/interact with a dashboard tile
  function canAccessTile(tileKey) {
    if (!user) return false;
    if (user.role?.code === "SUPER_ADMIN") return true;
    return authorizedTiles.some((t) => t.key === tileKey);
  }

  // Verify existing session on page load
  useEffect(() => {
    async function verifySession() {
      const storedToken = localStorage.getItem("allisons_token");
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const data = await apiRequest("/auth/me");
        if (data?.user) {
          setUser(data.user);
          setAuthorizedTiles(data.authorized_tiles || []);
          if (data.user.warehouse) {
            setActiveWarehouse(data.user.warehouse);
          } else {
            setActiveWarehouse({ id: 1, code: "MULEMBA", name: "Mulemba Warehouse (Luanda North)" });
          }
        } else {
          logout();
        }
      } catch (err) {
        console.warn("Session expired or invalid, requiring re-login:", err);
        logout();
      } finally {
        setLoading(false);
      }
    }

    verifySession();
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


