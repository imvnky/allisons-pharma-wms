import React, { useState } from "react";
import { useAuth, DEMO_USERS } from "../context/AuthContext";
import { MapPin, Shield, Calendar, Bell, User as UserIcon, ChevronDown, Check } from "lucide-react";

export default function Navbar() {
  const { user, activeWarehouse, setActiveWarehouse, login, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showWhMenu, setShowWhMenu] = useState(false);

  const warehouses = [
    { id: 1, code: "MULEMBA", name: "Mulemba Warehouse (Luanda North)" },
    { id: 2, code: "PALANCA", name: "Palanca Warehouse (Luanda South)" },
    { id: 3, code: "LOBITO", name: "Lobito Warehouse (Benguela)" },
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Brand & System Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-700 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-md">
          A
        </div>
        <div>
          <div className="text-sm font-bold text-slate-900 leading-tight">Allisons African Pharma</div>
          <div className="text-xs text-purple-700 font-medium">Warehouse Management System</div>
        </div>
      </div>

      {/* Center & Right Controls */}
      <div className="flex items-center gap-4">
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
                Select Warehouse Scope
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
          <span>{user?.role?.name || "Guest"}</span>
        </div>

        {/* Date Display */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{new Date().toLocaleDateString("en-US", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}</span>
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500"></span>
        </button>

        {/* User Persona Switcher (For Pair Testing) */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
          >
            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs border border-purple-200">
              {user?.full_name ? user.full_name.split(" ").map((n) => n[0]).join("") : "U"}
            </div>
            <div className="text-left hidden lg:block">
              <div className="text-xs font-semibold text-slate-900 leading-tight">{user?.full_name}</div>
              <div className="text-[10px] text-slate-500">{user?.username}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute top-full mt-1.5 right-0 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-40">
              <div className="px-4 py-2 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-900">{user?.full_name}</div>
                <div className="text-[11px] text-slate-500">{user?.role?.name} • {user?.warehouse?.name || "All Angola"}</div>
              </div>

              <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Quick Role Persona Switcher
              </div>

              <div className="max-h-60 overflow-y-auto">
                {DEMO_USERS.map((du) => (
                  <button
                    key={du.username}
                    onClick={async () => {
                      await login(du.username, "admin123");
                      setShowUserMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                      user?.username === du.username
                        ? "bg-purple-50 text-purple-700 font-bold"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span>{du.label}</span>
                    {user?.username === du.username && <Check className="w-3.5 h-3.5 text-purple-600" />}
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-100 mt-2 pt-1 px-2">
                <button
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg font-semibold"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

