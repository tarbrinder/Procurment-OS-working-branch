import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/App";
import { Navbar } from "@/components/Navbar";
import { KPICard } from "@/components/KPICard";
import { StageBadge } from "@/components/StageBadge";
import { ProbabilityIndicator } from "@/components/ProbabilityIndicator";
import { CreateRFQModal } from "@/components/CreateRFQModal";
import { IncomingCallsWidget } from "@/components/IncomingCallsWidget";
import { VerificationBadge } from "@/components/VerificationBadge";
import { NotificationBell } from "@/components/NotificationBell";
import { CompactRFQCard, BroadcastBadge } from "@/components/DynamicRFQ";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchBuyerDashboard, fetchBuyerRfqs, exportCsv } from "@/lib/api";
import { STAGE_LABELS, STAGES, CHART_COLORS } from "@/lib/constants";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Plus,
  Search,
  Download,
  FileText,
  TrendingUp,
  MessageSquare,
  Handshake,
  XCircle,
  BarChart3,
  Truck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function BuyerDashboard() {
  const { glid, view } = useAppContext();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [rfqs, setRfqs] = useState([]);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [showCreateRFQ, setShowCreateRFQ] = useState(false);

  const lastDataRef = useRef("");

  const loadData = useCallback(async () => {
    if (!glid) return;
    try {
      const [dashRes, rfqsRes] = await Promise.all([
        fetchBuyerDashboard(glid),
        fetchBuyerRfqs(glid, {
          stage: stageFilter !== "all" ? stageFilter : undefined,
          search: search || undefined,
        }),
      ]);
      // Only update state if data actually changed to avoid layout reflows
      const fingerprint = JSON.stringify({ d: dashRes.data, r: rfqsRes.data.rfqs });
      if (fingerprint !== lastDataRef.current) {
        lastDataRef.current = fingerprint;
        setDashboard(dashRes.data);
        setRfqs(rfqsRes.data.rfqs);
      }
    } catch (err) {
      console.error(err);
    }
  }, [glid, stageFilter, search]);

  useEffect(() => {
    if (!glid || view !== "buyer") {
      navigate("/");
      return;
    }
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, [glid, view, navigate, loadData]);

  if (!dashboard) return <div className="loading">Loading...</div>;

  const { kpis, stage_distribution } = dashboard;

  return (
    <div className="dashboard-layout" data-testid="buyer-dashboard">
      <Navbar>
        <NotificationBell glid={glid} view={view} />
      </Navbar>
      <IncomingCallsWidget glid={glid} view={view} />
      <main className="dashboard-main">
        <div className="kpi-strip" data-testid="buyer-kpi-strip">
          <KPICard icon={FileText} label="Total Leads" value={kpis.total_leads} />
          <KPICard icon={TrendingUp} label="Active RFQs" value={kpis.active_rfqs} accent="blue" />
          <KPICard icon={MessageSquare} label="Quotes Received" value={kpis.quotes_received} accent="amber" />
          <KPICard icon={BarChart3} label="Negotiation" value={kpis.negotiation_ongoing} accent="amber" />
          <KPICard icon={Handshake} label="Deals Won" value={kpis.deals_won} accent="green" />
          <KPICard icon={Truck} label="In Fulfillment" value={kpis.in_fulfillment || 0} accent="blue" />
          <KPICard icon={XCircle} label="Deals Lost" value={kpis.deals_lost} accent="red" />
        </div>

        <div className="charts-actions-row">
          <div className="chart-card" data-testid="buyer-stage-chart">
            <h3>Pipeline by Stage</h3>
            {stage_distribution.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={stage_distribution}
                      dataKey="count"
                      nameKey="stage"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {stage_distribution.map((entry, i) => (
                        <Cell key={entry.stage} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, STAGE_LABELS[name] || name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="chart-legend">
                  {stage_distribution.map((entry, i) => (
                    <div key={entry.stage} className="legend-item">
                      <span className="legend-dot" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span>{STAGE_LABELS[entry.stage]}: {entry.count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400 py-8 text-center">No data yet</p>
            )}
          </div>
          <div className="actions-panel">
            <Button onClick={() => setShowCreateRFQ(true)} className="create-rfq-btn" data-testid="create-rfq-btn">
              <Plus size={16} /> Create RFQ
            </Button>
            <a href={exportCsv("buyer", glid)} className="export-link" data-testid="export-csv-btn">
              <Button variant="outline" className="w-full">
                <Download size={16} /> Export CSV
              </Button>
            </a>
          </div>
        </div>

        <div className="filter-row" data-testid="buyer-filter-row">
          <div className="search-box">
            <Search size={16} />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="buyer-search-input"
            />
          </div>
          <Select value={stageFilter} onValueChange={(v) => setStageFilter(v)}>
            <SelectTrigger className="w-48" data-testid="buyer-stage-filter">
              <SelectValue placeholder="All Stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STAGE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="table-wrapper" data-testid="buyer-rfq-table">
          <Table>
            <TableHeader>
              <TableRow className="table-header-row">
                <TableHead>Seller GLID</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Days in Stage</TableHead>
                <TableHead>Probability</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rfqs.map((rfq) => {
                const daysSince = Math.max(
                  0,
                  Math.floor((Date.now() - new Date(rfq.last_updated).getTime()) / 86400000)
                );
                return (
                  <TableRow
                    key={rfq.rfq_id}
                    className="table-data-row cursor-pointer"
                    onClick={() => navigate(`/rfq/${rfq.rfq_id}?view=${view}&glid=${glid}`)}
                    data-testid={`rfq-row-${rfq.rfq_id}`}
                  >
                    <TableCell className="font-medium">GLID {rfq.seller_glid}</TableCell>
                    <TableCell>
                      <CompactRFQCard rfq={rfq} />
                      <BroadcastBadge rfq={rfq} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <StageBadge stage={rfq.stage} />
                        {rfq.seller_verified?.verified && <VerificationBadge verification={rfq.seller_verified} />}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`priority-badge priority-${rfq.priority}`}>
                        {rfq.priority}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs">
                      {formatDistanceToNow(new Date(rfq.last_updated), { addSuffix: true })}
                    </TableCell>
                    <TableCell>{daysSince}d</TableCell>
                    <TableCell>
                      <ProbabilityIndicator value={rfq.probability_score} />
                    </TableCell>
                  </TableRow>
                );
              })}
              {rfqs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    No RFQs found. Create your first RFQ to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>
      <CreateRFQModal
        open={showCreateRFQ}
        onClose={() => setShowCreateRFQ(false)}
        onCreated={loadData}
      />
    </div>
  );
}
