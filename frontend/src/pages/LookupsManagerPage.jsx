import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";
import { ListFilter, Plus, Check, Search, Tag, CheckCircle2 } from "lucide-react";

export default function LookupsManagerPage() {
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
        setLookups(data);
        if (data.length > 0 && !selectedType) {
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
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ListFilter className="w-6 h-6 text-purple-600" />
            <span>Master Dropdowns & Lookup Dictionaries</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Super Admin Control Center • Zero Hardcoded Options • Manage All System Selectables
          </p>
        </div>

        {selectedType && (
          <button
            onClick={() => setAddModal(true)}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Option to {selectedType.type_name}</span>
          </button>
        )}
      </div>

      {/* Split View */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Panel: Categories (4 cols) */}
        <div className="md:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">
            Dropdown Categories ({lookups.length})
          </div>

          <div className="space-y-1">
            {lookups.map((lt) => {
              const isSelected = selectedType?.type_code === lt.type_code;
              return (
                <button
                  key={lt.type_code}
                  onClick={() => setSelectedType(lt)}
                  className={`w-full text-left p-3 rounded-xl text-xs flex items-center justify-between transition-colors ${isSelected
                    ? "bg-purple-50 text-purple-900 font-bold border border-purple-200"
                    : "hover:bg-slate-50 text-slate-700"
                    }`}
                >
                  <div className="space-y-0.5">
                    <div>{lt.type_name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{lt.type_code}</div>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {lt.values.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Values Grid (8 cols) */}
        <div className="md:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {selectedType ? (
            <div>
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {selectedType.type_name}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">{selectedType.type_code}</p>
                </div>
                <span className="text-xs text-slate-500 font-semibold">{selectedType.values.length} Options Defined</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="p-3 w-16">Sort</th>
                      <th className="p-3">Display Label (Shown in Dropdowns)</th>
                      <th className="p-3">System Key / Code</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedType.values.map((val) => (
                      <tr key={val.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-slate-400">#{val.sort_order}</td>
                        <td className="p-3 font-bold text-slate-900">{val.label}</td>
                        <td className="p-3 font-mono text-purple-700">{val.key}</td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            Active 🟢
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs">Select a category on the left.</div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {addModal && selectedType && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAddValue} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add Option to {selectedType.type_name}</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Display Label (User Facing):</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Water Damage During Transit"
                  value={newLabel}
                  onChange={(e) => {
                    setNewLabel(e.target.value);
                    setNewKey(e.target.value.toUpperCase().replace(/\s+/g, "_"));
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">System Key (DB Code):</label>
                <input
                  type="text"
                  required
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-purple-800"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Sort Order:</label>
                <input
                  type="number"
                  value={newOrder}
                  onChange={(e) => setNewOrder(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAddModal(false)}
                className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
              >
                Save & Deploy Option
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

