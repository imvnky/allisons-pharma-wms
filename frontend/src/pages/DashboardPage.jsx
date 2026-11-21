import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
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
  const { t } = useLanguage();

  const [summary, setSummary] = useState({
    total_physical_units: 0,
    total_required_units: 0,
    total_difference_units: 0,
    total_sales_units: 0,
    discrepancy_count: 0,
    total_skus: 52,
    counted_skus: 0,
    progress_pct: 0,
    accuracy_pct: 100.0,
    status_text: "Audit In Progress",
    breakdown: {
      carton_units: 0,
      loose_units: 0,
      display_units: 0,
      carton_pct: 0,
      loose_pct: 0,
      display_pct: 0,
    },
    pending_transfers: 0,
  });

  const [categoryBars, setCategoryBars] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [logistics, setLogistics] = useState({
    latest_arrival: null,
    latest_transfer: null,
    sales_today: 0
  });
  const [feed, setFeed] = useState([]);
  const [activeRange, setActiveRange] = useState("today");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [activeWarehouse, activeRange]);

  async function loadDashboardData() {
    const whId = activeWarehouse?.id || 1;
    setLoading(true);
    try {
      const [sumData, catData, topData, logData, feedData] = await Promise.all([
        apiRequest(`/dashboard/summary?warehouse_id=${whId}`),
        apiRequest(`/dashboard/categories?warehouse_id=${whId}`),
        apiRequest(`/dashboard/top-products?warehouse_id=${whId}`),
        apiRequest(`/dashboard/logistics-inflow?warehouse_id=${whId}`),
        apiRequest(`/dashboard/live-stream?warehouse_id=${whId}`),
      ]);

      if (sumData) setSummary(sumData);
      if (catData) setCategoryBars(catData);
      if (topData) setTopProducts(topData);
      if (logData) setLogistics(logData);
      if (feedData) setFeed(feedData);
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {t("dashboard.stockPerformance", "Warehouse Stock Performance")}
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold">
              {activeWarehouse?.name || "Mulemba"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {t("dashboard.stockPerformanceSubtitle", "Real-time physical audit surveillance, container intake, and inter-warehouse balance.")}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadDashboardData()}
            title="Refresh Live Metrics"
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
          <button
            onClick={() => setCurrentView("reconciliation")}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{t("dashboard.openDailySheet", "Open Daily Sheet")}</span>
          </button>
          <button
            onClick={() => setCurrentView("counting")}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Boxes className="w-3.5 h-3.5 text-indigo-600" />
            <span>{t("dashboard.floorTerminal", "Floor Terminal")}</span>
          </button>
        </div>
      </div>

      {/* 4 Core KPI Summary Cards (PaceUI Bento Stat Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Physical Stock Counted */}
        <div className="bento-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t("dashboard.physicalStockCounted", "Physical Stock Counted")}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
              <ArrowUpRight className="w-3 h-3 text-emerald-600" />
              <span>{summary.accuracy_pct}% {t("dashboard.accuracy", "Accurate")}</span>
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {summary.total_physical_units.toLocaleString()} <span className="text-xs font-semibold text-slate-400">{t("common.units", "units")}</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {t("dashboard.acrossBreakdown", "Across cartons, loose, & showcase display")}
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-600 to-blue-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, summary.progress_pct || 5)}%` }}
            ></div>
          </div>
        </div>

        {/* KPI 2: Audit Completion Progress */}
        <div className="bento-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t("dashboard.auditProgress", "Audit Progress")}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-full">
              <Activity className="w-3 h-3 text-indigo-600" />
              <span>{summary.progress_pct}% {t("common.finished", "Finished")}</span>
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {summary.status_text === "Inventory Reconciled"
                ? t("dashboard.inventoryReconciled", "Inventory Reconciled")
                : t("dashboard.auditInProgress", "Audit In Progress")}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {summary.counted_skus} / {summary.total_skus} {t("dashboard.skusCounted", "SKUs counted today")}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
            <span>{t("common.cartons", "Carton")}: {summary.breakdown.carton_pct}%</span>
            <span>{t("counting.tabLoose", "Loose")}: {summary.breakdown.loose_pct}%</span>
            <span>{t("counting.tabDisplay", "Display")}: {summary.breakdown.display_pct}%</span>
          </div>
        </div>

        {/* KPI 3: Inbound Shipments & Transfers */}
        <div className="bento-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t("dashboard.inboundTransfers", "Inbound Transfers")}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
              <Truck className="w-3 h-3 text-amber-600" />
              <span>{summary.pending_transfers} {t("dashboard.pending", "Pending")}</span>
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {summary.pending_transfers} {t("dashboard.dispatches", "Active Dispatches")}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {t("dashboard.awaitingSignOff", "Inter-warehouse transit awaiting receipt")}
            </div>
          </div>
          <button
            onClick={() => setCurrentView("shipments")}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors pt-1 cursor-pointer"
          >
            <span>{t("dashboard.reviewArrivalsBtn", "Review Arrivals & Transfers")}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* KPI 4: Stock Variance & Discrepancies */}
        <div className="bento-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t("dashboard.stockVariances", "Stock Variances")}
            </span>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${summary.discrepancy_count > 0
                  ? "text-rose-700 bg-rose-50 border-rose-200/80"
                  : "text-emerald-700 bg-emerald-50 border-emerald-200/80"
                }`}
            >
              {summary.discrepancy_count > 0 ? (
                <>
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  <span>{t("dashboard.requiresAction", "Requires Action")}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>{t("dashboard.allMatched", "Clean Match")}</span>
                </>
              )}
            </span>
          </div>
          <div className="my-2">
            <div
              className={`text-2xl font-black tracking-tight ${summary.discrepancy_count > 0 ? "text-rose-600" : "text-slate-900"
                }`}
            >
              {summary.discrepancy_count} {t("dashboard.skus", "SKUs")}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {summary.discrepancy_count > 0
                ? t("dashboard.varianceMismatch", "Physical count mismatch with book stock")
                : t("dashboard.zeroVariance", "All counted stock matches ledger")}
            </div>
          </div>
          <button
            onClick={() => setCurrentView("alerts")}
            className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 transition-colors pt-1 cursor-pointer"
          >
            <span>{t("dashboard.inspectDiscrepanciesBtn", "Inspect Discrepancies")}</span>
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
                {t("dashboard.therapeuticAudit", "Therapeutic Class Stock Audit")}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {t("dashboard.therapeuticSubtitle", "Physical counts vs Book stock requirements across therapeutic lines")}
              </p>
            </div>

            <div className="flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200/80 text-[11px] font-bold text-slate-600">
              <button
                onClick={() => setActiveRange("today")}
                className={`px-2.5 py-1 rounded-md transition-colors ${activeRange === "today" ? "bg-white text-slate-900 shadow-2xs font-bold" : "hover:text-slate-900"}`}
              >
                {t("dashboard.today", "Today")}
              </button>
              <button
                onClick={() => setActiveRange("week")}
                className={`px-2.5 py-1 rounded-md transition-colors ${activeRange === "week" ? "bg-white text-slate-900 shadow-2xs font-bold" : "hover:text-slate-900"}`}
              >
                {t("dashboard.sevenDays", "7 Days")}
              </button>
              <button
                onClick={() => setActiveRange("month")}
                className={`px-2.5 py-1 rounded-md transition-colors ${activeRange === "month" ? "bg-white text-slate-900 shadow-2xs font-bold" : "hover:text-slate-900"}`}
              >
                {t("dashboard.month", "Month")}
              </button>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="space-y-4">
            {categoryBars.length > 0 ? (
              <div className="flex items-end justify-between gap-3 h-48 pt-6 px-2 border-b border-slate-100 overflow-x-auto">
                {categoryBars.map((bar, idx) => (
                  <div key={idx} className="flex-1 min-w-[48px] flex flex-col items-center gap-2 h-full justify-end group">
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
                    <span className="text-[10px] font-bold text-slate-500 truncate max-w-[54px] text-center" title={bar.name}>
                      {bar.name.split(" ")[0]}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-xs text-slate-400 border-b border-slate-100">
                <span>No active therapeutic inventory records found for today.</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-500 px-2 pt-1">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-indigo-600"></div>
                  <span className="font-semibold text-slate-700">{t("dashboard.physicalVerified", "Physical Verified")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-slate-200"></div>
                  <span className="font-medium text-slate-500">{t("dashboard.requiredBookStock", "Required Book Stock")}</span>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-600">{summary.accuracy_pct}% {t("dashboard.accuracyOverall", "Accuracy Overall")}</span>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Top Products Table */}
        <div className="lg:col-span-5 bento-card p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 tracking-tight">
                {t("dashboard.topMonitored", "Top Monitored Medicines")}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{t("dashboard.topMonitoredSubtitle", "High-velocity SKUs & physical stock status")}</p>
            </div>
            <button
              onClick={() => setCurrentView("reconciliation")}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              {t("dashboard.viewAll", "View All")}
            </button>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto min-h-[220px]">
            {topProducts.length > 0 ? (
              topProducts.map((p, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">{p.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.sku} • {p.category}</div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${p.status_color || "bg-slate-50 text-slate-700 border-slate-200"}`}>
                      {p.status}
                    </span>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">{p.physical}</div>
                      <div className={`text-[10px] ${p.diff_color || "text-slate-500"}`}>{p.difference}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No product counts recorded yet today.
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => setCurrentView("reconciliation")}
              className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>{t("dashboard.exportAuditReport", "Export Full Inventory Audit Report")}</span>
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
              {t("dashboard.stockBreakdown", "Physical Stock Breakdown")}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{t("dashboard.distributionAcross", "Distribution across counting streams")}</p>
          </div>

          {/* Semi-Donut Gauge Graphic (PaceUI Style) */}
          <div className="flex flex-col items-center justify-center py-4">
            <div className="relative w-36 h-20 overflow-hidden flex items-end justify-center">
              <div className="w-36 h-36 rounded-full border-12 border-slate-100 border-t-indigo-600 border-r-blue-500 border-l-purple-500 absolute top-0"></div>
              <div className="text-center z-10 pb-1">
                <div className="text-xl font-black text-slate-900">{summary.total_physical_units.toLocaleString()}</div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase">{t("dashboard.totalUnits", "Total Units")}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 w-full mt-5 text-center text-xs">
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-2 h-2 rounded-full bg-indigo-600 mx-auto mb-1"></div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">{t("common.cartons", "Cartons")}</div>
                <div className="font-bold text-slate-900">{summary.breakdown.carton_pct}%</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-2 h-2 rounded-full bg-blue-500 mx-auto mb-1"></div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">{t("counting.tabLoose", "Loose")}</div>
                <div className="font-bold text-slate-900">{summary.breakdown.loose_pct}%</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-2 h-2 rounded-full bg-purple-500 mx-auto mb-1"></div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">{t("counting.tabDisplay", "Display")}</div>
                <div className="font-bold text-slate-900">{summary.breakdown.display_pct}%</div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 text-center">
            {t("dashboard.formulaDesc", "Formula: Physical = (Cartons × Pack Size) + Loose + Display")}
          </div>
        </div>

        {/* Middle Column (4 cols): Sea Shipments & Transfer Inflow */}
        <div className="lg:col-span-4 bento-card p-6 flex flex-col justify-between space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900 tracking-tight">
              {t("dashboard.logisticsInflow", "Logistics & Transfer Inflow")}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{t("dashboard.portShipmentsSubtitle", "Port shipments and inter-branch movement")}</p>
          </div>

          <div className="space-y-3">
            {logistics.latest_arrival ? (
              <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100/90 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-2xs">
                    <Ship className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{logistics.latest_arrival.title}</div>
                    <div className="text-[10px] text-slate-500">{logistics.latest_arrival.subtitle}</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  {logistics.latest_arrival.status}
                </span>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <Ship className="w-4 h-4 text-slate-400" />
                <div className="text-xs text-slate-500">No inward shipments logged today.</div>
              </div>
            )}

            {logistics.latest_transfer ? (
              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100/90 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-600 text-white shadow-2xs">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{logistics.latest_transfer.title}</div>
                    <div className="text-[10px] text-slate-500">{logistics.latest_transfer.subtitle}</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                  {logistics.latest_transfer.status}
                </span>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <Truck className="w-4 h-4 text-slate-400" />
                <div className="text-xs text-slate-500">No inter-warehouse transfers in transit.</div>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-800 text-white shadow-2xs">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">{t("dashboard.localSalesDeducted", "Local Sales Deducted")}</div>
                  <div className="text-[10px] text-slate-500">{t("dashboard.supervisorLedgerEntries", "Supervisor manual ledger entries")}</div>
                </div>
              </div>
              <span className="font-bold text-slate-800 text-xs">{logistics.sales_today.toLocaleString()} {t("common.units", "units")}</span>
            </div>
          </div>

          <button
            onClick={() => setCurrentView("shipments")}
            className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>{t("dashboard.manageShipmentsBtn", "Manage Shipments & Transfers")}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Column (4 cols): Live Floor Counting Audit Feed */}
        <div className="lg:col-span-4 bento-card p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <h2 className="text-sm font-black text-slate-900 tracking-tight">
                {t("dashboard.liveAuditStream", "Live Audit Stream")}
              </h2>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">{t("dashboard.realTime", "Real-Time")}</span>
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
            <span className="text-slate-400">{t("dashboard.postgresAuditTrail", "PostgreSQL Audit Trail")}</span>
            <button
              onClick={() => setCurrentView("counting")}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              {t("dashboard.floorTerminal", "Floor Terminal")} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
