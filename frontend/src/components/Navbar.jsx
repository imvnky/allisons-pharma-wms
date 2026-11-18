import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import {
  MapPin,
  Shield,
  Bell,
  Search,
  ChevronDown,
  Check,
  LogOut,
  Sparkles,
  Command,
  Activity,
  Layers,
  X
} from "lucide-react";

export default function Navbar({ currentView, setCurrentView }) {
  const { user, activeWarehouse, setActiveWarehouse, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showWhMenu, setShowWhMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const warehouses = [
    { id: 1, code: "MULEMBA", name: "Mulemba (Luanda North)" },
    { id: 2, code: "PALANCA", name: "Palanca (Luanda South)" },
    { id: 3, code: "LOBITO", name: "Lobito (Benguela)" },
  ];

  const viewTitles = {
    dashboard: "Dashboard Overview",
    counting: "Floor Counting Terminal",
    reconciliation: "Daily Reconciliation Sheet",
    shipments: "Shipments & Transfers Hub",
    alerts: "Differences & Expiry Alerts",
    hq: "HQ Master Angola Stock",
    roles: "Roles & Authorization",
    lookups: "Master Dropdowns",
    logs: "API & System Observability",
  };

  const notifications = [
    { id: 1, title: "Near Expiry Alert", desc: "Amoxicillin 500mg (Batch BAT-2026-X1) expiring in <30 days", time: "10m ago", type: "urgent" },
    { id: 2, title: "Container Arrived at Port", desc: "MSC Luisa (Container MSCU-992144) cleared customs", time: "42m ago", type: "info" },
    { id: 3, title: "Inter-Warehouse Transfer", desc: "Dispatch TRF-8821 from Mulemba to Palanca awaiting receipt", time: "1h ago", type: "warning" },
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left: Brand & Breadcrumb */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-lg shadow-sm shadow-indigo-500/20">
            A
          </div>
          <div>
            <div className="text-sm font-black text-slate-900 tracking-tight leading-none">
              Alisons
            </div>
            <div className="text-[10px] font-semibold text-indigo-600 tracking-wider uppercase mt-0.5">
              Pharma WMS
            </div>
          </div>
        </div>

        {/* Vertical divider */}
        <div className="hidden md:block w-px h-6 bg-slate-200"></div>

        {/* Breadcrumb Path (PaceUI style) */}
        <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className="text-slate-400">Alisons</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-bold bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
            {t(`nav.viewTitles.${currentView}`, viewTitles[currentView] || "Overview")}
          </span>
        </div>
      </div>

      {/* Center: Search Bar with Shortcut Badge */}
      <div className="hidden lg:flex items-center flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("searchPlaceholder", "Search medicines, batches, SKUs, or aisles...")}
            className="w-full pl-9 pr-16 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder:text-slate-400 transition-all"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-semibold text-slate-400 shadow-2xs">
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Warehouse Scope Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowWhMenu(!showWhMenu)}
            disabled={user?.role?.code !== "SUPER_ADMIN" && user?.role?.code !== "HQ_ADMIN"}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/90 text-slate-800 text-xs font-semibold transition-colors shadow-2xs"
          >
            <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="truncate max-w-[140px] sm:max-w-[180px]">
              {activeWarehouse?.name || "Mulemba"}
            </span>
            {(user?.role?.code === "SUPER_ADMIN" || user?.role?.code === "HQ_ADMIN") && (
              <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
            )}
          </button>

          {showWhMenu && (
            <div className="absolute top-full mt-1.5 right-0 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40 animate-slideDown">
              <div className="px-3.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {t("warehouseScope", "Select Warehouse Scope")}
              </div>
              {warehouses.map((wh) => (
                <button
                  key={wh.id}
                  onClick={() => {
                    setActiveWarehouse(wh);
                    setShowWhMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs hover:bg-indigo-50/70 flex items-center justify-between font-medium text-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{wh.name}</span>
                  </div>
                  {activeWarehouse?.id === wh.id && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live System Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-[11px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{t("online", "Online")}</span>
        </div>

        {/* Country & Language Switcher */}
        <button
          onClick={() => setLanguage(language === "pt" ? "en" : "pt")}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200/60 text-[11px] font-bold text-slate-700 transition-colors cursor-pointer"
          title={`Active Language: ${language === "pt" ? "Português (AO)" : "English"}. Click to switch.`}
        >
          <span>{language === "pt" ? "🇦🇴" : "🇬🇧"}</span>
          <span>{language === "pt" ? "PT" : "EN"}</span>
        </button>

        {/* Notifications Popover Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-600 border border-transparent hover:border-slate-200 transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
          </button>

          {showNotifications && (
            <div className="absolute top-full mt-1.5 right-0 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-40 animate-slideDown">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900">{t("notifications", "Notifications")}</span>
                <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded-full">
                  3 New
                </span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-100"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span>{n.title}</span>
                      <span className="text-[10px] font-normal text-slate-400">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Vertical divider */}
        <div className="w-px h-6 bg-slate-200"></div>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-xl hover:bg-slate-100/80 transition-all border border-transparent hover:border-slate-200 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
              {user?.full_name ? user.full_name.split(" ").map((n) => n[0]).join("") : "U"}
            </div>
            <div className="text-left hidden xl:block">
              <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[120px]">
                {user?.full_name || "User"}
              </div>
              <div className="text-[10px] text-indigo-600 font-semibold">{user?.role?.name || "Staff"}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute top-full mt-1.5 right-0 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-40 animate-slideDown">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 rounded-t-2xl">
                <div className="text-xs font-bold text-slate-900">{user?.full_name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{user?.email || user?.username}</div>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                  <Shield className="w-2.5 h-2.5 text-indigo-600" />
                  <span>{user?.role?.name}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1.5">
                  {t("scope", "Scope")}: <span className="font-semibold text-slate-700">{user?.warehouse?.name || t("nationalScope", "All Angola (HQ)")}</span>
                </div>
              </div>

              <div className="p-2">
                <button
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl font-bold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span>{t("signOut", "Sign Out")}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
