import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";
import {
  FileSpreadsheet,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Boxes,
  Truck,
  Clock,
  CheckCircle2,
  Package,
  Ship,
  Activity
} from "lucide-react";

export default function DashboardPage({ setCurrentView }) {
  const { user, activeWarehouse } = useAuth();
  const [stats, setStats] = useState({
    cartonPct: 85,
    loosePct: 60,
    displayPct: 100,
    pendingTransfers: 2,
    discrepanciesCount: 4,
    statusText: "Under Process",
  });
  const [feed, setFeed] = useState([]);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];

    // Fetch live reconciliation data for stats
    apiRequest(`/reconciliation/sheet?warehouse_id=${activeWarehouse.id}`)
      .then((data) => {
        const records = data.records || [];
        const diffs = records.filter((r) => r.difference !== 0);
        const countedCarton = records.filter((r) => r.carton_count > 0).length;
        const countedLoose = records.filter((r) => r.loose_count > 0).length;
        const total = records.length || 1;

        setStats((prev) => ({
          ...prev,
          cartonPct: Math.round((countedCarton / total) * 100),
          loosePct: Math.round((countedLoose / total) * 100),
          discrepanciesCount: diffs.length,
          statusText: data.session.status === "INVENTORY_DONE" ? "Inventory Done" : "Under Process",
        }));
      })
      .catch((err) => console.log("Reconciliation load err:", err));

    // Fetch pending inward transfers
    apiRequest("/shipments/transfers")
      .then((trfs) => {
        if (Array.isArray(trfs)) {
          const pending = trfs.filter((t) => t.is_incoming && t.status === "IN_TRANSIT").length;
          setStats((prev) => ({ ...prev, pendingTransfers: pending }));
        }
      })
      .catch(() => {});

    // Activity feed
    setFeed([
      { time: "Live", user: "Inventory Stream", text: `Active Daily Inventory Cycle #${today} initialized for ${activeWarehouse.name}`, type: "system" },
      { time: "Recent", user: "Reconciliation Monitor", text: "Physical counting, inward arrivals and transfers synced", type: "carton" },
    ]);
  }, [activeWarehouse]);

  const todayDateStr = new Date().toISOString().split("T")[0];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Hero Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-7 rounded-3xl shadow-xl">
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-purple-300 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Daily Inventory Cycle #{todayDateStr} • {activeWarehouse.name}
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            Welcome back, {user?.full_name?.split(" ")[0] || "User"}
          </h1>
          <p className="text-xs text-purple-200/90 max-w-xl">
            Track real-time counting streams, review auto-calculated stock differences, and manage inter-warehouse transfers across Angola.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-left">
            <div className="text-[10px] text-purple-200 font-semibold uppercase">Daily Status</div>
            <div className="text-sm font-bold text-emerald-300 flex items-center gap-1.5 mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{stats.statusText}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Core KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Status</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-slate-900">{stats.statusText}</div>
            <div className="text-xs text-slate-500 mt-0.5">Started 08:00 AM • Target: 18:00</div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 h-2 rounded-full w-[72%]"></div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Physical Progress</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1.5 text-xs font-semibold text-slate-700">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Cartons</span>
              <span className="font-bold text-purple-600">{stats.cartonPct}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${stats.cartonPct}%` }}></div>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-slate-500">Loose</span>
              <span className="font-bold text-pink-600">{stats.loosePct}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div className="bg-pink-500 h-1.5 rounded-full" style={{ width: `${stats.loosePct}%` }}></div>
            </div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Transfers</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-slate-900">{stats.pendingTransfers}</div>
            <div className="text-xs text-slate-500 mt-0.5">Inward dispatches awaiting approval</div>
          </div>
          <button
            onClick={() => setCurrentView("shipments")}
            className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1.5 transition-colors"
          >
            <span>Review & Approve</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Discrepancies</span>
            <div className="p-2 rounded-xl bg-red-50 text-red-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-red-600">{stats.discrepanciesCount}</div>
            <div className="text-xs text-slate-500 mt-0.5">Products with stock variance</div>
          </div>
          <button
            onClick={() => setCurrentView("alerts")}
            className="text-xs font-bold text-red-700 hover:text-red-800 flex items-center gap-1.5 transition-colors"
          >
            <span>View Differences</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Priority Action Cards (Instead of 13 cluttered tiles) */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Today's Priority Workflows
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Action 1 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-purple-200 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Daily Reconciliation Sheet</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Review live physical counts, enter manual sales figures, and inspect auto-calculated differences across all 13 columns.
              </p>
            </div>
            <button
              onClick={() => setCurrentView("reconciliation")}
              className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <span>Open Reconciliation Sheet</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Action 2 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-purple-200 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Boxes className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Floor Stock Counting</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Dedicated tablet/scanner terminal for Carton Staff, Loose Staff, and Display Staff to submit verified physical quantities.
              </p>
            </div>
            <button
              onClick={() => setCurrentView("counting")}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <span>Launch Counting Terminal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Action 3 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-purple-200 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Ship className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Shipments & Transfers Hub</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Receive new Sea Container shipments directly into stock, and dispatch/approve inter-warehouse transfers between branches.
              </p>
            </div>
            <button
              onClick={() => setCurrentView("shipments")}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <span>Manage Shipments & Transfers</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Two-Column Bottom Section: Live Stream + Health Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Live Physical Counting Stream */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h3 className="text-sm font-bold text-slate-900">Live Floor Counting Stream</h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">Real-Time Audit Feed</span>
          </div>

          <div className="space-y-3.5">
            {feed.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                <div className="p-2 rounded-lg bg-white border border-slate-200 text-purple-600 shrink-0">
                  <Package className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 truncate">{item.user}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">{item.time}</span>
                  </div>
                  <p className="text-xs text-slate-600">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (5 cols): Warehouse Stock Health & Expiry */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Warehouse Stock Health</h3>
            <p className="text-xs text-slate-500 mt-0.5">Critical batch monitoring & inbound arrivals</p>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-red-900">Near Expiry Alert</div>
                <div className="text-xs text-red-700">3 Batches expiring within 30 days</div>
              </div>
              <button
                onClick={() => setCurrentView("alerts")}
                className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold"
              >
                Inspect
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-indigo-900">Sea Shipment In Transit</div>
                <div className="text-xs text-indigo-700">Vessel MSC Luisa scheduled arrival: 15:30</div>
              </div>
              <span className="text-xs font-bold text-indigo-600">Port Cleared</span>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-purple-900">Manual Sales Recorded Today</div>
                <div className="text-xs text-purple-700">Supervisor entered sales across 8 SKUs</div>
              </div>
              <span className="text-xs font-bold text-purple-700">142 Units</span>
            </div>
          </div>

          <div className="text-center pt-2">
            <button
              onClick={() => setCurrentView("reconciliation")}
              className="text-xs font-bold text-purple-600 hover:text-purple-700"
            >
              View Full Warehouse Ledger →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

