import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";
import { ShieldCheck, Users, Edit3, KeyRound, Plus, Check, Clock, List } from "lucide-react";

export default function RolesManagerPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("tiles"); // 'tiles' | 'users'
  const [tilesData, setTilesData] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [warehousesList, setWarehousesList] = useState([
    { id: 1, name: "Mulemba Warehouse (Luanda North)" },
    { id: 2, name: "Palanca Warehouse (Luanda South)" },
    { id: 3, name: "Lobito Warehouse (Benguela)" },
  ]);
  
  // Drawer state for editing a tile's permissions
  const [selectedTile, setSelectedTile] = useState(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  
  // User Management Modals
  const [addUserModal, setAddUserModal] = useState(false);
  const [resetPassModal, setResetPassModal] = useState(false);
  const [activeUserToReset, setActiveUserToReset] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  // New User Form State
  const [newUsername, setNewUsername] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newUserRole, setNewUserRole] = useState(3);
  const [newUserWarehouse, setNewUserWarehouse] = useState(1);
  const [newUserPassword, setNewUserPassword] = useState("admin123");

  useEffect(() => {
    loadData();
  }, [tab]);

  function loadData() {
    apiRequest("/admin/tiles")
      .then((data) => {
        setTilesData(data.tiles || []);
        setAvailableRoles(data.available_roles || []);
      })
      .catch(console.log);

    apiRequest("/admin/users")
      .then(setUsersList)
      .catch(console.log);

    apiRequest("/admin/warehouses")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setWarehousesList(data);
      })
      .catch(console.log);
  }

  function handleOpenDrawer(tile) {
    setSelectedTile(tile);
    setSelectedRoleIds(tile.assigned_role_ids || []);
  }

  function toggleRole(roleId) {
    if (selectedRoleIds.includes(roleId)) {
      setSelectedRoleIds(selectedRoleIds.filter((id) => id !== roleId));
    } else {
      setSelectedRoleIds([...selectedRoleIds, roleId]);
    }
  }

  async function handleSaveTilePermissions() {
    if (!selectedTile) return;
    try {
      await apiRequest(`/admin/tiles/${selectedTile.id}/permissions`, "PUT", selectedRoleIds);
      alert(`Updated permissions for "${selectedTile.title}" successfully!`);
      setSelectedTile(null);
      loadData();
    } catch (err) {
      alert("Error saving permissions: " + err.message);
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    try {
      const whId = parseInt(newUserWarehouse, 10);
      await apiRequest("/admin/users", "POST", {
        username: newUsername,
        full_name: newFullName,
        password: newUserPassword,
        role_id: parseInt(newUserRole, 10),
        warehouse_id: whId > 0 ? whId : null,
      });
      alert(`User ${newUsername} created successfully!`);
      setAddUserModal(false);
      setNewUsername("");
      setNewFullName("");
      loadData();
    } catch (err) {
      alert("Error creating user: " + err.message);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (!activeUserToReset) return;
    try {
      await apiRequest(`/admin/users/${activeUserToReset.id}/reset-password`, "POST", {
        new_password: newPassword,
      });
      alert(`Password for ${activeUserToReset.username} reset successfully!`);
      setResetPassModal(false);
      setNewPassword("");
    } catch (err) {
      alert("Error resetting password: " + err.message);
    }
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-600" />
            <span>Authorization & User Governance</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Super Admin Control Center • Tile-Based RBAC & User Identity Manager
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAddUserModal(true)}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add New User</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setTab("tiles")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            tab === "tiles"
              ? "border-purple-600 text-purple-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Module Tile Permissions Matrix (J&J Pattern)</span>
        </button>
        <button
          onClick={() => setTab("users")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            tab === "users"
              ? "border-purple-600 text-purple-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Accounts & Credential Reset ({usersList.length})</span>
        </button>
      </div>

      {/* TAB 1: Tiles & Permissions Grid */}
      {tab === "tiles" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="p-3">Tile / Module Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Assigned Roles (Permissions)</th>
                  <th className="p-3 text-center">Sub-Perms</th>
                  <th className="p-3 text-center">Change Logs</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tilesData.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{t.title}</td>
                    <td className="p-3 text-slate-500">{t.category}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {t.assigned_roles.map((r, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => alert(`Sub-permissions for ${t.title}: View, Submit, Edit Own, Approve, Export`)}
                        className="p-1.5 text-slate-400 hover:text-slate-700"
                      >
                        <List className="w-4 h-4 mx-auto" />
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => alert(`Audit Log: Permissions for ${t.title} initialized by Super Admin on 04 Nov 2026.`)}
                        className="p-1.5 text-slate-400 hover:text-slate-700"
                      >
                        <Clock className="w-4 h-4 mx-auto" />
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleOpenDrawer(t)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-700 font-bold text-[11px] flex items-center gap-1 mx-auto transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Access</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Users Management & Password Reset */}
      {tab === "users" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="p-3">User ID</th>
                  <th className="p-3">Full Name & Username</th>
                  <th className="p-3">Role Assigned</th>
                  <th className="p-3">Warehouse Scope</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-500">USR-{u.id.toString().padStart(3, "0")}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{u.full_name}</div>
                      <div className="text-[10px] text-slate-400">{u.username} • {u.email || "No email"}</div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
                        {u.role.name}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-700">
                      {u.warehouse?.name || "🌐 All Angola (HQ / Global)"}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Active 🟢
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => {
                          setActiveUserToReset(u);
                          setResetPassModal(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold flex items-center gap-1 mx-auto transition-colors"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Reset Password</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-Out Drawer for Tile Permissions (Images 2 & 3) */}
      {selectedTile && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-end z-50">
          <div className="bg-white w-full max-w-md h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedTile.title}</h3>
                  <p className="text-xs text-purple-700 font-semibold">{selectedTile.category}</p>
                </div>
                <button onClick={() => setSelectedTile(null)} className="text-slate-400 hover:text-slate-700">✕</button>
              </div>

              {/* Roles Multi-Select Checkboxes */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Select Roles Permitted to Access this Tile:
                </label>
                <div className="space-y-2">
                  {availableRoles.map((r) => {
                    const isChecked = selectedRoleIds.includes(r.id);
                    return (
                      <label
                        key={r.id}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-purple-50/60 border-purple-200 text-purple-950 font-bold"
                            : "hover:bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleRole(r.id)}
                            className="rounded text-purple-600 focus:ring-purple-500"
                          />
                          <span>{r.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{r.code}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Sub-Permissions Info */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="text-xs font-bold text-slate-800">User Sub-Permissions Active</div>
                <div className="text-[11px] text-slate-500">
                  Granular capabilities: View Tile, Submit Daily Records, Edit Own Submissions, Approve Transfers.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedTile(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTilePermissions}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md"
              >
                Save & Deploy Permissions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetPassModal && activeUserToReset && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleResetPassword} className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Reset Password: {activeUserToReset.username}</h3>
            <p className="text-xs text-slate-500">
              Super Admin override. Set a new password for {activeUserToReset.full_name}.
            </p>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">New Password:</label>
              <input
                type="text"
                required
                placeholder="Enter new password..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetPassModal(false)}
                className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
              >
                Set Password
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add User Modal */}
      {addUserModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateUser} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Create New User Account</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria Dos Santos"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Username:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. maria.s"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Assigned Role:</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200"
                >
                  {availableRoles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Assigned Warehouse:</label>
                <select
                  value={newUserWarehouse}
                  onChange={(e) => setNewUserWarehouse(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200"
                >
                  <option value="0">Global / National HQ (No single branch lock)</option>
                  {warehousesList.map((wh) => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Initial Password:</label>
                <input
                  type="text"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 font-mono"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAddUserModal(false)}
                className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
              >
                Create Account
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

