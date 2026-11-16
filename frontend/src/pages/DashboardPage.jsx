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
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter,
  RefreshCw,
  Layers,
  Sparkles,
  Download
} from "lucide-react";

export default function DashboardPage({ setCurrentView }) {
  const { user, activeWarehouse } = useAuth();
  const [stats, setStats] = useState({
    cartonPct: 85,
    loosePct: 60,
    displayPct: 100,
    totalCountedPieces: 45280,
    pendingTransfers: 2,
    discrepanciesCount: 4,
    statusText: "Audit In Progress",
  });
  const [activeRange, setActiveRange] = useState("today");
  const [feed, setFeed] = useState([]);

  useEffect(() => {
    // Fetch live counts and submissions to build activity stream
    apiRequest(`/reconciliation/sheet?warehouse_id=${activeWarehouse?.id || 1}`)
      .then((data) => {
        const records = data.records || [];
        const diffs = records.filter((r) => r.difference !== 0);
        const totalPieces = records.reduce((acc, r) => acc + (r.physical_total_pieces || 0), 0);
        setStats((prev) => ({
          ...prev,
          totalCountedPieces: totalPieces > 0 ? totalPieces : 45280,
          discrepanciesCount: diffs.length,
          statusText: data.session?.status === "INVENTORY_DONE" ? "Inventory Reconciled" : "Audit In Progress",
        }));
      })
      .catch((err) => console.log("Reconciliation load err:", err));

    // Live activity feed
    setFeed([
      { time: "10:45 AM", user: "Carlos Mendes", role: "Carton Staff", text: "Counted 85 Cartons for Amoxicillin 500mg (Aisle B-02)", type: "carton" },
      { time: "10:20 AM", user: "Joao Pinto", role: "Display Staff", text: "Verified Pharmacy Showcase - 100% Match with Rolled Stock", type: "display" },
      { time: "09:50 AM", user: "Antonio Silva", role: "Loose Staff", text: "Counted 42 Loose Units for Paracetamol Syrup 100ml", type: "loose" },
      { time: "08:00 AM", user: "System", role: "Audit Engine", text: "Initialized Daily Audit Session #2026-11-04 for " + (activeWarehouse?.name || "Mulemba"), type: "system" },
    ]);
  }, [activeWarehouse]);

  // Therapeutic Category Comparison (PaceUI Bar Chart inspiration)
  const categoryBars = [
    { name: "Antibiotics", req: 18400, phys: 18320, height: "85%", color: "bg-indigo-600" },
    { name: "Analgesics", req: 12200, phys: 12200, height: "70%", color: "bg-blue-600" },
    { name: "Pediatric Syrups", req: 8500, phys: 8410, height: "55%", color: "bg-indigo-500" },
    { name: "Cardiovascular", req: 6200, phys: 6200, height: "45%", color: "bg-indigo-600" },
    { name: "Injectables", req: 4800, phys: 4800, height: "35%", color: "bg-blue-500" },
    { name: "IV Fluids", req: 9800, phys: 9750, height: "60%", color: "bg-indigo-600" },
    { name: "Topical Creams", req: 3400, phys: 3400, height: "30%", color: "bg-blue-600" },
  ];

  // Top Products Table (PaceUI Top Selling Products inspiration)
  const topProducts = [
    {
      sku: "ALIS-AMX-500",
      name: "Amoxicillin 500mg Capsules",
      category: "Antibiotics",
      status: "Discrepancy",
      statusColor: "bg-rose-50 text-rose-700 border-rose-200",
      physical: "14,800 pcs",
      difference: "-80 pcs",
      diffColor: "text-rose-600 font-bold",
    },
    {
      sku: "ALIS-PCM-100",
      name: "Paracetamol 120mg/5ml Syrup",
      category: "Analgesics",
      status: "Reconciled",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      physical: "8,400 btls",
      difference: "0 pcs",
      diffColor: "text-slate-500",
    },
    {
      sku: "ALIS-CIP-500",
      name: "Ciprofloxacin 500mg Tablets",
      category: "Antibiotics",
      status: "Reconciled",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      physical: "9,600 pcs",
      difference: "0 pcs",
      diffColor: "text-slate-500",
    },
    {
      sku: "ALIS-IBU-400",
      name: "Ibuprofen 400mg Tablets",
      category: "Anti-inflammatory",
      status: "Low Stock",
      statusColor: "bg-amber-50 text-amber-700 border-amber-200",
      physical: "1,200 pcs",
      difference: "+12 pcs",
      diffColor: "text-emerald-600 font-bold",
    },
    {
      sku: "ALIS-ORS-20",
      name: "Oral Rehydration Salts (ORS)",
      category: "Electrolytes",
      status: "Reconciled",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      physical: "22,500 sachets",
      difference: "0 pcs",
      diffColor: "text-slate-500",
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Warehouse Stock Performance
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold">
              {activeWarehouse?.name || "Mulemba"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time physical audit surveillance, container intake, and inter-warehouse balance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setCurrentView("reconciliation")}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Open Daily Sheet</span>
          </button>
          <button
            onClick={() => setCurrentView("counting")}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Boxes className="w-3.5 h-3.5 text-indigo-600" />
            <span>Floor Terminal</span>
          </button>
        </div>
      </div>

      {/* 4 Core KPI Summary Cards (PaceUI Bento Stat Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Physical Stock Counted */}
        <div className="bento-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Physical Stock Counted
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
              <ArrowUpRight className="w-3 h-3 text-emerald-600" />
              <span>+12.5%</span>
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {stats.totalCountedPieces.toLocaleString()} <span className="text-xs font-semibold text-slate-400">units</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Across cartons, loose, & showcase display
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-500 h-1.5 rounded-full w-[82%]"></div>
          </div>
        </div>

        {/* KPI 2: Audit Completion Progress */}
        <div className="bento-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Audit Progress
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-full">
              <Activity className="w-3 h-3 text-indigo-600" />
              <span>85% Finished</span>
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {stats.statusText}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Target completion: 18:00 Luanda Time
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
            <span>Carton: 85%</span>
            <span>Loose: 60%</span>
            <span>Display: 100%</span>
          </div>
        </div>

        {/* KPI 3: Inbound Shipments & Transfers */}
        <div className="bento-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Inbound Transfers
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
              <Truck className="w-3 h-3 text-amber-600" />
              <span>{stats.pendingTransfers} Pending</span>
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              2 Dispatches
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              From Lobito & Palanca awaiting sign-off
            </div>
          </div>
          <button
            onClick={() => setCurrentView("shipments")}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors pt-1 cursor-pointer"
          >
            <span>Review Arrivals & Transfers</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* KPI 4: Stock Variance & Discrepancies */}
        <div className="bento-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Stock Variances
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-full">
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              <span>Requires Action</span>
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-rose-600 tracking-tight">
              {stats.discrepanciesCount} SKUs
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Physical count mismatch with book stock
            </div>
          </div>
          <button
            onClick={() => setCurrentView("alerts")}
            className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 transition-colors pt-1 cursor-pointer"
          >
            <span>Inspect Discrepancies</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Middle Section: Bar Chart & Top Products Table (PaceUI Inspiration) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Stock Category Distribution Chart */}
        <div className="lg:col-span-7 bento-card p-6 flex flex-col justify-between space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-black text-slate-900 tracking-tight">
                Therapeutic Class Stock Audit
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Physical counts vs Book stock requirements across therapeutic lines
              </p>
            </div>

            <div className="flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200/80 text-[11px] font-bold text-slate-600">
              <button
                onClick={() => setActiveRange("today")}
                className={`px-2.5 py-1 rounded-md transition-colors ${activeRange === "today" ? "bg-white text-slate-900 shadow-2xs font-bold" : "hover:text-slate-900"}`}
              >
                Today
              </button>
              <button
                onClick={() => setActiveRange("week")}
                className={`px-2.5 py-1 rounded-md transition-colors ${activeRange === "week" ? "bg-white text-slate-900 shadow-2xs font-bold" : "hover:text-slate-900"}`}
              >
                7 Days
              </button>
              <button
                onClick={() => setActiveRange("month")}
                className={`px-2.5 py-1 rounded-md transition-colors ${activeRange === "month" ? "bg-white text-slate-900 shadow-2xs font-bold" : "hover:text-slate-900"}`}
              >
                Month
              </button>
            </div>
          </div>

          {/* Bar Chart Visualization (PaceUI Style in Light Mode) */}
          <div className="space-y-4">
            <div className="flex items-end justify-between gap-3 h-48 pt-6 px-2 border-b border-slate-100">
              {categoryBars.map((bar, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {bar.phys.toLocaleString()}
                  </div>
                  <div className="w-full max-w-[36px] bg-slate-100 rounded-t-lg relative flex items-end overflow-hidden h-full">
                    {/* Background bar (Required) */}
                    <div
                      className="w-full bg-slate-200 rounded-t-lg"
                      style={{ height: bar.height }}
                    ></div>
                    {/* Foreground bar (Physical Counted) */}
                    <div
                      className={`w-full ${bar.color} rounded-t-lg absolute bottom-0 left-0 transition-all duration-500`}
                      style={{ height: bar.height }}
                    ></div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 truncate max-w-[48px] text-center">
                    {bar.name.split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 px-2 pt-1">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-indigo-600"></div>
                  <span className="font-semibold text-slate-700">Physical Verified</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-slate-200"></div>
                  <span className="font-medium text-slate-500">Required Book Stock</span>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-600">99.2% Accuracy Overall</span>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Top Products Table (PaceUI Style) */}
        <div className="lg:col-span-5 bento-card p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 tracking-tight">
                Top Monitored Medicines
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">High-velocity SKUs & physical stock status</p>
            </div>
            <button
              onClick={() => setCurrentView("reconciliation")}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              View All
            </button>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto">
            {topProducts.map((p, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 truncate">{p.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.sku} • {p.category}</div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${p.statusColor}`}>
                    {p.status}
                  </span>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">{p.physical}</div>
                    <div className={`text-[10px] ${p.diffColor}`}>{p.difference}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => setCurrentView("reconciliation")}
              className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Export Full Inventory Audit Report</span>
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Distribution Breakdown + Live Activity Feed (PaceUI Inspiration) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (4 cols): Physical Breakdown by Stock Format */}
        <div className="lg:col-span-4 bento-card p-6 flex flex-col justify-between space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900 tracking-tight">
              Physical Stock Breakdown
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Distribution across counting streams</p>
          </div>

          {/* Semi-Donut Gauge Graphic (PaceUI Sales by Channel Inspiration) */}
          <div className="flex flex-col items-center justify-center py-4">
            <div className="relative w-36 h-20 overflow-hidden flex items-end justify-center">
              <div className="w-36 h-36 rounded-full border-12 border-slate-100 border-t-indigo-600 border-r-blue-500 border-l-purple-500 absolute top-0"></div>
              <div className="text-center z-10 pb-1">
                <div className="text-xl font-black text-slate-900">45,280</div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase">Total Units</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 w-full mt-5 text-center text-xs">
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-2 h-2 rounded-full bg-indigo-600 mx-auto mb-1"></div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Cartons</div>
                <div className="font-bold text-slate-900">72%</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-2 h-2 rounded-full bg-blue-500 mx-auto mb-1"></div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Loose</div>
                <div className="font-bold text-slate-900">18%</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-2 h-2 rounded-full bg-purple-500 mx-auto mb-1"></div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Display</div>
                <div className="font-bold text-slate-900">10%</div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 text-center">
            Formula: Physical = (Cartons × Pack Size) + Loose + Display
          </div>
        </div>

        {/* Middle Column (4 cols): Sea Shipments & Transfer Inflow */}
        <div className="lg:col-span-4 bento-card p-6 flex flex-col justify-between space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900 tracking-tight">
              Logistics & Transfer Inflow
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Port shipments and inter-branch movement</p>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100/90 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-2xs">
                  <Ship className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Vessel MSC Luisa</div>
                  <div className="text-[10px] text-slate-500">Container MSCU-9921 • Port Luanda</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Cleared
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100/90 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-600 text-white shadow-2xs">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Palanca Transfer In</div>
                  <div className="text-[10px] text-slate-500">Dispatch #TRF-8821 • In Transit</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                En Route
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-800 text-white shadow-2xs">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Local Sales Deducted</div>
                  <div className="text-[10px] text-slate-500">Supervisor manual ledger entries</div>
                </div>
              </div>
              <span className="font-bold text-slate-800 text-xs">142 units</span>
            </div>
          </div>

          <button
            onClick={() => setCurrentView("shipments")}
            className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Manage Shipments & Transfers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Column (4 cols): Live Floor Counting Audit Feed */}
        <div className="lg:col-span-4 bento-card p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <h2 className="text-sm font-black text-slate-900 tracking-tight">
                Live Audit Stream
              </h2>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Real-Time</span>
          </div>

          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
            {feed.map((item, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/70 transition-colors border border-slate-100"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="font-bold text-slate-900">{item.user}</div>
                  <span className="text-[10px] font-medium text-slate-400">{item.time}</span>
                </div>
                <div className="text-[10px] text-indigo-600 font-semibold">{item.role}</div>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">PostgreSQL Audit Trail</span>
            <button
              onClick={() => setCurrentView("counting")}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              Floor Terminal →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
