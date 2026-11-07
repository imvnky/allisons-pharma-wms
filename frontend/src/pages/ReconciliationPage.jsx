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
  Filter
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
    apiRequest(`/reconciliation/sheet?target_date=${selectedDate}&warehouse_id=${activeWarehouse.id}`)
      .then((data) => {
        setSheetData(data);
        // Pre-fill local edits
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
  const isLocked = sheetData?.session?.status === "INVENTORY_DONE";
  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.product_name.toLowerCase().includes(search.toLowerCase()) ||
      r.sku.toLowerCase().includes(search.toLowerCase());
    if (showDiffOnly) {
      return matchesSearch && r.difference !== 0;
    }
    return matchesSearch;
  });

  const totalRequired = records.reduce((acc, r) => acc + r.required_stock, 0);
  const totalPhysical = records.reduce((acc, r) => acc + r.physical_stock, 0);
  const totalDifference = records.reduce((acc, r) => acc + r.difference, 0);
  const totalSales = records.reduce((acc, r) => acc + r.sales_qty, 0);
  const diffCount = records.filter((r) => r.difference !== 0).length;

  return (
    <div className="p-8 space-y-6 max-w-[1500px] mx-auto">
      {/* Top Header & Historical Date Picker */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Daily Reconciliation Sheet</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
              {sheetData?.session?.status || "UNDER_PROCESS"}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeWarehouse.name} • 13 Core Ledger Columns with Live Calculations
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <Calendar className="w-4 h-4 text-purple-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-bold text-slate-700 focus:outline-none"
            />
          </div>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          {(user?.role?.code === "SUPERVISOR" || user?.role?.code === "SUPER_ADMIN") && (
            isLocked ? (
              <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5 shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Audit Finalized & Locked</span>
              </div>
            ) : (
              <button
                onClick={() => setFinalizeModal(true)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Finalize & Submit to HQ</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Reconciled Progress</div>
          <div className="text-base font-black text-slate-900 mt-1">
            {records.length - diffCount} / {records.length} SKUs
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Total Required Stock</div>
          <div className="text-base font-black text-indigo-700 mt-1">{totalRequired.toLocaleString()} Units</div>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Total Physical Stock</div>
          <div className="text-base font-black text-purple-700 mt-1">{totalPhysical.toLocaleString()} Units</div>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Net Discrepancy</div>
          <div
            className={`text-base font-black mt-1 ${
              totalDifference < 0 ? "text-red-600" : totalDifference > 0 ? "text-amber-600" : "text-emerald-600"
            }`}
          >
            {totalDifference > 0 ? `+${totalDifference}` : totalDifference} Units
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Sales Entered Today</div>
          <div className="text-base font-black text-slate-800 mt-1">{totalSales.toLocaleString()} Units</div>
        </div>
      </div>

      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search SKU or Product Description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-purple-600"
          />
        </div>

        <button
          onClick={() => setShowDiffOnly(!showDiffOnly)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
            showDiffOnly
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Show Discrepancies Only ({diffCount})</span>
        </button>
      </div>

      {/* The 13 Core Columns Master Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="p-3 sticky left-0 bg-slate-50 z-10 w-28">1. SKU</th>
                <th className="p-3 min-w-44">2. Description & Pack</th>
                <th className="p-3 text-right">3. Opening</th>
                <th className="p-3 text-right text-emerald-700 bg-emerald-50/40">4. Arrivals</th>
                <th className="p-3 text-right text-amber-700 bg-amber-50/40">5. Transfers</th>
                <th className="p-3 text-right bg-purple-50/80 text-purple-900 min-w-28 font-black">
                  6. Sales ✍️
                </th>
                <th className="p-3 text-right">7. Cartons</th>
                <th className="p-3 text-right">8. Loose</th>
                <th className="p-3 text-right">9. Display</th>
                <th className="p-3 text-right bg-slate-100/80 font-black text-slate-800">
                  10. Required
                </th>
                <th className="p-3 text-right bg-slate-100/80 font-black text-slate-800">
                  11. Physical
                </th>
                <th className="p-3 text-center min-w-28 font-black">12. Difference</th>
                <th className="p-3 min-w-48 font-black">13. Remarks ✍️</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((r) => {
                const isDiff = r.difference !== 0;
                return (
                  <tr key={r.record_id} className={`hover:bg-slate-50/80 transition-colors ${isDiff ? "bg-red-50/20" : ""}`}>
                    {/* 1. SKU */}
                    <td className="p-3 font-mono font-bold text-slate-900 sticky left-0 bg-white z-10">
                      {r.sku}
                    </td>

                    {/* 2. Description */}
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{r.product_name}</div>
                      <div className="text-[10px] text-slate-400">1 Ctn = {r.units_per_carton} Units</div>
                    </td>

                    {/* 3. Opening */}
                    <td className="p-3 text-right font-semibold text-slate-700">
                      {r.opening_stock.toLocaleString()}
                    </td>

                    {/* 4. Arrivals */}
                    <td className="p-3 text-right font-bold text-emerald-700 bg-emerald-50/20">
                      +{r.arrivals_qty}
                    </td>

                    {/* 5. Transfers */}
                    <td className="p-3 text-right font-bold text-amber-700 bg-amber-50/20">
                      -{r.transfers_qty}
                    </td>

                    {/* 6. Sales (Editable) */}
                    <td className="p-3 text-right bg-purple-50/40">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          disabled={isLocked}
                          value={editingSales[r.record_id] ?? r.sales_qty}
                          onChange={(e) =>
                            setEditingSales({
                              ...editingSales,
                              [r.record_id]: e.target.value,
                            })
                          }
                          onBlur={() => !isLocked && handleSaveSales(r.record_id)}
                          className={`w-20 text-right font-bold text-xs p-1.5 rounded-lg border shadow-xs ${
                            isLocked
                              ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed"
                              : "border-purple-200 focus:outline-none focus:border-purple-600 bg-white"
                          }`}
                        />
                      </div>
                    </td>

                    {/* 7. Cartons */}
                    <td className="p-3 text-right font-semibold text-slate-700">{r.carton_count}</td>

                    {/* 8. Loose */}
                    <td className="p-3 text-right font-semibold text-slate-700">{r.loose_count}</td>

                    {/* 9. Display */}
                    <td className="p-3 text-right font-semibold text-slate-700">{r.display_count}</td>

                    {/* 10. Required Stock */}
                    <td className="p-3 text-right font-black text-slate-900 bg-slate-50/50">
                      {r.required_stock.toLocaleString()}
                    </td>

                    {/* 11. Physical Stock */}
                    <td className="p-3 text-right font-black text-purple-900 bg-slate-50/50">
                      {r.physical_stock.toLocaleString()}
                    </td>

                    {/* 12. Difference */}
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-black ${
                          r.difference === 0
                            ? "bg-emerald-100 text-emerald-800"
                            : r.difference < 0
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {r.difference === 0 ? "Balanced 🟢" : `${r.difference > 0 ? "+" : ""}${r.difference} 🔴`}
                      </span>
                    </td>

                    {/* 13. Remarks (Editable) */}
                    <td className="p-3">
                      <input
                        type="text"
                        disabled={isLocked}
                        placeholder={isLocked ? "Audit locked" : "Add reason/remark..."}
                        value={editingRemarks[r.record_id] ?? r.remarks}
                        onChange={(e) =>
                          setEditingRemarks({
                            ...editingRemarks,
                            [r.record_id]: e.target.value,
                          })
                        }
                        onBlur={() => !isLocked && handleSaveRemarks(r.record_id)}
                        className={`w-full text-xs p-1.5 rounded-lg border focus:outline-none focus:border-purple-600 ${
                          isLocked
                            ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed"
                            : "bg-white border-slate-200"
                        }`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Finalize Modal */}
      {finalizeModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Finalize & Submit Daily Inventory</h3>
              <p className="text-xs text-slate-500 mt-1">
                You are submitting the finalized stock audit for <span className="font-bold">{activeWarehouse.name}</span> on {selectedDate}.
              </p>
            </div>

            {diffCount > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                ⚠️ Notice: There are {diffCount} products with variance flagged. Please ensure remarks are documented for the HQ audit.
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setFinalizeModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalize}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md"
              >
                Confirm & Submit to HQ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

