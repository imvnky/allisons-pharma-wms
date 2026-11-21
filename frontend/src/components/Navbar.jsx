import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { apiRequest } from "../services/api";
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
  X,
  Copy,
  ExternalLink,
  ArrowRight,
  FileSpreadsheet,
  Truck,
  Ship,
  Boxes,
  Terminal,
  Package
} from "lucide-react";

export default function Navbar({ currentView, setCurrentView }) {
  const { user, activeWarehouse, setActiveWarehouse, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showWhMenu, setShowWhMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Universal Activity & Audit Tracker Modal State
  const [showTrackerModal, setShowTrackerModal] = useState(false);
  const [trackerQuery, setTrackerQuery] = useState("");
  const [trackerResults, setTrackerResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

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
    products: "Product Catalog Master",
    roles: "Roles & Authorization",
    lookups: "Master Dropdowns",
    logs: "API & System Observability",
  };

  const notifications = [
    { id: 1, title: "Near Expiry Alert", desc: "ALAIZE Suspensão (Batch BAT-2026-X1) expiring in <90 days", time: "10m ago", type: "urgent" },
    { id: 2, title: "Container Arrived at Port", desc: "MSC Cargo (Container MSKU-908124-7) verified in stock", time: "42m ago", type: "info" },
    { id: 3, title: "Inter-Warehouse Transfer", desc: "Transfer Note TR-2026-101 to Lobito in transit", time: "1h ago", type: "warning" },
  ];

  // Global Keyboard Shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowTrackerModal((prev) => !prev);
      } else if (e.key === "Escape" && showTrackerModal) {
        setShowTrackerModal(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showTrackerModal]);

  // Live query debounced lookup
  useEffect(() => {
    if (!trackerQuery || trackerQuery.trim().length < 2) {
      setTrackerResults([]);
      return;
    }

    const timer = setTimeout(() => {
      setSearching(true);
      apiRequest(`/tracking/inspect?q=${encodeURIComponent(trackerQuery.trim())}`)
        .then((res) => {
          setTrackerResults(res.results || []);
        })
        .catch((err) => {
          console.warn("Tracker query failed:", err);
          setTrackerResults([]);
        })
        .finally(() => setSearching(false));
    }, 280);

    return () => clearTimeout(timer);
  }, [trackerQuery]);

  function copyToClipboard(text, idKey) {
    navigator.clipboard.writeText(text);
    setCopiedId(idKey);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleNavigate(targetView) {
    if (targetView && setCurrentView) {
      setCurrentView(targetView);
    }
    setShowTrackerModal(false);
    setTrackerQuery("");
  }

  function getCategoryIcon(type) {
    switch (type) {
      case "TRANSFER_NOTE":
        return <Truck className="w-4 h-4 text-amber-600" />;
      case "INWARD_SHIPMENT":
        return <Ship className="w-4 h-4 text-blue-600" />;
      case "COUNT_TICKET":
        return <Boxes className="w-4 h-4 text-indigo-600" />;
      case "SYSTEM_REQUEST":
        return <Terminal className="w-4 h-4 text-purple-600" />;
      case "PRODUCT_SKU":
        return <Package className="w-4 h-4 text-emerald-600" />;
      default:
        return <Activity className="w-4 h-4 text-slate-500" />;
    }
  }

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

      {/* Center: Universal Activity & Audit Tracking Search Pill */}
      <div className="hidden lg:flex items-center flex-1 max-w-md mx-8">
        <div
          onClick={() => setShowTrackerModal(true)}
          className="relative w-full cursor-pointer group"
        >
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          <div className="w-full pl-9 pr-16 py-1.5 bg-slate-50 hover:bg-slate-100/90 text-xs border border-slate-200 rounded-xl text-slate-400 flex items-center transition-all select-none">
            <span>Track Request ID, TRN, GRN, Ticket, or SKU...</span>
          </div>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-semibold text-slate-400 shadow-2xs">
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Mobile Search Button */}
        <button
          onClick={() => setShowTrackerModal(true)}
          className="lg:hidden p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600"
          title="Track Activity ID"
        >
          <Search className="w-4 h-4" />
        </button>

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
            className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-600 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
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

      {/* Universal Activity & Audit Tracking Modal */}
      {showTrackerModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
            {/* Modal Search Input Header */}
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
              <Search className="w-5 h-5 text-indigo-600 shrink-0" />
              <input
                autoFocus
                type="text"
                value={trackerQuery}
                onChange={(e) => setTrackerQuery(e.target.value)}
                placeholder="Enter Request ID (REQ-), Transfer (TR-), Container/BL, Count (CNT-), or SKU..."
                className="w-full bg-transparent text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              {trackerQuery && (
                <button
                  onClick={() => setTrackerQuery("")}
                  className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setShowTrackerModal(false)}
                className="px-2 py-1 bg-slate-200/80 hover:bg-slate-300 rounded-lg text-[11px] font-bold text-slate-600"
              >
                ESC
              </button>
            </div>

            {/* Quick Sample Queries Pill Bar */}
            <div className="px-4 py-2 border-b border-slate-100 bg-white flex items-center gap-2 overflow-x-auto text-[11px]">
              <span className="text-slate-400 font-bold uppercase shrink-0">Try:</span>
              {["TR-2026-", "01/26", "CNT-2026-", "REQ-", "ALIS-ALAIZE", "ALIS-ALBENTEL"].map((sample) => (
                <button
                  key={sample}
                  onClick={() => setTrackerQuery(sample)}
                  className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200/80 font-mono text-[10px] text-slate-600 shrink-0 transition-colors"
                >
                  {sample}
                </button>
              ))}
            </div>

            {/* Results Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {searching ? (
                <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Searching across all activities, logs, and logistics records...</span>
                </div>
              ) : trackerResults.length > 0 ? (
                trackerResults.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-50 hover:bg-indigo-50/30 border border-slate-200/80 transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-white border border-slate-200/90 shadow-2xs">
                          {getCategoryIcon(item.match_type)}
                        </div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          {item.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${item.status_color}`}>
                          {item.status}
                        </span>
                        <button
                          onClick={() => copyToClipboard(item.reference_id, `${idx}-ref`)}
                          title="Copy Identifier"
                          className="px-2 py-0.5 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-mono text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>{item.reference_id}</span>
                          {copiedId === `${idx}-ref` ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{item.summary}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                      <div>
                        <span className="font-semibold text-slate-700">{item.actor}</span> • {item.location} • {item.timestamp}
                      </div>
                      <button
                        onClick={() => handleNavigate(item.target_view)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                      >
                        <span>Open Details</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              ) : trackerQuery.trim().length >= 2 ? (
                <div className="py-12 text-center text-xs text-slate-400 space-y-1">
                  <p className="font-bold text-slate-700">No matching activities found for "{trackerQuery}"</p>
                  <p>Try searching by Transfer Note (`TR-2026-`), Arrival (`01/26`), Request ID (`REQ-`), or Medicine SKU.</p>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                  <Activity className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-700">Unified Activity & Audit Identification Tracker</p>
                  <p className="max-w-md mx-auto text-slate-500">
                    Type any reference number, request correlation ID, transfer waybill, sea container BL, or pharmaceutical SKU to inspect its full lifecycle trail.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>PostgreSQL Audit Trail Grounded</span>
              <div className="flex items-center gap-3">
                <span>Press <kbd className="font-mono bg-white px-1.5 py-0.5 border border-slate-200 rounded text-[10px]">ESC</kbd> to exit</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
