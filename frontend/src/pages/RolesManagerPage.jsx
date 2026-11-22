import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { apiRequest } from "../services/api";
import {
  ShieldCheck,
  Users,
  Edit3,
  KeyRound,
  Plus,
  Check,
  Clock,
  List,
  Lock,
  X,
  Layers,
  Sparkles,
  Shield
} from "lucide-react";

export default function RolesManagerPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState("tiles"); // 'tiles' | 'users'
  const [tilesData, setTilesData] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [usersList, setUsersList] = useState([]);

  // Drawer / Modal state for editing tile's permissions
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
      .then((u) => setUsersList(u || []))
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
      await apiRequest("/admin/users", "POST", {
        username: newUsername,
        full_name: newFullName,
        password: newUserPassword,
        role_id: parseInt(newUserRole, 10),
        warehouse_id: parseInt(newUserWarehouse, 10),
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
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <span>{t("roles.title", "Roles & Dynamic Authorization")}</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold">
              J&J UiP RBAC Standard
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Dynamic tile-based permission matrix and warehouse user provisioning. Zero hardcoded roles.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setAddUserModal(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t("roles.provisionUser", "+ Provision User")}</span>
          </button>
        </div>
      </div>

      {/* Tabs as PaceUI Pills */}
      <div className="flex items-center justify-between">
        <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold shadow-2xs">
          <button
            onClick={() => setTab("tiles")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              tab === "tiles"
                ? "bg-white text-indigo-700 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Tiles & Permission Matrix ({tilesData.length})</span>
          </button>
          <button
            onClick={() => setTab("users")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              tab === "users"
                ? "bg-white text-indigo-700 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Warehouse User Directory ({usersList.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Tiles & Sub-Permission Matrix */}
      {tab === "tiles" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tilesData.map((tile) => (
            <div
              key={tile.id}
              className="bento-card p-5 flex flex-col justify-between space-y-4 hover:border-indigo-300"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-[10px] font-bold">
                    {tile.tile_key}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {tile.category}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">{tile.title}</h3>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">{tile.route_path}</div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Assigned Roles</div>
                  <div className="flex flex-wrap gap-1">
                    {tile.assigned_roles?.map((r, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold"
                      >
                        {r.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleOpenDrawer(tile)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 hover:border-indigo-200 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Configure Access Roles</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: User Management Directory */}
      {tab === "users" && (
        <div className="bento-card overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Staff & Supervisor Identity Directory
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Assigned roles, branch scopes, and authentication credentials</p>
            </div>
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
              {usersList.length} Active Accounts
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">{t("roles.colUser", "User")}</th>
                  <th className="py-3 px-4">{t("roles.colEmail", "Email")}</th>
                  <th className="py-3 px-4">{t("roles.colRole", "Role")}</th>
                  <th className="py-3 px-4">{t("roles.colScope", "Warehouse Scope")}</th>
                  <th className="py-3 px-4 text-center">{t("roles.colStatus", "Status")}</th>
                  <th className="py-3 px-4 text-right">{t("roles.colActions", "Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                          {u.full_name ? u.full_name[0] : "U"}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{u.full_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {u.role?.name || "Staff"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {u.warehouse?.name || "National HQ (All Angola)"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setActiveUserToReset(u);
                          setResetPassModal(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        Reset Password
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Tile Permissions Modal */}
      {selectedTile && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bento-card max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Authorize Roles for Tile</h3>
                <div className="text-[11px] text-indigo-600 font-bold mt-0.5">{selectedTile.title}</div>
              </div>
              <button onClick={() => setSelectedTile(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableRoles.map((role) => {
                const isAssigned = selectedRoleIds.includes(role.id);
                return (
                  <button
                    key={role.id}
                    onClick={() => toggleRole(role.id)}
                    className={`w-full p-2.5 rounded-xl text-xs flex items-center justify-between border transition-colors cursor-pointer ${
                      isAssigned
                        ? "bg-indigo-50 border-indigo-200 text-indigo-900 font-bold"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{role.name}</span>
                    {isAssigned && <Check className="w-4 h-4 text-indigo-600" />}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedTile(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTilePermissions}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs"
              >
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {addUserModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bento-card max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>Provision New Warehouse User</span>
              </h3>
              <button onClick={() => setAddUserModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. mateus.f"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mateus Fernandes"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold"
                >
                  {availableRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Warehouse Scope</label>
                <select
                  value={newUserWarehouse}
                  onChange={(e) => setNewUserWarehouse(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold"
                >
                  <option value="1">Mulemba Warehouse (Luanda North)</option>
                  <option value="2">Palanca Warehouse (Luanda South)</option>
                  <option value="3">Lobito Warehouse (Benguela)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Initial Password</label>
                <input
                  type="text"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddUserModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPassModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bento-card max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-600" />
                <span>Reset User Password</span>
              </h3>
              <button onClick={() => setResetPassModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
              <p className="text-slate-600">
                Set a new password for <span className="font-bold text-slate-900">{activeUserToReset?.username}</span>:
              </p>
              <input
                type="password"
                required
                placeholder="Enter new secure password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-xs font-mono"
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetPassModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
