import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { fetchNotifications } from "@/lib/api";
import { STAGE_LABELS } from "@/lib/constants";
import { Bell, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const NotificationBell = ({ glid, view }) => {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const lastSeenRef = useRef("");
  const navigate = useNavigate();

  const load = useCallback(async () => {
    if (!glid) return;
    try {
      const res = await fetchNotifications(view, glid, lastSeenRef.current);
      const items = res.data.notifications || [];
      if (items.length > 0 && !open) {
        setUnread((prev) => prev + items.filter((n) => n.created_at > (lastSeenRef.current || "")).length);
        setNotifications((prev) => {
          const ids = new Set(prev.map((p) => p.log_id));
          const newItems = items.filter((n) => !ids.has(n.log_id));
          return [...newItems, ...prev].slice(0, 30);
        });
        if (items[0]) lastSeenRef.current = items[0].created_at;
      }
    } catch (e) { /* silent */ }
  }, [glid, view, open]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [load]);

  const handleOpen = () => {
    setOpen(!open);
    if (!open) setUnread(0);
  };

  return (
    <div className="relative" data-testid="notification-bell">
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
        data-testid="notification-bell-btn"
      >
        <Bell size={18} className="text-slate-600" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center" data-testid="notification-count">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-lg shadow-xl border border-slate-200 z-50 max-h-96 overflow-y-auto" data-testid="notification-dropdown">
          <div className="flex items-center justify-between p-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-700">Activity Feed</span>
            <button onClick={() => setOpen(false)}><X size={14} className="text-slate-400" /></button>
          </div>
          {notifications.length === 0 ? (
            <p className="text-xs text-slate-400 p-4 text-center">No recent activity</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.log_id}
                onClick={() => { navigate(`/rfq/${n.rfq_id}?view=${view}&glid=${glid}`); setOpen(false); }}
                className="w-full text-left px-3 py-2.5 hover:bg-slate-50 border-b border-slate-50 transition-colors"
                data-testid={`notification-${n.log_id}`}
              >
                <div className="text-xs font-semibold text-slate-700 truncate">{n.product}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{n.details}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
