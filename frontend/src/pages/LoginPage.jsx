import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Lock, User, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck, Warehouse, Sparkles } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showHelper, setShowHelper] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError("Please enter both username/email and password.");
      return;
    }

    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message || "Invalid credentials. Please verify username and password.");
    } finally {
      setLoading(false);
    }
  }

  function fillCredentials(u, p) {
    setUsername(u);
    setPassword(p);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/40 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Background Lighting */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-500 shadow-xl shadow-purple-500/25 border border-purple-400/30 mb-4 transform hover:scale-105 transition-transform">
            <span className="text-white font-black text-2xl tracking-wider">A</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight sm:text-3xl">
            Allisons African Pharma
          </h2>
          <p className="mt-1.5 text-xs text-purple-300 font-semibold tracking-wider uppercase">
            Warehouse Management & Audit Portal • Angola
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-white/20">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">Sign in to your account</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your assigned staff or supervisor credentials
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-red-700 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Username or Email
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. venkatesh.j or superadmin"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-purple-600 text-slate-900 placeholder:text-slate-400 transition-all bg-white"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-purple-600 text-slate-900 placeholder:text-slate-400 transition-all bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-3.5 h-3.5 text-purple-600 rounded-sm border-slate-300 focus:ring-purple-500"
                />
                <span className="text-xs text-slate-600">Keep me signed in</span>
              </label>
              <button
                type="button"
                onClick={() => setShowHelper(!showHelper)}
                className="text-xs text-purple-700 hover:text-purple-800 font-semibold"
              >
                {showHelper ? "Hide accounts hint" : "Need credentials hint?"}
              </button>
            </div>

            {showHelper && (
              <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200 text-xs text-slate-700 space-y-1.5">
                <div className="font-bold text-purple-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Standard Initial Accounts:</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1">
                  <button
                    type="button"
                    onClick={() => fillCredentials("venkatesh.j", "admin123")}
                    className="p-1.5 rounded-lg bg-white border border-purple-100 hover:border-purple-300 text-left"
                  >
                    <div className="font-bold text-purple-900">Venkatesh Joshi</div>
                    <div className="text-[10px] text-slate-500">Mulemba Supervisor</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillCredentials("superadmin", "admin123")}
                    className="p-1.5 rounded-lg bg-white border border-purple-100 hover:border-purple-300 text-left"
                  >
                    <div className="font-bold text-purple-900">Super Admin</div>
                    <div className="text-[10px] text-slate-500">Full Access</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillCredentials("hq.admin", "admin123")}
                    className="p-1.5 rounded-lg bg-white border border-purple-100 hover:border-purple-300 text-left"
                  >
                    <div className="font-bold text-purple-900">Dr. Amilcar</div>
                    <div className="text-[10px] text-slate-500">HQ Angola Director</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillCredentials("carlos.m", "admin123")}
                    className="p-1.5 rounded-lg bg-white border border-purple-100 hover:border-purple-300 text-left"
                  >
                    <div className="font-bold text-purple-900">Carlos Mendes</div>
                    <div className="text-[10px] text-slate-500">Carton Floor Staff</div>
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 hover:from-purple-800 hover:to-indigo-700 shadow-md shadow-purple-600/20 transition-all disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Security Features Info */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Dynamic RBAC Protected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Warehouse className="w-3.5 h-3.5 text-purple-600" />
              <span>3 Warehouses Active</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-400">
          Allisons African Pharma Limitada • Luanda & Benguela, Angola
        </p>
      </div>
    </div>
  );
}
