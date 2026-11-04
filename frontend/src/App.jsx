import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";

// Pages
import DashboardPage from "./pages/DashboardPage";
import StockCountingPage from "./pages/StockCountingPage";
import ReconciliationPage from "./pages/ReconciliationPage";
import ShipmentsTransfersPage from "./pages/ShipmentsTransfersPage";
import AlertsPage from "./pages/AlertsPage";
import HQMasterPage from "./pages/HQMasterPage";
import RolesManagerPage from "./pages/RolesManagerPage";
import LookupsManagerPage from "./pages/LookupsManagerPage";
import ApiLogsPage from "./pages/ApiLogsPage";

function MainApp() {
  const [currentView, setCurrentView] = useState("dashboard");
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xs font-mono">
        <div className="space-y-3 text-center">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div>Connecting to Allisons African Pharma Backend Engine...</div>
        </div>
      </div>
    );
  }

  function renderView() {
    switch (currentView) {
      case "dashboard":
        return <DashboardPage setCurrentView={setCurrentView} />;
      case "counting":
        return <StockCountingPage />;
      case "reconciliation":
        return <ReconciliationPage />;
      case "shipments":
        return <ShipmentsTransfersPage />;
      case "alerts":
        return <AlertsPage />;
      case "hq":
        return <HQMasterPage />;
      case "roles":
        return <RolesManagerPage />;
      case "lookups":
        return <LookupsManagerPage />;
      case "logs":
        return <ApiLogsPage />;
      default:
        return <DashboardPage setCurrentView={setCurrentView} />;
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
        <main className="flex-1 min-h-[calc(100vh-4rem)] overflow-y-auto">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
