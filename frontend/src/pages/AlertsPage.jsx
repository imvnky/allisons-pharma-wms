import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";
import { AlertTriangle, Clock, ShieldAlert, CheckCircle2, DollarSign, Calendar } from "lucide-react";

export default function AlertsPage() {
  const { user, activeWarehouse } = useAuth();
  const [tab, setTab] = useState("diff"); // 'diff' | 'expiry'
  const [differences, setDifferences] = useState([]);
  const [nearExpiry, setNearExpiry] = useState([]);
  const [expiryThreshold, setExpiryThreshold] = useState(90);

  useEffect(() => {
    apiRequest("/alerts/differences").then((d) => setDifferences(d.items || [])).catch(console.log);
    apiRequest(`/alerts/near-expiry?days_threshold=${expiryThreshold}`).then((d) => setNearExpiry(d.items || [])).catch(console.log);
  }, [activeWarehouse, expiryThreshold]);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-red-600" />
            <span>Quality & Discrepancy Alerts</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeWarehouse.name} • Variance Monitoring & Batch Expiry Surveillance
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setTab("diff")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${tab === "diff"
                ? "bg-white text-red-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Product Differences ({differences.length})</span>
          </button>
          <button
            onClick={() => setTab("expiry")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${tab === "expiry"
                ? "bg-white text-amber-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Near Expiry Goods ({nearExpiry.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Product Differences */}
      {tab === "diff" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-red-50/30">
            <div>
              <h3 className="text-xs font-bold text-red-900 uppercase tracking-wider">
                Active Product Variances (Physical Count ≠ Required Stock)
              </h3>
              <p className="text-[11px] text-slate-500">
                Only records with discrepancies from {activeWarehouse.name}
              </p>
            </div>
            <span className="text-xs font-bold text-red-700 bg-red-100 px-3 py-1 rounded-full">
              {differences.length} Discrepancies Flagged
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Product Name & Category</th>
                  <th className="p-3 text-right">Required Stock</th>
                  <th className="p-3 text-right">Physical Count</th>
                  <th className="p-3 text-center">Variance Qty</th>
                  <th className="p-3 text-right">Estimated Financial Impact</th>
                  <th className="p-3 min-w-48">Supervisor Remarks</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {differences.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-400">
                      🎉 No discrepancies detected! All physical counts match required stock perfectly.
                    </td>
                  </tr>
                ) : (
                  differences.map((d) => (
                    <tr key={d.record_id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-900">{d.sku}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{d.product_name}</div>
                        <div className="text-[10px] text-slate-400">{d.category}</div>
                      </td>
                      <td className="p-3 text-right font-semibold text-slate-700">{d.required_stock}</td>
                      <td className="p-3 text-right font-bold text-purple-700">{d.physical_stock}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-black ${d.difference < 0 ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                            }`}
                        >
                          {d.difference > 0 ? `+${d.difference}` : d.difference} Units
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-red-700">
                        {d.financial_impact_aoa < 0 ? "-" : "+"} AOA {Math.abs(d.financial_impact_aoa).toLocaleString()}
                      </td>
                      <td className="p-3 text-slate-700 italic">
                        {d.remarks ? `"${d.remarks}"` : <span className="text-slate-400">No remark entered</span>}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Near Expiry Goods */}
      {tab === "expiry" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Urgency Filter:</span>
            <button
              onClick={() => setExpiryThreshold(30)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${expiryThreshold === 30 ? "bg-red-600 text-white" : "bg-white border text-slate-600"
                }`}
            >
              Critical (&lt; 30 Days)
            </button>
            <button
              onClick={() => setExpiryThreshold(60)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${expiryThreshold === 60 ? "bg-amber-500 text-white" : "bg-white border text-slate-600"
                }`}
            >
              Warning (&lt; 60 Days)
            </button>
            <button
              onClick={() => setExpiryThreshold(90)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${expiryThreshold === 90 ? "bg-purple-600 text-white" : "bg-white border text-slate-600"
                }`}
            >
              All Notice (&lt; 90 Days)
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Product Description</th>
                    <th className="p-3">Batch Number</th>
                    <th className="p-3">Expiry Date</th>
                    <th className="p-3 text-center">Days Remaining</th>
                    <th className="p-3 text-right">In-Stock Quantity</th>
                    <th className="p-3 text-right">Stock Value (AOA)</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {nearExpiry.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-400">
                        No batches expiring within {expiryThreshold} days for this warehouse.
                      </td>
                    </tr>
                  ) : (
                    nearExpiry.map((it) => (
                      <tr key={it.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-slate-900">{it.sku}</td>
                        <td className="p-3 font-bold text-slate-900">{it.product_name}</td>
                        <td className="p-3 font-mono text-purple-700">{it.batch_number}</td>
                        <td className="p-3 font-semibold text-slate-700">{it.expiry_date}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-black ${it.urgency === "CRITICAL"
                                ? "bg-red-100 text-red-800"
                                : it.urgency === "WARNING"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-purple-100 text-purple-800"
                              }`}
                          >
                            {it.days_remaining} Days
                          </span>
                        </td>
                        <td className="p-3 text-right font-extrabold text-slate-900">
                          {it.units.toLocaleString()} Units ({it.cartons} Ctns)
                        </td>
                        <td className="p-3 text-right font-bold text-slate-700">
                          AOA {it.value_aoa.toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => alert(`Batch ${it.batch_number} flagged for clearance/quarantine order.`)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold"
                          >
                            Flag for Action
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

