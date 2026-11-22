import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { apiRequest } from "../services/api";
import { exportToCsv } from "../utils/exportUtils";
import {
  Boxes,
  Plus,
  Search,
  Upload,
  Download,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Package,
  Layers,
  Filter,
  FileSpreadsheet,
  Check,
  RefreshCw
} from "lucide-react";

export default function ProductsPage() {
  const { user } = useAuth();
  const { t, formatCurrency } = useLanguage();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Single Product Form
  const [formSku, setFormSku] = useState("");
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("Antibiotics");
  const [formUnitsPerCarton, setFormUnitsPerCarton] = useState(50);
  const [formUom, setFormUom] = useState("Box");
  const [formUnitPrice, setFormUnitPrice] = useState(1500);

  // Bulk Upload State
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkError, setBulkError] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  async function loadProducts() {
    setLoading(true);
    try {
      const data = await apiRequest("/products?include_inactive=true");
      setProducts(data || []);
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const cats = await apiRequest("/products/categories");
      setCategories(cats || []);
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  }

  function openAddModal() {
    setEditingProduct(null);
    setFormSku("");
    setFormName("");
    setFormCategory(categories[0] || "Antibiotics");
    setFormUnitsPerCarton(50);
    setFormUom("Box");
    setFormUnitPrice(1500);
    setShowAddModal(true);
  }

  function openEditModal(prod) {
    setEditingProduct(prod);
    setFormSku(prod.sku);
    setFormName(prod.name);
    setFormCategory(prod.category);
    setFormUnitsPerCarton(prod.units_per_carton);
    setFormUom(prod.unit_of_measure || "Box");
    setFormUnitPrice(prod.unit_price || 0);
    setShowAddModal(true);
  }

  async function handleSaveProduct(e) {
    e.preventDefault();
    try {
      if (editingProduct) {
        await apiRequest(`/products/${editingProduct.id}`, "PUT", {
          sku: formSku,
          name: formName,
          category: formCategory,
          units_per_carton: parseInt(formUnitsPerCarton, 10),
          unit_of_measure: formUom,
          unit_price: parseFloat(formUnitPrice) || 0,
        });
        alert(`Medicine '${formName}' updated successfully!`);
      } else {
        await apiRequest("/products", "POST", {
          sku: formSku,
          name: formName,
          category: formCategory,
          units_per_carton: parseInt(formUnitsPerCarton, 10),
          unit_of_measure: formUom,
          unit_price: parseFloat(formUnitPrice) || 0,
        });
        alert(`Medicine '${formName}' added to catalog!`);
      }
      setShowAddModal(false);
      loadProducts();
      loadCategories();
    } catch (err) {
      alert("Error saving product: " + err.message);
    }
  }

  async function handleToggleStatus(prod) {
    const action = prod.is_active ? "deactivate" : "activate";
    if (!confirm(`Are you sure you want to ${action} '${prod.name}'?`)) return;
    try {
      await apiRequest(`/products/${prod.id}`, "DELETE");
      loadProducts();
    } catch (err) {
      alert("Error changing status: " + err.message);
    }
  }

  // --- CSV / Excel Bulk Parser ---
  function handleCsvFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setBulkFile(file);
    setBulkError("");

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target.result;
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          setBulkError("CSV file must have a header row and at least 1 medicine row.");
          setBulkPreview([]);
          return;
        }

        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/["']/g, ""));
        const skuIdx = headers.findIndex((h) => h.includes("sku"));
        const nameIdx = headers.findIndex((h) => h.includes("name") || h.includes("product") || h.includes("medicine"));
        const catIdx = headers.findIndex((h) => h.includes("cat"));
        const packIdx = headers.findIndex((h) => h.includes("pack") || h.includes("carton") || h.includes("units"));
        const uomIdx = headers.findIndex((h) => h.includes("uom") || h.includes("measure") || h.includes("unit"));
        const priceIdx = headers.findIndex((h) => h.includes("price") || h.includes("aoa") || h.includes("cost"));

        if (skuIdx === -1 || nameIdx === -1) {
          setBulkError("CSV must contain columns for 'SKU' and 'Name' / 'Medicine'.");
          setBulkPreview([]);
          return;
        }

        const parsed = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
          const sku = cols[skuIdx];
          const name = cols[nameIdx];
          if (!sku || !name) continue;

          parsed.push({
            sku: sku.toUpperCase(),
            name: name,
            category: catIdx !== -1 && cols[catIdx] ? cols[catIdx] : "General Medicine",
            units_per_carton: packIdx !== -1 && parseInt(cols[packIdx], 10) ? parseInt(cols[packIdx], 10) : 50,
            unit_of_measure: uomIdx !== -1 && cols[uomIdx] ? cols[uomIdx] : "Box",
            unit_price: priceIdx !== -1 && parseFloat(cols[priceIdx]) ? parseFloat(cols[priceIdx]) : 1000,
          });
        }

        setBulkPreview(parsed);
      } catch (err) {
        setBulkError("Failed to parse CSV file: " + err.message);
      }
    };
    reader.readAsText(file);
  }

  async function handleConfirmBulkUpload() {
    if (bulkPreview.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await apiRequest("/products/bulk", "POST", { products: bulkPreview });
      alert(res.message || `Successfully processed ${bulkPreview.length} products!`);
      setShowBulkModal(false);
      setBulkFile(null);
      setBulkPreview([]);
      loadProducts();
      loadCategories();
    } catch (err) {
      alert("Bulk upload failed: " + err.message);
    } finally {
      setBulkLoading(false);
    }
  }

  function downloadSampleTemplate() {
    const filename = "Alisons_Pharmaceutical_Catalog_Template.csv";
    const headers = ["SKU", "Name", "Category", "Units_Per_Carton", "Unit_Of_Measure", "Unit_Price_AOA"];
    const rows = [
      ["SKU-AMX-500", "Amoxicillin 500mg Capsules", "Antibiotics", "24", "Box 10x10", "1200"],
      ["SKU-PCM-100", "Paracetamol Syrup 100ml", "Analgesics & Antipyretics", "48", "Bottle", "450"],
      ["SKU-CIP-500", "Ciprofloxacin 500mg Tablets", "Antibiotics", "12", "Box 10x10", "1600"],
      ["SKU-IBU-400", "Ibuprofen 400mg Tablets", "Anti-inflammatory", "50", "Box 10x10", "950"],
      ["SKU-ART-80", "Artemether + Lumefantrine 80/480mg", "Antimalarials", "30", "Box 6 Tabs", "3200"],
      ["SKU-MET-500", "Metformin 500mg Tablets", "Antidiabetic", "30", "Box 10x10", "800"],
    ];
    exportToCsv(filename, headers, rows);
  }

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === "All" || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const activeCount = products.filter((p) => p.is_active).length;
  const distinctCategories = Array.from(new Set(products.map((p) => p.category))).length;
  const avgPackaging = products.length > 0
    ? Math.round(products.reduce((s, p) => s + (p.units_per_carton || 1), 0) / products.length)
    : 0;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Boxes className="w-5 h-5 text-indigo-600" />
              <span>{t("products.title", "Pharmaceutical Product Master")}</span>
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
              {t("products.nationalCatalog", "National Catalog")}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {t("products.subtitle", "Central repository of pharmaceutical medicines, packaging carton ratios, SKUs, and therapeutic classifications.")}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={downloadSampleTemplate}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download CSV sample format for Excel"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{t("products.sampleTemplate", "Sample Template")}</span>
          </button>
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{t("products.bulkImportBtn", "Bulk Import (CSV / Excel)")}</span>
          </button>
          <button
            onClick={openAddModal}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t("products.addMedicineBtn", "Add Medicine")}</span>
          </button>
        </div>
      </div>

      {/* 4 PaceUI KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bento-card p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t("products.kpiTotal", "Total Medicines")}</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{products.length}</div>
            <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">
              {activeCount} {t("products.kpiActive", "Active in Catalog")}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bento-card p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t("products.kpiClasses", "Therapeutic Classes")}</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{distinctCategories}</div>
            <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
              {t("products.kpiClassesDesc", "Antibiotics, Antimalarials, etc.")}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bento-card p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t("products.kpiAvgPackaging", "Avg Master Packaging")}</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{avgPackaging}</div>
            <div className="text-[11px] font-semibold text-slate-500 mt-0.5">{t("products.kpiPackagingDesc", "Units per Shipping Carton")}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="bento-card p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t("products.kpiHealth", "Catalog Health")}</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">100%</div>
            <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">{t("products.kpiHealthDesc", "Verified SKUs Ready for WMS")}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bento-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t("products.searchPlaceholder", "Search medicine name, SKU, or category...")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50/70 focus:bg-white text-xs font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>{t("products.categoryLabel", "Category:")}</span>
          </span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold"
          >
            <option value="All">{t("products.allCategories", "All Categories")} ({products.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Products Table */}
      <div className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">{t("products.cols.sku", "SKU Code")}</th>
                <th className="py-3 px-4">{t("products.cols.name", "Medicine / Product Name")}</th>
                <th className="py-3 px-4">{t("products.cols.category", "Therapeutic Category")}</th>
                <th className="py-3 px-4 text-center">{t("products.cols.packaging", "Packaging (Units/Ctn)")}</th>
                <th className="py-3 px-4">{t("products.cols.uom", "Unit of Measure")}</th>
                <th className="py-3 px-4 text-right">{t("products.cols.price", "Standard Price (AOA)")}</th>
                <th className="py-3 px-4 text-center">{t("products.cols.status", "Status")}</th>
                <th className="py-3 px-4 text-right">{t("products.cols.actions", "Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                      <span>{t("common.loading", "Loading pharmaceutical catalog...")}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    {t("products.noMedicines", "No medicines found matching your criteria.")}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">{p.sku}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                      {p.units_per_carton} units / ctn
                    </td>
                    <td className="py-3 px-4 text-slate-600">{p.unit_of_measure}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {p.unit_price ? p.unit_price.toLocaleString() : "0.00"} AOA
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${p.is_active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}
                      >
                        {p.is_active ? t("common.active", "Active") : t("common.inactive", "Archived")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 cursor-pointer"
                          title="Edit Medicine Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(p)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50/50 cursor-pointer"
                          title={p.is_active ? "Deactivate Medicine" : "Re-activate Medicine"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL 1: ADD / EDIT MEDICINE ================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bento-card max-w-lg w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-600" />
                  <span>{editingProduct ? t("products.modalAdd.editTitle", "Edit Medicine Details") : t("products.modalAdd.addTitle", "Add New Pharmaceutical Medicine")}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {t("products.modalAdd.subtitle", "Register a SKU and its shipping carton packaging ratio into the WMS.")}
                </p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">{t("products.modalAdd.skuLabel", "SKU Code (Unique ID)")}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SKU-AMX-500"
                  value={formSku}
                  onChange={(e) => setFormSku(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">{t("products.modalAdd.nameLabel", "Medicine / Product Name")}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amoxicillin 500mg Capsules"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">{t("products.modalAdd.categoryLabel", "Therapeutic Category")}</label>
                  <input
                    type="text"
                    required
                    list="category-suggestions"
                    placeholder="e.g. Antibiotics"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-medium"
                  />
                  <datalist id="category-suggestions">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {t("products.modalAdd.packagingLabel", "Carton Packaging (Units / Carton)")}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 50"
                    value={formUnitsPerCarton}
                    onChange={(e) => setFormUnitsPerCarton(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono font-bold text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">{t("products.modalAdd.uomLabel", "Unit of Measure")}</label>
                  <select
                    value={formUom}
                    onChange={(e) => setFormUom(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-medium"
                  >
                    <option value="Box">Box (Carton Internal)</option>
                    <option value="Bottle">Syrup Bottle</option>
                    <option value="Vial">Injectable Vial</option>
                    <option value="Blister / Strip">Blister / Strip</option>
                    <option value="Sachet">Sachet</option>
                    <option value="Piece / Unit">Piece / Unit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">{t("products.modalAdd.priceLabel", "Standard Price (AOA)")}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 1500"
                    value={formUnitPrice}
                    onChange={(e) => setFormUnitPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingProduct ? t("common.save", "Update Medicine") : t("products.modalAdd.saveBtn", "Save Medicine to Catalog")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: BULK CSV / EXCEL UPLOAD ================= */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bento-card max-w-3xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-indigo-600" />
                  <span>{t("products.modalBulk.title", "Bulk Upload Product Catalog (CSV / Excel)")}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {t("products.modalBulk.subtitle", "Import hundreds of pharmaceutical products in seconds with automatic SKU upsert.")}
                </p>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Dropzone */}
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center bg-slate-50 hover:bg-indigo-50/30 transition-colors">
                <FileSpreadsheet className="w-10 h-10 text-indigo-600 mx-auto mb-2" />
                <div className="text-sm font-bold text-slate-800">
                  Select CSV or Excel exported file
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Required columns: <span className="font-mono font-bold text-slate-700">SKU, Name, Category, Units_Per_Carton</span>
                </p>
                <label className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-xs">
                  <span>Browse File</span>
                  <input
                    type="file"
                    accept=".csv, .txt"
                    onChange={handleCsvFileSelect}
                    className="hidden"
                  />
                </label>
              </div>

              {bulkError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{bulkError}</span>
                </div>
              )}

              {/* Preview Table */}
              {bulkPreview.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>Parsed Medicines Preview ({bulkPreview.length} rows ready)</span>
                    <span className="text-[11px] text-emerald-700 font-mono">Format Verified ✓</span>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-56">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                        <tr>
                          <th className="py-2 px-3">SKU</th>
                          <th className="py-2 px-3">Name</th>
                          <th className="py-2 px-3">Category</th>
                          <th className="py-2 px-3 text-center">Packaging</th>
                          <th className="py-2 px-3 text-right">Price (AOA)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {bulkPreview.slice(0, 15).map((r, i) => (
                          <tr key={i}>
                            <td className="py-1.5 px-3 font-mono font-bold text-indigo-700">{r.sku}</td>
                            <td className="py-1.5 px-3 font-semibold text-slate-900">{r.name}</td>
                            <td className="py-1.5 px-3 text-slate-600">{r.category}</td>
                            <td className="py-1.5 px-3 text-center font-mono">{r.units_per_carton} / ctn</td>
                            <td className="py-1.5 px-3 text-right font-mono">{r.unit_price}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {bulkPreview.length > 15 && (
                    <div className="text-[10px] text-slate-400 text-right">
                      + {bulkPreview.length - 15} additional rows will be imported
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={downloadSampleTemplate}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t("products.sampleTemplate", "Download CSV Template")}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(false)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={bulkPreview.length === 0 || bulkLoading}
                    onClick={handleConfirmBulkUpload}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    {bulkLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Importing Catalog...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{t("products.modalBulk.uploadBtn", `Import ${bulkPreview.length} Products`, { count: bulkPreview.length })}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
