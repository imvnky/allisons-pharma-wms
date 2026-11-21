import React, { useState } from "react";
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
import ProductsPage from "./pages/ProductsPage";

function MainApp() {
  const [currentView, setCurrentView] = useState("dashboard");
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-800 text-xs">
        <div className="space-y-4 text-center">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto shadow-sm"></div>
          <div className="text-slate-600 font-semibold tracking-wide">
            Connecting to Alisons African Pharma Portal...
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
      case "products":
        return <ProductsPage />;
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
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 font-sans antialiased">
      <Navbar currentView={currentView} setCurrentView={setCurrentView} />
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
      <LanguageProvider>
        <MainApp />
      </LanguageProvider>
    </AuthProvider>
  );
}
