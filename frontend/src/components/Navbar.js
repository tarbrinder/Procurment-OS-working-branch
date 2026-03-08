import { useAppContext } from "@/App";
import { useNavigate } from "react-router-dom";
import { ArrowLeftRight } from "lucide-react";

export const Navbar = ({ children }) => {
  const { view, glid, glidInfo, setView, setGlid } = useAppContext();
  const navigate = useNavigate();

  const handleSwitch = () => {
    const newView = view === "buyer" ? "seller" : "buyer";
    setView(newView);
    setGlid(null);
    navigate("/");
  };

  const handleHome = () => {
    setView(null);
    setGlid(null);
    navigate("/");
  };

  return (
    <nav className="navbar" data-testid="navbar">
      <div className="navbar-left">
        <button onClick={handleHome} className="nav-logo" data-testid="nav-home">
          GLID Procurement OS
        </button>
        {glidInfo && (
          <span className="nav-glid-badge" data-testid="nav-glid-badge">
            GLID {glid} — {glidInfo.name}
          </span>
        )}
      </div>
      <div className="navbar-right">
        {children}
        {view && (
          <div className="view-switcher" data-testid="view-switcher">
            <span className={view === "buyer" ? "active-label" : "inactive-label"}>
              Buyer
            </span>
            <button onClick={handleSwitch} className="switch-btn" data-testid="switch-view-btn">
              <ArrowLeftRight size={16} />
            </button>
            <span className={view === "seller" ? "active-label" : "inactive-label"}>
              Seller
            </span>
          </div>
        )}
      </div>
    </nav>
  );
};
