import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { recordDelivery, listDeliveries } from "@/lib/api";
import { FileUpload } from "@/components/FileUpload";
import { toast } from "sonner";
import { PackageCheck, AlertTriangle, CheckCircle2 } from "lucide-react";

export const DeliveryTab = ({ rfq, rfqId, view, glid, onRefresh }) => {
  const [deliveries, setDeliveries] = useState([]);
  const [form, setForm] = useState({ delivery_status: "full", quality_status: "ok", notes: "", quantity_received: "" });
  const [photoIds, setPhotoIds] = useState([]);

  const lastUpdated = rfq?.last_updated;
  const load = () => { listDeliveries(rfqId).then((r) => setDeliveries(r.data.deliveries)); };
  useEffect(load, [rfqId, lastUpdated]);

  const totalReceived = deliveries.reduce((s, d) => s + (d.quantity_received || 0), 0);

  const handleRecord = async () => {
    if (!form.quantity_received) { toast.error("Quantity required"); return; }
    try {
      await recordDelivery(rfqId, { ...form, quantity_received: parseInt(form.quantity_received), photo_file_ids: photoIds });
      toast.success("Delivery recorded"); load(); if (onRefresh) onRefresh();
      setForm({ delivery_status: "full", quality_status: "ok", notes: "", quantity_received: "" }); setPhotoIds([]);
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  return (
    <div className="space-y-3 pt-3" data-testid="delivery-tab">
      <div className="text-xs font-semibold text-slate-600">
        Received: {totalReceived.toLocaleString()} of {rfq?.quantity?.toLocaleString() || "?"} units
      </div>

      {view === "buyer" && (
        <div className="space-y-2 border-t pt-3">
          <p className="text-xs font-semibold text-slate-600">Confirm Delivery</p>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Quantity Received</Label><Input type="number" value={form.quantity_received} onChange={(e) => setForm({ ...form, quantity_received: e.target.value })} data-testid="delivery-qty" /></div>
            <div><Label className="text-xs">Delivery Status</Label>
              <Select value={form.delivery_status} onValueChange={(v) => setForm({ ...form, delivery_status: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Fully Received</SelectItem>
                  <SelectItem value="partial">Partially Received</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label className="text-xs">Quality Check</Label>
            <Select value={form.quality_status} onValueChange={(v) => setForm({ ...form, quality_status: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ok">Quality OK</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
                <SelectItem value="mixed">Mixed Quality</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Any observations..." /></div>
          <FileUpload rfqId={rfqId} glid={glid} viewType={view} onFilesUploaded={(f) => setPhotoIds(f.map((x) => x.file_id))} compact />
          <Button size="sm" onClick={handleRecord} data-testid="confirm-delivery-btn"><PackageCheck size={14} /> Confirm Delivery</Button>
        </div>
      )}

      {deliveries.length > 0 && (
        <div className="border-t pt-3 space-y-2">
          <p className="text-xs font-semibold text-slate-600">Delivery Records</p>
          {deliveries.map((d) => {
            const qualityIcon = d.quality_status === "ok" ? <CheckCircle2 size={12} className="text-emerald-600" /> : <AlertTriangle size={12} className="text-amber-600" />;
            return (
              <div key={d.delivery_id} className="text-xs p-2 bg-slate-50 rounded border" data-testid={`delivery-${d.delivery_id}`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{d.quantity_received} units — {d.delivery_status === "full" ? "Fully Received" : "Partially Received"}</span>
                  <span className="flex items-center gap-1">{qualityIcon} {d.quality_status === "ok" ? "Quality OK" : d.quality_status === "damaged" ? "Damaged" : "Mixed"}</span>
                </div>
                {d.notes && <div className="text-slate-400 mt-1">{d.notes}</div>}
              </div>
            );
          })}
        </div>
      )}

      {deliveries.length === 0 && view === "seller" && (
        <p className="text-xs text-slate-400 py-4 text-center">Waiting for buyer to confirm delivery.</p>
      )}
    </div>
  );
};
