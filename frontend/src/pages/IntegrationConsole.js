import { useState, useEffect, useCallback } from "react";
import { registerPartner, listPartners, generateToken, integrationCreateRFQ, integrationRfqStatus, registerWebhook, listWebhooks, deleteWebhook } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  UserPlus, Key, FileText, Link2, Webhook, Copy, ExternalLink,
  ArrowLeft, Check, Trash2, RefreshCw, Eye,
} from "lucide-react";

const API_BASE = process.env.REACT_APP_BACKEND_URL;

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 hover:bg-slate-200 rounded transition-colors"
      data-testid="copy-btn"
    >
      {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} className="text-slate-400" />}
    </button>
  );
}

function CodeBlock({ label, value }) {
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <CopyBtn text={value} />
      </div>
      <pre className="bg-slate-900 text-emerald-400 text-xs p-3 rounded-lg mt-1 overflow-x-auto whitespace-pre-wrap break-all font-mono">{value}</pre>
    </div>
  );
}

function Section({ title, icon: Icon, children, id }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm" id={id} data-testid={`section-${id}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
          <Icon size={14} className="text-slate-600" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function IntegrationConsole() {
  const [partners, setPartners] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [partnerForm, setPartnerForm] = useState({ external_id: "", name: "", role: "buyer" });
  const [tokenForm, setTokenForm] = useState({ external_id: "", expires_minutes: 60 });
  const [tokenResult, setTokenResult] = useState(null);
  const [rfqForm, setRfqForm] = useState({ buyer_external_id: "", seller_external_id: "", product: "", quantity: 100, budget: 50000, description: "" });
  const [rfqResult, setRfqResult] = useState(null);
  const [webhookForm, setWebhookForm] = useState({ url: "", secret: "" });
  const [statusForm, setStatusForm] = useState({ rfq_id: "" });
  const [statusResult, setStatusResult] = useState(null);
  const [iframeUrl, setIframeUrl] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [p, w] = await Promise.all([listPartners(), listWebhooks()]);
      setPartners(p.data.partners || []);
      setWebhooks(w.data.webhooks || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRegisterPartner = async () => {
    if (!partnerForm.external_id || !partnerForm.name) { toast.error("ID and Name required"); return; }
    try {
      const res = await registerPartner(partnerForm);
      toast.success(`Partner registered: GLID ${res.data.glid}`);
      setPartnerForm({ external_id: "", name: "", role: "buyer" });
      loadData();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const handleGenerateToken = async () => {
    if (!tokenForm.external_id) { toast.error("External ID required"); return; }
    try {
      const res = await generateToken(tokenForm);
      setTokenResult(res.data);
      toast.success("Token generated");
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const handleCreateRFQ = async () => {
    if (!rfqForm.buyer_external_id || !rfqForm.seller_external_id || !rfqForm.product) { toast.error("Buyer, Seller, and Product required"); return; }
    try {
      const res = await integrationCreateRFQ(rfqForm);
      setRfqResult(res.data);
      toast.success(`RFQ created: ${res.data.rfq_id.substring(0, 8)}...`);
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const handleCheckStatus = async () => {
    if (!statusForm.rfq_id) { toast.error("RFQ ID required"); return; }
    try {
      const res = await integrationRfqStatus(statusForm.rfq_id);
      setStatusResult(res.data);
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const handleRegisterWebhook = async () => {
    if (!webhookForm.url) { toast.error("URL required"); return; }
    try {
      await registerWebhook(webhookForm);
      toast.success("Webhook registered");
      setWebhookForm({ url: "", secret: "" });
      loadData();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const handleDeleteWebhook = async (id) => {
    try { await deleteWebhook(id); toast.success("Deleted"); loadData(); } catch (e) { toast.error("Failed"); }
  };

  const buyers = partners.filter(p => p.role === "buyer");
  const sellers = partners.filter(p => p.role === "seller");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="p-2 rounded-lg hover:bg-slate-100 transition-colors" data-testid="back-to-demo">
              <ArrowLeft size={16} className="text-slate-500" />
            </a>
            <div>
              <h1 className="text-base font-bold text-slate-800">Integration Console</h1>
              <p className="text-[11px] text-slate-500">Test the integration API before embedding in your portals</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/" className="text-xs text-blue-600 hover:underline" data-testid="demo-mode-link">Demo Mode</a>
            <span className="text-slate-300">|</span>
            <Button size="sm" variant="outline" className="text-xs h-7" onClick={loadData} data-testid="refresh-btn">
              <RefreshCw size={12} /> Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-5">
        {/* Quick Start Guide */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 text-white" data-testid="quickstart">
          <h2 className="text-sm font-bold mb-2">Quick Start — 4 Steps to Embed</h2>
          <div className="grid grid-cols-4 gap-3 text-[11px]">
            <div className="bg-white/15 rounded-lg p-3">
              <span className="font-bold text-white/70">1.</span> Register your buyers & sellers with their IDs from your system
            </div>
            <div className="bg-white/15 rounded-lg p-3">
              <span className="font-bold text-white/70">2.</span> Create RFQ via API when matchmaking is done in your app
            </div>
            <div className="bg-white/15 rounded-lg p-3">
              <span className="font-bold text-white/70">3.</span> Generate tokens for each user to embed in iframe
            </div>
            <div className="bg-white/15 rounded-lg p-3">
              <span className="font-bold text-white/70">4.</span> Embed iframe in your portal — user negotiates here
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* Step 1: Register Partners */}
          <Section title="Step 1 — Register Partners" icon={UserPlus} id="partners">
            <div className="space-y-2">
              <Input className="h-8 text-xs" placeholder="External ID (from your system)" value={partnerForm.external_id}
                onChange={(e) => setPartnerForm({ ...partnerForm, external_id: e.target.value })} data-testid="partner-ext-id" />
              <Input className="h-8 text-xs" placeholder="Company Name" value={partnerForm.name}
                onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })} data-testid="partner-name" />
              <div className="flex gap-2">
                <Button size="sm" variant={partnerForm.role === "buyer" ? "default" : "outline"} className="text-xs h-7 flex-1"
                  onClick={() => setPartnerForm({ ...partnerForm, role: "buyer" })} data-testid="role-buyer">Buyer</Button>
                <Button size="sm" variant={partnerForm.role === "seller" ? "default" : "outline"} className="text-xs h-7 flex-1"
                  onClick={() => setPartnerForm({ ...partnerForm, role: "seller" })} data-testid="role-seller">Seller</Button>
              </div>
              <Button size="sm" className="w-full text-xs h-8 bg-slate-800" onClick={handleRegisterPartner} data-testid="register-partner-btn">
                <UserPlus size={12} /> Register Partner
              </Button>
            </div>
            {partners.length > 0 && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="text-[10px] font-semibold text-slate-500 mb-2">Registered ({partners.length})</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {partners.map(p => (
                    <div key={p.partner_id} className="flex items-center justify-between bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs"
                      data-testid={`partner-${p.external_id}`}>
                      <div>
                        <span className="font-semibold text-slate-700">{p.name}</span>
                        <span className="text-slate-400 ml-1.5">({p.external_id})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${p.role === "buyer" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {p.role} — GLID {p.glid}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* Step 2: Create RFQ */}
          <Section title="Step 2 — Create RFQ via API" icon={FileText} id="create-rfq">
            <div className="space-y-2">
              <select className="w-full h-8 text-xs border rounded-md px-2 bg-white" value={rfqForm.buyer_external_id}
                onChange={(e) => setRfqForm({ ...rfqForm, buyer_external_id: e.target.value })} data-testid="rfq-buyer-select">
                <option value="">Select Buyer...</option>
                {buyers.map(b => <option key={b.external_id} value={b.external_id}>{b.name} ({b.external_id})</option>)}
              </select>
              <select className="w-full h-8 text-xs border rounded-md px-2 bg-white" value={rfqForm.seller_external_id}
                onChange={(e) => setRfqForm({ ...rfqForm, seller_external_id: e.target.value })} data-testid="rfq-seller-select">
                <option value="">Select Seller...</option>
                {sellers.map(s => <option key={s.external_id} value={s.external_id}>{s.name} ({s.external_id})</option>)}
              </select>
              <Input className="h-8 text-xs" placeholder="Product" value={rfqForm.product}
                onChange={(e) => setRfqForm({ ...rfqForm, product: e.target.value })} data-testid="rfq-product" />
              <div className="flex gap-2">
                <Input className="h-8 text-xs" type="number" placeholder="Qty" value={rfqForm.quantity}
                  onChange={(e) => setRfqForm({ ...rfqForm, quantity: parseInt(e.target.value) || 0 })} data-testid="rfq-qty" />
                <Input className="h-8 text-xs" type="number" placeholder="Budget" value={rfqForm.budget}
                  onChange={(e) => setRfqForm({ ...rfqForm, budget: parseFloat(e.target.value) || 0 })} data-testid="rfq-budget" />
              </div>
              <Button size="sm" className="w-full text-xs h-8 bg-slate-800" onClick={handleCreateRFQ} data-testid="create-rfq-btn">
                <FileText size={12} /> Create RFQ
              </Button>
            </div>
            {rfqResult && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <CodeBlock label="RFQ ID" value={rfqResult.rfq_id} />
                <CodeBlock label="Buyer Embed URL" value={rfqResult.buyer_embed_url} />
                <CodeBlock label="Seller Embed URL" value={rfqResult.seller_embed_url} />
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" className="text-xs h-7 flex-1" data-testid="preview-buyer-embed"
                    onClick={() => setIframeUrl(rfqResult.buyer_embed_url)}>
                    <Eye size={12} /> Preview Buyer
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs h-7 flex-1" data-testid="preview-seller-embed"
                    onClick={() => setIframeUrl(rfqResult.seller_embed_url)}>
                    <Eye size={12} /> Preview Seller
                  </Button>
                </div>
              </div>
            )}
          </Section>

          {/* Step 3: Generate Token */}
          <Section title="Step 3 — Generate Auth Token" icon={Key} id="tokens">
            <div className="space-y-2">
              <select className="w-full h-8 text-xs border rounded-md px-2 bg-white" value={tokenForm.external_id}
                onChange={(e) => setTokenForm({ ...tokenForm, external_id: e.target.value })} data-testid="token-partner-select">
                <option value="">Select Partner...</option>
                {partners.map(p => <option key={p.external_id} value={p.external_id}>{p.name} ({p.role}) — {p.external_id}</option>)}
              </select>
              <Input className="h-8 text-xs" type="number" placeholder="Expires in (minutes)" value={tokenForm.expires_minutes}
                onChange={(e) => setTokenForm({ ...tokenForm, expires_minutes: parseInt(e.target.value) || 60 })} data-testid="token-expires" />
              <Button size="sm" className="w-full text-xs h-8 bg-slate-800" onClick={handleGenerateToken} data-testid="generate-token-btn">
                <Key size={12} /> Generate Token
              </Button>
            </div>
            {tokenResult && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <CodeBlock label="JWT Token" value={tokenResult.token} />
                <CodeBlock label="Embed URL" value={tokenResult.embed_url_template} />
                <div className="mt-2 bg-slate-50 rounded-lg p-2 text-[11px]">
                  <p className="font-semibold text-slate-600 mb-1">Iframe Code:</p>
                  <pre className="bg-slate-900 text-amber-400 text-[10px] p-2 rounded font-mono overflow-x-auto">
{`<iframe
  src="${tokenResult.embed_url_template}"
  width="100%"
  height="700"
  frameBorder="0"
/>`}
                  </pre>
                </div>
                <Button size="sm" variant="outline" className="text-xs h-7 mt-2 w-full" data-testid="preview-embed"
                  onClick={() => setIframeUrl(tokenResult.embed_url_template)}>
                  <Eye size={12} /> Preview Embed
                </Button>
              </div>
            )}
          </Section>

          {/* Step 4: Check RFQ Status + Webhooks */}
          <Section title="Step 4 — Monitor & Webhooks" icon={Webhook} id="monitor">
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-slate-500 uppercase">Check RFQ Status</p>
              <div className="flex gap-2">
                <Input className="h-8 text-xs flex-1" placeholder="RFQ ID" value={statusForm.rfq_id}
                  onChange={(e) => setStatusForm({ rfq_id: e.target.value })} data-testid="status-rfq-id" />
                <Button size="sm" variant="outline" className="text-xs h-8" onClick={handleCheckStatus} data-testid="check-status-btn">Check</Button>
              </div>
              {statusResult && (
                <pre className="bg-slate-900 text-emerald-400 text-[10px] p-2 rounded-lg font-mono overflow-x-auto">
                  {JSON.stringify(statusResult, null, 2)}
                </pre>
              )}
            </div>
            <div className="mt-3 border-t border-slate-100 pt-3 space-y-2">
              <p className="text-[10px] font-semibold text-slate-500 uppercase">Register Webhook</p>
              <Input className="h-8 text-xs" placeholder="Webhook URL (https://...)" value={webhookForm.url}
                onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })} data-testid="webhook-url" />
              <Button size="sm" className="w-full text-xs h-8 bg-slate-800" onClick={handleRegisterWebhook} data-testid="register-webhook-btn">
                <Webhook size={12} /> Register Webhook
              </Button>
              {webhooks.length > 0 && (
                <div className="space-y-1">
                  {webhooks.map(w => (
                    <div key={w.webhook_id} className="flex items-center justify-between bg-slate-50 rounded px-2 py-1.5 text-xs">
                      <span className="text-slate-600 truncate flex-1">{w.url}</span>
                      <button onClick={() => handleDeleteWebhook(w.webhook_id)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>
        </div>

        {/* API Reference */}
        <Section title="API Reference" icon={Link2} id="api-reference">
          <div className="grid grid-cols-2 gap-3">
            {[
              { method: "POST", path: "/api/integration/register-partner", desc: "Register buyer/seller with external ID" },
              { method: "POST", path: "/api/integration/generate-token", desc: "Generate JWT token for iframe auth" },
              { method: "POST", path: "/api/integration/create-rfq", desc: "Create RFQ with buyer+seller external IDs" },
              { method: "GET", path: "/api/integration/rfq-status/{rfq_id}", desc: "Check RFQ stage and progress" },
              { method: "GET", path: "/api/integration/embed-config?token=JWT", desc: "Validate token and get user config" },
              { method: "POST", path: "/api/integration/webhooks/register", desc: "Register webhook for stage change events" },
            ].map(api => (
              <div key={api.path} className="bg-slate-50 rounded-lg p-2.5 text-xs">
                <span className={`font-bold ${api.method === "POST" ? "text-emerald-600" : "text-blue-600"}`}>{api.method}</span>
                <code className="text-slate-700 ml-1.5 font-mono text-[11px]">{api.path}</code>
                <p className="text-slate-500 text-[10px] mt-0.5">{api.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Iframe Preview */}
        {iframeUrl && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm" data-testid="iframe-preview">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">Embed Preview</h3>
              <div className="flex items-center gap-2">
                <a href={iframeUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  <ExternalLink size={12} /> Open in new tab
                </a>
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setIframeUrl("")}>Close</Button>
              </div>
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-100">
              <iframe src={iframeUrl} width="100%" height="600" frameBorder="0" title="Embed Preview" className="bg-white"
                data-testid="embed-iframe" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
