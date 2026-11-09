import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { apiRequest } from "../services/api";
import { Boxes, Box, Store, Search, CheckCircle2, AlertTriangle, Save, RotateCcw, Trash2 } from "lucide-react";

export default function StockCountingPage() {
  const { user, activeWarehouse } = useAuth();
  const { language, t } = useLanguage();
  
  // Determine initial mode based on user role
  const initialMode =
    user?.role?.code === "CARTON_STAFF"
      ? "CARTON"
      : user?.role?.code === "LOOSE_STAFF"
      ? "LOOSE"
      : user?.role?.code === "DISPLAY_STAFF"
      ? "DISPLAY"
      : "CARTON";

  const [countMode, setCountMode] = useState(initialMode);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [countInput, setCountInput] = useState(0);
  const [displayReason, setDisplayReason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [mySubmissions, setMySubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const displayReasons = [
    { key: "BROKEN_DISPLAY", label: language === "pt" ? "Danificado / Quebrado na Área de Exposição" : "Broken / Damaged on Display Floor" },
    { key: "EXPIRED_SHOWCASE", label: language === "pt" ? "Expirado na Prateleira de Exposição" : "Expired on Showcase Shelf" },
    { key: "CUSTOMER_SAMPLING", label: language === "pt" ? "Amostra Autorizada a Médico / Cliente" : "Authorized Doctor / Customer Sampling" },
    { key: "REPLACED_BATCH", label: language === "pt" ? "Substituído por Lote Novo do Estoque" : "Replaced with Fresh Batch from Stock" },
    { key: "AUDIT_CORRECTION", label: language === "pt" ? "Correção de Erro de Contagem Anterior" : "Previous Day Miscount Correction" },
  ];

  // Load products & submissions
  useEffect(() => {
    apiRequest("/counts/products")
      .then((data) => {
        setProducts(data);
        if (data.length > 0) {
          setSelectedProduct(data[0]);
        }
      })
      .catch((err) => console.log(err));

    loadSubmissions();
  }, [countMode]);

  function loadSubmissions() {
    apiRequest(`/counts/my-submissions?count_type=${countMode}`)
      .then((data) => setMySubmissions(data))
      .catch((err) => console.log(err));
  }

  async function handleSubmit(e) {
    if (e?.preventDefault) e.preventDefault();
    if (!selectedProduct) return;

    if (countMode === "DISPLAY" && countInput !== 5 && !displayReason) {
      alert("Display quantity has changed! A valid justification reason is required.");
      return;
    }

    setLoading(true);
    try {
      await apiRequest("/counts/submit", "POST", {
        product_id: selectedProduct.id,
        count_type: countMode,
        quantity: parseInt(countInput, 10),
        change_reason_key: countMode === "DISPLAY" ? displayReason : null,
      });

      setSuccessMsg(`Submitted ${countInput} ${countMode.toLowerCase()}s for ${selectedProduct.name}!`);
      setTimeout(() => setSuccessMsg(""), 3500);
      setCountInput(0);
      setDisplayReason("");
      loadSubmissions();
    } catch (err) {
      alert("Submission error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteSubmission(submissionId) {
    if (!confirm(t("counting.deleteConfirm"))) return;
    try {
      await apiRequest(`/counts/${submissionId}`, "DELETE");
      loadSubmissions();
    } catch (err) {
      alert("Error removing count: " + err.message);
    }
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">{t("counting.title")}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === "pt" ? "Sessão iniciada como" : "Logged in as"} <span className="font-bold text-purple-700">{user?.full_name}</span> ({user?.role?.name}) • {activeWarehouse?.name}
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setCountMode("CARTON")}
            disabled={user?.role?.code === "LOOSE_STAFF" || user?.role?.code === "DISPLAY_STAFF"}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
              countMode === "CARTON"
                ? "bg-white text-purple-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900 disabled:opacity-40"
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>{t("counting.tabCarton")}</span>
          </button>
          <button
            onClick={() => setCountMode("LOOSE")}
            disabled={user?.role?.code === "CARTON_STAFF" || user?.role?.code === "DISPLAY_STAFF"}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
              countMode === "LOOSE"
                ? "bg-white text-pink-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900 disabled:opacity-40"
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>{t("counting.tabLoose")}</span>
          </button>
          <button
            onClick={() => setCountMode("DISPLAY")}
            disabled={user?.role?.code === "CARTON_STAFF" || user?.role?.code === "LOOSE_STAFF"}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
              countMode === "DISPLAY"
                ? "bg-white text-emerald-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900 disabled:opacity-40"
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>{t("counting.tabDisplay")}</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Counting Terminal Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Select & Enter Count (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700">
              {language === "pt" ? "1. Selecionar Medicamento para Contar" : "1. Select Product to Count"}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder={t("counting.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-purple-600 bg-slate-50"
              />
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1 pr-1 border border-slate-100 rounded-xl p-1.5">
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                    selectedProduct?.id === p.id
                      ? "bg-purple-50 text-purple-900 font-bold border border-purple-200"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div>
                    <div>{p.name}</div>
                    <div className="text-[10px] text-slate-400">{p.sku} • {p.category}</div>
                  </div>
                  <div className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">
                    1 Ctn = {p.units_per_carton} Pcs
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedProduct && (
            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100 space-y-4">
              <div className="flex items-center justify-between border-b border-purple-100/80 pb-2">
                <div>
                  <div className="text-xs font-bold text-purple-950">{selectedProduct.name}</div>
                  <div className="text-[10px] text-purple-700">{selectedProduct.sku} • Specification: {selectedProduct.units_per_carton} Units / Carton</div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold uppercase">
                  {countMode} MODE
                </span>
              </div>

              {/* Special Display Mode Info */}
              {countMode === "DISPLAY" && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{language === "pt" ? "Estoque de Exposição Inicial (Automático):" : "Opening Display Stock (Auto-rolled):"}</span>
                    <span className="font-extrabold text-amber-950 px-2 py-0.5 rounded-sm bg-amber-100">5 {t("units")}</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    {language === "pt"
                      ? "O estoque de exposição é fixo. Se introduzir um valor diferente de 5, selecione um motivo aprovado abaixo."
                      : "Display stock is fixed. If entering an amount other than 5, you must select an approved reason below."}
                  </p>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-amber-800 block mb-1">
                      {language === "pt" ? "Motivo da Variação de Exposição (Obrigatório se alterado):" : "Reason for Display Variance (Mandatory if Changed):"}
                    </label>
                    <select
                      value={displayReason}
                      onChange={(e) => setDisplayReason(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg bg-white border border-amber-200"
                    >
                      <option value="">{language === "pt" ? "Selecione um motivo aprovado..." : "Select an approved reason..."}</option>
                      {displayReasons.map((dr) => (
                        <option key={dr.key} value={dr.key}>
                          {dr.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Stepper Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">
                  {language === "pt" ? "2. Inserir Quantidade Física Contada:" : "2. Enter Counted Physical Quantity:"}
                </label>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setCountInput(Math.max(0, countInput - 10))}
                    className="px-3.5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-700 cursor-pointer"
                  >
                    -10
                  </button>
                  <button
                    onClick={() => setCountInput(Math.max(0, countInput - 1))}
                    className="px-3.5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-700 cursor-pointer"
                  >
                    -1
                  </button>
                  <input
                    type="number"
                    value={countInput}
                    onChange={(e) => setCountInput(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-32 py-3 text-center text-2xl font-black text-slate-900 rounded-xl border border-purple-300 focus:outline-none focus:border-purple-600 bg-white shadow-inner"
                  />
                  <button
                    onClick={() => setCountInput(countInput + 1)}
                    className="px-3.5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-700 cursor-pointer"
                  >
                    +1
                  </button>
                  <button
                    onClick={() => setCountInput(countInput + 10)}
                    className="px-3.5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-700 cursor-pointer"
                  >
                    +10
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCountInput(0)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{language === "pt" ? "Limpar" : "Reset"}</span>
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>
                    {loading
                      ? t("loading")
                      : language === "pt"
                      ? "Guardar e Registar Contagem ↵"
                      : "Save & Submit Count ↵"}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Table: "My Submissions Today" (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t("counting.mySubmissions")}</h3>
              <p className="text-[11px] text-slate-400">
                {language === "pt" ? "Apenas contagens registadas pelo seu utilizador" : "Strictly showing counts entered by you"}
              </p>
            </div>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full">
              {mySubmissions.length} {language === "pt" ? "Registos" : "Entries"}
            </span>
          </div>

          <div className="max-h-[460px] overflow-y-auto space-y-2 pr-1">
            {mySubmissions.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400">
                {t("counting.noSubmissions")}
              </div>
            ) : (
              mySubmissions.map((sub) => (
                <div key={sub.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{sub.product_name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold text-purple-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        {sub.quantity} {sub.count_type}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteSubmission(sub.id)}
                        title="Delete submission"
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{sub.sku} • {sub.category}</span>
                    <span>{sub.created_at}</span>
                  </div>
                  {sub.change_reason && (
                    <div className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-sm inline-block">
                      Reason: {sub.change_reason}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

