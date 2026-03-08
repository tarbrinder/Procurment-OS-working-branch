import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { recordPayment, listPayments, confirmPayment, rejectPayment, getProforma } from "@/lib/api";
import { FileUpload } from "@/components/FileUpload";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, CreditCard } from "lucide-react";

export const PaymentTab = ({ rfq, rfqId, view, glid, onRefresh }) => {
  const [payments, setPayments] = useState([]);
  const [proforma, setProforma] = useState(null);
  const [form, setForm] = useState({ amount: "", payment_method: "", reference_number: "", milestone: "advance" });
  const [fileIds, setFileIds] = useState([]);

  const lastUpdated = rfq?.last_updated;
  const load = () => {
    listPayments(rfqId).then((r) => setPayments(r.data.payments));
    getProforma(rfqId).then((r) => setProforma(r.data.proforma));
  };
  useEffect(load, [rfqId, lastUpdated]);

  const totalPaid = payments.filter((p) => p.status === "confirmed").reduce((s, p) => s + p.amount, 0);
  const invoiceTotal = proforma?.total_amount || rfq?.budget || 0;
  const paidPercent = invoiceTotal > 0 ? Math.min(100, Math.round((totalPaid / invoiceTotal) * 100)) : 0;

  const handleRecord = async () => {
    if (!form.amount) { toast.error("Amount required"); return; }
    try {
      await recordPayment(rfqId, { ...form, amount: parseFloat(form.amount), file_ids: fileIds, payer_glid: glid, payer_type: view });
      toast.success("Payment recorded"); load(); if (onRefresh) onRefresh();
      setForm({ amount: "", payment_method: "", reference_number: "", milestone: "advance" }); setFileIds([]);
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const handleConfirm = async (paymentId) => {
    try { await confirmPayment(rfqId, paymentId); toast.success("Payment confirmed"); load(); if (onRefresh) onRefresh(); }
    catch (e) { toast.error("Failed"); }
  };

  const handleReject = async (paymentId) => {
    try { await rejectPayment(rfqId, paymentId); toast.error("Payment rejected"); load(); }
    catch (e) { toast.error("Failed"); }
  };

  return (
    <div className="space-y-3 pt-3" data-testid="payment-tab">
      {/* Progress bar */}
      <div className="text-xs font-semibold text-slate-600 flex justify-between">
        <span>Paid: INR {totalPaid.toLocaleString()} of {invoiceTotal.toLocaleString()}</span>
        <span>{paidPercent}%</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2"><div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${paidPercent}%`, transition: "width 0.3s" }} /></div>

      {/* Record payment form (buyer) */}
      {view === "buyer" && (
        <div className="space-y-2 border-t pt-3">
          <p className="text-xs font-semibold text-slate-600">Record Payment</p>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Amount (INR)</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} data-testid="payment-amount" /></div>
            <div><Label className="text-xs">Milestone</Label>
              <Select value={form.milestone} onValueChange={(v) => setForm({ ...form, milestone: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="advance">Advance</SelectItem>
                  <SelectItem value="on_dispatch">On Dispatch</SelectItem>
                  <SelectItem value="on_delivery">On Delivery</SelectItem>
                  <SelectItem value="retention">Retention</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Method</Label><Input value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} placeholder="NEFT/RTGS/UPI" /></div>
            <div><Label className="text-xs">Reference/UTR</Label><Input value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} data-testid="payment-ref" /></div>
          </div>
          <FileUpload rfqId={rfqId} glid={glid} viewType={view} onFilesUploaded={(f) => setFileIds(f.map((x) => x.file_id))} compact />
          <Button size="sm" onClick={handleRecord} data-testid="record-payment-btn"><CreditCard size={14} /> Record Payment</Button>
        </div>
      )}

      {/* Payment list */}
      {payments.length > 0 && (
        <div className="border-t pt-3 space-y-2">
          <p className="text-xs font-semibold text-slate-600">Payment History</p>
          {payments.map((p) => (
            <div key={p.payment_id} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded border" data-testid={`payment-${p.payment_id}`}>
              <div>
                <span className="font-semibold">INR {p.amount?.toLocaleString()}</span>
                <span className="text-slate-400 ml-2">{p.milestone} | {p.payment_method || "N/A"} | Ref: {p.reference_number || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2">
                {p.status === "pending" && <span className="text-amber-600 flex items-center gap-1"><Clock size={12} /> Pending</span>}
                {p.status === "confirmed" && <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12} /> Confirmed</span>}
                {p.status === "rejected" && <span className="text-red-600 flex items-center gap-1"><XCircle size={12} /> Rejected</span>}
                {p.status === "pending" && view === "seller" && (
                  <>
                    <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => handleConfirm(p.payment_id)}>Confirm</Button>
                    <Button size="sm" variant="destructive" className="h-6 text-xs" onClick={() => handleReject(p.payment_id)}>Reject</Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
