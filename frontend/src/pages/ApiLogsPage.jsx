import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";
import { exportToCsv } from "../utils/exportUtils";
import { Terminal, Download, Search, RefreshCw, Info, Code2, AlertCircle, Calendar, Filter, FileSpreadsheet } from "lucide-react";

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
    a.download = `api_logs_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
  }

  function handleExportCsv() {
    if (!logs || logs.length === 0) return;
    const headers = [
      "Log ID",
      "Timestamp",
      "Level",
      "Message",
      "Status Code",
      "Username",
      "Warehouse ID",
      "Latency (ms)",
      "Module Name",
      "File Name",
      "Method Name",
    ];

    const rows = logs.map((l) => [
      l.id,
      l.created_at,
      l.level,
      l.message,
      l.status_code,
      l.username || "Anonymous",
      l.warehouse_id || "",
      l.latency_ms,
      l.module_name || "",
      l.file_name || "",
      l.method_name || "",
    ]);

    const dateStr = new Date().toISOString().split("T")[0];
    exportToCsv(`Allisons_ApiLogs_${dateStr}.csv`, headers, rows);
  }

  return (
    <div className="p-8 space-y-6 max-w-[1500px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Terminal className="w-6 h-6 text-purple-600" />
            <span>API & System Observability Logs</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Super Admin Audit Trail • Intercepted Requests, Payloads & Python Error Tracebacks
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadLogs}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleExportCsv}
            title="Download Logs as CSV (Excel Compatible)"
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar (From J&J UiP Reference) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search logs by message, user, or endpoint..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadLogs()}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-purple-600"
            />
          </div>
          <button
            onClick={loadLogs}
            className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold"
          >
            Search
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-slate-500">Level:</span>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="p-1.5 rounded-xl border border-slate-200 font-bold text-xs"
            >
              <option value="ALL">All Levels</option>
              <option value="INFO">INFO Only 🟢</option>
              <option value="WARN">WARN Only 🟡</option>
              <option value="ERROR">ERROR Only 🔴</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-slate-500">Rows:</span>
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value, 10))}
              className="p-1.5 rounded-xl border border-slate-200 font-bold text-xs"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      </div>

      {/* High-Density Data Grid (From Reference Image 3) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
              <tr>
                <th className="p-3 w-12">ID</th>
                <th className="p-3 w-40">Date & Time</th>
                <th className="p-3 min-w-56">Message (Hover for Details)</th>
                <th className="p-3">Activity By</th>
                <th className="p-3 text-center">Level</th>
                <th className="p-3 text-center">Error Stack</th>
                <th className="p-3 text-center">Payload</th>
                <th className="p-3">Method Name</th>
                <th className="p-3">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80">
                  <td className="p-3 font-mono font-bold text-slate-400">#{log.id}</td>
                  <td className="p-3 font-mono text-slate-600">{log.created_at}</td>
                  
                  {/* Truncated message with native hover tooltip (Image 4) */}
                  <td className="p-3 font-medium text-slate-900 group relative">
                    <div className="truncate max-w-xs">{log.message}</div>
                    {/* Hover Tooltip */}
                    <div className="hidden group-hover:block absolute left-2 top-8 z-30 bg-slate-900 text-white p-2 rounded-lg shadow-xl text-[11px] max-w-sm whitespace-normal">
                      {log.message}
                    </div>
                  </td>

                  <td className="p-3 font-bold text-purple-900">{log.username}</td>
                  
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        log.level === "ERROR"
                          ? "bg-red-100 text-red-800"
                          : log.level === "WARN"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {log.level}
                    </span>
                  </td>

                  {/* Error Stack trigger (i) icon */}
                  <td className="p-3 text-center">
                    {log.error_stack ? (
                      <button
                        onClick={() => setActiveStack(log.error_stack)}
                        className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 text-red-700 flex items-center justify-center mx-auto"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>

                  {/* Payload trigger { } icon */}
                  <td className="p-3 text-center">
                    {log.payload ? (
                      <button
                        onClick={() => setActivePayload(log.payload)}
                        className="w-6 h-6 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-700 flex items-center justify-center mx-auto"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>

                  <td className="p-3 font-mono text-slate-600 truncate max-w-xs">{log.method_name}</td>
                  <td className="p-3 font-mono font-bold text-slate-500">{log.latency_ms} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>Showing {logs.length} of {totalCount} total logged activities</div>
          <div className="text-slate-400">PostgreSQL Partitioned Event Ledger</div>
        </div>
      </div>

      {/* Traceback Modal */}
      {activeStack && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950 text-slate-100 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-4 font-mono text-xs border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-red-400 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>Python Exception Traceback (FastAPI Engine)</span>
              </span>
              <button onClick={() => setActiveStack(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <pre className="max-h-96 overflow-y-auto p-4 bg-black/60 rounded-xl text-red-300 whitespace-pre-wrap leading-relaxed">
              {activeStack}
            </pre>
          </div>
        </div>
      )}

      {/* Payload Modal */}
      {activePayload && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950 text-slate-100 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 font-mono text-xs border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-purple-400 font-bold flex items-center gap-2">
                <Code2 className="w-4 h-4" />
                <span>Request / Response JSON Payload Inspector</span>
              </span>
              <button onClick={() => setActivePayload(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <pre className="max-h-96 overflow-y-auto p-4 bg-black/60 rounded-xl text-emerald-300 whitespace-pre-wrap">
              {JSON.stringify(activePayload, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

