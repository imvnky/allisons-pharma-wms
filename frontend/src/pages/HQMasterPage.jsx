import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { apiRequest } from "../services/api";
import { exportToCsv } from "../utils/exportUtils";
import { Globe, Activity, Search, Filter, Download, CheckCircle2, Clock, AlertTriangle, Building2, Printer } from "lucide-react";

export default function HQMasterPage() {
  const { language, t } = useLanguage();
  const [tab, setTab] = useState("monitor"); // 'monitor' | 'master'
  const [warehouseStatuses, setWarehouseStatuses] = useState([]);
  const [masterInventory, setMasterInventory] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  
  // 5 Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [salesFilter, setSalesFilter] = useState("ALL");

  useEffect(() => {
    loadHQData();
  }, [selectedDate, categoryFilter, salesFilter]);

  function loadHQData() {
    apiRequest(`/hq/warehouse-status?audit_date=${selectedDate}`)
      .then(setWarehouseStatuses)
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

  const nationalStock = masterInventory.reduce((acc, i) => acc + i.total_angola_stock, 0);
  const nationalSales = masterInventory.reduce((acc, i) => acc + i.total_sales_today, 0);
  const nationalDiff = masterInventory.reduce((acc, i) => acc + i.net_difference, 0);

  function handleExportMonitorCsv() {
    if (!warehouseStatuses || warehouseStatuses.length === 0) return;
    const headers = [
      "Warehouse Code",
      "Warehouse Name",
      "City / Province",
      "Daily Audit Status",
      "Counted SKUs",
      "Total Active SKUs",
      "Progress %",
      "Total Physical Stock Counted",
      "Total Sales Today",
      "Discrepancies Flagged",
      "Assigned Supervisor",
      "Audit Date",
    ];

    const rows = warehouseStatuses.map((wh) => [
      wh.warehouse_code,
      wh.warehouse_name,
      wh.city,
      wh.status,
      wh.counted_skus,
      wh.total_skus,
      `${wh.progress_pct}%`,
      wh.total_stock,
      wh.total_sales,
      wh.discrepancies_count,
      wh.supervisor_name,
      selectedDate,
    ]);

    exportToCsv(`Allisons_HQ_Audit_Progress_${selectedDate}.csv`, headers, rows);
  }

  function handleExportMasterCsv() {
    if (!filteredMaster || filteredMaster.length === 0) return;
    const headers = [
      "SKU",
      "Product Name",
      "Therapeutic Category",
      "Units / Carton Spec",
      "Mulemba Stock",
      "Palanca Stock",
      "Lobito Stock",
      "Total Angola Stock (Units)",
      "Today's Sales Across Angola",
      "Net Discrepancy",
      "Stock Health Status",
      "Audit Date",
    ];

    const rows = filteredMaster.map((item) => [
      item.sku,
      item.product_name,
      item.category,
      item.units_per_carton,
      item.mulemba_stock,
      item.palanca_stock,
      item.lobito_stock,
      item.total_angola_stock,
      item.total_sales_today,
      item.net_difference,
      item.status,
      selectedDate,
    ]);

    exportToCsv(`Allisons_HQ_Master_Inventory_${selectedDate}.csv`, headers, rows);
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Print-Only Official HQ Audit Header */}
      <div className="print-only-block mb-6 border-b-2 border-slate-900 pb-3">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-tight text-slate-900">
              Allisons African Pharma — HQ National Master Inventory Report
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              National Multi-Branch Surveillance (Mulemba, Palanca, Lobito) | Audit Date: <span className="font-bold">{selectedDate}</span>
            </p>
          </div>
          <div className="text-right text-xs text-slate-600">
            <p>Scope: <span className="font-bold uppercase">National Angola Master</span></p>
            <p>Printed On: {new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Globe className="w-6 h-6 text-indigo-600" />
            <span>{t("hq.title")}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t("hq.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab switch */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setTab("monitor")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                tab === "monitor"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{t("hq.tabMonitor")}</span>
            </button>
            <button
              onClick={() => setTab("master")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                tab === "master"
                  ? "bg-white text-purple-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{t("hq.tabMaster")}</span>
            </button>
          </div>

          {/* Export & Print Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={tab === "master" ? handleExportMasterCsv : handleExportMonitorCsv}
              title={language === "pt" ? "Exportar visualização para CSV (Excel)" : "Export Current View to CSV (Excel Compatible)"}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>{t("exportCsv")}</span>
            </button>
            <button
              onClick={() => window.print()}
              title={language === "pt" ? "Imprimir Relatório Oficial da Sede" : "Print Official HQ Report"}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* National KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase">{t("hq.nationalStock")}</div>
          <div className="text-xl font-black text-indigo-700 mt-1">{nationalStock.toLocaleString()} {t("units")}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Mulemba + Palanca + Lobito</div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase">{t("hq.nationalSales")}</div>
          <div className="text-xl font-black text-purple-700 mt-1">{nationalSales.toLocaleString()} {t("units")}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{language === "pt" ? "Registadas nas 3 filiais" : "Booked across 3 branches"}</div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase">{t("hq.branchesFinalized")}</div>
          <div className="text-xl font-black text-emerald-600 mt-1">
            {warehouseStatuses.filter((w) => w.status === "INVENTORY_DONE").length} / {warehouseStatuses.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{language === "pt" ? "Conclusão da auditoria diária" : "Daily audit completion"}</div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase">{t("hq.countrywideVariance")}</div>
          <div
            className={`text-xl font-black mt-1 ${
              nationalDiff < 0 ? "text-red-600" : nationalDiff > 0 ? "text-amber-600" : "text-emerald-600"
            }`}
          >
            {nationalDiff > 0 ? `+${nationalDiff}` : nationalDiff} {t("units")}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{language === "pt" ? "Variação líquida consolidada" : "Total variance across Angola"}</div>
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
                  className={`bg-white rounded-3xl p-6 border shadow-xs space-y-4 flex flex-col justify-between ${
                    isDone ? "border-emerald-200" : isProcess ? "border-purple-200" : "border-slate-200"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-500" />
                        <h3 className="text-sm font-bold text-slate-900">{wh.warehouse_name}</h3>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                          isDone
                            ? "bg-emerald-100 text-emerald-800"
                            : isProcess
                            ? "bg-purple-100 text-purple-800"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {wh.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500">
                      Supervisor: <span className="font-bold text-slate-800">{wh.supervisor_name}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-500">Audit Progress</span>
                        <span className="text-purple-700 font-bold">{wh.progress_pct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${wh.progress_pct}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-[10px] text-slate-400 font-bold">Physical Stock</div>
                        <div className="font-black text-slate-900 mt-0.5">{wh.total_stock.toLocaleString()}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-[10px] text-slate-400 font-bold">Sales Booked</div>
                        <div className="font-black text-slate-900 mt-0.5">{wh.total_sales.toLocaleString()}</div>
                      </div>
                    </div>

                    {wh.discrepancies_count > 0 && (
                      <div className="p-2 rounded-lg bg-red-50 border border-red-100 text-[11px] font-bold text-red-700 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{wh.discrepancies_count} Discrepancies Flagged</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => alert(`Opening live audit drill-down for ${wh.warehouse_name}`)}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-colors"
                  >
                    Inspect Warehouse Data →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Master Angola Inventory Table with 5 Filters */}
      {tab === "master" && (
        <div className="space-y-4">
          {/* 5 Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            {/* Filter 1: Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search Medicine or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200"
              />
            </div>

            {/* Filter 2: Category */}
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full py-1.5 px-3 text-xs rounded-xl border border-slate-200"
              >
                <option value="All">All Therapeutic Categories</option>
                <option value="Antibiotics">Antibiotics</option>
                <option value="Analgesics & Antipyretics">Analgesics & Antipyretics</option>
                <option value="Anti-inflammatory">Anti-inflammatory</option>
                <option value="Antidiabetic">Antidiabetic</option>
                <option value="Gastrointestinal">Gastrointestinal</option>
              </select>
            </div>

            {/* Filter 3: Sales Tier */}
            <div>
              <select
                value={salesFilter}
                onChange={(e) => setSalesFilter(e.target.value)}
                className="w-full py-1.5 px-3 text-xs rounded-xl border border-slate-200"
              >
                <option value="ALL">All Sales Volumes</option>
                <option value="HIGH">High Movers (&gt; 500 units)</option>
                <option value="MODERATE">Moderate Movers (100 - 500)</option>
                <option value="SLOW">Slow Movers (&lt; 100)</option>
                <option value="ZERO">Zero Sales Today</option>
              </select>
            </div>

            {/* Filter 4: Date */}
            <div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full py-1.5 px-3 text-xs rounded-xl border border-slate-200 font-bold"
              />
            </div>
          </div>

          {/* Consolidated Master Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Product Name</th>
                    <th className="p-3 text-right">Mulemba</th>
                    <th className="p-3 text-right">Palanca</th>
                    <th className="p-3 text-right">Lobito</th>
                    <th className="p-3 text-right bg-purple-50/50 text-purple-900 font-black">
                      Total Angola Stock
                    </th>
                    <th className="p-3 text-right">Today's Sales</th>
                    <th className="p-3 text-center">Net Diff</th>
                    <th className="p-3 text-center">Stock Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMaster.map((item) => (
                    <tr key={item.product_id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-900">{item.sku}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{item.product_name}</div>
                        <div className="text-[10px] text-slate-400">{item.category}</div>
                      </td>
                      <td className="p-3 text-right font-semibold text-slate-700">{item.mulemba_stock.toLocaleString()}</td>
                      <td className="p-3 text-right font-semibold text-slate-700">{item.palanca_stock.toLocaleString()}</td>
                      <td className="p-3 text-right font-semibold text-slate-700">{item.lobito_stock.toLocaleString()}</td>
                      <td className="p-3 text-right font-black text-purple-900 bg-purple-50/30">
                        {item.total_angola_stock.toLocaleString()} Units
                      </td>
                      <td className="p-3 text-right font-bold text-slate-800">{item.total_sales_today}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.net_difference === 0
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {item.net_difference === 0 ? "0 🟢" : `${item.net_difference} 🔴`}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            item.status === "Optimal"
                              ? "bg-emerald-50 text-emerald-800"
                              : "bg-amber-50 text-amber-800"
                          }`}
                        >
                          {item.status}
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

      {/* Print-Only HQ Official Sign-off Section */}
      <div className="print-only-block mt-8 pt-4 border-t border-slate-400">
        <div className="grid grid-cols-3 gap-8 text-xs text-slate-700">
          <div>
            <p className="font-bold mb-10">HQ Operations Director:</p>
            <div className="border-t border-slate-600 pt-1">Signature / Date</div>
          </div>
          <div>
            <p className="font-bold mb-10">Chief Pharmacist / Compliance:</p>
            <div className="border-t border-slate-600 pt-1">Signature / Date</div>
          </div>
          <div>
            <p className="font-bold mb-10">Allisons African Pharma HQ:</p>
            <div className="border-t border-slate-600 pt-1">Official Executive Seal</div>
          </div>
        </div>
      </div>
    </div>
  );
}

