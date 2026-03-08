import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StageBadge } from '@/components/StageBadge';
import {
  Users,
  FileText,
  MessageSquare,
  TrendingUp,
  LogOut,
  Eye,
  Broadcast,
  Target,
  Activity
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line } from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [rfqs, setRfqs] = useState([]);
  const [timeline, setTimeline] = useState(null);
  const [adoption, setAdoption] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin');
      return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [overviewRes, rfqsRes, timelineRes, adoptionRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/admin/overview`),
        axios.get(`${BACKEND_URL}/api/admin/rfqs`, { params: { limit: 10 } }),
        axios.get(`${BACKEND_URL}/api/admin/analytics/timeline`, { params: { days: 7 } }),
        axios.get(`${BACKEND_URL}/api/admin/adoption`)
      ]);

      setOverview(overviewRes.data);
      setRfqs(rfqsRes.data.rfqs);
      setTimeline(timelineRes.data);
      setAdoption(adoptionRes.data);
    } catch (error) {
      toast.error('Failed to load data');
      if (error.response?.status === 401) {
        navigate('/admin');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_email');
    toast.success('Logged out');
    navigate('/admin');
  };

  const viewRFQ = (rfqId) => {
    navigate(`/admin/rfq/${rfqId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!overview) return null;

  // Prepare chart data
  const stageData = Object.entries(overview.stage_distribution).map(([stage, count]) => ({
    name: stage.replace(/_/g, ' '),
    value: count
  }));

  const priorityData = Object.entries(overview.priority_distribution).map(([priority, count]) => ({
    name: priority,
    value: count
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Admin Portal</h1>
              <p className="text-sm text-slate-600">GLID Procurement OS Analytics</p>
            </div>
            <Button onClick={handleLogout} variant="outline">
              <LogOut size={16} className="mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Buyers</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.totals.buyers}</div>
              <p className="text-xs text-slate-500 mt-1">
                {adoption.active_users.active_buyers_7d} active (7d)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Sellers</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.totals.sellers}</div>
              <p className="text-xs text-slate-500 mt-1">
                {adoption.active_users.active_sellers_7d} active (7d)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total RFQs</CardTitle>
              <FileText className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.totals.rfqs}</div>
              <p className="text-xs text-slate-500 mt-1">
                +{overview.recent_activity.rfqs_24h} in last 24h
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.totals.messages}</div>
              <p className="text-xs text-slate-500 mt-1">
                +{overview.recent_activity.messages_24h} in last 24h
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Conversion & Broadcast Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target size={20} />
                Conversion Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Win Rate</span>
                  <span className="text-2xl font-bold text-green-600">{overview.conversion.win_rate}%</span>
                </div>
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{overview.conversion.deal_won}</div>
                    <div className="text-xs text-slate-500">Won</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{overview.conversion.deal_lost}</div>
                    <div className="text-xs text-slate-500">Lost</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{overview.conversion.in_negotiation}</div>
                    <div className="text-xs text-slate-500">Negotiating</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Broadcast size={20} />
                Broadcast Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Broadcast RFQs</span>
                  <span className="text-2xl font-bold text-blue-600">{overview.broadcast_stats.broadcast_rfqs}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-sm text-slate-600">Unique Broadcast Groups</span>
                  <span className="text-xl font-bold text-purple-600">{overview.broadcast_stats.unique_broadcast_groups}</span>
                </div>
                <div className="text-xs text-slate-500 pt-2">
                  Avg {(overview.broadcast_stats.broadcast_rfqs / overview.broadcast_stats.unique_broadcast_groups).toFixed(1)} sellers per broadcast
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Stage Distribution</CardTitle>
              <CardDescription>RFQs by current stage</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stageData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline (7 days)</CardTitle>
              <CardDescription>RFQs and Messages created</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeline.rfqs_per_day}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" name="RFQs" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Top Buyers</CardTitle>
              <CardDescription>Most active buyers by RFQ count</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {overview.top_buyers.map((buyer, idx) => (
                  <div key={buyer.glid} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-medium">{buyer.name}</div>
                        <div className="text-xs text-slate-500">GLID {buyer.glid}</div>
                      </div>
                    </div>
                    <Badge variant="secondary">{buyer.rfq_count} RFQs</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Sellers</CardTitle>
              <CardDescription>Most active sellers by RFQ count</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {overview.top_sellers.map((seller, idx) => (
                  <div key={seller.glid} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-semibold">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-medium">{seller.name}</div>
                        <div className="text-xs text-slate-500">GLID {seller.glid}</div>
                      </div>
                    </div>
                    <Badge variant="secondary">{seller.rfq_count} RFQs</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent RFQs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent RFQs</CardTitle>
            <CardDescription>Latest 10 RFQ threads</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>RFQ ID</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rfqs.map((rfq) => (
                  <TableRow key={rfq.rfq_id}>
                    <TableCell className="font-mono text-xs">{rfq.rfq_id.substring(0, 8)}...</TableCell>
                    <TableCell className="font-medium">{rfq.product}</TableCell>
                    <TableCell>
                      <div className="text-sm">{rfq.buyer_name}</div>
                      <div className="text-xs text-slate-500">GLID {rfq.buyer_glid}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{rfq.seller_name}</div>
                      <div className="text-xs text-slate-500">GLID {rfq.seller_glid}</div>
                    </TableCell>
                    <TableCell>
                      <StageBadge stage={rfq.stage} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={rfq.priority === 'high' ? 'destructive' : 'secondary'}>
                        {rfq.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => viewRFQ(rfq.rfq_id)}
                        data-testid={`view-rfq-${rfq.rfq_id}`}
                      >
                        <Eye size={14} className="mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Engagement Metrics */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity size={20} />
              Engagement Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">{adoption.engagement.avg_messages_per_rfq}</div>
                <div className="text-sm text-slate-600 mt-1">Avg Messages per RFQ</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">{adoption.engagement.total_video_calls}</div>
                <div className="text-sm text-slate-600 mt-1">Total Video Calls</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">{adoption.engagement.video_call_completion_rate}%</div>
                <div className="text-sm text-slate-600 mt-1">Call Completion Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
