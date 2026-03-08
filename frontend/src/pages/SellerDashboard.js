import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/App";
import { Navbar } from "@/components/Navbar";
import { KPICard } from "@/components/KPICard";
import { StageBadge } from "@/components/StageBadge";
import { ProbabilityIndicator } from "@/components/ProbabilityIndicator";
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
import { fetchSellerDashboard, fetchSellerRfqs, exportCsv } from "@/lib/api";
import { STAGE_LABELS, STAGES, CHART_COLORS } from "@/lib/constants";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Search, Download, Inbox, Clock, BarChart3, CheckCircle2, Eye, Truck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { IncomingCallsWidget } from "@/components/IncomingCallsWidget";
import { VerificationBadge } from "@/components/VerificationBadge";
import { NotificationBell } from "@/components/NotificationBell";

export default function SellerDashboard() {
  const { glid, view } = useAppContext();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [rfqs, setRfqs] = useState([]);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");

  const lastDataRef = useRef("");

  const loadData = useCallback(async () => {
    if (!glid) return;
    try {
      const [dashRes, rfqsRes] = await Promise.all([
        fetchSellerDashboard(glid),
        fetchSellerRfqs(glid, {
          stage: stageFilter !== "all" ? stageFilter : undefined,
          search: search || undefined,
        }),
      ]);
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
    if (!glid || view !== "seller") {
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
    <div className="dashboard-layout" data-testid="seller-dashboard">
      <Navbar>
        <NotificationBell glid={glid} view={view} />
      </Navbar>
      <IncomingCallsWidget glid={glid} view={view} />
      <main className="dashboard-main">
        <div className="kpi-strip" data-testid="seller-kpi-strip">
          <KPICard icon={Inbox} label="Total Incoming" value={kpis.total_incoming} />
          <KPICard icon={Clock} label="Pending Response" value={kpis.pending_response} accent="amber" />
          <KPICard icon={BarChart3} label="Negotiation" value={kpis.negotiation_ongoing} accent="blue" />
          <KPICard icon={Truck} label="In Fulfillment" value={kpis.in_fulfillment || 0} accent="blue" />
          <KPICard icon={CheckCircle2} label="Deals Closed" value={kpis.deals_closed} accent="green" />
        </div>

        <div className="charts-actions-row">
          <div className="chart-card" data-testid="seller-stage-chart">
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
            <a href={exportCsv("seller", glid)} className="export-link" data-testid="seller-export-csv-btn">
              <Button variant="outline" className="w-full">
                <Download size={16} /> Export CSV
              </Button>
            </a>
          </div>
        </div>

        <div className="filter-row" data-testid="seller-filter-row">
          <div className="search-box">
            <Search size={16} />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="seller-search-input"
            />
          </div>
          <Select value={stageFilter} onValueChange={(v) => setStageFilter(v)}>
            <SelectTrigger className="w-48" data-testid="seller-stage-filter">
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

        <div className="table-wrapper" data-testid="seller-rfq-table">
          <Table>
            <TableHeader>
              <TableRow className="table-header-row">
                <TableHead>Buyer GLID</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Probability</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rfqs.map((rfq) => (
                <TableRow
                  key={rfq.rfq_id}
                  className="table-data-row"
                  data-testid={`seller-rfq-row-${rfq.rfq_id}`}
                >
                  <TableCell className="font-medium">GLID {rfq.buyer_glid}</TableCell>
                  <TableCell>{rfq.product}</TableCell>
                  <TableCell>INR {rfq.budget?.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <StageBadge stage={rfq.stage} />
                      {rfq.seller_verified?.verified && <VerificationBadge verification={rfq.seller_verified} />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ProbabilityIndicator value={rfq.probability_score} />
                  </TableCell>
                  <TableCell className="text-slate-500 text-xs">
                    {formatDistanceToNow(new Date(rfq.last_updated), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant={rfq.stage === "RFQ_SENT" ? "default" : "outline"}
                      className="table-action-btn"
                      onClick={() => navigate(`/rfq/${rfq.rfq_id}?view=${view}&glid=${glid}`)}
                      data-testid={`seller-action-${rfq.rfq_id}`}
                    >
                      <Eye size={14} />
                      {rfq.stage === "RFQ_SENT" ? "Respond" : "View"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rfqs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    No incoming RFQs. They will appear here when buyers send them.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}
