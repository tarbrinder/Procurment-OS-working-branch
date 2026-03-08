import { useState } from "react";
import { useAppContext } from "@/App";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { createRfq } from "@/lib/api";
import { toast } from "sonner";

export const CreateRFQModal = ({ open, onClose, onCreated }) => {
  const { glid, glidInfo, allGlids } = useAppContext();
  const [form, setForm] = useState({
    product: "",
    quantity: "",
    budget: "",
    description: "",
    seller_glid: "",
    priority: "medium",
  });
  const [loading, setLoading] = useState(false);

  const connectedSellerIds = glidInfo?.connections || [];
  const connectedSellers = allGlids.filter(
    (g) => g.type === "seller" && connectedSellerIds.includes(g.glid)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.product || !form.quantity || !form.budget || !form.seller_glid) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      await createRfq({
        buyer_glid: glid,
        seller_glid: form.seller_glid,
        product: form.product,
        quantity: parseInt(form.quantity),
        budget: parseFloat(form.budget),
        description: form.description,
        priority: form.priority,
      });
      toast.success("RFQ created successfully!");
      setForm({ product: "", quantity: "", budget: "", description: "", seller_glid: "", priority: "medium" });
      onClose();
      if (onCreated) onCreated();
    } catch (err) {
      toast.error("Failed to create RFQ");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-bold">Create New RFQ</DialogTitle>
          <DialogDescription>
            Send a Request for Quotation to a connected seller.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-xs font-semibold text-slate-600">Product Name *</Label>
            <Input
              value={form.product}
              onChange={(e) => setForm({ ...form, product: e.target.value })}
              placeholder="e.g. Steel Pipes"
              data-testid="rfq-product-input"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-600">Quantity *</Label>
              <Input
                type="number"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                placeholder="1000"
                data-testid="rfq-quantity-input"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600">Budget (INR) *</Label>
              <Input
                type="number"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                placeholder="50000"
                data-testid="rfq-budget-input"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600">Select Seller *</Label>
            <Select
              value={form.seller_glid}
              onValueChange={(v) => setForm({ ...form, seller_glid: v })}
            >
              <SelectTrigger data-testid="rfq-seller-select">
                <SelectValue placeholder="Choose seller..." />
              </SelectTrigger>
              <SelectContent>
                {connectedSellers.map((s) => (
                  <SelectItem key={s.glid} value={s.glid}>
                    GLID {s.glid} — {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600">Priority</Label>
            <Select
              value={form.priority}
              onValueChange={(v) => setForm({ ...form, priority: v })}
            >
              <SelectTrigger data-testid="rfq-priority-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600">Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Additional details..."
              rows={3}
              data-testid="rfq-description-input"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} data-testid="rfq-cancel-btn">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} data-testid="rfq-submit-btn">
              {loading ? "Creating..." : "Send RFQ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
