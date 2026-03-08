import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({ baseURL: API_BASE });

export const fetchGlids = () => api.get("/glids");
export const fetchGlidInfo = (glid) => api.get(`/glids/${glid}`);
export const fetchBuyerDashboard = (glid) => api.get(`/buyer/${glid}/dashboard`);
export const fetchSellerDashboard = (glid) => api.get(`/seller/${glid}/dashboard`);
export const fetchBuyerRfqs = (glid, params) => api.get(`/buyer/${glid}/rfqs`, { params });
export const fetchSellerRfqs = (glid, params) => api.get(`/seller/${glid}/rfqs`, { params });
export const fetchRfq = (rfqId) => api.get(`/rfqs/${rfqId}`);
export const createRfq = (data) => api.post("/rfqs", data);
export const performAction = (rfqId, data) => api.post(`/rfqs/${rfqId}/actions`, data);
export const fetchMessages = (rfqId) => api.get(`/rfqs/${rfqId}/messages`);
export const sendMessage = (rfqId, data) => api.post(`/rfqs/${rfqId}/messages`, data);
export const fetchActivity = (rfqId) => api.get(`/rfqs/${rfqId}/activity`);

// Video
export const createVideoRoom = (rfqId) => api.post(`/rfqs/${rfqId}/video-room`);
export const initiateCall = (rfqId, data) => api.post(`/rfqs/${rfqId}/video-call/initiate`, data);
export const acceptCall = (rfqId) => api.post(`/rfqs/${rfqId}/video-call/accept`);
export const declineCall = (rfqId) => api.post(`/rfqs/${rfqId}/video-call/decline`);
export const endCall = (rfqId) => api.post(`/rfqs/${rfqId}/video-call/end`);
export const getIncomingCalls = (glid) => api.get(`/calls/incoming/${glid}`);
export const getActiveCalls = (glid) => api.get(`/calls/active/${glid}`);
export const verifySeller = (rfqId, data) => api.post(`/rfqs/${rfqId}/verify-seller`, data);

// Files
export const uploadFile = (formData) => api.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
export const listRfqFiles = (rfqId) => api.get(`/rfqs/${rfqId}/files`);

// Proforma Invoice
export const sendProforma = (rfqId, data) => api.post(`/rfqs/${rfqId}/proforma`, data);
export const getProforma = (rfqId) => api.get(`/rfqs/${rfqId}/proforma`);
export const acceptProforma = (rfqId) => api.post(`/rfqs/${rfqId}/proforma/accept`);
export const rejectProforma = (rfqId) => api.post(`/rfqs/${rfqId}/proforma/reject`);

// Payments
export const recordPayment = (rfqId, data) => api.post(`/rfqs/${rfqId}/payments`, data);
export const listPayments = (rfqId) => api.get(`/rfqs/${rfqId}/payments`);
export const confirmPayment = (rfqId, paymentId) => api.post(`/rfqs/${rfqId}/payments/${paymentId}/confirm`);
export const rejectPayment = (rfqId, paymentId) => api.post(`/rfqs/${rfqId}/payments/${paymentId}/reject`);

// Shipments
export const addShipment = (rfqId, data) => api.post(`/rfqs/${rfqId}/shipments`, data);
export const listShipments = (rfqId) => api.get(`/rfqs/${rfqId}/shipments`);

// Delivery
export const recordDelivery = (rfqId, data) => api.post(`/rfqs/${rfqId}/delivery`, data);
export const listDeliveries = (rfqId) => api.get(`/rfqs/${rfqId}/delivery`);

// Complaints
export const raiseComplaint = (rfqId, data) => api.post(`/rfqs/${rfqId}/complaints`, data);
export const listComplaints = (rfqId) => api.get(`/rfqs/${rfqId}/complaints`);
export const respondToComplaint = (rfqId, complaintId, data) => api.post(`/rfqs/${rfqId}/complaints/${complaintId}/respond`, null, { params: data });
export const resolveComplaint = (rfqId, complaintId) => api.post(`/rfqs/${rfqId}/complaints/${complaintId}/resolve`);
export const escalateComplaint = (rfqId, complaintId) => api.post(`/rfqs/${rfqId}/complaints/${complaintId}/escalate`);

// Reviews
export const submitReview = (rfqId, data) => api.post(`/rfqs/${rfqId}/review`, data);
export const getReview = (rfqId) => api.get(`/rfqs/${rfqId}/review`);
export const respondToReview = (rfqId, data) => api.post(`/rfqs/${rfqId}/review/respond`, null, { params: data });
export const getSellerReviews = (glid) => api.get(`/sellers/${glid}/reviews`);
export const getTrustScore = (glid) => api.get(`/sellers/${glid}/trust-score`);

// Notifications
export const fetchNotifications = (viewType, glid, since) => api.get(`/${viewType}/${glid}/notifications`, { params: { since } });

// Integration API
export const registerPartner = (data) => api.post("/integration/register-partner", data);
export const listPartners = () => api.get("/integration/partners");
export const generateToken = (data) => api.post("/integration/generate-token", data);
export const integrationCreateRFQ = (data) => api.post("/integration/create-rfq", data);
export const integrationRfqStatus = (rfqId) => api.get(`/integration/rfq-status/${rfqId}`);
export const embedConfig = (token) => api.get(`/integration/embed-config`, { params: { token } });
export const registerWebhook = (data) => api.post("/integration/webhooks/register", data);
export const listWebhooks = () => api.get("/integration/webhooks");
export const deleteWebhook = (id) => api.delete(`/integration/webhooks/${id}`);

export const exportCsv = (view, glid) => `${API_BASE}/${view}/${glid}/export`;
export const resetDatabase = () => api.post("/reset");

export default api;
