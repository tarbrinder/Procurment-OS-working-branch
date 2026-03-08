import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/App";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShoppingCart, Store, ArrowRight, Code2 } from "lucide-react";

export default function LandingPage() {
  const { setView, setGlid, allGlids, view, glid } = useAppContext();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlView = params.get("view");
    const urlGlid = params.get("glid");
    if (urlView && urlGlid) {
      setView(urlView);
      setGlid(urlGlid);
      navigate(`/${urlView}`);
    }
  }, [navigate, setView, setGlid]);

  const buyers = allGlids.filter((g) => g.type === "buyer");
  const sellers = allGlids.filter((g) => g.type === "seller");
  const glidOptions = view === "buyer" ? buyers : view === "seller" ? sellers : [];

  const handleEnter = (role) => {
    setView(role);
    setGlid(null);
  };

  const handleProceed = () => {
    if (view && glid) {
      navigate(`/${view}`);
    }
  };

  return (
    <div className="landing-container" data-testid="landing-page">
      <div className="landing-card">
        <h1>GLID Procurement OS</h1>
        <p className="subtitle">Demo Mode</p>

        <div className="role-buttons">
          <Button
            onClick={() => handleEnter("buyer")}
            className={`role-btn ${view === "buyer" ? "active" : ""}`}
            data-testid="enter-buyer-btn"
          >
            <ShoppingCart size={20} />
            Enter as Buyer
          </Button>
          <Button
            onClick={() => handleEnter("seller")}
            className={`role-btn ${view === "seller" ? "active" : ""}`}
            data-testid="enter-seller-btn"
          >
            <Store size={20} />
            Enter as Seller
          </Button>
        </div>

        {view && (
          <div className="glid-selection" data-testid="glid-selection">
            <label>Select your GLID</label>
            <Select onValueChange={(v) => setGlid(v)}>
              <SelectTrigger data-testid="glid-select-trigger">
                <SelectValue placeholder="Choose GLID..." />
              </SelectTrigger>
              <SelectContent>
                {glidOptions.map((g) => (
                  <SelectItem key={g.glid} value={g.glid} data-testid={`glid-option-${g.glid}`}>
                    GLID {g.glid} — {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {view && glid && (
          <Button onClick={handleProceed} className="proceed-btn" data-testid="proceed-btn">
            Proceed to Dashboard <ArrowRight size={16} />
          </Button>
        )}

        <div className="mt-6 pt-4 border-t border-slate-200">
          <button
            onClick={() => navigate("/integration")}
            className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1.5 mx-auto transition-colors"
            data-testid="integration-console-link"
          >
            <Code2 size={14} /> Integration Console — Embed in your app
          </button>
        </div>
      </div>
    </div>
  );
}
