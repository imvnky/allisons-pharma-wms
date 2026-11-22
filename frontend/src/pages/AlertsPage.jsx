import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { apiRequest } from "../services/api";
import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  CheckCircle2,
  DollarSign,
  Calendar,
  Filter,
  ArrowRight,
  ShieldX,
  PackageX,
  Sparkles
} from "lucide-react";

export default function AlertsPage() {
  const { user, activeWarehouse } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState("diff"); // 'diff' | 'expiry'
  const [differences, setDifferences] = useState([]);
  const [nearExpiry, setNearExpiry] = useState([]);
  const [expiryThreshold, setExpiryThreshold] = useState(90);

  useEffect(() => {
    apiRequest("/alerts/differences").then((d) => setDifferences(d.items || [])).catch(console.log);
    apiRequest(`/alerts/near-expiry?days_threshold=${expiryThreshold}`).then((d) => setNearExpiry(d.items || [])).catch(console.log);
  }, [activeWarehouse, expiryThreshold]);

  const totalFinancialImpact = differences.reduce(
    (acc, d) => acc + (d.financial_impact_aoa || 0),
    0
  );

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <span>{t("alerts.title", "Quality & Discrepancy Alerts")}</span>
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
              {activeWarehouse?.name || "Mulemba"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {t("alerts.subtitle", "Active stock discrepancies, supervisor sign-offs, and pharmaceutical batch shelf life monitoring.")}
          </p>
        </div>

        {/* Tab switch pills */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold shadow-2xs">
          <button
            onClick={() => setTab("diff")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              tab === "diff"
                ? "bg-white text-rose-700 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{t("alerts.tabDifferences", "Product Differences")} ({differences.length})</span>
          </button>
          <button
            onClick={() => setTab("expiry")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              tab === "expiry"
                ? "bg-white text-amber-700 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{t("alerts.tabExpiry", "Near Expiry Goods")} ({nearExpiry.length})</span>
          </button>
        </div>
      </div>

      {/* Summary Bento KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bento-card p-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Flagged Variances</div>
          <div className="text-2xl font-black text-rose-600 mt-1">{differences.length} SKUs</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Physical count mismatch</div>
        </div>

        <div className="bento-card p-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimated Value Impact</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            AOA {Math.abs(totalFinancialImpact).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">At current wholesale pricing</div>
        </div>

        <div className="bento-card p-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Batches Under 30 Days</div>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {nearExpiry.filter((e) => e.days_remaining <= 30).length} Batches
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Urgent clearance or return</div>
        </div>

        <div className="bento-card p-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Batches Under 90 Days</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{nearExpiry.length} Batches</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Eligible for hospital prioritization</div>
        </div>
      </div>

      {/* TAB 1: Product Differences */}
      {tab === "diff" && (
        <div className="bento-card overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/40">
            <div>
              <h2 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                Active Product Variances (Physical Count ≠ Required Stock)
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Discrepancies flagged during today's audit cycle at {activeWarehouse?.name}
              </p>
            </div>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-3 py-1 rounded-full border border-rose-200">
              {differences.length} Flags Pending Review
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Product Name & Category</th>
                  <th className="py-3 px-4 text-right">Required Stock</th>
                  <th className="py-3 px-4 text-right">Physical Count</th>
                  <th className="py-3 px-4 text-center">Variance Qty</th>
                  <th className="py-3 px-4 text-right">Estimated Financial Impact</th>
                  <th className="py-3 px-4 min-w-48">Supervisor Remarks</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {differences.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-400">
                      {t("alerts.noDifferences", "🎉 No discrepancies detected! All physical counts match required stock perfectly.")}
                    </td>
                  </tr>
                ) : (
                  differences.map((d) => (
                    <tr key={d.record_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{d.sku}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{d.product_name}</div>
                        <div className="text-[10px] text-slate-400">{d.category}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">
                        {d.required_stock?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-indigo-700">
                        {d.physical_stock?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-mono text-[11px] font-black border ${
                            d.difference < 0
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {d.difference > 0 ? `+${d.difference}` : d.difference} Units
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {d.financial_impact_aoa < 0 ? "-" : "+"} AOA {Math.abs(d.financial_impact_aoa).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-600 italic">
                        {d.remarks ? `"${d.remarks}"` : <span className="text-slate-400">No remark logged</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                          {d.status || "PENDING"}
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
            <span className="text-xs font-bold text-slate-500">{t("alerts.colsExpiry.urgencyHorizon", "Urgency Horizon:")}</span>
            {[30, 60, 90, 180].map((days) => (
              <button
                key={days}
                onClick={() => setExpiryThreshold(days)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  expiryThreshold === days
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t("alerts.colsExpiry.ltDays", `< ${days} Days`, { days })}
              </button>
            ))}
          </div>

          <div className="bento-card overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/40">
              <div>
                <h2 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Batches Expiring Within {expiryThreshold} Days
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Proactive expiry management for pharmaceuticals in {activeWarehouse?.name}
                </p>
              </div>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-3 py-1 rounded-full">
                {nearExpiry.length} {t("alerts.colsExpiry.batchesFlagged", "Batches Flagged")}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Medicine & Formulation</th>
                    <th className="py-3 px-4">Batch #</th>
                    <th className="py-3 px-4">Expiry Date</th>
                    <th className="py-3 px-4 text-center">Remaining Days</th>
                    <th className="py-3 px-4 text-right">Physical Units in Stock</th>
                    <th className="py-3 px-4 text-center">Recommended Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {nearExpiry.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-400">
                        {t("alerts.colsExpiry.zeroExpiring", `🛡️ Zero batches expiring within ${expiryThreshold} days! Warehouse catalog is within safe shelf life.`, { days: expiryThreshold })}
                      </td>
                    </tr>
                  ) : (
                    nearExpiry.map((item, idx) => {
                      const isCritical = item.days_remaining <= 30;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{item.sku}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{item.product_name}</div>
                            <div className="text-[10px] text-slate-400">{item.category}</div>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-indigo-700">{item.batch_number}</td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-600">{item.expiry_date}</td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                isCritical
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {item.days_remaining} {t("alerts.colsExpiry.daysLeft", "days left")}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {item.quantity?.toLocaleString()} units
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                                isCritical
                                  ? "bg-rose-100 text-rose-800 border-rose-300"
                                  : "bg-indigo-50 text-indigo-700 border-indigo-200"
                              }`}
                            >
                              {isCritical ? "Quarantine / Return" : "Prioritize Dispensing"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
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
