import React from "react";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Boxes,
  FileSpreadsheet,
  Ship,
  AlertTriangle,
  Globe,
  Settings,
  ShieldCheck,
  ListFilter,
  Terminal,
  Activity,
  ChevronRight,
  Clock,
  ArrowLeftRight
} from "lucide-react";

export default function Sidebar({ currentView, setCurrentView }) {
  const { user, canAccessTile } = useAuth();

  const isSuperAdmin = user?.role?.code === "SUPER_ADMIN";
  const isHQ = user?.role?.code === "HQ_ADMIN" || isSuperAdmin;
  const isSupervisor = user?.role?.code === "SUPERVISOR" || isSuperAdmin;
  const isCarton = user?.role?.code === "CARTON_STAFF" || isSupervisor;
  const isLoose = user?.role?.code === "LOOSE_STAFF" || isSupervisor;
  const isDisplay = user?.role?.code === "DISPLAY_STAFF" || isSupervisor;

  const menuSections = [
    {
      title: "Core",
      items: [
        { id: "dashboard", label: "Home / Dashboard", icon: LayoutDashboard, visible: true },
      ],
    },
    {
      title: "Stock Counting",
      visible: isCarton || isLoose || isDisplay,
      items: [
        { id: "counting", label: "Floor Counting Terminal", icon: Boxes, visible: isCarton || isLoose || isDisplay },
      ],
    },
    {
      title: "Reconciliation",
      visible: isSupervisor || isHQ,
      items: [
        { id: "reconciliation", label: "Daily Reconciliation Sheet", icon: FileSpreadsheet, visible: isSupervisor || isHQ },
      ],
    },
    {
      title: "Shipments & Transfers",
      visible: isSupervisor || isHQ,
      items: [
        { id: "shipments", label: "Arrivals & Transfers Hub", icon: Ship, visible: isSupervisor || isHQ },
      ],
    },
    {
      title: "Alerts & Quality",
      visible: isSupervisor || isHQ,
      items: [
        { id: "alerts", label: "Differences & Expiry", icon: AlertTriangle, visible: isSupervisor || isHQ },
      ],
    },
    {
      title: "HQ Executive",
      visible: isHQ,
      items: [
        { id: "hq", label: "HQ Master Angola Stock", icon: Globe, visible: isHQ },
      ],
    },
    {
      title: "Administration",
      visible: isSuperAdmin,
      items: [
        { id: "roles", label: "Roles & Authorization", icon: ShieldCheck, visible: isSuperAdmin },
        { id: "lookups", label: "Master Dropdowns", icon: ListFilter, visible: isSuperAdmin },
        { id: "logs", label: "API & System Logs", icon: Terminal, visible: isSuperAdmin },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="py-4 px-3 space-y-6">
        {menuSections
          .filter((section) => section.visible !== false)
          .map((section, idx) => (
            <div key={idx} className="space-y-1">
              <div className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items
                  .filter((item) => item.visible)
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setCurrentView(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-purple-50 text-purple-700 font-bold shadow-xs border border-purple-100"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${isActive ? "text-purple-600" : "text-slate-400"}`} />
                          <span>{item.label}</span>
                        </div>
                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-purple-600"></div>}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
      </div>

      {/* Warehouse Status Pill at Bottom */}
      <div className="p-4 border-t border-slate-100">
        <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100/80">
          <div className="flex items-center justify-between text-[11px] font-bold text-purple-900">
            <span>Audit Cycle</span>
            <span className="px-1.5 py-0.5 rounded-sm bg-purple-200 text-purple-800 text-[9px]">LIVE</span>
          </div>
          <div className="text-[11px] text-slate-600 mt-1">Status: <span className="font-semibold text-emerald-600">Open</span></div>
          <div className="text-[10px] text-slate-400 mt-0.5">PostgreSQL • Async API</div>
        </div>
      </div>
    </aside>
  );
}

