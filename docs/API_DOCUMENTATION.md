# GLID Procurement OS - API Documentation

## Base URL
```
Production: https://github-context.preview.emergentagent.com/api
Local: http://localhost:8001/api
```

## Table of Contents
1. [Authentication](#authentication)
2. [GLID Management](#glid-management)
3. [RFQ Operations](#rfq-operations)
4. [Messaging](#messaging)
5. [Video Calls](#video-calls)
6. [Post-Deal Lifecycle](#post-deal-lifecycle)
7. [Integration API](#integration-api)

---

## Authentication

This demo application does not require authentication for basic operations. Integration API uses JWT tokens.

---

## GLID Management

### Get All GLIDs
**GET** `/glids`

Returns all GLID nodes in the network.

**Response:**
```json
{
  "glids": [
    {
      "glid": "1",
      "type": "buyer",
      "name": "Tata Industries",
      "connections": ["1.1", "1.2", "1.3", "1.4"]
    }
  ]
}
```

### Get GLID Info
**GET** `/glids/{glid}`

Get details of a specific GLID.

**Parameters:**
- `glid` (path) - GLID identifier

**Response:**
```json
{
  "glid": "1",
  "type": "buyer",
  "name": "Tata Industries",
  "connections": ["1.1", "1.2", "1.3"]
}
```

---

## RFQ Operations

### Create RFQ
**POST** `/rfqs`

Create a new Request for Quotation.

**Request Body:**
```json
{
  "buyer_glid": "1",
  "seller_glid": "1.1",
  "product": "Steel Pipes",
  "quantity": 5000,
  "budget": 250000,
  "description": "High-grade steel pipes",
  "priority": "high"
}
```

**Response:**
```json
{
  "rfq_id": "uuid",
  "buyer_glid": "1",
  "seller_glid": "1.1",
  "product": "Steel Pipes",
  "quantity": 5000,
  "budget": 250000,
  "stage": "RFQ_SENT",
  "probability_score": 40,
  "priority": "high",
  "created_at": "2026-03-08T11:42:47.894Z",
  "last_updated": "2026-03-08T11:42:47.894Z"
}
```

### Get RFQ
**GET** `/rfqs/{rfq_id}`

Retrieve a specific RFQ by ID.

**Response:** Same as Create RFQ response

### Get Buyer RFQs
**GET** `/buyer/{glid}/rfqs`

Get all RFQs for a buyer GLID.

**Query Parameters:**
- `stage` (optional) - Filter by stage
- `search` (optional) - Search by product name

**Response:**
```json
{
  "rfqs": [...]
}
```

### Get Seller RFQs
**GET** `/seller/{glid}/rfqs`

Get all RFQs for a seller GLID.

**Query Parameters:** Same as Buyer RFQs

### Perform RFQ Action
**POST** `/rfqs/{rfq_id}/actions`

Perform an action on an RFQ (send quote, accept, reject, etc.)

**Request Body:**
```json
{
  "action": "send_quote",
  "actor_glid": "1.1",
  "actor_type": "seller",
  "content": "Quote sent: INR 240,000",
  "metadata": {
    "amount": 240000
  }
}
```

**Available Actions:**
- `send_quote` - Seller sends a quote
- `counter_offer` - Buyer/seller counter offers
- `accept_quote` - Buyer accepts quote
- `reject_quote` - Buyer rejects quote
- `schedule_meeting` - Schedule a meeting
- `close_deal_won` - Mark deal as won
- `close_deal_lost` - Mark deal as lost

---

## Messaging

### Get Messages
**GET** `/rfqs/{rfq_id}/messages`

Get all messages for an RFQ.

**Response:**
```json
{
  "messages": [
    {
      "message_id": "uuid",
      "rfq_id": "uuid",
      "sender_glid": "1",
      "sender_type": "buyer",
      "content": "New RFQ: Steel Pipes | Qty: 5000",
      "message_type": "system",
      "metadata": {},
      "created_at": "2026-03-08T11:42:47.894Z"
    }
  ]
}
```

### Send Message
**POST** `/rfqs/{rfq_id}/messages`

Send a message in an RFQ thread.

**Request Body:**
```json
{
  "sender_glid": "1",
  "sender_type": "buyer",
  "content": "Can you provide samples?",
  "message_type": "text",
  "metadata": {}
}
```

---

## Video Calls

### Create Video Room
**POST** `/rfqs/{rfq_id}/video-room`

Create or retrieve a Daily.co video room for an RFQ.

**Response:**
```json
{
  "rfq_id": "uuid",
  "room_name": "rfq-12345678",
  "room_url": "https://example.daily.co/rfq-12345678",
  "created_at": "2026-03-08T11:42:47.894Z"
}
```

### Initiate Video Call
**POST** `/rfqs/{rfq_id}/video-call/initiate`

Initiate a video call (creates ringing state).

**Request Body:**
```json
{
  "caller_glid": "1",
  "caller_type": "buyer"
}
```

### Accept Video Call
**POST** `/rfqs/{rfq_id}/video-call/accept`

Accept an incoming video call.

### Decline Video Call
**POST** `/rfqs/{rfq_id}/video-call/decline`

Decline an incoming video call.

### End Video Call
**POST** `/rfqs/{rfq_id}/video-call/end`

End an active or ringing video call.

### Get Incoming Calls
**GET** `/calls/incoming/{glid}`

Get all incoming (ringing) calls for a GLID.

### Get Active Calls
**GET** `/calls/active/{glid}`

Get all active/ringing calls for a GLID (both caller and receiver).

### Verify Seller
**POST** `/rfqs/{rfq_id}/verify-seller`

Mark seller as verified after video KYC.

**Request Body:**
```json
{
  "verified_by_glid": "1",
  "note": "Seller verified via video KYC"
}
```

---

## Post-Deal Lifecycle

### Proforma Invoice

#### Send Proforma
**POST** `/rfqs/{rfq_id}/proforma`

Seller sends a proforma invoice.

**Request Body:**
```json
{
  "amount": 240000,
  "tax_amount": 43200,
  "total_amount": 283200,
  "payment_terms": "50% advance, 50% on delivery",
  "line_items": [
    {
      "description": "Steel Pipes",
      "quantity": 5000,
      "unit_price": 48,
      "amount": 240000
    }
  ],
  "notes": "Delivery in 30 days",
  "file_ids": []
}
```

#### Get Proforma
**GET** `/rfqs/{rfq_id}/proforma`

Get proforma invoice for an RFQ.

#### Accept Proforma
**POST** `/rfqs/{rfq_id}/proforma/accept`

Buyer accepts the proforma invoice.

#### Reject Proforma
**POST** `/rfqs/{rfq_id}/proforma/reject`

Buyer rejects the proforma invoice.

### Payments

#### Record Payment
**POST** `/rfqs/{rfq_id}/payments`

Buyer records a payment.

**Request Body:**
```json
{
  "amount": 141600,
  "payment_method": "Bank Transfer",
  "reference_number": "TXN123456",
  "milestone": "advance",
  "file_ids": [],
  "payer_glid": "1",
  "payer_type": "buyer"
}
```

#### List Payments
**GET** `/rfqs/{rfq_id}/payments`

Get all payments for an RFQ.

#### Confirm Payment
**POST** `/rfqs/{rfq_id}/payments/{payment_id}/confirm`

Seller confirms receiving payment.

#### Reject Payment
**POST** `/rfqs/{rfq_id}/payments/{payment_id}/reject`

Seller rejects payment record.

### Shipments

#### Add Shipment
**POST** `/rfqs/{rfq_id}/shipments`

Seller adds shipment details.

**Request Body:**
```json
{
  "lr_number": "LR123456",
  "tracking_number": "TRK987654",
  "carrier": "Blue Dart",
  "quantity_shipped": 5000,
  "eway_bill": "EWB123456",
  "notes": "Handle with care"
}
```

#### List Shipments
**GET** `/rfqs/{rfq_id}/shipments`

Get all shipments for an RFQ.

### Delivery

#### Record Delivery
**POST** `/rfqs/{rfq_id}/delivery`

Buyer confirms delivery receipt.

**Request Body:**
```json
{
  "delivery_status": "full",
  "quality_status": "ok",
  "notes": "All items received in good condition",
  "photo_file_ids": [],
  "quantity_received": 5000
}
```

**Delivery Status Options:**
- `full` - Complete delivery
- `partial` - Partial delivery
- `damaged` - Damaged goods

**Quality Status Options:**
- `ok` - Quality acceptable
- `damaged` - Items damaged
- `mixed` - Mixed quality

#### List Deliveries
**GET** `/rfqs/{rfq_id}/delivery`

Get all delivery records for an RFQ.

### Complaints

#### Raise Complaint
**POST** `/rfqs/{rfq_id}/complaints`

Raise a complaint about the transaction.

**Request Body:**
```json
{
  "category": "quality_issue",
  "description": "Some items are damaged",
  "complainant_glid": "1",
  "complainant_type": "buyer",
  "file_ids": []
}
```

**Category Options:**
- `quality_issue`
- `delivery_delay`
- `quantity_mismatch`
- `payment_dispute`
- `other`

#### List Complaints
**GET** `/rfqs/{rfq_id}/complaints`

Get all complaints for an RFQ.

#### Respond to Complaint
**POST** `/rfqs/{rfq_id}/complaints/{complaint_id}/respond`

**Query Parameters:**
- `response` - Response text
- `responder_glid` - GLID of responder

#### Resolve Complaint
**POST** `/rfqs/{rfq_id}/complaints/{complaint_id}/resolve`

Mark complaint as resolved.

#### Escalate Complaint
**POST** `/rfqs/{rfq_id}/complaints/{complaint_id}/escalate`

Escalate complaint to higher authority.

### Reviews

#### Submit Review
**POST** `/rfqs/{rfq_id}/review`

Buyer submits a review for the seller.

**Request Body:**
```json
{
  "rating": 5,
  "comment": "Excellent service and quality products",
  "reviewer_glid": "1"
}
```

#### Get Review
**GET** `/rfqs/{rfq_id}/review`

Get review for an RFQ.

#### Respond to Review
**POST** `/rfqs/{rfq_id}/review/respond`

Seller responds to a review.

**Query Parameters:**
- `response` - Response text

#### Get Seller Reviews
**GET** `/sellers/{glid}/reviews`

Get all reviews for a seller.

#### Get Trust Score
**GET** `/sellers/{glid}/trust-score`

Get aggregated trust score for a seller.

---

## Dashboard & Analytics

### Get Buyer Dashboard
**GET** `/buyer/{glid}/dashboard`

Get KPIs and stage distribution for buyer.

**Response:**
```json
{
  "kpis": {
    "total_leads": 10,
    "active_rfqs": 5,
    "quotes_received": 3,
    "negotiation_ongoing": 2,
    "deals_won": 3,
    "deals_lost": 1,
    "in_fulfillment": 2
  },
  "stage_distribution": [
    { "stage": "RFQ_SENT", "count": 2 },
    { "stage": "NEGOTIATION", "count": 2 }
  ]
}
```

### Get Seller Dashboard
**GET** `/seller/{glid}/dashboard`

Get KPIs and stage distribution for seller.

### Export CSV
**GET** `/buyer/{glid}/export`
**GET** `/seller/{glid}/export`

Export RFQs as CSV file.

---

## File Management

### Upload File
**POST** `/upload`

Upload a file (max 10MB, stored as base64).

**Form Data:**
- `file` - File to upload
- `rfq_id` - RFQ ID
- `uploaded_by_glid` - Uploader GLID
- `uploaded_by_type` - Uploader type (buyer/seller)

**Response:**
```json
{
  "file_id": "uuid",
  "filename": "invoice.pdf",
  "content_type": "application/pdf",
  "size_bytes": 50000,
  "download_url": "/api/files/{file_id}",
  "created_at": "2026-03-08T11:42:47.894Z"
}
```

### Download File
**GET** `/files/{file_id}`

Download a file by ID.

### List RFQ Files
**GET** `/rfqs/{rfq_id}/files`

Get all files attached to an RFQ.

---

## Notifications

### Get Notifications
**GET** `/{view_type}/{glid}/notifications`

Get recent activity notifications for a GLID.

**Parameters:**
- `view_type` - "buyer" or "seller"
- `glid` - GLID identifier
- `since` (query, optional) - ISO timestamp to fetch notifications since

---

## Integration API

### Register Partner
**POST** `/integration/register-partner`

Register an external partner for integration.

**Request Body:**
```json
{
  "external_id": "partner-123",
  "name": "Acme Corp",
  "role": "buyer",
  "metadata": {}
}
```

### Generate Token
**POST** `/integration/generate-token`

Generate JWT token for embedded access.

**Request Body:**
```json
{
  "external_id": "partner-123",
  "expires_minutes": 60
}
```

**Response:**
```json
{
  "token": "eyJ...",
  "partner": {
    "external_id": "partner-123",
    "role": "buyer",
    "name": "Acme Corp",
    "glid": "100"
  },
  "embed_url_template": "https://example.com/embed?token=...",
  "expires_minutes": 60
}
```

### Create RFQ via Integration
**POST** `/integration/create-rfq`

Create an RFQ via integration API.

**Request Body:**
```json
{
  "buyer_external_id": "partner-123",
  "seller_external_id": "partner-456",
  "product": "Steel Pipes",
  "quantity": 5000,
  "budget": 250000,
  "description": "High-grade steel pipes",
  "priority": "high",
  "metadata": {}
}
```

**Response:**
```json
{
  "rfq_id": "uuid",
  "stage": "RFQ_SENT",
  "buyer_embed_url": "https://example.com/embed/rfq/{rfq_id}?token=...",
  "seller_embed_url": "https://example.com/embed/rfq/{rfq_id}?token=...",
  "buyer_dashboard_url": "https://example.com/embed?token=...",
  "seller_dashboard_url": "https://example.com/embed?token=..."
}
```

### Get RFQ Status
**GET** `/integration/rfq-status/{rfq_id}`

Get RFQ status via integration API.

### Register Webhook
**POST** `/integration/webhooks/register`

Register a webhook for events.

**Request Body:**
```json
{
  "url": "https://your-app.com/webhook",
  "events": ["stage_change", "message", "payment", "delivery"],
  "secret": "your-webhook-secret"
}
```

### List Webhooks
**GET** `/integration/webhooks`

List all registered webhooks.

### Delete Webhook
**DELETE** `/integration/webhooks/{webhook_id}`

Delete a webhook.

---

## RFQ Stage Flow

```
Pre-Deal:
RFQ_SENT → SELLER_VERIFIED → QUOTE_RECEIVED → NEGOTIATION → 
MEETING_SCHEDULED → DEAL_WON / DEAL_LOST

Post-Deal (from DEAL_WON):
DEAL_WON → PROFORMA_SENT → PROFORMA_ACCEPTED → PAYMENT_PENDING → 
PAYMENT_PARTIAL → PAYMENT_RECEIVED → DISPATCHED → IN_TRANSIT → 
DELIVERED → REVIEW_SUBMITTED → CLOSED
```

---

## Error Responses

All endpoints return errors in the following format:

```json
{
  "detail": "Error message"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (validation error, business logic error)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

No rate limiting is currently enforced in the demo version.

---

## WebSocket Support

The application uses long polling (2-second intervals) instead of WebSockets for real-time updates.

---

## Support

For issues or questions, refer to the project repository or documentation.
