import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import LoginPage from "./pages/LoginPage";

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
  const getInitialView = () => {
    const hash = window.location.hash.replace(/^#\/?/, "");
    const validViews = ["dashboard", "counting", "reconciliation", "shipments", "alerts", "hq", "roles", "lookups", "logs"];
    return validViews.includes(hash) ? hash : "dashboard";
  };

  const [currentView, setCurrentViewState] = useState(getInitialView);
  const { user, loading } = useAuth();

  const setCurrentView = (view) => {
    window.location.hash = `#/${view}`;
    setCurrentViewState(view);
  };

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, "");
      const validViews = ["dashboard", "counting", "reconciliation", "shipments", "alerts", "hq", "roles", "lookups", "logs"];
      if (validViews.includes(hash)) {
        setCurrentViewState(hash);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-xs font-mono">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto shadow-lg shadow-purple-500/20"></div>
          <div className="text-slate-300 font-medium tracking-wide">
            Connecting to Allisons African Pharma Portal...
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated: render Login Portal
  if (!user) {
    return <LoginPage />;
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
    <LanguageProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </LanguageProvider>
  );
}

