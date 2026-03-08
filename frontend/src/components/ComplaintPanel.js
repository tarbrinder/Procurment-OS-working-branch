import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { raiseComplaint, listComplaints, respondToComplaint, resolveComplaint, escalateComplaint } from "@/lib/api";
import { FileUpload } from "@/components/FileUpload";
import { COMPLAINT_CATEGORIES } from "@/lib/constants";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, ArrowUp, MessageSquare } from "lucide-react";

export const ComplaintPanel = ({ rfqId, view, glid, onRefresh, rfq }) => {
  const [complaints, setComplaints] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "", description: "" });
  const [fileIds, setFileIds] = useState([]);
  const [responseInputs, setResponseInputs] = useState({});

  const lastUpdated = rfq?.last_updated;
  const load = () => { listComplaints(rfqId).then((r) => setComplaints(r.data.complaints)); };
  useEffect(load, [rfqId, lastUpdated]);

  const activeCount = complaints.filter((c) => c.status === "open" || c.status === "escalated").length;

  const handleRaise = async () => {
    if (!form.category || !form.description) { toast.error("Fill all fields"); return; }
    try {
      await raiseComplaint(rfqId, { ...form, complainant_glid: glid, complainant_type: view, file_ids: fileIds });
      toast.success("Complaint raised"); setShowForm(false); setForm({ category: "", description: "" }); setFileIds([]);
      load(); if (onRefresh) onRefresh();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const handleRespond = async (complaintId) => {
    const text = responseInputs[complaintId];
    if (!text) return;
    try {
      await respondToComplaint(rfqId, complaintId, { response: text, responder_glid: glid, responder_type: view });
      toast.success("Response added"); setResponseInputs((p) => ({ ...p, [complaintId]: "" })); load();
    } catch (e) { toast.error("Failed"); }
  };

  const handleResolve = async (complaintId) => {
    try { await resolveComplaint(rfqId, complaintId); toast.success("Complaint resolved"); load(); if (onRefresh) onRefresh(); }
    catch (e) { toast.error("Failed"); }
  };

  const handleEscalate = async (complaintId) => {
    try { await escalateComplaint(rfqId, complaintId); toast.error("Complaint escalated"); load(); }
    catch (e) { toast.error("Failed"); }
  };

  return (
    <div className="detail-card" data-testid="complaint-panel">
      <div className="flex items-center justify-between mb-2">
        <h4 className="flex items-center gap-1" style={{ margin: 0 }}>
          <AlertTriangle size={12} /> Complaints {activeCount > 0 && <span className="text-red-600 text-xs font-bold">({activeCount} active)</span>}
        </h4>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)} className="text-xs h-7" data-testid="raise-complaint-btn">
          {showForm ? "Cancel" : "Raise Complaint"}
        </Button>
      </div>

      {activeCount > 0 && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-2">
          Stage progression is blocked until all complaints are resolved.
        </div>
      )}

      {showForm && (
        <div className="space-y-2 border rounded p-3 mb-3 bg-slate-50">
          <div><Label className="text-xs">Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {COMPLAINT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} data-testid="complaint-desc" /></div>
          <FileUpload rfqId={rfqId} glid={glid} viewType={view} onFilesUploaded={(f) => setFileIds(f.map((x) => x.file_id))} compact />
          <Button size="sm" variant="destructive" onClick={handleRaise} data-testid="submit-complaint-btn"><AlertTriangle size={14} /> Submit</Button>
        </div>
      )}

      {complaints.map((c) => (
        <div key={c.complaint_id} className="text-xs border rounded p-3 mb-2" data-testid={`complaint-${c.complaint_id}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold">{c.category}</span>
            <span className={`uppercase font-bold ${c.status === "open" ? "text-amber-600" : c.status === "escalated" ? "text-red-600" : "text-emerald-600"}`}>
              {c.status}
            </span>
          </div>
          <p className="text-slate-600 mb-2">{c.description}</p>

          {c.responses?.map((r, i) => (
            <div key={i} className="bg-slate-50 rounded p-2 mb-1 text-slate-600">
              <span className="font-semibold">GLID {r.responder_glid}:</span> {r.response}
            </div>
          ))}

          {c.status !== "resolved" && (
            <div className="flex items-center gap-2 mt-2">
              <Input
                value={responseInputs[c.complaint_id] || ""}
                onChange={(e) => setResponseInputs((p) => ({ ...p, [c.complaint_id]: e.target.value }))}
                placeholder="Respond..."
                className="h-7 text-xs flex-1"
              />
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleRespond(c.complaint_id)}>
                <MessageSquare size={12} />
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-600" onClick={() => handleResolve(c.complaint_id)}>
                <CheckCircle2 size={12} /> Resolve
              </Button>
              {c.status === "open" && (
                <Button size="sm" variant="outline" className="h-7 text-xs text-red-600" onClick={() => handleEscalate(c.complaint_id)}>
                  <ArrowUp size={12} /> Escalate
                </Button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
