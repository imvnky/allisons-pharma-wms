import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { apiRequest } from "../services/api";
import { MapPin, Shield, Calendar, Bell, ChevronDown, Check, LogOut, Globe } from "lucide-react";

export default function Navbar() {
  const { user, activeWarehouse, setActiveWarehouse, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showWhMenu, setShowWhMenu] = useState(false);
  const [warehouses, setWarehouses] = useState([
    { id: 1, code: "MULEMBA", name: "Mulemba Warehouse (Luanda North)" },
    { id: 2, code: "PALANCA", name: "Palanca Warehouse (Luanda South)" },
    { id: 3, code: "LOBITO", name: "Lobito Warehouse (Benguela)" },
  ]);

  useEffect(() => {
    apiRequest("/admin/warehouses")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setWarehouses(data);
        }
      })
      .catch((err) => {
        // Fallback to initial default warehouses gracefully
        console.warn("Could not load dynamic warehouses list, using defaults:", err);
      });
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Brand & System Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-700 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-md">
          A
        </div>
        <div>
          <div className="text-sm font-bold text-slate-900 leading-tight">Allisons African Pharma</div>
          <div className="text-xs text-purple-700 font-medium">{t("appSubtitle")}</div>
        </div>
      </div>

      {/* Center & Right Controls */}
      <div className="flex items-center gap-4">
        {/* Language Selector Pill */}
        <div className="flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] font-bold">
          <button
            onClick={() => setLanguage("en")}
            title="English"
            className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              language === "en"
                ? "bg-white text-purple-700 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>🇬🇧</span>
            <span>EN</span>
          </button>
          <button
            onClick={() => setLanguage("pt")}
            title="Português (Angola)"
            className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              language === "pt"
                ? "bg-white text-purple-700 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>🇦🇴</span>
            <span>PT</span>
          </button>
        </div>

        {/* Active Warehouse Selector */}
        <div className="relative">
          <button
            onClick={() => setShowWhMenu(!showWhMenu)}
            disabled={user?.role?.code !== "SUPER_ADMIN" && user?.role?.code !== "HQ_ADMIN"}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200 transition-colors"
          >
            <MapPin className="w-3.5 h-3.5 text-purple-600" />
            <span>{activeWarehouse?.name || "Mulemba Warehouse"}</span>
            {(user?.role?.code === "SUPER_ADMIN" || user?.role?.code === "HQ_ADMIN") && (
              <ChevronDown className="w-3 h-3 text-slate-500" />
            )}
          </button>

          {showWhMenu && (
            <div className="absolute top-full mt-1.5 right-0 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {t("warehouseScope")}
              </div>
              {warehouses.map((wh) => (
                <button
                  key={wh.id}
                  onClick={() => {
                    setActiveWarehouse(wh);
                    setShowWhMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-purple-50 flex items-center justify-between font-medium text-slate-700"
                >
                  <span>{wh.name}</span>
                  {activeWarehouse?.id === wh.id && <Check className="w-3.5 h-3.5 text-purple-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Role Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold">
          <Shield className="w-3 h-3 text-purple-600" />
          <span>{user?.role?.name || "User"}</span>
        </div>

        {/* Date Display */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>
            {new Date().toLocaleDateString(language === "pt" ? "pt-AO" : "en-US", {
              weekday: "short",
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500"></span>
        </button>

        {/* User Profile & Sign Out Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
              {user?.full_name ? user.full_name.split(" ").map((n) => n[0]).join("") : "U"}
            </div>
            <div className="text-left hidden lg:block">
              <div className="text-xs font-bold text-slate-900 leading-tight">{user?.full_name}</div>
              <div className="text-[10px] text-purple-700 font-medium">{user?.role?.name}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute top-full mt-1.5 right-0 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-40 animate-fadeIn">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                <div className="text-xs font-bold text-slate-900">{user?.full_name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{user?.email || user?.username}</div>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                  <Shield className="w-2.5 h-2.5 text-purple-600" />
                  <span>{user?.role?.name}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Scope: <span className="font-semibold text-slate-700">{user?.warehouse?.name || t("nationalScope")}</span>
                </div>
              </div>

              <div className="p-2">
                <button
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg font-bold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-600" />
                  <span>{t("signOut")}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}


