import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { apiRequest } from "../services/api";
import {
  ListFilter,
  Plus,
  Check,
  Search,
  Tag,
  CheckCircle2,
  X,
  Sparkles,
  BookOpen
} from "lucide-react";

export default function LookupsManagerPage() {
  const { t } = useLanguage();
  const [lookups, setLookups] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newOrder, setNewOrder] = useState(1);

  useEffect(() => {
    loadLookups();
  }, []);

  function loadLookups() {
    apiRequest("/admin/lookups")
      .then((data) => {
        setLookups(data || []);
        if (data?.length > 0 && !selectedType) {
          setSelectedType(data[0]);
        } else if (selectedType) {
          const updated = data.find((d) => d.type_code === selectedType.type_code);
          if (updated) setSelectedType(updated);
        }
      })
      .catch(console.log);
  }

  async function handleAddValue(e) {
    e.preventDefault();
    if (!selectedType) return;
    try {
      await apiRequest("/admin/lookups/values", "POST", {
        lookup_type_code: selectedType.type_code,
        key: newKey,
        label: newLabel,
        sort_order: parseInt(newOrder, 10),
      });
      alert(`Option "${newLabel}" added successfully!`);
      setAddModal(false);
      setNewKey("");
      setNewLabel("");
      loadLookups();
    } catch (err) {
      alert("Error adding value: " + err.message);
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ListFilter className="w-5 h-5 text-indigo-600" />
              <span>{t("lookups.title", "Master Dropdowns & System Lookups")}</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold">
              Dynamic Dictionary
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Super Admin Control Center • Zero Hardcoded Options • Manage All Selectable Justification Reasons
          </p>
        </div>

        {selectedType && (
          <button
            onClick={() => setAddModal(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t("lookups.addOption", "+ Add Option")}</span>
          </button>
        )}
      </div>

      {/* Split View */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Panel: Categories (4 cols) */}
        <div className="md:col-span-4 bento-card p-4 space-y-3">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-2">
            Configurable Dictionaries ({lookups.length})
          </div>

          <div className="space-y-1">
            {lookups.map((lt) => {
              const isSelected = selectedType?.type_code === lt.type_code;
              return (
                <button
                  key={lt.type_code}
                  onClick={() => setSelectedType(lt)}
                  className={`w-full text-left p-3 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${isSelected
                      ? "bg-indigo-50/80 text-indigo-900 font-bold border border-indigo-200 shadow-2xs"
                      : "hover:bg-slate-50 text-slate-700"
                    }`}
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="truncate">{lt.type_name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{lt.type_code}</div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                    {lt.values?.length || 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Values Grid (8 cols) */}
        <div className="md:col-span-8 bento-card overflow-hidden">
          {selectedType ? (
            <div>
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    {selectedType.type_name}
                  </h2>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedType.type_code}</p>
                </div>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                  {selectedType.values?.length || 0} Available Options
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4 w-16 text-center">{t("lookups.colOrder", "Order")}</th>
                      <th className="py-3 px-4">{t("lookups.colKey", "Database Key")}</th>
                      <th className="py-3 px-4">{t("lookups.colLabel", "Display Label (Shown in UI Dropdown)")}</th>
                      <th className="py-3 px-4 text-center">{t("lookups.colStatus", "Active Status")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {selectedType.values?.map((val) => (
                      <tr key={val.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-400">
                          {val.sort_order}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                          {val.key}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {val.label}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>{t("common.enabled", "Enabled")}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs">
              Select a category on the left to inspect or add options.
            </div>
          )}
        </div>
      </div>

      {/* Add Option Modal */}
      {addModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bento-card max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Add Option to {selectedType?.type_name}</h3>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedType?.type_code}</div>
              </div>
              <button onClick={() => setAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddValue} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Internal Unique Key</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EXPIRED_SHOWCASE"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value.toUpperCase().replace(/\s+/g, "_"))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Human-Readable Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Expired on Showcase Shelf"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Display Sort Order</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newOrder}
                  onChange={(e) => setNewOrder(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs"
                >
                  Save Option
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
