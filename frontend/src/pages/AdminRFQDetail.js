import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StageBadge } from '@/components/StageBadge';
import { DynamicRFQDetails, BroadcastBadge } from '@/components/DynamicRFQ';
import { ArrowLeft, MessageSquare, Activity as ActivityIcon, FileText, Package, DollarSign } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

export default function AdminRFQDetail() {
  const { rfqId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin');
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqId]);

  const loadData = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/admin/rfqs/${rfqId}`);
      setData(response.data);
    } catch (error) {
      toast.error('Failed to load RFQ details');
      if (error.response?.status === 401) {
        navigate('/admin');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading RFQ details...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { rfq, buyer_info, seller_info, messages, activity_logs, files, post_deal_info, message_count, activity_count } = data;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/dashboard')}
            >
              <ArrowLeft size={16} className="mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-slate-900">RFQ Details</h1>
              <p className="text-sm text-slate-600 font-mono">{rfq.rfq_id}</p>
            </div>
            <StageBadge stage={rfq.stage} />
            <BroadcastBadge rfq={rfq} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - RFQ Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* RFQ Information */}
            <Card>
              <CardHeader>
                <CardTitle>RFQ Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-lg font-semibold">{rfq.product}</div>
                      <div className="text-sm text-slate-600 mt-1">
                        Created {formatDistanceToNow(new Date(rfq.created_at), { addSuffix: true })}
                      </div>
                    </div>
                    <Badge variant={rfq.priority === 'high' ? 'destructive' : 'secondary'}>
                      {rfq.priority} priority
                    </Badge>
                  </div>

                  {rfq.rfq_data && (
                    <div className="pt-4 border-t">
                      <h4 className="font-semibold mb-3">Custom Fields</h4>
                      <DynamicRFQDetails rfq={rfq} />
                    </div>
                  )}

                  {rfq.description && (
                    <div className="pt-4 border-t">
                      <h4 className="font-semibold mb-2">Description</h4>
                      <p className="text-sm text-slate-600">{rfq.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Participants */}
            <Card>
              <CardHeader>
                <CardTitle>Participants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm font-semibold text-blue-600 mb-2">Buyer</div>
                    <div className="font-semibold">{buyer_info?.name || 'Unknown'}</div>
                    <div className="text-sm text-slate-600">GLID {rfq.buyer_glid}</div>
                    {rfq.buyer_external_id && (
                      <div className="text-xs text-slate-500 mt-1">
                        External ID: {rfq.buyer_external_id}
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-sm font-semibold text-green-600 mb-2">Seller</div>
                    <div className="font-semibold">{seller_info?.name || 'Unknown'}</div>
                    <div className="text-sm text-slate-600">GLID {rfq.seller_glid}</div>
                    {rfq.seller_external_id && (
                      <div className="text-xs text-slate-500 mt-1">
                        External ID: {rfq.seller_external_id}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Messages */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare size={20} />
                  Messages ({message_count})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {messages.map((msg) => (
                    <div key={msg.message_id} className="flex gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                        msg.sender_type === 'buyer' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                      }`}>
                        {msg.sender_type === 'buyer' ? 'B' : 'S'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold">
                            GLID {msg.sender_glid} ({msg.sender_type})
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700">{msg.content}</p>
                        {msg.message_type && msg.message_type !== 'text' && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {msg.message_type}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <div className="text-center text-slate-500 py-8">
                      No messages yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Activity Logs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ActivityIcon size={20} />
                  Activity Timeline ({activity_count})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {activity_logs.map((log) => (
                    <div key={log.log_id} className="flex gap-3 items-start">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{log.action.replace(/_/g, ' ')}</div>
                        <div className="text-xs text-slate-600">{log.details}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Stats & Post-Deal */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Messages</span>
                    <span className="font-semibold">{message_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Activities</span>
                    <span className="font-semibold">{activity_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Files</span>
                    <span className="font-semibold">{files.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Probability</span>
                    <span className="font-semibold">{rfq.probability_score}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Post-Deal Info */}
            {post_deal_info && post_deal_info.proforma && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText size={20} />
                    Proforma Invoice
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Amount</span>
                      <span className="font-semibold">₹{post_deal_info.proforma.amount?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Tax</span>
                      <span className="font-semibold">₹{post_deal_info.proforma.tax_amount?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-sm font-semibold">Total</span>
                      <span className="font-bold text-lg">₹{post_deal_info.proforma.total_amount?.toLocaleString()}</span>
                    </div>
                    <Badge variant={post_deal_info.proforma.status === 'accepted' ? 'default' : 'secondary'}>
                      {post_deal_info.proforma.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payments */}
            {post_deal_info && post_deal_info.payments && post_deal_info.payments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign size={20} />
                    Payments ({post_deal_info.payments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {post_deal_info.payments.map((payment, idx) => (
                      <div key={payment.payment_id} className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-sm font-semibold">Payment {idx + 1}</span>
                          <Badge variant={payment.confirmed ? 'default' : 'secondary'}>
                            {payment.confirmed ? 'Confirmed' : 'Pending'}
                          </Badge>
                        </div>
                        <div className="text-lg font-bold">₹{payment.amount?.toLocaleString()}</div>
                        <div className="text-xs text-slate-600">{payment.payment_method}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Shipments */}
            {post_deal_info && post_deal_info.shipments && post_deal_info.shipments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package size={20} />
                    Shipments ({post_deal_info.shipments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {post_deal_info.shipments.map((shipment) => (
                      <div key={shipment.shipment_id} className="p-3 bg-slate-50 rounded-lg text-sm">
                        <div className="font-semibold mb-1">LR: {shipment.lr_number}</div>
                        <div className="text-slate-600">Tracking: {shipment.tracking_number}</div>
                        <div className="text-slate-600">Carrier: {shipment.carrier}</div>
                        <div className="text-slate-600">Qty: {shipment.quantity_shipped}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Files */}
            {files.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Files ({files.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {files.map((file) => (
                      <div key={file.file_id} className="p-2 bg-slate-50 rounded text-sm">
                        <div className="font-medium truncate">{file.filename}</div>
                        <div className="text-xs text-slate-500">
                          {(file.size_bytes / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
