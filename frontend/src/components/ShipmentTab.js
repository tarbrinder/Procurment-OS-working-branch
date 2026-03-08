import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addShipment, listShipments } from "@/lib/api";
import { toast } from "sonner";
import { Truck, Package, MapPin } from "lucide-react";

export const ShipmentTab = ({ rfq, rfqId, view, glid, onRefresh }) => {
  const [shipments, setShipments] = useState([]);
  const [form, setForm] = useState({ lr_number: "", tracking_number: "", carrier: "", quantity_shipped: "", eway_bill: "", notes: "" });

  const lastUpdated = rfq?.last_updated;
  const load = () => { listShipments(rfqId).then((r) => setShipments(r.data.shipments)); };
  useEffect(load, [rfqId, lastUpdated]);

  const totalShipped = shipments.reduce((s, sh) => s + (sh.quantity_shipped || 0), 0);

  const handleAdd = async () => {
    if (!form.quantity_shipped) { toast.error("Quantity required"); return; }
    try {
      await addShipment(rfqId, { ...form, quantity_shipped: parseInt(form.quantity_shipped) });
      toast.success("Shipment added"); load(); if (onRefresh) onRefresh();
      setForm({ lr_number: "", tracking_number: "", carrier: "", quantity_shipped: "", eway_bill: "", notes: "" });
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  return (
    <div className="space-y-3 pt-3" data-testid="shipment-tab">
      <div className="text-xs font-semibold text-slate-600">
        Shipped: {totalShipped.toLocaleString()} of {rfq?.quantity?.toLocaleString() || "?"} units
      </div>

      {view === "seller" && (
        <div className="space-y-2 border-t pt-3">
          <p className="text-xs font-semibold text-slate-600">Add Shipment</p>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Quantity</Label><Input type="number" value={form.quantity_shipped} onChange={(e) => setForm({ ...form, quantity_shipped: e.target.value })} data-testid="shipment-qty" /></div>
            <div><Label className="text-xs">Carrier</Label><Input value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} placeholder="e.g. Delhivery" /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">LR Number</Label><Input value={form.lr_number} onChange={(e) => setForm({ ...form, lr_number: e.target.value })} data-testid="shipment-lr" /></div>
            <div><Label className="text-xs">Tracking Number</Label><Input value={form.tracking_number} onChange={(e) => setForm({ ...form, tracking_number: e.target.value })} data-testid="shipment-tracking" /></div>
          </div>
          <div><Label className="text-xs">E-Way Bill</Label><Input value={form.eway_bill} onChange={(e) => setForm({ ...form, eway_bill: e.target.value })} /></div>
          <div><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          <Button size="sm" onClick={handleAdd} data-testid="add-shipment-btn"><Truck size={14} /> Add Shipment</Button>
        </div>
      )}

      {shipments.length > 0 && (
        <div className="border-t pt-3 space-y-2">
          <p className="text-xs font-semibold text-slate-600">Shipments</p>
          {shipments.map((s) => (
            <div key={s.shipment_id} className="text-xs p-2 bg-slate-50 rounded border space-y-1" data-testid={`shipment-${s.shipment_id}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold flex items-center gap-1"><Package size={12} /> {s.quantity_shipped} units</span>
                <span className="text-xs uppercase font-semibold" style={{ color: s.status === "dispatched" ? "#1d4ed8" : "#047857" }}>{s.status}</span>
              </div>
              <div className="text-slate-500">
                {s.carrier && <span>Carrier: {s.carrier} | </span>}
                {s.lr_number && <span>LR: {s.lr_number} | </span>}
                {s.tracking_number && <span className="flex items-center gap-1 inline"><MapPin size={10} /> {s.tracking_number}</span>}
                {s.eway_bill && <span> | E-Way: {s.eway_bill}</span>}
              </div>
              {s.notes && <div className="text-slate-400">{s.notes}</div>}
            </div>
          ))}
        </div>
      )}

      {shipments.length === 0 && view === "buyer" && (
        <p className="text-xs text-slate-400 py-4 text-center">No shipments yet. Waiting for seller to dispatch.</p>
      )}
    </div>
  );
};
