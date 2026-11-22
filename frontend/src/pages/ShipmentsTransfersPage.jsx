import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { apiRequest } from "../services/api";
import { exportToCsv } from "../utils/exportUtils";
import {
  Ship,
  ArrowLeftRight,
  Plus,
  CheckCircle2,
  Truck,
  Calendar,
  Check,
  AlertCircle,
  X,
  Package,
  Clock,
  ArrowRight,
  Printer,
  FileSpreadsheet,
  Trash2,
  Plane,
  Eye,
  FileText
} from "lucide-react";

export default function ShipmentsTransfersPage() {
  const { user, activeWarehouse } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState("arrivals"); // 'arrivals' | 'transfers'
  const [arrivals, setArrivals] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [addArrivalModal, setAddArrivalModal] = useState(false);
  const [createTransferModal, setCreateTransferModal] = useState(false);
  const [viewTransferModal, setViewTransferModal] = useState(null);
  const [viewArrivalModal, setViewArrivalModal] = useState(null);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);

  // Quick Add Product Form State
  const [quickSku, setQuickSku] = useState("");
  const [quickName, setQuickName] = useState("");
  const [quickCategory, setQuickCategory] = useState("Antibiotics");
  const [quickPackaging, setQuickPackaging] = useState(50);

  // --- SCREENSHOT 2: New Arrival Form State ---
  const [shipmentNumber, setShipmentNumber] = useState("");
  const [arrivalDate, setArrivalDate] = useState(new Date().toISOString().split("T")[0]);
  const [lotSize, setLotSize] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [freightType, setFreightType] = useState("CONTAINER"); // 'CONTAINER' or 'AIRLOT'
  const [containerOrAirlotNo, setContainerOrAirlotNo] = useState("");
  const [trackingBL, setTrackingBL] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [arrivalLines, setArrivalLines] = useState([]);

  // --- SCREENSHOT 1: New Transfer Form State ---
  const [destWarehouseId, setDestWarehouseId] = useState(2);
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split("T")[0]);
  const [driverName, setDriverName] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [transferLines, setTransferLines] = useState([]);

  const [warehouseOptions, setWarehouseOptions] = useState([
    { id: 1, code: "MULEMBA", name: "Mulemba Warehouse (Luanda North)", city: "Luanda" },
    { id: 2, code: "PALANCA", name: "Palanca Warehouse (Luanda South)", city: "Luanda" },
    { id: 3, code: "LOBITO", name: "Lobito Warehouse (Benguela)", city: "Lobito" },
  ]);

  useEffect(() => {
    loadData();

    // Dynamically fetch active warehouses
    apiRequest("/admin/warehouses")
      .then((whs) => {
        if (whs && whs.length > 0) {
          setWarehouseOptions(whs);
          const other = whs.find((w) => w.id !== (activeWarehouse?.id || 1));
          if (other) setDestWarehouseId(other.id);
        }
      })
      .catch(console.warn);

    apiRequest("/counts/products")
      .then((p) => {
        setProducts(p || []);
        if (p && p.length > 0) {
          // Initialize empty line item for arrival
          setArrivalLines([
            {
              product_id: p[0].id,
              packaging: p[0].units_per_carton || 50,
              total_cartons: 0,
              total_units: 0,
              cartons_received: 0,
              units_received: 0,
              shortage_units: 0,
              batch_number: "",
              expiry_date: "2028-12-31",
              remarks: ""
            }
          ]);
          // Initialize empty line item for transfer
          setTransferLines([
            {
              product_id: p[0].id,
              carton_packing: p[0].units_per_carton || 50,
              cartons_dispatched: 0,
              dispatched_qty: 0
            }
          ]);
        }
      })
      .catch(console.error);
  }, [activeWarehouse, tab]);

  async function loadData() {
    setLoading(true);
    try {
      const [arr, trf] = await Promise.all([
        apiRequest("/shipments/arrivals"),
        apiRequest("/shipments/transfers")
      ]);
      setArrivals(arr || []);
      setTransfers(trf || []);
    } catch (err) {
      console.error("Failed to load shipments & transfers:", err);
    } finally {
      setLoading(false);
    }
  }

  // --- Dynamic Transfer Line Items Handlers ---
  function addTransferLine() {
    const first = products[0] || { id: 1, units_per_carton: 50 };
    setTransferLines([
      ...transferLines,
      {
        product_id: first.id,
        carton_packing: first.units_per_carton || 50,
        cartons_dispatched: 5,
        dispatched_qty: 5 * (first.units_per_carton || 50)
      }
    ]);
  }

  function updateTransferLine(index, field, value) {
    const updated = [...transferLines];
    const row = { ...updated[index], [field]: value };

    if (field === "product_id") {
      const prod = products.find((p) => p.id === parseInt(value, 10));
      if (prod) {
        row.carton_packing = prod.units_per_carton || 50;
        row.dispatched_qty = (parseInt(row.cartons_dispatched, 10) || 0) * row.carton_packing;
      }
    } else if (field === "cartons_dispatched" || field === "carton_packing") {
      const cartons = parseInt(field === "cartons_dispatched" ? value : row.cartons_dispatched, 10) || 0;
      const packing = parseInt(field === "carton_packing" ? value : row.carton_packing, 10) || 1;
      row.dispatched_qty = cartons * packing;
    }

    updated[index] = row;
    setTransferLines(updated);
  }

  function removeTransferLine(index) {
    if (transferLines.length === 1) return;
    setTransferLines(transferLines.filter((_, i) => i !== index));
  }

  // --- Dynamic Arrival Line Items Handlers ---
  function addArrivalLine() {
    const first = products[0] || { id: 1, units_per_carton: 50 };
    setArrivalLines([
      ...arrivalLines,
      {
        product_id: first.id,
        packaging: first.units_per_carton || 50,
        total_cartons: 10,
        total_units: 10 * (first.units_per_carton || 50),
        cartons_received: 10,
        units_received: 10 * (first.units_per_carton || 50),
        shortage_units: 0,
        batch_number: `BAT-2026-X${arrivalLines.length + 1}`,
        expiry_date: "2028-12-31",
        remarks: "Verified intact"
      }
    ]);
  }

  function updateArrivalLine(index, field, value) {
    const updated = [...arrivalLines];
    const row = { ...updated[index], [field]: value };

    if (field === "product_id") {
      const prod = products.find((p) => p.id === parseInt(value, 10));
      if (prod) {
        row.packaging = prod.units_per_carton || 50;
      }
    }

    const pkg = parseInt(row.packaging, 10) || 1;
    const totCtns = parseInt(row.total_cartons, 10) || 0;
    const recCtns = parseInt(row.cartons_received, 10) || 0;

    row.total_units = totCtns * pkg;
    row.units_received = recCtns * pkg;
    row.shortage_units = Math.max(0, row.total_units - row.units_received);

    updated[index] = row;
    setArrivalLines(updated);
  }

  function removeArrivalLine(index) {
    if (arrivalLines.length === 1) return;
    setArrivalLines(arrivalLines.filter((_, i) => i !== index));
  }

  // Arrival Live Totals
  const totalManifestCartons = arrivalLines.reduce((s, r) => s + (parseInt(r.total_cartons, 10) || 0), 0);
  const totalManifestUnits = arrivalLines.reduce((s, r) => s + (parseInt(r.total_units, 10) || 0), 0);
  const totalReceivedCartons = arrivalLines.reduce((s, r) => s + (parseInt(r.cartons_received, 10) || 0), 0);
  const totalReceivedUnits = arrivalLines.reduce((s, r) => s + (parseInt(r.units_received, 10) || 0), 0);
  const totalShortageUnits = arrivalLines.reduce((s, r) => s + (parseInt(r.shortage_units, 10) || 0), 0);

  // Transfer Live Totals
  const totalTransferCartons = transferLines.reduce((s, r) => s + (parseInt(r.cartons_dispatched, 10) || 0), 0);
  const totalTransferUnits = transferLines.reduce((s, r) => s + (parseInt(r.dispatched_qty, 10) || 0), 0);

  // --- Submissions ---
  async function handleAddArrival(e) {
    e.preventDefault();
    try {
      const payload = {
        shipment_number: shipmentNumber,
        arrival_date: arrivalDate,
        lot_size: lotSize,
        invoice_number: invoiceNumber,
        freight_type: freightType,
        container_number: containerOrAirlotNo,
        tracking_bl_number: trackingBL,
        supplier_name: supplierName,
        received_date: arrivalDate,
        arrival_type: freightType === "CONTAINER" ? "SEA_SHIPMENT" : "AIR_FREIGHT",
        items: arrivalLines.map((line) => ({
          product_id: parseInt(line.product_id, 10),
          packaging: parseInt(line.packaging, 10) || 1,
          total_cartons: parseInt(line.total_cartons, 10) || 0,
          total_units: parseInt(line.total_units, 10) || 0,
          cartons_received: parseInt(line.cartons_received, 10) || 0,
          units_received: parseInt(line.units_received, 10) || 0,
          shortage_units: parseInt(line.shortage_units, 10) || 0,
          batch_number: line.batch_number || "BAT-GEN-01",
          expiry_date: line.expiry_date || "2028-12-31",
          remarks: line.remarks || ""
        }))
      };

      const res = await apiRequest("/shipments/arrivals", "POST", payload);
      alert(`Shipment Arrival [${res.shipment_number || shipmentNumber}] logged into warehouse stock!`);
      setAddArrivalModal(false);
      loadData();
    } catch (err) {
      alert("Error adding arrival: " + err.message);
    }
  }

  async function handleCreateTransfer(e) {
    e.preventDefault();
    try {
      const payload = {
        to_warehouse_id: parseInt(destWarehouseId, 10),
        transfer_date: transferDate,
        driver_name: driverName,
        vehicle_plate: vehiclePlate,
        notes: transferNotes,
        items: transferLines.map((line) => ({
          product_id: parseInt(line.product_id, 10),
          carton_packing: parseInt(line.carton_packing, 10) || 1,
          cartons_dispatched: parseInt(line.cartons_dispatched, 10) || 0,
          dispatched_qty: parseInt(line.dispatched_qty, 10) || 0,
          batch_number: "BAT-TRF"
        }))
      };

      const res = await apiRequest("/shipments/transfers", "POST", payload);
      alert(`Transfer [${res.transfer_number}] dispatched successfully! Opening Printable Transfer Note.`);
      setCreateTransferModal(false);
      await loadData();

      // Open printable Transfer Paper immediately
      const destWh = warehouseOptions.find((w) => w.id === parseInt(destWarehouseId, 10));
      const newlyCreated = {
        transfer_number: res.transfer_number,
        transfer_date: transferDate,
        from_warehouse_name: activeWarehouse?.name || "Mulemba Warehouse (Luanda North)",
        to_warehouse_name: destWh?.name || "Lobito Warehouse (Benguela)",
        driver_name: driverName,
        vehicle_plate: vehiclePlate,
        notes: transferNotes,
        total_cartons: totalTransferCartons,
        total_units: totalTransferUnits,
        items: transferLines.map((line) => {
          const prod = products.find((p) => p.id === parseInt(line.product_id, 10));
          return {
            product_name: prod?.name || "Pharmaceutical Item",
            sku: prod?.sku || "MED-SKU",
            carton_packing: line.carton_packing,
            cartons_dispatched: line.cartons_dispatched,
            dispatched_qty: line.dispatched_qty
          };
        })
      };
      setViewTransferModal(newlyCreated);
    } catch (err) {
      alert("Error creating transfer: " + err.message);
    }
  }

  async function handleApproveTransfer(transferId) {
    if (!confirm("Confirm physical receipt of stock and approve this transfer into your warehouse?")) return;
    try {
      await apiRequest(`/shipments/transfers/${transferId}/approve`, "POST");
      alert("Transfer approved! Stock auto-added to your Arrivals column.");
      loadData();
    } catch (err) {
      alert("Approval error: " + err.message);
    }
  }

  // --- Excel Exporters ---
  function exportArrivalManifestToExcel(arr) {
    const filename = `Shipment_Arrival_${(arr.shipment_number || "ARR").replace("/", "_")}_${arr.received_date}.csv`;
    const headers = [
      "Shipment Number",
      "Arrival Date",
      "Invoice Number",
      "Freight Mode",
      "Container / Airlot #",
      "BL / AWB #",
      "Supplier / Port",
      "Sr No",
      "Product Name",
      "SKU",
      "Packaging (Units/Ctn)",
      "Total Cartons",
      "Total Units",
      "Received Cartons",
      "Received Units",
      "Shortage Units",
      "Lot / Batch #",
      "Expiry Date",
      "Remarks"
    ];

    const rows = (arr.items || []).map((it, idx) => [
      arr.shipment_number || arr.arrival_number,
      arr.received_date,
      arr.invoice_number,
      arr.freight_type || arr.arrival_type,
      arr.container_number,
      arr.tracking_bl_number,
      arr.supplier_name,
      idx + 1,
      it.product_name,
      it.sku,
      it.packaging,
      it.total_cartons,
      it.total_units,
      it.cartons_received,
      it.units_received,
      it.shortage_units,
      it.batch_number,
      it.expiry_date,
      it.remarks || ""
    ]);

    exportToCsv(filename, headers, rows);
  }

  async function handleQuickAddProduct(e) {
    e.preventDefault();
    try {
      const res = await apiRequest("/products", "POST", {
        sku: quickSku.trim().toUpperCase(),
        name: quickName.trim(),
        category: quickCategory.trim(),
        units_per_carton: parseInt(quickPackaging, 10) || 50,
        unit_of_measure: "Box",
        unit_price: 1000
      });
      alert(`Medicine '${quickName}' added to master catalog!`);
      // Reload products list
      const updatedProducts = await apiRequest("/counts/products");
      setProducts(updatedProducts || []);
      // Auto-append to arrival lines if in arrival mode
      const newPkg = parseInt(quickPackaging, 10) || 50;
      setArrivalLines((prev) => [
        ...prev,
        {
          product_id: res.id,
          packaging: newPkg,
          total_cartons: 10,
          total_units: 10 * newPkg,
          cartons_received: 10,
          units_received: 10 * newPkg,
          shortage_units: 0,
          batch_number: "BAT-NEW-01",
          expiry_date: "2028-12-31",
          remarks: "New SKU registered on intake"
        }
      ]);
      setShowQuickAddModal(false);
      setQuickSku("");
      setQuickName("");
    } catch (err) {
      alert("Error adding product: " + err.message);
    }
  }

  function exportTransferManifestToExcel(trf) {
    const filename = `Transfer_Note_${trf.transfer_number}_${trf.transfer_date}.csv`;
    const headers = [
      "Transfer Number",
      "Transfer Date",
      "From Warehouse",
      "To Warehouse",
      "Driver Name",
      "Vehicle Plate",
      "Sr No",
      "Product Name",
      "SKU",
      "Carton Packing",
      "Quantity of Cartons",
      "Units (Cartons x Packing)",
      "Status"
    ];

    const rows = (trf.items || []).map((it, idx) => [
      trf.transfer_number,
      trf.transfer_date,
      trf.from_warehouse_name,
      trf.to_warehouse_name,
      trf.driver_name,
      trf.vehicle_plate,
      idx + 1,
      it.product_name,
      it.sku,
      it.carton_packing,
      it.cartons_dispatched,
      it.dispatched_qty,
      trf.status
    ]);

    exportToCsv(filename, headers, rows);
  }

  // Helper to extract clean branch name in CAPS for bold header
  function extractDestinationBranch(fullName) {
    if (!fullName) return "BRANCH";
    const upper = fullName.toUpperCase();
    if (upper.includes("LOBITO")) return "LOBITO";
    if (upper.includes("PALANCA")) return "PALANCA";
    if (upper.includes("MULEMBA")) return "MULEMBA";
    return fullName.replace(/\(.*?\)/g, "").trim().toUpperCase();
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Ship className="w-5 h-5 text-indigo-600" />
              <span>{t("shipments.title", "Arrival & Transfer Hub")}</span>
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
              {activeWarehouse?.name || "Mulemba Distribution HQ"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {t("shipments.subtitle", "Port container & airlot verification, Bill of Lading (BL) customs clearance, and inter-branch logistics.")}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setAddArrivalModal(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t("shipments.addArrival", "+ Add Shipment Arrival")}</span>
          </button>
          <button
            onClick={() => setCreateTransferModal(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>{t("shipments.createTransfer", "+ Create Transfer")}</span>
          </button>
        </div>
      </div>

      {/* 4 PaceUI KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bento-card p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Inward Shipments</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{arrivals.length}</div>
            <div className="text-[11px] font-semibold text-emerald-600 mt-0.5 flex items-center gap-1">
              <span>● Containers & Airlots Logged</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Ship className="w-5 h-5" />
          </div>
        </div>

        <div className="bento-card p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Inbound Cargo Units</div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {arrivals.reduce((sum, a) => sum + (a.total_units || 0), 0).toLocaleString()}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
              Across all verified sea & air manifests
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bento-card p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Branch Transfers</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{transfers.length}</div>
            <div className="text-[11px] font-semibold text-indigo-600 mt-0.5">
              {transfers.filter((t) => t.status === "IN_TRANSIT").length} In Transit
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="bento-card p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Unloaded Shortages</div>
            <div className="text-2xl font-black text-rose-600 mt-1">
              {arrivals.reduce((sum, a) => sum + (a.total_shortage_units || 0), 0).toLocaleString()}
            </div>
            <div className="text-[11px] font-semibold text-rose-500 mt-0.5">
              Units short from manifest
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs as PaceUI Pills */}
      <div className="flex items-center justify-between">
        <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold shadow-2xs">
          <button
            onClick={() => setTab("arrivals")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${tab === "arrivals"
              ? "bg-white text-indigo-700 shadow-2xs font-bold"
              : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <Ship className="w-3.5 h-3.5" />
            <span>Shipment Arrivals Manifests ({arrivals.length})</span>
          </button>
          <button
            onClick={() => setTab("transfers")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${tab === "transfers"
              ? "bg-white text-indigo-700 shadow-2xs font-bold"
              : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Inter-Warehouse Transfers & Notes ({transfers.length})</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: ARRIVALS ================= */}
      {tab === "arrivals" && (
        <div className="bento-card overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Ship className="w-4 h-4 text-emerald-600" />
                <span>Verified Sea & Air Shipment Arrivals</span>
              </h3>
              <p className="text-xs text-slate-500">
                Official cargo manifests with expected vs received cartons and automatic shortage calculations.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Shipment #</th>
                  <th className="py-3 px-4">Arrival Date</th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Mode & Number</th>
                  <th className="py-3 px-4">BL / AWB #</th>
                  <th className="py-3 px-4">Supplier / Port</th>
                  <th className="py-3 px-4 text-right">Total Cartons</th>
                  <th className="py-3 px-4 text-right">Received Units</th>
                  <th className="py-3 px-4 text-right">Shortage</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {arrivals.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="py-8 text-center text-slate-400">
                      No shipment arrivals recorded yet. Click "Add Shipment Arrival" to log new cargo.
                    </td>
                  </tr>
                ) : (
                  arrivals.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                        {a.shipment_number || a.arrival_number}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-mono">{a.received_date}</td>
                      <td className="py-3 px-4 font-mono text-slate-800">{a.invoice_number || "INV-N/A"}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {a.freight_type === "AIRLOT" ? (
                            <span className="p-1 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                              <Plane className="w-3 h-3" />
                            </span>
                          ) : (
                            <span className="p-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Ship className="w-3 h-3" />
                            </span>
                          )}
                          <span className="font-mono text-slate-900 font-semibold">
                            {a.container_number || "N/A"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{a.tracking_bl_number}</td>
                      <td className="py-3 px-4 text-slate-700">{a.supplier_name}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                        {a.total_cartons?.toLocaleString() || 0} ctns
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        {a.total_units?.toLocaleString() || 0}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {(a.total_shortage_units || 0) > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                            -{a.total_shortage_units.toLocaleString()} units
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewArrivalModal(a)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 cursor-pointer"
                            title="View Full Arrival Manifest"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => exportArrivalManifestToExcel(a)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50/50 cursor-pointer"
                            title="Export Manifest to Excel"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
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
      )}

      {/* ================= TAB 2: TRANSFERS ================= */}
      {tab === "transfers" && (
        <div className="bento-card overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-600" />
                <span>Inter-Warehouse Consignments & Transfer Notes</span>
              </h3>
              <p className="text-xs text-slate-500">
                Logistics transfers between Luanda (Mulemba, Palanca) and Benguela (Lobito) with physical portrait transfer notes.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Transfer Note #</th>
                  <th className="py-3 px-4">Initiation Date</th>
                  <th className="py-3 px-4">Route</th>
                  <th className="py-3 px-4">Driver & Vehicle</th>
                  <th className="py-3 px-4 text-center">Items</th>
                  <th className="py-3 px-4 text-right">Total Cartons</th>
                  <th className="py-3 px-4 text-right">Total Units</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {transfers.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-8 text-center text-slate-400">
                      No inter-warehouse transfers recorded yet. Click "Create Transfer" to dispatch stock.
                    </td>
                  </tr>
                ) : (
                  transfers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                        {t.transfer_number}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">{t.transfer_date}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                          <span>{t.from_warehouse_name.split(" ")[0]}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="text-indigo-600">{t.to_warehouse_name.split(" ")[0]}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <div>{t.driver_name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{t.vehicle_plate}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {t.items?.length || 0} medicines
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                        {t.total_cartons?.toLocaleString() || 0} ctns
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-indigo-700">
                        {t.total_units?.toLocaleString() || 0}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${t.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                        >
                          {t.status === "APPROVED" ? "Delivered & Approved" : "In Transit"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewTransferModal(t)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/50 flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                            title="Print Physical Transfer Paper (Portrait)"
                          >
                            <Printer className="w-3 h-3 text-indigo-600" />
                            <span>Print Note</span>
                          </button>
                          {t.is_incoming && t.status === "IN_TRANSIT" && (
                            <button
                              onClick={() => handleApproveTransfer(t.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 text-[11px] font-bold shadow-2xs cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL 1: ADD SHIPMENT ARRIVAL (SCREENSHOT 2) ================= */}
      {addArrivalModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bento-card max-w-4xl w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Ship className="w-5 h-5 text-emerald-600" />
                  <span>Add Shipment Arrival</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Log incoming pharmaceutical cargo manifest with expected vs received quantities.
                </p>
              </div>
              <button onClick={() => setAddArrivalModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddArrival} className="space-y-4 text-xs">
              {/* Row 1: Shipment # / Year & Arrival Date & Lot Size & Invoice # */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Number / Year Of Shipment
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="01/26 | 02/26 | 03/26"
                    value={shipmentNumber}
                    onChange={(e) => setShipmentNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Arrival Date</label>
                  <input
                    type="date"
                    required
                    value={arrivalDate}
                    onChange={(e) => setArrivalDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Lot Size</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1,500 Cartons / 20 Pallets"
                    value={lotSize}
                    onChange={(e) => setLotSize(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Invoice Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INV-2026-8812"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono text-xs"
                  />
                </div>
              </div>

              {/* Row 2: Freight Mode (Container vs Airlot) & Number & BL # & Supplier */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Freight Type</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFreightType("CONTAINER")}
                      className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 border transition-colors cursor-pointer ${freightType === "CONTAINER"
                        ? "bg-white text-emerald-700 border-emerald-300 shadow-2xs"
                        : "bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200"
                        }`}
                    >
                      <Ship className="w-3.5 h-3.5" />
                      <span>Container (Sea)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFreightType("AIRLOT")}
                      className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 border transition-colors cursor-pointer ${freightType === "AIRLOT"
                        ? "bg-white text-sky-700 border-sky-300 shadow-2xs"
                        : "bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200"
                        }`}
                    >
                      <Plane className="w-3.5 h-3.5" />
                      <span>Airlot (Air)</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {freightType === "CONTAINER" ? "Container Number" : "Airlot Number"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={freightType === "CONTAINER" ? "MSKU-908124-7" : "AWB-074-88912"}
                    value={containerOrAirlotNo}
                    onChange={(e) => setContainerOrAirlotNo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">BL / AWB Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MEDU-782194"
                    value={trackingBL}
                    onChange={(e) => setTrackingBL(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono text-xs"
                  />
                </div>
              </div>

              {/* Row 3: Multi-product Line Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">
                    Cargo Manifest Products ({arrivalLines.length} line items)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowQuickAddModal(true)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold flex items-center gap-1 cursor-pointer"
                      title="Register an uncataloged medicine on the spot"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Register New SKU</span>
                    </button>
                    <button
                      type="button"
                      onClick={addArrivalLine}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Product Row</span>
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-72">
                  <table className="w-full text-left text-[11px] border-collapse min-w-[900px]">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10">
                      <tr>
                        <th className="py-2 px-2.5">Product</th>
                        <th className="py-2 px-2 text-center">Packaging</th>
                        <th className="py-2 px-2 text-right">Total Ctns</th>
                        <th className="py-2 px-2 text-right">Total Units</th>
                        <th className="py-2 px-2 text-right">Recv Ctns</th>
                        <th className="py-2 px-2 text-right">Recv Units</th>
                        <th className="py-2 px-2 text-right text-rose-600">Shortage</th>
                        <th className="py-2 px-2">Lot / Batch</th>
                        <th className="py-2 px-2">Expiry</th>
                        <th className="py-2 px-2">Remarks</th>
                        <th className="py-2 px-2 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {arrivalLines.map((line, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-1.5 px-2.5 min-w-[180px]">
                            <select
                              value={line.product_id}
                              onChange={(e) => updateArrivalLine(idx, "product_id", e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs font-semibold bg-white"
                            >
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.sku})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-1.5 px-2 text-center min-w-[70px]">
                            <input
                              type="number"
                              min="1"
                              value={line.packaging}
                              onChange={(e) => updateArrivalLine(idx, "packaging", e.target.value)}
                              className="w-14 px-1 py-1 border border-slate-200 rounded-md text-center font-mono"
                              title="Units per Carton"
                            />
                          </td>
                          <td className="py-1.5 px-2 min-w-[70px]">
                            <input
                              type="number"
                              min="0"
                              value={line.total_cartons}
                              onChange={(e) => updateArrivalLine(idx, "total_cartons", e.target.value)}
                              className="w-16 px-1 py-1 border border-slate-200 rounded-md text-right font-mono font-bold"
                            />
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-800 min-w-[70px]">
                            {line.total_units?.toLocaleString() || 0}
                          </td>
                          <td className="py-1.5 px-2 min-w-[70px]">
                            <input
                              type="number"
                              min="0"
                              value={line.cartons_received}
                              onChange={(e) => updateArrivalLine(idx, "cartons_received", e.target.value)}
                              className="w-16 px-1 py-1 border border-slate-200 rounded-md text-right font-mono font-bold text-emerald-700"
                            />
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono font-bold text-emerald-700 min-w-[70px]">
                            {line.units_received?.toLocaleString() || 0}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono font-bold min-w-[70px]">
                            {(line.shortage_units || 0) > 0 ? (
                              <span className="text-rose-600">-{line.shortage_units}</span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 min-w-[100px]">
                            <input
                              type="text"
                              value={line.batch_number}
                              onChange={(e) => updateArrivalLine(idx, "batch_number", e.target.value)}
                              className="w-24 px-1 py-1 border border-slate-200 rounded-md font-mono text-[10px]"
                            />
                          </td>
                          <td className="py-1.5 px-2 min-w-[110px]">
                            <input
                              type="date"
                              value={line.expiry_date}
                              onChange={(e) => updateArrivalLine(idx, "expiry_date", e.target.value)}
                              className="w-28 px-1 py-1 border border-slate-200 rounded-md font-mono text-[10px]"
                            />
                          </td>
                          <td className="py-1.5 px-2 min-w-[120px]">
                            <input
                              type="text"
                              placeholder="Notes"
                              value={line.remarks}
                              onChange={(e) => updateArrivalLine(idx, "remarks", e.target.value)}
                              className="w-full px-1 py-1 border border-slate-200 rounded-md text-[10px]"
                            />
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            {arrivalLines.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeArrivalLine(idx)}
                                className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Below Totals Summary Strip (Screenshot 2 requirement) */}
                <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-4">
                    <span>Summary Totals:</span>
                    <span className="font-mono text-slate-900">
                      Total Cartons: <span className="text-indigo-600">{totalManifestCartons} Manifested</span> /{" "}
                      <span className="text-emerald-700">{totalReceivedCartons} Received</span>
                    </span>
                    <span className="font-mono text-slate-900">
                      Total Units: <span className="text-indigo-600">{totalManifestUnits.toLocaleString()}</span> /{" "}
                      <span className="text-emerald-700">{totalReceivedUnits.toLocaleString()}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">Net Shortage:</span>
                    <span
                      className={`px-2.5 py-1 rounded-full font-mono text-xs ${totalShortageUnits > 0
                        ? "bg-rose-100 text-rose-800 border border-rose-300 font-black"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        }`}
                    >
                      {totalShortageUnits > 0 ? `-${totalShortageUnits.toLocaleString()} Units Short` : "0 Shortage (Full Cargo)"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddArrivalModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Log Shipment Arrival</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: CREATE TRANSFER (SCREENSHOT 1) ================= */}
      {createTransferModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bento-card max-w-2xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-indigo-600" />
                  <span>Dispatch Inter-Warehouse Transfer</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Select destination branch, initiation date, and multiple pharmaceutical products with carton quantities.
                </p>
              </div>
              <button onClick={() => setCreateTransferModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="space-y-4 text-xs">
              {/* Destination Warehouse & Initiation Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Destination Warehouse</label>
                  <select
                    value={destWarehouseId}
                    onChange={(e) => setDestWarehouseId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold"
                  >
                    {warehouseOptions
                      .filter((w) => w.id !== (activeWarehouse?.id || 1))
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Transfer Initiation Date
                  </label>
                  <input
                    type="date"
                    required
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Driver Name & Vehicle Plate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Driver Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pedro Manuel"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Vehicle Plate</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LD-44-91-AM"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Multi-product Line Items (Screenshot 1 requirement) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-700 font-bold text-xs">
                    Products to Transfer ({transferLines.length} line items)
                  </label>
                  <button
                    type="button"
                    onClick={addTransferLine}
                    className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Product</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600 font-bold">
                      <tr>
                        <th className="py-2 px-3">Product</th>
                        <th className="py-2 px-3 text-center">Carton Packing</th>
                        <th className="py-2 px-3 text-right">Quantity of Cartons</th>
                        <th className="py-2 px-3 text-right">Units (Carton Qty × Packing)</th>
                        <th className="py-2 px-2 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {transferLines.map((line, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3">
                            <select
                              value={line.product_id}
                              onChange={(e) => updateTransferLine(idx, "product_id", e.target.value)}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white"
                            >
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.sku})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={line.carton_packing}
                              onChange={(e) => updateTransferLine(idx, "carton_packing", e.target.value)}
                              className="w-16 px-1.5 py-1 border border-slate-200 rounded-md text-center font-mono font-semibold"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min="1"
                              value={line.cartons_dispatched}
                              onChange={(e) => updateTransferLine(idx, "cartons_dispatched", e.target.value)}
                              className="w-20 px-1.5 py-1 border border-slate-200 rounded-md text-right font-mono font-bold"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-indigo-700">
                            {line.dispatched_qty?.toLocaleString() || 0}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {transferLines.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeTransferLine(idx)}
                                className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Transfer Totals Strip */}
                <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 flex items-center justify-between text-xs font-bold text-indigo-900">
                  <span>Transfer Consignment Totals:</span>
                  <div className="flex items-center gap-4 font-mono">
                    <span>
                      Total Cartons: <span className="font-black">{totalTransferCartons} ctns</span>
                    </span>
                    <span>
                      Total Units: <span className="font-black">{totalTransferUnits.toLocaleString()}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Transfer Notes / Waybill Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Handover to regional depot before 17:00"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateTransferModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Dispatch Transfer & Generate Paper</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: PORTRAIT TRANSFER NOTE PRINT VIEW (SCREENSHOT 1) ================= */}
      {viewTransferModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bento-card max-w-3xl w-full p-6 sm:p-8 space-y-6 my-8 print-portrait-card bg-white shadow-2xl">
            {/* Action Bar (Hidden on print) */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 no-print">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-600" />
                <span className="text-sm font-bold text-slate-900">
                  Official Transfer Note Paper (Portrait Format)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Transfer Paper (Portrait)</span>
                </button>
                <button
                  onClick={() => exportTransferManifestToExcel(viewTransferModal)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Export Excel</span>
                </button>
                <button
                  onClick={() => setViewTransferModal(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* PRINTABLE DOCUMENT BODY (Exact requirements from Screenshot 1) */}
            <div className="space-y-6 text-slate-900 font-sans print:p-0">
              {/* HEADER SECTION (Screenshot 1.d) */}
              <div className="border-b-2 border-slate-800 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-xl bg-white border border-slate-300 p-1 shrink-0 flex items-center justify-center">
                      <img src="/Logo.PNG" alt="Amaldina Logo" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                        Amaldina Comércio Geral, Lda
                      </h1>
                      <div className="text-xs font-bold text-indigo-700 tracking-wide mt-0.5">
                        Alisons WMS Division
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1 space-y-0.5">
                        <div>Rua Direita de Cacuaco, Km 9, Bairro Mulemba, Luanda, Angola</div>
                        <div>NIF: 5417088921 | Tel: +244 923 112 233 | Email: logistics@alisons.co.ao</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-slate-500 uppercase">Transfer Paper Number</div>
                    <div className="text-base font-black font-mono text-indigo-700 mt-0.5">
                      {viewTransferModal.transfer_number}
                    </div>
                    <div className="text-xs font-semibold text-slate-700 mt-1">
                      Date: <span className="font-mono font-bold">{viewTransferModal.transfer_date}</span>
                    </div>
                  </div>
                </div>

                {/* Clear and bold line showing Transfer Note for destination branch */}
                <div className="mt-5 p-3 rounded-lg bg-slate-100 border-2 border-slate-900 text-center">
                  <span className="text-sm sm:text-base font-black text-slate-900 tracking-wide uppercase">
                    Transfer Note for Amaldina Comercio Geral, Lda –{" "}
                    {extractDestinationBranch(viewTransferModal.to_warehouse_name)}
                  </span>
                </div>
              </div>

              {/* Logistics Details */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 font-bold block">Source Origin:</span>
                  <span className="font-bold text-slate-900">{viewTransferModal.from_warehouse_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block">Destination Branch:</span>
                  <span className="font-bold text-indigo-700">{viewTransferModal.to_warehouse_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block">Carrier / Driver Name:</span>
                  <span className="font-bold text-slate-900">{viewTransferModal.driver_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block">Vehicle Registration Plate:</span>
                  <span className="font-mono font-bold text-slate-900">{viewTransferModal.vehicle_plate}</span>
                </div>
              </div>

              {/* BODY TABLE (Exact columns from Screenshot 1.d) */}
              <div>
                <table className="w-full text-left text-xs border border-slate-400 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-400 font-bold text-slate-900">
                      <th className="py-2.5 px-3 border-r border-slate-400 text-center w-12">Sr. no</th>
                      <th className="py-2.5 px-3 border-r border-slate-400">Name of Products</th>
                      <th className="py-2.5 px-3 border-r border-slate-400 text-center">
                        Carton Packing (Qty in a Carton)
                      </th>
                      <th className="py-2.5 px-3 border-r border-slate-400 text-right">Quantity of Cartons</th>
                      <th className="py-2.5 px-3 text-right">Units (Carton Qty × Packing)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {(viewTransferModal.items || []).map((it, idx) => (
                      <tr key={idx} className="border-b border-slate-300">
                        <td className="py-2 px-3 border-r border-slate-300 text-center font-mono font-bold text-slate-700">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-300 font-bold text-slate-900">
                          {it.product_name} <span className="text-[10px] text-slate-500 font-mono">({it.sku})</span>
                        </td>
                        <td className="py-2 px-3 border-r border-slate-300 text-center font-mono text-slate-800">
                          {it.carton_packing} units/ctn
                        </td>
                        <td className="py-2 px-3 border-r border-slate-300 text-right font-mono font-bold text-slate-900">
                          {it.cartons_dispatched} ctns
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-indigo-700">
                          {it.dispatched_qty?.toLocaleString() || 0}
                        </td>
                      </tr>
                    ))}
                    {/* Summary row */}
                    <tr className="bg-slate-100/80 font-black border-t-2 border-slate-400 text-slate-900">
                      <td colSpan="3" className="py-2.5 px-3 text-right border-r border-slate-400 uppercase">
                        Total Consignment:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono border-r border-slate-400 text-slate-900">
                        {(viewTransferModal.total_cartons || 0).toLocaleString()} ctns
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-indigo-900">
                        {(viewTransferModal.total_units || 0).toLocaleString()} units
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Sign-off & Inspection Blocks */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs">
                <div className="space-y-8">
                  <div>
                    <span className="font-bold text-slate-700 block">Dispatched & Released By:</span>
                    <span className="text-[11px] text-slate-500">Warehouse Dispatcher Signature</span>
                  </div>
                  <div className="border-b border-slate-400 w-4/5 pt-4"></div>
                  <div className="text-[11px] text-slate-500">Date: ________________________</div>
                </div>

                <div className="space-y-8">
                  <div>
                    <span className="font-bold text-slate-700 block">Received & Inspected By:</span>
                    <span className="text-[11px] text-slate-500">
                      {extractDestinationBranch(viewTransferModal.to_warehouse_name)} Branch Supervisor
                    </span>
                  </div>
                  <div className="border-b border-slate-400 w-4/5 pt-4"></div>
                  <div className="text-[11px] text-slate-500">Date: ________________________</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: VIEW FULL ARRIVAL MANIFEST ================= */}
      {viewArrivalModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bento-card max-w-4xl w-full p-6 sm:p-8 space-y-5 my-8 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Ship className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Shipment Arrival Manifest — {viewArrivalModal.shipment_number || viewArrivalModal.arrival_number}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Full verification ledger with manifested cartons, received count, and shortage units.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportArrivalManifestToExcel(viewArrivalModal)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export to Excel (.csv)</span>
                </button>
                <button
                  onClick={() => setViewArrivalModal(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Manifest Header Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 font-bold block">Arrival Date:</span>
                <span className="font-mono font-bold text-slate-900">{viewArrivalModal.received_date}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block">Invoice Number:</span>
                <span className="font-mono font-bold text-slate-900">{viewArrivalModal.invoice_number || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block">Mode & Number:</span>
                <span className="font-mono font-bold text-indigo-700">
                  {viewArrivalModal.freight_type}: {viewArrivalModal.container_number}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block">BL / AWB #:</span>
                <span className="font-mono font-bold text-slate-900">{viewArrivalModal.tracking_bl_number}</span>
              </div>
            </div>

            {/* Manifest Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold text-[11px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Sr</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3 text-center">Packaging</th>
                    <th className="py-2.5 px-3 text-right">Manifest Ctns</th>
                    <th className="py-2.5 px-3 text-right">Received Ctns</th>
                    <th className="py-2.5 px-3 text-right">Received Units</th>
                    <th className="py-2.5 px-3 text-right text-rose-600">Shortage</th>
                    <th className="py-2.5 px-3">Batch #</th>
                    <th className="py-2.5 px-3">Expiry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(viewArrivalModal.items || []).map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 text-center font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {it.product_name} <span className="text-[10px] text-slate-400 font-mono">({it.sku})</span>
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-slate-600">{it.packaging} / ctn</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">{it.total_cartons}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                        {it.cartons_received}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                        {it.units_received?.toLocaleString() || 0}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        {(it.shortage_units || 0) > 0 ? (
                          <span className="text-rose-600">-{it.shortage_units}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-700">{it.batch_number}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{it.expiry_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer Summary */}
            <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800">
              <div>
                Total Unloaded:{" "}
                <span className="text-emerald-700">
                  {viewArrivalModal.total_units?.toLocaleString() || 0} Units ({viewArrivalModal.total_cartons || 0} Cartons)
                </span>
              </div>
              <div>
                Net Manifest Shortage:{" "}
                <span className="text-rose-600 font-black">
                  {(viewArrivalModal.total_shortage_units || 0) > 0
                    ? `-${viewArrivalModal.total_shortage_units.toLocaleString()} Units`
                    : "0 Units"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 5: QUICK REGISTER NEW SKU ================= */}
      {showQuickAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bento-card max-w-md w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-600" />
                  <span>Register New Medicine SKU</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Instantly registers this drug into the master catalog and appends it to your current manifest.
                </p>
              </div>
              <button onClick={() => setShowQuickAddModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddProduct} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">SKU Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SKU-ART-80"
                  value={quickSku}
                  onChange={(e) => setQuickSku(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Medicine Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Artemether 80mg / Lumefantrine 480mg"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Category</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Antimalarials"
                    value={quickCategory}
                    onChange={(e) => setQuickCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Packaging (Units/Ctn)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="50"
                    value={quickPackaging}
                    onChange={(e) => setQuickPackaging(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono font-bold text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickAddModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Register & Add to Manifest</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
