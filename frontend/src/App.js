import { useState, useEffect, createContext, useContext, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import ErrorBoundary from "@/components/ErrorBoundary";
import LandingPage from "@/pages/LandingPage";
import BuyerDashboard from "@/pages/BuyerDashboard";
import SellerDashboard from "@/pages/SellerDashboard";
import RFQWorkspace from "@/pages/RFQWorkspace";
import IntegrationConsole from "@/pages/IntegrationConsole";
import EmbedPage from "@/pages/EmbedPage";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminRFQDetail from "@/pages/AdminRFQDetail";
import { fetchGlids, fetchGlidInfo } from "@/lib/api";

export const AppContext = createContext(null);
export const useAppContext = () => useContext(AppContext);

function AppProvider({ children }) {
  const [view, setView] = useState(null);
  const [glid, setGlid] = useState(null);
  const [glidInfo, setGlidInfo] = useState(null);
  const [allGlids, setAllGlids] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlView = params.get("view");
    const urlGlid = params.get("glid");
    if (urlView && urlGlid) {
      setView(urlView);
      setGlid(urlGlid);
    }
    fetchGlids()
      .then((res) => setAllGlids(res.data.glids))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (glid) {
      fetchGlidInfo(glid)
        .then((res) => setGlidInfo(res.data))
        .catch(console.error);
    } else {
      setGlidInfo(null);
    }
  }, [glid]);

  const switchView = useCallback(() => {
    setView((v) => (v === "buyer" ? "seller" : "buyer"));
    setGlid(null);
    setGlidInfo(null);
  }, []);

  return (
    <AppContext.Provider
      value={{ view, setView, glid, setGlid, glidInfo, allGlids, switchView }}
    >
      {children}
      <Toaster position="top-right" richColors />
    </AppContext.Provider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/buyer" element={<BuyerDashboard />} />
            <Route path="/seller" element={<SellerDashboard />} />
            <Route path="/rfq/:rfqId" element={<RFQWorkspace />} />
            <Route path="/integration" element={<IntegrationConsole />} />
            <Route path="/embed" element={<EmbedPage />} />
            <Route path="/embed/rfq/:rfqId" element={<EmbedPage />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/rfq/:rfqId" element={<AdminRFQDetail />} />
          </Routes>
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
