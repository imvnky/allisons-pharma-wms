import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";
import { exportToCsv } from "../utils/exportUtils";
import { Ship, ArrowLeftRight, Plus, CheckCircle2, Truck, Calendar, Check, AlertCircle, Download, Printer } from "lucide-react";

export default function ShipmentsTransfersPage() {
  const { user, activeWarehouse } = useAuth();
  const [tab, setTab] = useState("arrivals"); // 'arrivals' | 'transfers'
  const [arrivals, setArrivals] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([
    { id: 1, name: "Mulemba Warehouse (Luanda North)" },
    { id: 2, name: "Palanca Warehouse (Luanda South)" },
    { id: 3, name: "Lobito Warehouse (Benguela)" },
  ]);
  const [addArrivalModal, setAddArrivalModal] = useState(false);
  const [createTransferModal, setCreateTransferModal] = useState(false);

  // New Arrival Form State
  const [arrivalType, setArrivalType] = useState("SEA_SHIPMENT");
  const [vesselName, setVesselName] = useState("");
  const [trackingBL, setTrackingBL] = useState("");
  const [containerNo, setContainerNo] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [arrivalProduct, setArrivalProduct] = useState(1);
  const [arrivalCartons, setArrivalCartons] = useState(50);
  const [batchNo, setBatchNo] = useState("BAT-2026-X1");
  const [expiryDate, setExpiryDate] = useState("2028-12-31");

  // New Transfer Form State
  const [destWarehouseId, setDestWarehouseId] = useState(2);
  const [driverName, setDriverName] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [transferProduct, setTransferProduct] = useState(1);
  const [transferQty, setTransferQty] = useState(100);

  useEffect(() => {
    loadData();
    apiRequest("/counts/products").then((prods) => {
      setProducts(prods);
      if (prods.length > 0) {
        setArrivalProduct(prods[0].id);
        setTransferProduct(prods[0].id);
      }
    }).catch(console.log);

    apiRequest("/admin/warehouses").then((whs) => {
      if (Array.isArray(whs) && whs.length > 0) {
        setWarehouses(whs);
        const otherWh = whs.find((w) => w.id !== activeWarehouse.id);
        if (otherWh) setDestWarehouseId(otherWh.id);
      }
    }).catch(console.log);
  }, [activeWarehouse, tab]);

  function loadData() {
    apiRequest("/shipments/arrivals").then(setArrivals).catch(console.log);
    apiRequest("/shipments/transfers").then(setTransfers).catch(console.log);
  }

  async function handleAddArrival(e) {
    e.preventDefault();
    try {
      await apiRequest("/shipments/arrivals", "POST", {
        arrival_type: arrivalType,
        vessel_name: vesselName,
        tracking_bl_number: trackingBL,
        container_number: containerNo,
        supplier_name: supplierName,
        received_date: new Date().toISOString().split("T")[0],
        items: [
          {
            product_id: parseInt(arrivalProduct, 10),
            batch_number: batchNo,
            expiry_date: expiryDate,
            cartons_received: parseInt(arrivalCartons, 10),
          },
        ],
      });
      alert("Shipment Arrival successfully verified and logged into warehouse stock!");
      setAddArrivalModal(false);
      loadData();
    } catch (err) {
      alert("Error adding arrival: " + err.message);
    }
  }

  async function handleCreateTransfer(e) {
    e.preventDefault();
    try {
      await apiRequest("/shipments/transfers", "POST", {
        to_warehouse_id: parseInt(destWarehouseId, 10),
        driver_name: driverName,
        vehicle_plate: vehiclePlate,
        items: [
          {
            product_id: parseInt(transferProduct, 10),
            batch_number: "BAT-TRF",
            dispatched_qty: parseInt(transferQty, 10),
          },
        ],
      });
      alert("Transfer dispatched successfully!");
      setCreateTransferModal(false);
      loadData();
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

  function handleExportArrivalsCsv() {
    if (!arrivals || arrivals.length === 0) return;
    const headers = [
      "Arrival ID",
      "Shipment Type",
      "Vessel / Supplier Name",
      "Container / BL Number",
      "Total Units",
      "Received Date",
      "Status",
      "Receiving Warehouse",
    ];

    const rows = arrivals.map((a) => [
      a.arrival_number,
      a.arrival_type,
      a.vessel_name,
      a.tracking_bl_number,
      a.total_units,
      a.received_date,
      a.status,
      activeWarehouse?.name || "",
    ]);

    const dateStr = new Date().toISOString().split("T")[0];
    exportToCsv(`Allisons_Arrivals_${activeWarehouse?.code || "WH"}_${dateStr}.csv`, headers, rows);
  }

  function handleExportTransfersCsv() {
    if (!transfers || transfers.length === 0) return;
    const headers = [
      "Transfer Number",
      "Origin Warehouse",
      "Destination Warehouse",
      "Driver Name",
      "Vehicle Plate",
      "Dispatched Date",
      "Transfer Status",
      "Notes / Waybill Ref",
    ];

    const rows = transfers.map((t) => [
      t.transfer_number,
      t.from_warehouse?.name || t.from_warehouse_id,
      t.to_warehouse?.name || t.to_warehouse_id,
      t.driver_name || "N/A",
      t.vehicle_plate || "N/A",
      t.dispatched_at ? t.dispatched_at.split("T")[0] : "",
      t.status,
      t.notes || "",
    ]);

    const dateStr = new Date().toISOString().split("T")[0];
    exportToCsv(`Allisons_Transfers_${activeWarehouse?.code || "WH"}_${dateStr}.csv`, headers, rows);
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Print-Only Logistics & Consignment Audit Header */}
      <div className="print-only-block mb-6 border-b-2 border-slate-900 pb-3">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-tight text-slate-900">
              Allisons African Pharma — {tab === "arrivals" ? "Inward Shipments & Deliveries Manifest" : "Inter-Warehouse Transfer Consignment Note"}
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Active Hub: <span className="font-bold">{activeWarehouse?.name}</span> ({activeWarehouse?.code}) | Report Date: <span className="font-bold">{new Date().toISOString().split("T")[0]}</span>
            </p>
          </div>
          <div className="text-right text-xs text-slate-600">
            <p>Manifest Type: <span className="font-bold uppercase">{tab === "arrivals" ? "Arrivals / Containers" : "Consignment Waybills"}</span></p>
            <p>Printed On: {new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Shipments & Transfers Hub</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeWarehouse?.name} • Manage Sea Shipments, Local Freight & Inter-Warehouse Transfers
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Export & Print */}
          <div className="flex items-center gap-2">
            <button
              onClick={tab === "arrivals" ? handleExportArrivalsCsv : handleExportTransfersCsv}
              title="Export Current Manifest to CSV (Excel Compatible)"
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-purple-600" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => window.print()}
              title="Print Manifest / Waybill"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setAddArrivalModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Ship className="w-3.5 h-3.5" />
            <span>+ Add Shipment Arrival</span>
          </button>
          <button
            onClick={() => setCreateTransferModal(true)}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>+ Create Transfer</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setTab("arrivals")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            tab === "arrivals"
              ? "border-purple-600 text-purple-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Ship className="w-4 h-4" />
          <span>Inward Arrivals (Sea & Local Shipments)</span>
        </button>
        <button
          onClick={() => setTab("transfers")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            tab === "transfers"
              ? "border-purple-600 text-purple-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>Inter-Warehouse Transfers</span>
        </button>
      </div>

      {/* TAB 1: Inward Arrivals */}
      {tab === "arrivals" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Inward Deliveries & Containers</h3>
            <span className="text-xs text-slate-400 font-semibold">{arrivals.length} Shipments Recorded</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="p-3">Arrival ID</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Vessel / Supplier</th>
                  <th className="p-3">Container / BL</th>
                  <th className="p-3 text-right">Items / Total Units</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {arrivals.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400">
                      No shipment arrivals recorded yet. Click "+ Add Shipment Arrival" above.
                    </td>
                  </tr>
                ) : (
                  arrivals.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-900">{a.arrival_number}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                          {a.arrival_type}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-800">{a.vessel_name}</td>
                      <td className="p-3 text-slate-600">{a.tracking_bl_number}</td>
                      <td className="p-3 text-right font-extrabold text-purple-700">
                        {a.total_units.toLocaleString()} Units
                      </td>
                      <td className="p-3 text-slate-500">{a.received_date}</td>
                      <td className="p-3 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                          {a.status} 🟢
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

      {/* TAB 2: Inter-Warehouse Transfers */}
      {tab === "transfers" && (
        <div className="space-y-6">
          {/* Pending Inward Section (Transfers incoming from other branches) */}
          <div className="bg-white rounded-2xl border border-amber-200/80 shadow-xs overflow-hidden">
            <div className="p-4 bg-amber-50/50 border-b border-amber-100 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  ⚠️ Inward Transfers Awaiting Confirmation
                </h3>
                <p className="text-[11px] text-amber-800">
                  Stock dispatched from other warehouses to {activeWarehouse.name}. Click approve to add to your stock.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="p-3">Transfer ID</th>
                    <th className="p-3">From Warehouse</th>
                    <th className="p-3">Driver / Vehicle</th>
                    <th className="p-3 text-right">Dispatched Qty</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transfers
                    .filter((t) => t.is_incoming && t.status !== "APPROVED")
                    .map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-slate-900">{t.transfer_number}</td>
                        <td className="p-3 font-bold text-purple-900">{t.from_warehouse_name}</td>
                        <td className="p-3 text-slate-600">
                          {t.driver_name || "Internal"} ({t.vehicle_plate || "N/A"})
                        </td>
                        <td className="p-3 text-right font-black text-purple-700">
                          {t.total_units.toLocaleString()} Units
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                            {t.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleApproveTransfer(t.id)}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 mx-auto transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Confirm & Approve Arrival</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  {transfers.filter((t) => t.is_incoming && t.status !== "APPROVED").length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-6 text-center text-slate-400">
                        No pending inward transfers awaiting approval.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Outward Dispatches Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Outward Dispatches</h3>
              <span className="text-xs text-slate-400 font-semibold">{transfers.length} Transfers Logged</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="p-3">Transfer ID</th>
                    <th className="p-3">From</th>
                    <th className="p-3">To Destination</th>
                    <th className="p-3">Driver</th>
                    <th className="p-3 text-right">Units</th>
                    <th className="p-3">Dispatched Time</th>
                    <th className="p-3 text-center">Receiver Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transfers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-900">{t.transfer_number}</td>
                      <td className="p-3 text-slate-700">{t.from_warehouse_name}</td>
                      <td className="p-3 font-bold text-purple-900">{t.to_warehouse_name}</td>
                      <td className="p-3 text-slate-600">{t.driver_name || "Freight Fleet"}</td>
                      <td className="p-3 text-right font-extrabold text-slate-900">
                        {t.total_units.toLocaleString()} Units
                      </td>
                      <td className="p-3 text-slate-500">{t.dispatched_at.slice(0, 16)}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Add Shipment Arrival */}
      {addArrivalModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAddArrival} className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Shipment Arrival (Sea / Local)</h3>
              <button type="button" onClick={() => setAddArrivalModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2 space-y-1">
                <label className="font-bold text-slate-700">Arrival Type:</label>
                <select
                  value={arrivalType}
                  onChange={(e) => setArrivalType(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200"
                >
                  <option value="SEA_SHIPMENT">Sea Container Shipment (Vessel)</option>
                  <option value="LOCAL_SUPPLIER">Local Supplier Delivery</option>
                  <option value="AIR_FREIGHT">Air Cargo (Luanda Airport)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Vessel Name / Supplier:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MSC Luisa"
                  value={vesselName}
                  onChange={(e) => setVesselName(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Tracking / BL Number:</label>
                <input
                  type="text"
                  placeholder="e.g. BL-MSCU-902181"
                  value={trackingBL}
                  onChange={(e) => setTrackingBL(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="col-span-2 space-y-1">
                <label className="font-bold text-slate-700">Select Pharmaceutical Product:</label>
                <select
                  value={arrivalProduct}
                  onChange={(e) => setArrivalProduct(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — 1 Ctn = {p.units_per_carton} Pcs
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Cartons Received:</label>
                <input
                  type="number"
                  required
                  value={arrivalCartons}
                  onChange={(e) => setArrivalCartons(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Batch / Lot Number:</label>
                <input
                  type="text"
                  required
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAddArrivalModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md"
              >
                Confirm & Stock In
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 2: Create Transfer */}
      {createTransferModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateTransfer} className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Dispatch Inter-Warehouse Transfer</h3>
              <button type="button" onClick={() => setCreateTransferModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2 space-y-1">
                <label className="font-bold text-slate-700">Destination Warehouse:</label>
                <select
                  value={destWarehouseId}
                  onChange={(e) => setDestWarehouseId(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 font-bold text-purple-900"
                >
                  {warehouses
                    .filter((w) => w.id !== activeWarehouse.id)
                    .map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Driver Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Pedro Manuel"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Vehicle Plate:</label>
                <input
                  type="text"
                  placeholder="e.g. LD-44-91-AM"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="col-span-2 space-y-1">
                <label className="font-bold text-slate-700">Product to Transfer:</label>
                <select
                  value={transferProduct}
                  onChange={(e) => setTransferProduct(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2 space-y-1">
                <label className="font-bold text-slate-700">Total Units to Transfer:</label>
                <input
                  type="number"
                  required
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 font-black text-purple-700"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCreateTransferModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md"
              >
                Dispatch Transfer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Print-Only Waybill Sign-off Section */}
      <div className="print-only-block mt-8 pt-4 border-t border-slate-400">
        <div className="grid grid-cols-3 gap-8 text-xs text-slate-700">
          <div>
            <p className="font-bold mb-10">Dispatching Officer (Warehouse):</p>
            <div className="border-t border-slate-600 pt-1">Signature / Date</div>
          </div>
          <div>
            <p className="font-bold mb-10">Transport Driver / Carrier:</p>
            <div className="border-t border-slate-600 pt-1">Signature / Date</div>
          </div>
          <div>
            <p className="font-bold mb-10">Receiving Branch Verification:</p>
            <div className="border-t border-slate-600 pt-1">Stamp & Seal / Date</div>
          </div>
        </div>
      </div>
    </div>
  );
}

