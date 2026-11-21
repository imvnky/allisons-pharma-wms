import React from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import {
  LayoutDashboard,
  Boxes,
  FileSpreadsheet,
  Ship,
  AlertTriangle,
  Globe,
  ShieldCheck,
  ListFilter,
  Terminal,
  Activity,
  Clock,
  ArrowLeftRight,
  LogOut,
  ChevronRight,
  ShieldAlert
} from "lucide-react";

export default function Sidebar({ currentView, setCurrentView }) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const isSuperAdmin = user?.role?.code === "SUPER_ADMIN";
  const isHQ = user?.role?.code === "HQ_ADMIN" || isSuperAdmin;
  const isSupervisor = user?.role?.code === "SUPERVISOR" || isSuperAdmin;
  const isCarton = user?.role?.code === "CARTON_STAFF" || isSupervisor;
  const isLoose = user?.role?.code === "LOOSE_STAFF" || isSupervisor;
  const isDisplay = user?.role?.code === "DISPLAY_STAFF" || isSupervisor;

  const menuSections = [
    {
      title: t("nav.dashboardsSection", "DASHBOARDS"),
      items: [
        { id: "dashboard", label: t("nav.overview", "Overview"), icon: LayoutDashboard, visible: true },
        { id: "counting", label: t("nav.floorCounting", "Floor Counting"), icon: Boxes, visible: isCarton || isLoose || isDisplay },
        { id: "reconciliation", label: t("nav.dailyReconciliation", "Daily Reconciliation"), icon: FileSpreadsheet, visible: isSupervisor || isHQ },
      ],
    },
    {
      title: t("nav.operationsSection", "OPERATIONS & LOGISTICS"),
      visible: isSupervisor || isHQ,
      items: [
        { id: "shipments", label: t("nav.arrivalsTransfers", "Arrivals & Transfers"), icon: Ship, visible: isSupervisor || isHQ },
        { id: "products", label: t("nav.productCatalog", "Product Catalog"), icon: Boxes, visible: isSupervisor || isHQ },
      ],
    },
    {
      title: t("nav.alertsSection", "ALERTS & QUALITY"),
      visible: isSupervisor || isHQ,
      items: [
        {
          id: "alerts",
          label: t("nav.differencesExpiry", "Differences & Expiry"),
          icon: ShieldAlert,
          visible: isSupervisor || isHQ,
          badge: "4",
          badgeColor: "bg-rose-100 text-rose-700",
        },
      ],
    },
    {
      title: t("nav.hqSection", "HQ EXECUTIVE"),
      visible: isHQ,
      items: [
        { id: "hq", label: t("nav.hqMasterAngola", "HQ Master Angola Stock"), icon: Globe, visible: isHQ },
      ],
    },
    {
      title: t("nav.systemSection", "SYSTEM & AUDIT"),
      visible: isSuperAdmin,
      items: [
        { id: "roles", label: t("nav.rolesAuth", "Roles & Authorization"), icon: ShieldCheck, visible: isSuperAdmin },
        { id: "lookups", label: t("nav.masterDropdowns", "Master Dropdowns"), icon: ListFilter, visible: isSuperAdmin },
        { id: "logs", label: t("nav.apiLogs", "API Observability Logs"), icon: Terminal, visible: isSuperAdmin },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/90 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      {/* Menu Sections */}
      <div className="py-5 px-3 space-y-6 overflow-y-auto">
        {menuSections
          .filter((section) => section.visible !== false)
          .map((section, idx) => (
            <div key={idx} className="space-y-1">
              <div className="px-3 text-[10px] font-black text-slate-400 tracking-wider uppercase">
                {section.title}
              </div>
              <div className="space-y-0.5 pt-0.5">
                {section.items
                  .filter((item) => item.visible)
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setCurrentView(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${isActive
                            ? "bg-indigo-50/80 text-indigo-700 font-bold border-l-2 border-indigo-600 shadow-2xs"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${item.badgeColor || "bg-slate-100 text-slate-600"}`}>
                            {item.badge}
                          </span>
                        )}
                        {isActive && !item.badge && (
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
      </div>

      {/* Bottom User Profile Card (PaceUI style) */}
      <div className="p-3 border-t border-slate-200/80 bg-slate-50/50 space-y-2">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
              {user?.full_name ? user.full_name.split(" ").map((n) => n[0]).join("") : "U"}
            </div>
            <div className="truncate text-left">
              <div className="text-xs font-bold text-slate-900 truncate">
                {user?.full_name || "Alisons Staff"}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {user?.role?.name || "Staff"}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            title={t("signOut", "Sign Out")}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Brand identity footer */}
        <div className="px-1 flex items-center justify-between text-[10px] text-slate-400">
          <span className="font-semibold text-slate-500">Amaldina Comércio Geral</span>
          <span className="font-mono text-[9px] bg-slate-200/70 text-slate-600 px-1.5 py-0.2 rounded font-bold">WMS</span>
        </div>
      </div>
    </aside>
  );
}
