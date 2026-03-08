import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { performAction, acceptProforma, rejectProforma, recordPayment, confirmPayment, addShipment, recordDelivery } from "@/lib/api";
import { toast } from "sonner";
import { CheckCircle2, XCircle, CreditCard, Truck, PackageCheck, FileText } from "lucide-react";

export const InlineActionBar = ({ rfq, rfqId, view, glid, onRefresh }) => {
  const [expanded, setExpanded] = useState(null);
  const [form, setForm] = useState({});
  const stage = rfq?.stage;

  const handleSubmit = async (action) => {
    try {
      if (action === "generate_po") {
        const poNumber = `PO-${rfqId.substring(0, 8).toUpperCase()}-${Date.now().toString().slice(-6)}`;
        await performAction(rfqId, {
          action: "generate_po",
          actor_glid: glid,
          actor_type: view,
          content: `Purchase Order Generated: ${poNumber}`,
          metadata: { po_number: poNumber },
        });
        toast.success(`Purchase Order ${poNumber} generated successfully`);
      } else if (action === "accept_proforma") {
        await acceptProforma(rfqId);
        toast.success("Proforma accepted");
      } else if (action === "reject_proforma") {
        await rejectProforma(rfqId);
        toast.success("Proforma rejected");
      } else if (action === "record_payment") {
        if (!form.amount || !form.reference_number) { toast.error("Amount and reference required"); return; }
        await recordPayment(rfqId, {
          amount: parseFloat(form.amount), payment_method: form.payment_method || "NEFT",
          reference_number: form.reference_number, milestone: "payment",
          payer_glid: glid, payer_type: view,
        });
        toast.success("Payment recorded");
      } else if (action === "confirm_payment") {
        if (!form.payment_id) return;
        await confirmPayment(rfqId, form.payment_id);
        toast.success("Payment confirmed");
      } else if (action === "add_shipment") {
        if (!form.quantity_shipped) { toast.error("Quantity required"); return; }
        await addShipment(rfqId, {
          lr_number: form.lr_number || "", tracking_number: form.tracking_number || "",
          carrier: form.carrier || "", quantity_shipped: parseInt(form.quantity_shipped),
          eway_bill: "", notes: "",
        });
        toast.success("Shipment dispatched");
      } else if (action === "confirm_delivery") {
        await recordDelivery(rfqId, {
          delivery_status: "full", quality_status: "ok", notes: "Confirmed via chat",
          photo_file_ids: [], quantity_received: rfq?.quantity || 0,
        });
        toast.success("Delivery confirmed");
      }
      setExpanded(null);
      setForm({});
      if (onRefresh) onRefresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Action failed");
    }
  };

  // Determine what inline actions to show based on stage + view
  let actions = [];
  if (stage === "DEAL_WON" && view === "buyer") {
    actions = [
      { key: "generate_po", label: "Generate Purchase Order", icon: FileText, variant: "success", quick: true },
    ];
  } else if (stage === "PROFORMA_SENT" && view === "buyer") {
    actions = [
      { key: "accept_proforma", label: "Accept Proforma", icon: CheckCircle2, variant: "success", quick: true },
      { key: "reject_proforma", label: "Reject", icon: XCircle, variant: "destructive", quick: true },
    ];
  } else if ((stage === "PAYMENT_PENDING" || stage === "PAYMENT_PARTIAL") && view === "buyer") {
    actions = [
      { key: "record_payment", label: "Record Payment", icon: CreditCard, form: true },
    ];
  } else if ((stage === "PAYMENT_PENDING" || stage === "PAYMENT_PARTIAL") && view === "seller") {
    // Seller might need to confirm pending payments — shown in tab
  } else if (stage === "PAYMENT_RECEIVED" && view === "seller") {
    actions = [
      { key: "add_shipment", label: "Dispatch Shipment", icon: Truck, form: true },
    ];
  } else if (stage === "IN_TRANSIT" && view === "buyer") {
    actions = [
      { key: "confirm_delivery", label: "Confirm Delivery", icon: PackageCheck, variant: "success", quick: true },
    ];
  }

  if (actions.length === 0) return null;

  return (
    <div className="inline-action-bar" data-testid="inline-action-bar">
      <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1">
        <FileText size={10} /> Quick action for current stage:
      </div>
      <div className="flex flex-wrap gap-1.5">
        {actions.map((a) => (
          <div key={a.key}>
            {a.quick ? (
              <Button
                size="sm"
                variant={a.variant === "destructive" ? "destructive" : "outline"}
                className={`text-xs h-7 ${a.variant === "success" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                onClick={() => handleSubmit(a.key)}
                data-testid={`inline-${a.key}`}
              >
                <a.icon size={12} /> {a.label}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7"
                onClick={() => setExpanded(expanded === a.key ? null : a.key)}
                data-testid={`inline-${a.key}-toggle`}
              >
                <a.icon size={12} /> {a.label}
              </Button>
            )}
          </div>
        ))}
      </div>
      {expanded === "record_payment" && (
        <div className="flex gap-1.5 mt-2 items-end" data-testid="inline-payment-form">
          <Input className="h-7 text-xs w-24" type="number" placeholder="Amount" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Input className="h-7 text-xs w-28" placeholder="UTR / Ref#" value={form.reference_number || ""} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} />
          <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleSubmit("record_payment")} data-testid="inline-payment-submit">
            Send
          </Button>
        </div>
      )}
      {expanded === "add_shipment" && (
        <div className="flex gap-1.5 mt-2 items-end" data-testid="inline-shipment-form">
          <Input className="h-7 text-xs w-16" type="number" placeholder="Qty" value={form.quantity_shipped || ""} onChange={(e) => setForm({ ...form, quantity_shipped: e.target.value })} />
          <Input className="h-7 text-xs w-24" placeholder="LR No." value={form.lr_number || ""} onChange={(e) => setForm({ ...form, lr_number: e.target.value })} />
          <Input className="h-7 text-xs w-24" placeholder="Tracking#" value={form.tracking_number || ""} onChange={(e) => setForm({ ...form, tracking_number: e.target.value })} />
          <Input className="h-7 text-xs w-24" placeholder="Carrier" value={form.carrier || ""} onChange={(e) => setForm({ ...form, carrier: e.target.value })} />
          <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleSubmit("add_shipment")} data-testid="inline-shipment-submit">
            Dispatch
          </Button>
        </div>
      )}
    </div>
  );
};
