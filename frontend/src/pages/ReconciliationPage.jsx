import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Search,
  CheckCircle2,
  AlertTriangle,
  Send,
  Save,
  Filter,
  RefreshCw,
  Info,
  Check,
  X,
  Building2,
  Clock
} from "lucide-react";

export default function ReconciliationPage() {
  const { user, activeWarehouse } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [sheetData, setSheetData] = useState(null);
  const [search, setSearch] = useState("");
  const [showDiffOnly, setShowDiffOnly] = useState(false);
  const [editingSales, setEditingSales] = useState({});
  const [editingRemarks, setEditingRemarks] = useState({});
  const [savingRecordId, setSavingRecordId] = useState(null);
  const [finalizeModal, setFinalizeModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSheet();
  }, [selectedDate, activeWarehouse]);

  function loadSheet() {
    setLoading(true);
    apiRequest(`/reconciliation/sheet?target_date=${selectedDate}&warehouse_id=${activeWarehouse?.id || 1}`)
      .then((data) => {
        setSheetData(data);
        const salesMap = {};
        const remarksMap = {};
        data.records.forEach((r) => {
          salesMap[r.record_id] = r.sales_qty;
          remarksMap[r.record_id] = r.remarks;
        });
        setEditingSales(salesMap);
        setEditingRemarks(remarksMap);
      })
      .catch((err) => console.log("Load sheet err:", err))
      .finally(() => setLoading(false));
  }

  async function handleSaveSales(recordId) {
    setSavingRecordId(recordId);
    try {
      const val = parseInt(editingSales[recordId], 10) || 0;
      await apiRequest("/reconciliation/sales", "PUT", {
        record_id: recordId,
        sales_qty: val,
      });
      loadSheet();
    } catch (err) {
      alert("Error saving sales: " + err.message);
    } finally {
      setSavingRecordId(null);
    }
  }

  async function handleSaveRemarks(recordId) {
    setSavingRecordId(recordId);
    try {
      await apiRequest("/reconciliation/remarks", "PUT", {
        record_id: recordId,
        remarks: editingRemarks[recordId] || "",
      });
      loadSheet();
    } catch (err) {
      alert("Error saving remarks: " + err.message);
    } finally {
      setSavingRecordId(null);
    }
  }

  async function handleFinalize() {
    if (!sheetData?.session?.id) return;
    try {
      await apiRequest(`/reconciliation/finalize?session_id=${sheetData.session.id}`, "POST");
      alert("Inventory finalized and submitted to HQ successfully!");
      setFinalizeModal(false);
      loadSheet();
    } catch (err) {
      alert("Finalize failed: " + err.message);
    }
  }

  const records = sheetData?.records || [];
  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.product_name.toLowerCase().includes(search.toLowerCase()) ||
      r.sku.toLowerCase().includes(search.toLowerCase());
    if (showDiffOnly) {
      return matchesSearch && r.difference !== 0;
    }
    return matchesSearch;
  });

  const totalRequired = records.reduce((acc, r) => acc + (r.required_stock || 0), 0);
  const totalPhysical = records.reduce((acc, r) => acc + (r.physical_stock || 0), 0);
  const totalDifference = records.reduce((acc, r) => acc + (r.difference || 0), 0);
  const totalSales = records.reduce((acc, r) => acc + (r.sales_qty || 0), 0);
  const diffCount = records.filter((r) => r.difference !== 0).length;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Header & Historical Date Picker */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/90 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              <span>Daily Reconciliation Master Sheet</span>
            </h1>
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                sheetData?.session?.status === "INVENTORY_DONE"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-indigo-50 text-indigo-800 border-indigo-200"
              }`}
            >
              {sheetData?.session?.status === "INVENTORY_DONE" ? "Inventory Reconciled" : "Audit In Progress"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeWarehouse?.name || "Mulemba"} • 13 Core Ledger Columns with Live Stock Calculations
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Date Picker Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {(user?.role?.code === "SUPERVISOR" || user?.role?.code === "SUPER_ADMIN") && (
            <button
              onClick={() => setFinalizeModal(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Finalize & Submit to HQ</span>
            </button>
          )}
        </div>
      </div>

      {/* Formula Guide Callout Pill */}
      <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs text-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-indigo-900 font-bold">
          <Info className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>Core Mathematical Formulas:</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-600">
          <div>Required = Opening + Arrivals - Transfers - Sales</div>
          <div className="hidden sm:block text-slate-300">•</div>
          <div>Physical = (Cartons × Pack Size) + Loose + Display</div>
          <div className="hidden sm:block text-slate-300">•</div>
          <div className="font-bold text-indigo-900">Difference = Physical - Required</div>
        </div>
      </div>

      {/* Summary KPI Cards (PaceUI Bento Stat Row) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bento-card p-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Audit Progress</div>
          <div className="text-lg font-black text-slate-900 mt-1">
            {records.length - diffCount} / {records.length} SKUs
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
            {records.length > 0 ? `${Math.round(((records.length - diffCount) / records.length) * 100)}% Matched` : "0%"}
          </div>
        </div>

        <div className="bento-card p-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Required Book Stock</div>
          <div className="text-lg font-black text-indigo-700 mt-1">
            {totalRequired.toLocaleString()} <span className="text-xs font-semibold text-slate-400">units</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Calculated ledger balance</div>
        </div>

        <div className="bento-card p-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Physical Counted</div>
          <div className="text-lg font-black text-slate-900 mt-1">
            {totalPhysical.toLocaleString()} <span className="text-xs font-semibold text-slate-400">units</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Cartons + Loose + Display</div>
        </div>

        <div className="bento-card p-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Variance</div>
          <div
            className={`text-lg font-black mt-1 ${
              totalDifference < 0 ? "text-rose-600" : totalDifference > 0 ? "text-emerald-600" : "text-slate-900"
            }`}
          >
            {totalDifference > 0 ? `+${totalDifference}` : totalDifference} <span className="text-xs font-semibold text-slate-400">units</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {diffCount > 0 ? `${diffCount} SKUs require check` : "Zero discrepancy"}
          </div>
        </div>

        <div className="bento-card p-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sales Today</div>
          <div className="text-lg font-black text-slate-900 mt-1">
            {totalSales.toLocaleString()} <span className="text-xs font-semibold text-slate-400">units</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Entered by Supervisor</div>
        </div>
      </div>

      {/* Table Toolbar */}
      <div className="bento-card p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filter SKU or Product Description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder:text-slate-400"
          />
        </div>

        <button
          onClick={() => setShowDiffOnly(!showDiffOnly)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
            showDiffOnly
              ? "bg-rose-50 text-rose-700 border border-rose-200"
              : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Show Discrepancies Only ({diffCount})</span>
        </button>
      </div>

      {/* 13 Core Columns Master Table */}
      <div className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-3 sticky left-0 bg-slate-50 z-10 w-28">1. SKU</th>
                <th className="p-3 min-w-48">2. Description & Pack</th>
                <th className="p-3 text-right">3. Opening</th>
                <th className="p-3 text-right text-emerald-700 bg-emerald-50/50">4. Arrivals</th>
                <th className="p-3 text-right text-amber-700 bg-amber-50/50">5. Transfers</th>
                <th className="p-3 text-right bg-indigo-50/80 text-indigo-900 min-w-28 font-black">
                  6. Sales ✍️
                </th>
                <th className="p-3 text-right">7. Cartons</th>
                <th className="p-3 text-right">8. Loose</th>
                <th className="p-3 text-right">9. Display</th>
                <th className="p-3 text-right bg-slate-100/90 font-black text-slate-900">
                  10. Required
                </th>
                <th className="p-3 text-right bg-slate-100/90 font-black text-slate-900">
                  11. Physical
                </th>
                <th className="p-3 text-center min-w-28 font-black">12. Difference</th>
                <th className="p-3 min-w-48 font-black">13. Remarks ✍️</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRecords.map((r) => {
                const isDiff = r.difference !== 0;
                return (
                  <tr
                    key={r.record_id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isDiff ? "bg-rose-50/30" : ""
                    }`}
                  >
                    {/* 1. SKU */}
                    <td className="p-3 font-mono font-bold text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-100">
                      {r.sku}
                    </td>

                    {/* 2. Description & Pack */}
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{r.product_name}</div>
                      <div className="text-[10px] text-slate-400">Pack of {r.pack_size} units</div>
                    </td>

                    {/* 3. Opening */}
                    <td className="p-3 text-right font-mono text-slate-600">
                      {r.opening_stock?.toLocaleString()}
                    </td>

                    {/* 4. Arrivals */}
                    <td className="p-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/30">
                      {r.arrivals_qty > 0 ? `+${r.arrivals_qty}` : "0"}
                    </td>

                    {/* 5. Transfers */}
                    <td className="p-3 text-right font-mono font-bold text-amber-700 bg-amber-50/30">
                      {r.transfers_out > 0 ? `-${r.transfers_out}` : "0"}
                    </td>

                    {/* 6. Sales (Editable) */}
                    <td className="p-2 text-right bg-indigo-50/30">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          value={editingSales[r.record_id] ?? r.sales_qty}
                          onChange={(e) =>
                            setEditingSales({
                              ...editingSales,
                              [r.record_id]: e.target.value,
                            })
                          }
                          className="w-16 px-1.5 py-1 text-right font-mono font-bold text-xs bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          onClick={() => handleSaveSales(r.record_id)}
                          disabled={savingRecordId === r.record_id}
                          title="Save Sales"
                          className="p-1 text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* 7. Cartons Count */}
                    <td className="p-3 text-right font-mono text-slate-600">
                      {r.carton_count} ctn
                    </td>

                    {/* 8. Loose Count */}
                    <td className="p-3 text-right font-mono text-slate-600">
                      {r.loose_count} pcs
                    </td>

                    {/* 9. Display Count */}
                    <td className="p-3 text-right font-mono text-slate-600">
                      {r.display_count} pcs
                    </td>

                    {/* 10. Required Total */}
                    <td className="p-3 text-right font-mono font-black text-slate-900 bg-slate-50/80">
                      {r.required_stock?.toLocaleString()}
                    </td>

                    {/* 11. Physical Total */}
                    <td className="p-3 text-right font-mono font-black text-slate-900 bg-slate-50/80">
                      {r.physical_stock?.toLocaleString()}
                    </td>

                    {/* 12. Difference */}
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full font-mono font-black text-xs border ${
                          r.difference < 0
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : r.difference > 0
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {r.difference > 0 ? `+${r.difference}` : r.difference}
                      </span>
                    </td>

                    {/* 13. Remarks (Editable) */}
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="Supervisor note..."
                          value={editingRemarks[r.record_id] ?? r.remarks ?? ""}
                          onChange={(e) =>
                            setEditingRemarks({
                              ...editingRemarks,
                              [r.record_id]: e.target.value,
                            })
                          }
                          className="flex-1 px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          onClick={() => handleSaveRemarks(r.record_id)}
                          disabled={savingRecordId === r.record_id}
                          title="Save Remarks"
                          className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Finalize Confirmation Modal */}
      {finalizeModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bento-card max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Confirm Final Daily Sign-Off</span>
              </h3>
              <button onClick={() => setFinalizeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to finalize the reconciliation session for{" "}
              <span className="font-bold text-slate-900">{activeWarehouse?.name}</span> on{" "}
              <span className="font-bold text-slate-900">{selectedDate}</span>?
              <br />
              <br />
              This will freeze today's figures, transfer closing balances into tomorrow's opening stock,
              and transmit the consolidated audit report to Alisons National HQ.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setFinalizeModal(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalize}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
