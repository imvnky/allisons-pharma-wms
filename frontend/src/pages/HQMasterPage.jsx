import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { apiRequest } from "../services/api";
import {
  Globe,
  Activity,
  Search,
  Filter,
  Download,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  ArrowUpRight,
  TrendingUp,
  MapPin,
  Sparkles
} from "lucide-react";

export default function HQMasterPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState("monitor"); // 'monitor' | 'master'
  const [warehouseStatuses, setWarehouseStatuses] = useState([]);
  const [masterInventory, setMasterInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [salesFilter, setSalesFilter] = useState("ALL");

  useEffect(() => {
    loadHQData();
  }, [selectedDate, categoryFilter, salesFilter]);

  useEffect(() => {
    apiRequest("/products/categories")
      .then((cats) => setCategories(cats || []))
      .catch(console.warn);
  }, []);

  function loadHQData() {
    apiRequest(`/hq/warehouse-status?audit_date=${selectedDate}`)
      .then((d) => setWarehouseStatuses(d || []))
      .catch(console.log);

    let url = `/hq/master-inventory?audit_date=${selectedDate}`;
    if (categoryFilter !== "All") url += `&product_category=${categoryFilter}`;
    if (salesFilter !== "ALL") url += `&sales_tier=${salesFilter}`;

    apiRequest(url)
      .then((data) => setMasterInventory(data.records || []))
      .catch(console.log);
  }

  const filteredMaster = masterInventory.filter(
    (item) =>
      item.product_name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase())
  );

  const nationalStock = masterInventory.reduce((acc, i) => acc + (i.total_angola_stock || 0), 0);
  const nationalSales = masterInventory.reduce((acc, i) => acc + (i.total_sales_today || 0), 0);
  const nationalDiff = masterInventory.reduce((acc, i) => acc + (i.net_difference || 0), 0);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-600" />
              <span>{t("hq.title", "Headquarters (HQ) National Master Control")}</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold">
              {t("common.allWarehouses", "All Angola Branches")}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {t("hq.subtitle", "Consolidated pharmaceutical inventory surveillance across Luanda North, Luanda South, and Benguela.")}
          </p>
        </div>

        {/* Tab switch pills */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold shadow-2xs">
          <button
            onClick={() => setTab("monitor")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${tab === "monitor"
                ? "bg-white text-indigo-700 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{t("hq.tabMonitor", "Live Audit Monitor")}</span>
          </button>
          <button
            onClick={() => setTab("master")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${tab === "master"
                ? "bg-white text-indigo-700 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{t("hq.tabMaster", "Master Angola Inventory")}</span>
          </button>
        </div>
      </div>

      {/* National KPI Strip (PaceUI Bento Stat Row) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bento-card p-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t("hq.nationalStock", "Total Angola Physical Stock")}
          </div>
          <div className="text-2xl font-black text-indigo-700 mt-1">
            {nationalStock.toLocaleString()} <span className="text-xs font-semibold text-slate-400">{t("common.units", "units")}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{t("hq.branchSubtitle", "Mulemba + Palanca + Lobito")}</div>
        </div>

        <div className="bento-card p-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t("hq.nationalSales", "National Daily Sales")}
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {nationalSales.toLocaleString()} <span className="text-xs font-semibold text-slate-400">{t("common.units", "units")}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{t("hq.bookedBranches", "Booked across 3 branches")}</div>
        </div>

        <div className="bento-card p-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t("hq.branchesFinalized", "Branches Finalized")}
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {warehouseStatuses.filter((w) => w.status === "INVENTORY_DONE").length} / {warehouseStatuses.length || 3}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{t("hq.auditCompletion", "Daily audit completion")}</div>
        </div>

        <div className="bento-card p-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t("hq.countrywideVariance", "Countrywide Net Variance")}
          </div>
          <div
            className={`text-2xl font-black mt-1 ${nationalDiff < 0 ? "text-rose-600" : nationalDiff > 0 ? "text-emerald-600" : "text-slate-900"
              }`}
          >
            {nationalDiff > 0 ? `+${nationalDiff}` : nationalDiff} <span className="text-xs font-semibold text-slate-400">{t("common.units", "units")}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{t("hq.acrossTherapeutic", "Across all therapeutic lines")}</div>
        </div>
      </div>

      {/* TAB 1: Live Warehouse Audit Process Monitor */}
      {tab === "monitor" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {warehouseStatuses.map((wh) => {
              const isDone = wh.status === "INVENTORY_DONE";
              const isProcess = wh.status === "UNDER_PROCESS";

              return (
                <div
                  key={wh.warehouse_id}
                  className={`bento-card p-6 space-y-4 flex flex-col justify-between ${isDone ? "border-emerald-200" : isProcess ? "border-indigo-200" : "border-slate-200"
                    }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-500" />
                        <h3 className="text-sm font-bold text-slate-900">{wh.warehouse_name}</h3>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${isDone
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : isProcess
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                      >
                        {wh.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>{t("hq.cartonCounting", "Carton Counting:")}</span>
                        <span className="font-bold text-slate-900">{wh.carton_completed ? "100% Done" : "In Progress"}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>{t("hq.looseCounting", "Loose Counting:")}</span>
                        <span className="font-bold text-slate-900">{wh.loose_completed ? "100% Done" : "In Progress"}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>{t("hq.displayCounter", "Display Counter:")}</span>
                        <span className="font-bold text-slate-900">{wh.display_completed ? "Verified" : "Pending"}</span>
                      </div>
                      <div className="flex justify-between text-slate-600 border-t border-slate-100 pt-2 font-semibold">
                        <span>{t("hq.skusAudited", "Total SKUs Audited:")}</span>
                        <span className="font-bold text-indigo-700">{wh.counted_skus} / {wh.total_skus} Items</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Supervisor: {wh.supervisor_name || "Assigned"}</span>
                    <span className="font-bold text-slate-700">Audit Cycle #{selectedDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Master Angola Inventory Table */}
      {tab === "master" && (
        <div className="space-y-4">
          <div className="bento-card p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t("hq.searchPlaceholder", "Search master catalog by SKU or Medicine...")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800"
              >
                <option value="All">{t("hq.allCategories", "All Categories")}</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <button
                onClick={() => window.print()}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t("hq.exportMaster", "Export Master")}</span>
              </button>
            </div>
          </div>

          <div className="bento-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">{t("hq.cols.sku", "SKU")}</th>
                    <th className="py-3 px-4 min-w-48">{t("hq.cols.description", "Description")}</th>
                    <th className="py-3 px-4">{t("hq.cols.category", "Category")}</th>
                    <th className="py-3 px-4 text-right">{t("hq.cols.mulembaStock", "Mulemba Stock")}</th>
                    <th className="py-3 px-4 text-right">{t("hq.cols.palancaStock", "Palanca Stock")}</th>
                    <th className="py-3 px-4 text-right">{t("hq.cols.lobitoStock", "Lobito Stock")}</th>
                    <th className="py-3 px-4 text-right bg-indigo-50/80 font-black text-indigo-900">
                      {t("hq.cols.totalAngola", "Total Angola Physical")}
                    </th>
                    <th className="py-3 px-4 text-right">{t("hq.cols.salesToday", "Sales Today")}</th>
                    <th className="py-3 px-4 text-center">{t("hq.cols.netVariance", "Net Variance")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredMaster.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{item.sku}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{item.product_name}</td>
                      <td className="py-3 px-4 text-slate-500">{item.category}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {item.mulemba_stock?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {item.palanca_stock?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {item.lobito_stock?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-indigo-700 bg-indigo-50/40">
                        {item.total_angola_stock?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                        {item.total_sales_today?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-bold border ${item.net_difference < 0
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : item.net_difference > 0
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                        >
                          {item.net_difference > 0 ? `+${item.net_difference}` : item.net_difference}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
