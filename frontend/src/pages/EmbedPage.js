import { useState, useEffect } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { embedConfig } from "@/lib/api";
import BuyerDashboard from "@/pages/BuyerDashboard";
import SellerDashboard from "@/pages/SellerDashboard";
import RFQWorkspace from "@/pages/RFQWorkspace";
import { AppContext } from "@/App";
import { Toaster } from "@/components/ui/sonner";

export default function EmbedPage() {
  const [searchParams] = useSearchParams();
  const { rfqId } = useParams();
  const token = searchParams.get("token");
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setError("No token provided"); setLoading(false); return; }
    embedConfig(token)
      .then((res) => { setConfig(res.data); setLoading(false); })
      .catch((e) => { setError(e.response?.data?.detail || "Invalid token"); setLoading(false); });
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="bg-white rounded-xl border border-red-200 p-6 max-w-sm text-center">
          <p className="text-sm font-semibold text-red-600 mb-1">Authentication Failed</p>
          <p className="text-xs text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!config) return null;

  // Provide a context that mimics AppProvider for embedded mode
  const contextValue = {
    view: config.role,
    setView: () => {},
    glid: config.glid,
    setGlid: () => {},
    glidInfo: { glid: config.glid, name: config.name, type: config.role },
    allGlids: [],
    switchView: () => {},
    isEmbed: true,
  };

  return (
    <AppContext.Provider value={contextValue}>
      <Toaster position="top-right" richColors />
      {rfqId ? (
        <RFQWorkspace />
      ) : config.role === "buyer" ? (
        <BuyerDashboard />
      ) : (
        <SellerDashboard />
      )}
    </AppContext.Provider>
  );
}
