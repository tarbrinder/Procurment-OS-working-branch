export const STAGES = [
  "RFQ_SENT", "SELLER_VERIFIED", "QUOTE_RECEIVED", "NEGOTIATION", "MEETING_SCHEDULED",
  "DEAL_WON", "PO_GENERATED", "PROFORMA_SENT", "PROFORMA_ACCEPTED",
  "PAYMENT_PENDING", "PAYMENT_PARTIAL", "PAYMENT_RECEIVED",
  "DISPATCHED", "IN_TRANSIT", "DELIVERED",
  "REVIEW_SUBMITTED", "CLOSED", "DEAL_LOST",
];

export const PRE_DEAL_STAGES = ["RFQ_SENT", "SELLER_VERIFIED", "QUOTE_RECEIVED", "NEGOTIATION", "MEETING_SCHEDULED", "DEAL_WON", "DEAL_LOST"];

export const POST_DEAL_STAGES = [
  "DEAL_WON", "PO_GENERATED", "PROFORMA_SENT", "PROFORMA_ACCEPTED",
  "PAYMENT_PENDING", "PAYMENT_PARTIAL", "PAYMENT_RECEIVED",
  "DISPATCHED", "IN_TRANSIT", "DELIVERED", "REVIEW_SUBMITTED", "CLOSED",
];

export const STAGE_LABELS = {
  RFQ_SENT: "RFQ Sent", SELLER_VERIFIED: "Seller Verified", QUOTE_RECEIVED: "Quote Received", NEGOTIATION: "Negotiation",
  MEETING_SCHEDULED: "Meeting Scheduled", DEAL_WON: "Deal Won", PO_GENERATED: "PO Generated",
  PROFORMA_SENT: "Proforma Sent", PROFORMA_ACCEPTED: "Proforma Accepted",
  PAYMENT_PENDING: "Payment Pending", PAYMENT_PARTIAL: "Payment Partial",
  PAYMENT_RECEIVED: "Payment Received", DISPATCHED: "Dispatched",
  IN_TRANSIT: "In Transit", DELIVERED: "Delivered",
  REVIEW_SUBMITTED: "Review Submitted", CLOSED: "Closed", DEAL_LOST: "Deal Lost",
};

export const STAGE_COLORS = {
  RFQ_SENT: { bg: "#eff6ff", text: "#1d4ed8", border: "#dbeafe" },
  SELLER_VERIFIED: { bg: "#ecfdf5", text: "#047857", border: "#d1fae5" },
  QUOTE_RECEIVED: { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
  NEGOTIATION: { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
  MEETING_SCHEDULED: { bg: "#eff6ff", text: "#1d4ed8", border: "#dbeafe" },
  DEAL_WON: { bg: "#ecfdf5", text: "#047857", border: "#d1fae5" },
  PO_GENERATED: { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" },
  PROFORMA_SENT: { bg: "#faf5ff", text: "#7c3aed", border: "#e9d5ff" },
  PROFORMA_ACCEPTED: { bg: "#ecfdf5", text: "#047857", border: "#d1fae5" },
  PAYMENT_PENDING: { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
  PAYMENT_PARTIAL: { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
  PAYMENT_RECEIVED: { bg: "#ecfdf5", text: "#047857", border: "#d1fae5" },
  DISPATCHED: { bg: "#eff6ff", text: "#1d4ed8", border: "#dbeafe" },
  IN_TRANSIT: { bg: "#eff6ff", text: "#1d4ed8", border: "#dbeafe" },
  DELIVERED: { bg: "#ecfdf5", text: "#047857", border: "#d1fae5" },
  REVIEW_SUBMITTED: { bg: "#ecfdf5", text: "#047857", border: "#d1fae5" },
  CLOSED: { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" },
  DEAL_LOST: { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" },
};

export const PRIORITY_COLORS = {
  high: { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" },
  medium: { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
  low: { bg: "#f3f4f6", text: "#4b5563", border: "#e5e7eb" },
};

export const PROBABILITY_MAP = {
  RFQ_SENT: 40, SELLER_VERIFIED: 50, QUOTE_RECEIVED: 60, NEGOTIATION: 75, MEETING_SCHEDULED: 85,
  DEAL_WON: 100, DEAL_LOST: 0,
};

export const FULFILLMENT_PROGRESS = {
  DEAL_WON: 5, PO_GENERATED: 10, PROFORMA_SENT: 20, PROFORMA_ACCEPTED: 30,
  PAYMENT_PENDING: 40, PAYMENT_PARTIAL: 50, PAYMENT_RECEIVED: 60,
  DISPATCHED: 70, IN_TRANSIT: 80, DELIVERED: 90,
  REVIEW_SUBMITTED: 95, CLOSED: 100,
};

export const COMPLAINT_CATEGORIES = [
  "Quality Issue", "Short Delivery", "Wrong Material", "Delayed Delivery", "Payment Dispute", "Other",
];

export const CHART_COLORS = ["#0f172a", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#7c3aed", "#06b6d4"];
