import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { apiRequest } from "../services/api";
import { exportToCsv } from "../utils/exportUtils";
import { AlertTriangle, Clock, ShieldAlert, CheckCircle2, DollarSign, Calendar, Download, Printer } from "lucide-react";

export default function AlertsPage() {
  const { user, activeWarehouse } = useAuth();
  const { language, t, formatCurrency } = useLanguage();
  const [tab, setTab] = useState("diff"); // 'diff' | 'expiry'
  const [differences, setDifferences] = useState([]);
  const [nearExpiry, setNearExpiry] = useState([]);
  const [expiryThreshold, setExpiryThreshold] = useState(90);

  useEffect(() => {
    apiRequest("/alerts/differences").then((d) => setDifferences(d.items || [])).catch(console.log);
    apiRequest(`/alerts/near-expiry?days_threshold=${expiryThreshold}`).then((d) => setNearExpiry(d.items || [])).catch(console.log);
  }, [activeWarehouse, expiryThreshold]);

  function handleExportDiffCsv() {
    if (!differences || differences.length === 0) return;
    const headers = [
      "SKU",
      "Product Name",
      "Therapeutic Category",
      "Required Stock",
      "Physical Stock",
      "Variance Qty",
      "Variance %",
      "Estimated Financial Impact (AOA)",
      "Supervisor Remarks",
      "Audit Status",
      "Warehouse",
      "Export Date",
    ];

    const rows = differences.map((d) => [
      d.sku,
      d.product_name,
      d.category,
      d.required_stock,
      d.physical_stock,
      d.difference,
      `${d.variance_pct}%`,
      d.financial_impact_aoa,
      d.remarks || "",
      d.status,
      activeWarehouse?.name || "",
      new Date().toISOString().split("T")[0],
    ]);

    const dateStr = new Date().toISOString().split("T")[0];
    exportToCsv(`Allisons_Discrepancies_${activeWarehouse?.code || "WH"}_${dateStr}.csv`, headers, rows);
  }

  function handleExportExpiryCsv() {
    if (!nearExpiry || nearExpiry.length === 0) return;
    const headers = [
      "SKU",
      "Product Description",
      "Batch Number",
      "Expiry Date",
      "Days Remaining",
      "Urgency Level",
      "Initial Received Units",
      "Units Depleted (FEFO)",
      "In-Stock Remaining Units",
      "In-Stock Remaining Cartons",
      "Batch Stock Value (AOA)",
      "Warehouse",
      "Export Date",
    ];

    const rows = nearExpiry.map((it) => [
      it.sku,
      it.product_name,
      it.batch_number,
      it.expiry_date,
      it.days_remaining,
      it.urgency,
      it.initial_units ?? it.units,
      it.depleted_units ?? 0,
      it.units,
      it.cartons,
      it.value_aoa,
      activeWarehouse?.name || "",
      new Date().toISOString().split("T")[0],
    ]);

    const dateStr = new Date().toISOString().split("T")[0];
    exportToCsv(`Allisons_NearExpiry_${activeWarehouse?.code || "WH"}_${expiryThreshold}Days_${dateStr}.csv`, headers, rows);
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Print-Only Official Alerts & Quality Audit Header */}
      <div className="print-only-block mb-6 border-b-2 border-slate-900 pb-3">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-tight text-slate-900">
              Allisons African Pharma — {tab === "diff"
                ? (language === "pt" ? "Auditoria de Discrepâncias e Variações de Produtos" : "Product Variances & Discrepancies Audit")
                : (language === "pt" ? "Relatório de Vigilância de Lotes com Validade Próxima" : "Near-Expiry Batch Surveillance Report")}
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              {language === "pt" ? "Armazém" : "Warehouse"}: <span className="font-bold">{activeWarehouse?.name}</span> ({activeWarehouse?.code}) | {language === "pt" ? "Data do Relatório" : "Report Date"}: <span className="font-bold">{new Date().toISOString().split("T")[0]}</span>
            </p>
          </div>
          <div className="text-right text-xs text-slate-600">
            <p>{language === "pt" ? "Separador Ativo" : "Active Tab"}: <span className="font-bold uppercase">{tab === "diff" ? (language === "pt" ? "Variações de Estoque" : "Stock Variances") : (language === "pt" ? `Validade (< ${expiryThreshold} Dias)` : `Expiry (< ${expiryThreshold} Days)`)}</span></p>
            <p>{language === "pt" ? "Impresso em" : "Printed On"}: {new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-red-600" />
            <span>{t("alerts.title")}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeWarehouse?.name} • {t("alerts.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab switch */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setTab("diff")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${tab === "diff"
                  ? "bg-white text-red-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{t("alerts.tabDifferences")} ({differences.length})</span>
            </button>
            <button
              onClick={() => setTab("expiry")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${tab === "expiry"
                  ? "bg-white text-amber-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{t("alerts.tabExpiry")} ({nearExpiry.length})</span>
            </button>
          </div>

          {/* Export & Print Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={tab === "diff" ? handleExportDiffCsv : handleExportExpiryCsv}
              title={language === "pt" ? "Exportar visualização atual para CSV (Excel)" : "Export Current View to CSV (Excel Compatible)"}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-red-600" />
              <span>{t("exportCsv")}</span>
            </button>
            <button
              onClick={() => window.print()}
              title={language === "pt" ? "Imprimir Folha Oficial de Qualidade" : "Print Official Quality Audit Sheet"}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: Product Differences */}
      {tab === "diff" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-red-50/30">
            <div>
              <h3 className="text-xs font-bold text-red-900 uppercase tracking-wider">
                {language === "pt" ? "Variações Ativas de Produtos (Estoque Físico ≠ Estoque Calculado)" : "Active Product Variances (Physical Count ≠ Required Stock)"}
              </h3>
              <p className="text-[11px] text-slate-500">
                {language === "pt" ? `Apenas registos com discrepâncias em ${activeWarehouse.name}` : `Only records with discrepancies from ${activeWarehouse.name}`}
              </p>
            </div>
            <span className="text-xs font-bold text-red-700 bg-red-100 px-3 py-1 rounded-full">
              {differences.length} {t("alerts.flaggedDifferences")}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="p-3">SKU</th>
                  <th className="p-3">{language === "pt" ? "Medicamento e Categoria" : "Product Name & Category"}</th>
                  <th className="p-3 text-right">{t("reconciliation.colRequired")}</th>
                  <th className="p-3 text-right">{t("reconciliation.colPhysical")}</th>
                  <th className="p-3 text-center">{t("alerts.varianceQty")}</th>
                  <th className="p-3 text-right">{t("alerts.financialImpact")}</th>
                  <th className="p-3 min-w-48">{t("reconciliation.colRemarks")}</th>
                  <th className="p-3 text-center">{t("status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {differences.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-400">
                      🎉 {t("alerts.noDifferences")}
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
                          {d.difference > 0 ? `+${d.difference}` : d.difference} {t("units")}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-red-700">
                        {formatCurrency(d.financial_impact_aoa)}
                      </td>
                      <td className="p-3 text-slate-700 italic">
                        {d.remarks ? `"${d.remarks}"` : <span className="text-slate-400">{language === "pt" ? "Sem observação" : "No remark entered"}</span>}
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
            <span className="text-xs font-bold text-slate-500">{language === "pt" ? "Filtro de Urgência:" : "Urgency Filter:"}</span>
            <button
              onClick={() => setExpiryThreshold(30)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${expiryThreshold === 30 ? "bg-red-600 text-white" : "bg-white border text-slate-600"
                }`}
            >
              {t("alerts.urgencyCritical")}
            </button>
            <button
              onClick={() => setExpiryThreshold(60)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${expiryThreshold === 60 ? "bg-amber-500 text-white" : "bg-white border text-slate-600"
                }`}
            >
              {t("alerts.urgencyWarning")}
            </button>
            <button
              onClick={() => setExpiryThreshold(90)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${expiryThreshold === 90 ? "bg-purple-600 text-white" : "bg-white border text-slate-600"
                }`}
            >
              {t("alerts.urgencyAll")}
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="p-3">SKU</th>
                    <th className="p-3">{language === "pt" ? "Descrição do Medicamento" : "Product Description"}</th>
                    <th className="p-3">{t("alerts.batchNumber")}</th>
                    <th className="p-3">{t("alerts.expiryDate")}</th>
                    <th className="p-3 text-center">{t("alerts.daysRemaining")}</th>
                    <th className="p-3 text-right">{t("alerts.inStockQuantity")}</th>
                    <th className="p-3 text-right">{t("alerts.stockValue")}</th>
                    <th className="p-3 text-center">{t("action")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {nearExpiry.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-400">
                        {t("alerts.noExpiry")}
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
                            {it.days_remaining} {language === "pt" ? "Dias" : "Days"}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="font-extrabold text-slate-900">
                            {it.units.toLocaleString()} {t("units")} {it.cartons > 0 ? `(${it.cartons} ${t("ctns")})` : ""}
                          </div>
                          {it.depleted_units > 0 && (
                            <div className="text-[10px] text-slate-400 font-medium">
                              {it.depleted_units.toLocaleString()} {t("alerts.depletedFefo")}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-700">
                          {formatCurrency(it.value_aoa)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => alert(language === "pt" ? `Lote ${it.batch_number} sinalizado para ação ou quarentena.` : `Batch ${it.batch_number} flagged for clearance/quarantine order.`)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer"
                          >
                            {t("alerts.flagAction")}
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

      {/* Print-Only Quality Review Sign-off Section */}
      <div className="print-only-block mt-8 pt-4 border-t border-slate-400">
        <div className="grid grid-cols-3 gap-8 text-xs text-slate-700">
          <div>
            <p className="font-bold mb-10">{language === "pt" ? "Supervisor de Inventário do Armazém:" : "Warehouse Inventory Supervisor:"}</p>
            <div className="border-t border-slate-600 pt-1">{language === "pt" ? "Assinatura / Data" : "Signature / Date"}</div>
          </div>
          <div>
            <p className="font-bold mb-10">{language === "pt" ? "Responsável pelo Controlo de Qualidade:" : "Quality Assurance Officer:"}</p>
            <div className="border-t border-slate-600 pt-1">{language === "pt" ? "Assinatura / Data" : "Signature / Date"}</div>
          </div>
          <div>
            <p className="font-bold mb-10">{language === "pt" ? "Supervisão de Operações da Sede (HQ):" : "HQ Operations Oversight:"}</p>
            <div className="border-t border-slate-600 pt-1">{language === "pt" ? "Carimbo e Selo" : "Stamp & Seal"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

