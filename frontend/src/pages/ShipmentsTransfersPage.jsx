import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";
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
  ArrowRight
} from "lucide-react";

export default function ShipmentsTransfersPage() {
  const { user, activeWarehouse } = useAuth();
  const [tab, setTab] = useState("arrivals"); // 'arrivals' | 'transfers'
  const [arrivals, setArrivals] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
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
    apiRequest("/counts/products").then((p) => setProducts(p || [])).catch(console.log);
  }, [activeWarehouse, tab]);

  function loadData() {
    apiRequest("/shipments/arrivals").then((a) => setArrivals(a || [])).catch(console.log);
    apiRequest("/shipments/transfers").then((t) => setTransfers(t || [])).catch(console.log);
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

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Ship className="w-5 h-5 text-indigo-600" />
              <span>Shipments & Transfers Hub</span>
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
              {activeWarehouse?.name || "Mulemba"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Port container intake, Bill of Lading (BL) customs clearance, and inter-branch logistics.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setAddArrivalModal(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Receive Container</span>
          </button>
          <button
            onClick={() => setCreateTransferModal(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Dispatch Transfer</span>
          </button>
        </div>
      </div>

      {/* Tabs as PaceUI Pills */}
      <div className="flex items-center justify-between">
        <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold shadow-2xs">
          <button
            onClick={() => setTab("arrivals")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              tab === "arrivals"
                ? "bg-white text-indigo-700 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Ship className="w-3.5 h-3.5" />
            <span>Port Container Arrivals ({arrivals.length})</span>
          </button>
          <button
            onClick={() => setTab("transfers")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              tab === "transfers"
                ? "bg-white text-indigo-700 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Inter-Warehouse Transfers ({transfers.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Arrivals */}
      {tab === "arrivals" && (
        <div className="bento-card overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Sea Shipments & Inbound Containers
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Containers arriving via Port of Luanda</p>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              Automated Stock Inflow
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Tracking / BL #</th>
                  <th className="py-3 px-4">Vessel & Container</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Received Date</th>
                  <th className="py-3 px-4">Items & Batches</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {arrivals.map((arr) => (
                  <tr key={arr.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                      {arr.tracking_bl_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{arr.vessel_name || "Sea Vessel"}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Container: {arr.container_number || "MSCU-8849"}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{arr.supplier_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{arr.received_date}</td>
                    <td className="py-3 px-4">
                      {arr.items?.map((it, i) => (
                        <div key={i} className="text-[11px]">
                          <span className="font-bold text-slate-900">{it.product_name}</span>:{" "}
                          <span className="font-mono text-indigo-700 font-bold">{it.cartons_received} ctn</span>{" "}
                          <span className="text-slate-400 text-[10px]">({it.batch_number})</span>
                        </div>
                      ))}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {arr.status || "Received"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Transfers */}
      {tab === "transfers" && (
        <div className="bento-card overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Inter-Warehouse Route Logistics
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Dispatches between Mulemba, Palanca, and Lobito</p>
            </div>
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
              Dual Supervisor Sign-Off
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Dispatch #</th>
                  <th className="py-3 px-4">Origin & Destination</th>
                  <th className="py-3 px-4">Driver & Vehicle</th>
                  <th className="py-3 px-4">Products Dispatched</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {transfers.map((trf) => {
                  const isRecipient = trf.to_warehouse_id === activeWarehouse?.id;
                  const isPending = trf.status === "PENDING" || trf.status === "IN_TRANSIT";
                  return (
                    <tr key={trf.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                        {trf.dispatch_number}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">
                          {trf.from_warehouse?.name || "Mulemba"} → {trf.to_warehouse?.name || "Palanca"}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(trf.dispatched_at || Date.now()).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{trf.driver_name || "Motorist"}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Plate: {trf.vehicle_plate || "LD-88-21-AA"}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {trf.items?.map((it, i) => (
                          <div key={i} className="text-[11px]">
                            <span className="font-bold text-slate-900">{it.product_name}</span>:{" "}
                            <span className="font-mono text-indigo-700 font-bold">{it.dispatched_qty} units</span>
                          </div>
                        ))}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            trf.status === "APPROVED" || trf.status === "RECEIVED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {trf.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isRecipient && isPending ? (
                          <button
                            onClick={() => handleApproveTransfer(trf.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            Approve Receipt
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">Logged</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Arrival Modal */}
      {addArrivalModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bento-card max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Ship className="w-4 h-4 text-indigo-600" />
                <span>Receive Port Container Shipment</span>
              </h3>
              <button onClick={() => setAddArrivalModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddArrival} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Vessel Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MSC Luisa / Maersk Cotonou"
                  value={vesselName}
                  onChange={(e) => setVesselName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Bill of Lading (BL #)</label>
                  <input
                    type="text"
                    required
                    placeholder="BL-99210-AO"
                    value={trackingBL}
                    onChange={(e) => setTrackingBL(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Container Number</label>
                  <input
                    type="text"
                    required
                    placeholder="MSCU-449102"
                    value={containerNo}
                    onChange={(e) => setContainerNo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Supplier / Manufacturer</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sandoz Global / Cipla Pharma"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-xs"
                />
              </div>

              <div className="border-t border-slate-100 pt-3">
                <label className="block text-slate-700 font-bold mb-1">Medicine SKU</label>
                <select
                  value={arrivalProduct}
                  onChange={(e) => setArrivalProduct(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Cartons</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={arrivalCartons}
                    onChange={(e) => setArrivalCartons(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Batch #</label>
                  <input
                    type="text"
                    required
                    value={batchNo}
                    onChange={(e) => setBatchNo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddArrivalModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                >
                  Record Port Arrival
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Transfer Modal */}
      {createTransferModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bento-card max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-indigo-600" />
                <span>Dispatch Inter-Warehouse Stock Transfer</span>
              </h3>
              <button onClick={() => setCreateTransferModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Destination Branch</label>
                <select
                  value={destWarehouseId}
                  onChange={(e) => setDestWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold"
                >
                  <option value="1">Mulemba Warehouse (Luanda North)</option>
                  <option value="2">Palanca Warehouse (Luanda South)</option>
                  <option value="3">Lobito Warehouse (Benguela)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Driver Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Manuel Silva"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Vehicle Plate</label>
                  <input
                    type="text"
                    required
                    placeholder="LD-99-12-AO"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Product</label>
                <select
                  value={transferProduct}
                  onChange={(e) => setTransferProduct(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Units to Transfer</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-bold font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateTransferModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs"
                >
                  Confirm Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
