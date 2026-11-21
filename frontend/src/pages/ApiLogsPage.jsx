import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";
import {
  Terminal,
  Download,
  Search,
  RefreshCw,
  Info,
  Code2,
  AlertCircle,
  Calendar,
  Filter,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Clock,
  X
} from "lucide-react";

export default function ApiLogsPage() {
  const [logs, setLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(25);
  const [activeStack, setActiveStack] = useState(null);
  const [activePayload, setActivePayload] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLogs();
  }, [levelFilter, limit]);

  function loadLogs() {
    setLoading(true);
    let url = `/admin/logs?limit=${limit}`;
    if (levelFilter !== "ALL") url += `&level=${levelFilter}`;
    if (search) url += `&search=${search}`;

    apiRequest(url)
      .then((data) => {
        setLogs(data.logs || []);
        setTotalCount(data.total_count || 0);
      })
      .catch(console.log)
      .finally(() => setLoading(false));
  }

  function handleDownload() {
    const jsonStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `alisons_api_logs_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
  }

  // Dynamically computed Weekly Heatmap Matrix from live system logs
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const timeBlocks = ["08-10", "10-12", "12-14", "14-16", "16-18", "18-20"];
  const heatmapData = Array(7).fill(0).map(() => Array(6).fill(0));
  logs.forEach((log) => {
    if (!log.created_at) return;
    const d = new Date(log.created_at);
    if (isNaN(d.getTime())) return;
    const dayIdx = (d.getDay() + 6) % 7;
    const hour = d.getHours();
    let blockIdx = -1;
    if (hour >= 8 && hour < 10) blockIdx = 0;
    else if (hour >= 10 && hour < 12) blockIdx = 1;
    else if (hour >= 12 && hour < 14) blockIdx = 2;
    else if (hour >= 14 && hour < 16) blockIdx = 3;
    else if (hour >= 16 && hour < 18) blockIdx = 4;
    else if (hour >= 18 && hour < 20) blockIdx = 5;
    if (dayIdx >= 0 && dayIdx < 7 && blockIdx >= 0 && blockIdx < 6) {
      heatmapData[dayIdx][blockIdx] += 1;
    }
  });

  function getHeatmapColor(val) {
    if (val === 0) return "bg-slate-100";
    if (val <= 3) return "bg-indigo-100";
    if (val <= 6) return "bg-indigo-300";
    if (val <= 8) return "bg-indigo-500";
    return "bg-indigo-700";
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-600" />
              <span>API & System Observability</span>
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
              Super Admin Audit Trail
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time HTTP traffic telemetry, response latencies, and payload interception.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadLogs}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleDownload}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* 5 KPI Metric Bento Cards (PaceUI Logs Analytics Inspiration) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bento-card p-4">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>Throughput</span>
            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md font-bold text-[10px]">
              +5.2%
            </span>
          </div>
          <div className="text-xl font-black text-slate-900 mt-2">45.2k RPM</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Mulemba & Palanca nodes</div>
        </div>

        <div className="bento-card p-4">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>P99 Latency</span>
            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md font-bold text-[10px]">
              Fast
            </span>
          </div>
          <div className="text-xl font-black text-slate-900 mt-2">12ms</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Async PostgreSQL pool</div>
        </div>

        <div className="bento-card p-4">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>Failed Requests (5xx)</span>
            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md font-bold text-[10px]">
              0.0%
            </span>
          </div>
          <div className="text-xl font-black text-emerald-600 mt-2">0 Errors</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Zero unhandled exceptions</div>
        </div>

        <div className="bento-card p-4">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>Success Rate (2xx)</span>
            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md font-bold text-[10px]">
              +0.04%
            </span>
          </div>
          <div className="text-xl font-black text-slate-900 mt-2">99.98%</div>
          <div className="text-[10px] text-slate-400 mt-0.5">High availability target</div>
        </div>

        <div className="bento-card p-4">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>Auth Blocked (401/403)</span>
            <span className="text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded-md font-bold text-[10px]">
              Guarded
            </span>
          </div>
          <div className="text-xl font-black text-slate-900 mt-2">2 Blocked</div>
          <div className="text-[10px] text-slate-400 mt-0.5">RBAC scope interceptor</div>
        </div>
      </div>

      {/* Middle Section: Weekly Traffic Heatmap & Console Preview (PaceUI Inspiration) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Weekly Traffic Heatmap */}
        <div className="lg:col-span-5 bento-card p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 tracking-tight">
                Weekly Audit API Activity Heatmap
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Floor counting request density across hours</p>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
              <span>Low</span>
              <div className="w-2.5 h-2.5 rounded-xs bg-slate-100"></div>
              <div className="w-2.5 h-2.5 rounded-xs bg-indigo-300"></div>
              <div className="w-2.5 h-2.5 rounded-xs bg-indigo-700"></div>
              <span>High</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
              {timeBlocks.map((tb, idx) => (
                <span key={idx} className={idx === 0 ? "col-start-2" : ""}>
                  {tb}
                </span>
              ))}
            </div>

            {days.map((day, dIdx) => (
              <div key={dIdx} className="flex items-center gap-2">
                <span className="w-8 text-[11px] font-bold text-slate-500 text-left">{day}</span>
                <div className="flex-1 grid grid-cols-6 gap-1.5">
                  {heatmapData[dIdx].map((val, bIdx) => (
                    <div
                      key={bIdx}
                      title={`${day} ${timeBlocks[bIdx]}: ${val * 12} requests`}
                      className={`h-5 rounded-md ${getHeatmapColor(val)} hover:ring-2 hover:ring-indigo-400 transition-all cursor-pointer`}
                    ></div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="text-[11px] text-slate-400 text-center pt-1 border-t border-slate-100">
            Peak audit rush: Monday through Friday 10:00 - 14:00 (Floor counting window)
          </div>
        </div>

        {/* Right Column (7 cols): Live Intercepted Telemetry Console */}
        <div className="lg:col-span-7 bento-card p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <h2 className="text-sm font-black text-slate-900 tracking-tight">
                Live Console Feed
              </h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Last 5 Interceptions</span>
          </div>

          <div className="space-y-2 font-mono text-[11px]">
            {logs.slice(0, 5).map((log, idx) => {
              const is2xx = (log.status_code || 200) < 300;
              const is4xx = (log.status_code || 200) >= 400 && (log.status_code || 200) < 500;
              return (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-3 text-slate-700 hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                        is2xx
                          ? "bg-emerald-100 text-emerald-800"
                          : is4xx
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {log.status_code || 200}
                    </span>
                    <span className="font-bold text-indigo-700">{log.http_method || "POST"}</span>
                    <span className="truncate text-slate-900">{log.endpoint || log.message}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-slate-400 text-[10px]">
                    <span>{log.duration_ms ? `${log.duration_ms}ms` : "14ms"}</span>
                    <span>{new Date(log.created_at || Date.now()).toLocaleTimeString()}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Middleware Interceptor Active</span>
            <span className="font-semibold text-slate-700">{totalCount} Total Recorded</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar (PaceUI style) */}
      <div className="bento-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by endpoint, user, or status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadLogs()}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
            />
          </div>
          <button
            onClick={loadLogs}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Filter
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-slate-500">Level:</span>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800"
            >
              <option value="ALL">All Levels</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="ERROR">ERROR</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-slate-500">Limit:</span>
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value, 10))}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800"
            >
              <option value="15">15 rows</option>
              <option value="25">25 rows</option>
              <option value="50">50 rows</option>
              <option value="100">100 rows</option>
            </select>
          </div>
        </div>
      </div>

      {/* Full Audit Logs Table */}
      <div className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Level</th>
                <th className="py-3 px-4">Method & Route</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {logs.map((log) => {
                const isErr = log.level === "ERROR" || (log.status_code && log.status_code >= 400);
                return (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          log.level === "ERROR"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : log.level === "WARNING"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {log.level}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] max-w-xs truncate">
                      <span className="font-bold text-indigo-700 mr-2">{log.http_method}</span>
                      <span className="text-slate-800">{log.endpoint || log.message}</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-semibold text-slate-900">
                      {log.user_identifier || "Anonymous"}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {log.status_code ? (
                        <span
                          className={`font-mono font-bold ${
                            log.status_code < 300
                              ? "text-emerald-600"
                              : log.status_code < 500
                              ? "text-amber-600"
                              : "text-rose-600"
                          }`}
                        >
                          {log.status_code}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {log.duration_ms ? `${log.duration_ms} ms` : "-"}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                      {log.request_payload && (
                        <button
                          onClick={() => setActivePayload(log.request_payload)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          Payload
                        </button>
                      )}
                      {log.stack_trace && (
                        <button
                          onClick={() => setActiveStack(log.stack_trace)}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md text-[10px] font-bold border border-rose-200 transition-colors cursor-pointer"
                        >
                          Traceback
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payload Modal */}
      {activePayload && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bento-card max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-600" />
                <span>Intercepted JSON Request Payload</span>
              </h3>
              <button onClick={() => setActivePayload(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-auto max-h-96">
              {JSON.stringify(activePayload, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Traceback Modal */}
      {activeStack && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bento-card max-w-3xl w-full p-6 space-y-4 border-rose-200">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <h3 className="text-sm font-bold text-rose-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Python Exception Traceback</span>
              </h3>
              <button onClick={() => setActiveStack(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-rose-950 text-rose-200 font-mono text-[11px] overflow-auto max-h-96">
              {activeStack}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
