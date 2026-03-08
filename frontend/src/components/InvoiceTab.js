import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { sendProforma, getProforma, acceptProforma, rejectProforma } from "@/lib/api";
import { FileUpload } from "@/components/FileUpload";
import { toast } from "sonner";
import { CheckCircle2, XCircle, FileText, Clock } from "lucide-react";

export const InvoiceTab = ({ rfq, rfqId, view, glid, onRefresh }) => {
  const [proforma, setProforma] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ amount: "", tax_amount: "0", total_amount: "", payment_terms: "", notes: "" });
  const [fileIds, setFileIds] = useState([]);

  const lastUpdated = rfq?.last_updated;
  useEffect(() => {
    getProforma(rfqId).then((r) => { setProforma(r.data.proforma); setLoading(false); }).catch(() => setLoading(false));
  }, [rfqId, lastUpdated]);

  const handleSend = async () => {
    if (!form.amount || !form.total_amount) { toast.error("Amount required"); return; }
    try {
      await sendProforma(rfqId, {
        amount: parseFloat(form.amount), tax_amount: parseFloat(form.tax_amount || 0),
        total_amount: parseFloat(form.total_amount), payment_terms: form.payment_terms,
        notes: form.notes, file_ids: fileIds, line_items: [],
      });
      toast.success("Proforma invoice sent");
      const r = await getProforma(rfqId);
      setProforma(r.data.proforma);
      if (onRefresh) onRefresh();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to send"); }
  };

  const handleAccept = async () => {
    try { await acceptProforma(rfqId); toast.success("Proforma accepted"); if (onRefresh) onRefresh(); }
    catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const handleReject = async () => {
    try { await rejectProforma(rfqId); toast.success("Proforma rejected — back to negotiation"); if (onRefresh) onRefresh(); }
    catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  if (loading) return <p className="text-xs text-slate-400 py-4">Loading...</p>;

  // Seller: Send/Revise proforma
  if (view === "seller" && (!proforma || proforma.status === "rejected")) {
    return (
      <div className="space-y-3 pt-3" data-testid="proforma-form">
        <p className="text-xs font-semibold text-slate-600">{proforma?.status === "rejected" ? "Revise Proforma Invoice" : "Send Proforma Invoice"}</p>
        <div className="grid grid-cols-2 gap-2">
          <div><Label className="text-xs">Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value, total_amount: String(parseFloat(e.target.value || 0) + parseFloat(form.tax_amount || 0)) })} data-testid="proforma-amount" /></div>
          <div><Label className="text-xs">Tax</Label><Input type="number" value={form.tax_amount} onChange={(e) => setForm({ ...form, tax_amount: e.target.value, total_amount: String(parseFloat(form.amount || 0) + parseFloat(e.target.value || 0)) })} data-testid="proforma-tax" /></div>
        </div>
        <div><Label className="text-xs">Total</Label><Input value={form.total_amount} readOnly className="bg-slate-50 font-semibold" /></div>
        <div><Label className="text-xs">Payment Terms</Label><Input value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} placeholder="e.g. 50% advance, 50% on delivery" data-testid="proforma-terms" /></div>
        <div><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
        <FileUpload rfqId={rfqId} glid={glid} viewType={view} onFilesUploaded={(f) => setFileIds(f.map((x) => x.file_id))} compact />
        <Button size="sm" onClick={handleSend} data-testid="send-proforma-btn"><FileText size={14} /> Send Proforma</Button>
      </div>
    );
  }

  // Show proforma details
  if (proforma) {
    const statusColor = { sent: "text-amber-600", accepted: "text-emerald-600", rejected: "text-red-600" }[proforma.status] || "text-slate-500";
    return (
      <div className="space-y-3 pt-3" data-testid="proforma-details">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-600">Proforma Invoice (Rev {proforma.revision})</p>
          <span className={`text-xs font-bold uppercase ${statusColor}`}>{proforma.status}</span>
        </div>
        <div className="text-sm space-y-1">
          <div className="flex justify-between"><span className="text-slate-500">Amount</span><span className="font-semibold">INR {proforma.amount?.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Tax</span><span className="font-semibold">INR {proforma.tax_amount?.toLocaleString()}</span></div>
          <div className="flex justify-between border-t pt-1"><span className="text-slate-700 font-semibold">Total</span><span className="font-bold">INR {proforma.total_amount?.toLocaleString()}</span></div>
          {proforma.payment_terms && <div className="text-xs text-slate-500 pt-1">Terms: {proforma.payment_terms}</div>}
          {proforma.notes && <div className="text-xs text-slate-500">Notes: {proforma.notes}</div>}
        </div>
        {proforma.status === "sent" && view === "buyer" && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleAccept} data-testid="accept-proforma-btn"><CheckCircle2 size={14} /> Accept</Button>
            <Button size="sm" variant="destructive" onClick={handleReject} data-testid="reject-proforma-btn"><XCircle size={14} /> Reject</Button>
          </div>
        )}
        {proforma.status === "sent" && view === "seller" && (
          <p className="text-xs text-amber-600 flex items-center gap-1"><Clock size={12} /> Waiting for buyer response...</p>
        )}
        {proforma.revision_history?.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs font-semibold text-slate-500 mb-1">Revision History</p>
            {proforma.revision_history.map((r, i) => (
              <div key={i} className="text-xs text-slate-400">Rev {r.revision}: INR {r.total_amount?.toLocaleString()}</div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <p className="text-xs text-slate-400 py-4 text-center">No proforma invoice yet. {view === "seller" ? "Send one above." : "Waiting for seller."}</p>;
};
