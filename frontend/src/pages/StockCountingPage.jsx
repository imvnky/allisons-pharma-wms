import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";
import {
  Boxes,
  Box,
  Store,
  Search,
  CheckCircle2,
  AlertTriangle,
  Save,
  RotateCcw,
  Plus,
  Minus,
  Sparkles,
  Info,
  Clock,
  History
} from "lucide-react";

export default function StockCountingPage() {
  const { user, activeWarehouse } = useAuth();

  // Initial mode based on user role
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
    { key: "BROKEN_DISPLAY", label: "Broken / Damaged on Display Floor" },
    { key: "EXPIRED_SHOWCASE", label: "Expired on Showcase Shelf" },
    { key: "CUSTOMER_SAMPLING", label: "Authorized Doctor / Customer Sampling" },
    { key: "REPLACED_BATCH", label: "Replaced with Fresh Batch from Stock" },
    { key: "AUDIT_CORRECTION", label: "Previous Day Miscount Correction" },
  ];

  useEffect(() => {
    apiRequest("/counts/products")
      .then((data) => {
        setProducts(data || []);
        if (data?.length > 0) {
          setSelectedProduct(data[0]);
        }
      })
      .catch(console.log);

    loadSubmissions();
  }, [countMode]);

  function loadSubmissions() {
    apiRequest(`/counts/my-submissions?count_type=${countMode}`)
      .then((data) => setMySubmissions(data || []))
      .catch(console.log);
  }

  async function handleSubmit(e) {
    e.preventDefault();
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

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const packSize = selectedProduct?.pack_size || 1;
  const calculatedPieces =
    countMode === "CARTON"
      ? (parseInt(countInput, 10) || 0) * packSize
      : parseInt(countInput, 10) || 0;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Boxes className="w-5 h-5 text-indigo-600" />
              <span>Floor Stock Counting Terminal</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
              {activeWarehouse?.name || "Mulemba"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Logged in as <span className="font-bold text-slate-900">{user?.full_name}</span> ({user?.role?.name})
          </p>
        </div>

        {/* Mode Selector Tabs (PaceUI Light Pills) */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold shadow-2xs">
          <button
            onClick={() => setCountMode("CARTON")}
            disabled={user?.role?.code === "LOOSE_STAFF" || user?.role?.code === "DISPLAY_STAFF"}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              countMode === "CARTON"
                ? "bg-white text-indigo-700 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900 disabled:opacity-40"
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Carton Floor</span>
          </button>
          <button
            onClick={() => setCountMode("LOOSE")}
            disabled={user?.role?.code === "CARTON_STAFF" || user?.role?.code === "DISPLAY_STAFF"}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              countMode === "LOOSE"
                ? "bg-white text-blue-700 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900 disabled:opacity-40"
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>Loose Units</span>
          </button>
          <button
            onClick={() => setCountMode("DISPLAY")}
            disabled={user?.role?.code === "CARTON_STAFF" || user?.role?.code === "LOOSE_STAFF"}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              countMode === "DISPLAY"
                ? "bg-white text-purple-700 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900 disabled:opacity-40"
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Display Floor</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Terminal Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Select & Enter Count (7 cols) */}
        <div className="lg:col-span-7 bento-card p-6 space-y-5">
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              1. Select Medicine SKU
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Scan barcode or type medicine name / SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder:text-slate-400"
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1 border border-slate-100 rounded-xl p-1.5 bg-slate-50/50">
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    selectedProduct?.id === p.id
                      ? "bg-indigo-50/80 text-indigo-900 font-bold border border-indigo-200/90 shadow-2xs"
                      : "hover:bg-slate-100/70 text-slate-700"
                  }`}
                >
                  <div>
                    <div className="font-bold">{p.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {p.sku} • Pack Size: {p.pack_size} units
                    </div>
                  </div>
                  <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded-md font-semibold text-slate-600">
                    Aisle B-0{p.id % 4 + 1}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Active Product Details & Calculation */}
          {selectedProduct && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                <div>
                  <div className="text-xs font-bold text-slate-900">{selectedProduct.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    SKU: {selectedProduct.sku} • Therapeutic Line: Essential Generic
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Pack Multiplier</div>
                  <div className="text-xs font-black text-indigo-700">{packSize} units / ctn</div>
                </div>
              </div>

              {/* Display Auto-Roll Banner */}
              {countMode === "DISPLAY" && (
                <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 text-xs text-purple-900 flex items-start gap-2">
                  <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Opening Display Rolled:</span> Previous closing display stock (
                    <span className="font-black">5 units</span>) is auto-carried forward into today's opening.
                    If count is changed, select an authorized reason code below.
                  </div>
                </div>
              )}

              {/* Quantity Counter */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  2. Enter Physical Quantity ({countMode.toLowerCase()}s)
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-slate-200 rounded-xl bg-white shadow-2xs overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setCountInput(Math.max(0, parseInt(countInput || 0, 10) - 1))}
                      className="p-3 hover:bg-slate-50 text-slate-600 border-r border-slate-100 cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={countInput}
                      onChange={(e) => setCountInput(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-24 text-center font-mono font-black text-lg py-2 focus:outline-none text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setCountInput(parseInt(countInput || 0, 10) + 1)}
                      className="p-3 hover:bg-slate-50 text-slate-600 border-l border-slate-100 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quick Increment Chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[5, 10, 25, 50, 100].map((step) => (
                      <button
                        key={step}
                        type="button"
                        onClick={() => setCountInput(parseInt(countInput || 0, 10) + step)}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors shadow-2xs cursor-pointer"
                      >
                        +{step}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCountInput(0)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-500 transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Live Formula Preview Box */}
                <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs mt-3">
                  <div className="text-slate-500">
                    {countMode === "CARTON" ? (
                      <span>
                        {countInput} Cartons × {packSize} pack size =
                      </span>
                    ) : (
                      <span>Direct physical units =</span>
                    )}
                  </div>
                  <div className="font-mono text-sm font-black text-indigo-700">
                    {calculatedPieces.toLocaleString()} Total Pieces
                  </div>
                </div>
              </div>

              {/* Display Reason Code Dropdown (Conditional) */}
              {countMode === "DISPLAY" && (
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <span>3. Justification Reason</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <select
                    value={displayReason}
                    onChange={(e) => setDisplayReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="">-- Select reason for showcase quantity variance --</option>
                    {displayReasons.map((dr) => (
                      <option key={dr.key} value={dr.key}>
                        {dr.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                {loading ? (
                  <span>Recording Count...</span>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Submit Verified Physical Count</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Submission History & Isolation Verification (5 cols) */}
        <div className="lg:col-span-5 bento-card p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <History className="w-4 h-4 text-indigo-600" />
                <span>My Audit Submissions</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Strict isolated audit log for {user?.full_name}
              </p>
            </div>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
              {mySubmissions.length} Today
            </span>
          </div>

          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {mySubmissions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <Boxes className="w-8 h-8 mx-auto text-slate-300" />
                <div className="text-xs font-semibold">No counts submitted yet for {countMode.toLowerCase()}</div>
                <div className="text-[10px]">Select a medicine on the left to begin counting.</div>
              </div>
            ) : (
              mySubmissions.map((sub, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/60 transition-colors flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900">{sub.product_name || "Medicine SKU"}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(sub.created_at).toLocaleTimeString()} • {sub.count_type}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-slate-900">
                      {sub.quantity} {sub.count_type?.toLowerCase()}s
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600">Recorded</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 text-center">
            Isolated Role Scope: You can only record and review counts within your assigned permission stream.
          </div>
        </div>
      </div>
    </div>
  );
}
