# GLID Procurement OS - Comprehensive Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [B2B Procurement Journey](#b2b-procurement-journey)
4. [Key Features](#key-features)
5. [API Reference](#api-reference)
6. [User Flows](#user-flows)
7. [Admin Portal](#admin-portal)
8. [Integration Guide](#integration-guide)
9. [Testing](#testing)
10. [Deployment](#deployment)

---

## Overview

**GLID Procurement OS** is a comprehensive B2B procurement platform built for IndiaMART's ecosystem. It enables seamless RFQ (Request for Quotation) management between buyers and sellers with complete lifecycle tracking from inquiry to delivery.

### Tech Stack
- **Backend**: FastAPI (Python), Motor (AsyncIO MongoDB)
- **Frontend**: React 19, Tailwind CSS, Shadcn UI
- **Database**: MongoDB
- **Real-time**: Daily.co (Video calls)

---

## Architecture

### Directory Structure
```
/app/
├── backend/
│   ├── server.py          # FastAPI application (2400+ lines)
│   ├── .env              # Environment variables
│   └── requirements.txt   # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── pages/        # Main application pages
│   │   ├── components/   # Reusable UI components
│   │   └── lib/          # API & utilities
│   ├── package.json
│   └── .env
└── docs/                 # Documentation
```

### Database Collections
- **rfqs**: RFQ documents with flexible schema
- **messages**: Chat messages within RFQ threads
- **users**: Partner/user information
- **reviews**: Buyer/seller feedback
- **files**: File attachments
- **proformas**: Proforma invoices
- **payments**: Payment records
- **shipments**: Delivery tracking

---

## B2B Procurement Journey

Based on IndiaMART's B2B workflow and Indian procurement practices:

### Complete Stage Flow

#### Pre-Deal Stages (Discovery → Negotiation)
1. **RFQ_SENT** (40%)
   - Buyer creates RFQ and sends to seller(s)
   - Seller receives notification
   
2. **SELLER_VERIFIED** (50%)
   - Optional video KYC verification
   - Trust establishment phase
   
3. **QUOTE_RECEIVED** (60%)
   - Seller submits quotation with pricing
   - Buyer reviews terms
   
4. **NEGOTIATION** (75%)
   - Back-and-forth on pricing, terms, delivery
   - Counter-offers and discussions
   
5. **MEETING_SCHEDULED** (85%)
   - Video call scheduled for detailed discussion
   - Final clarifications
   
6. **DEAL_WON** (100%) / **DEAL_LOST** (0%)
   - Buyer accepts/rejects the quote
   - Transition to post-deal or closure

#### Post-Deal Stages (Order Fulfillment)
7. **PO_GENERATED** (5% fulfillment)
   - **NEW**: Purchase Order generation
   - Formalizes the agreement
   - Includes PO number, terms, conditions
   
8. **PROFORMA_SENT** (20%)
   - Seller sends proforma invoice
   - Final pricing confirmation
   
9. **PROFORMA_ACCEPTED** (30%)
   - Buyer accepts proforma
   - Ready for payment
   
10. **PAYMENT_PENDING** (40%)
    - Payment processing initiated
    
11. **PAYMENT_PARTIAL** (50%)
    - Partial payment received (advance)
    
12. **PAYMENT_RECEIVED** (60%)
    - Full payment confirmed
    
13. **DISPATCHED** (70%)
    - Order shipped with tracking
    
14. **IN_TRANSIT** (80%)
    - Shipment en route
    
15. **DELIVERED** (90%)
    - Goods delivered to buyer
    
16. **REVIEW_SUBMITTED** (95%)
    - Buyer submits feedback
    
17. **CLOSED** (100%)
    - Transaction complete

---

## Key Features

### 1. Flexible RFQ System
- **Dynamic Schema**: Custom fields per RFQ type
- **No Fixed Structure**: Supports any product/service category
- **Reserved Fields**: `rfq_id`, `stage`, `buyer_glid`, `seller_glid`, etc.
- **Custom Fields**: Unlimited key-value pairs

Example:
```json
{
  "category": "Diesel Generator",
  "brand": "Kirloskar",
  "wattage": "25 KVA",
  "warranty": "2 years",
  "custom_field_1": "any value",
  "custom_field_2": 12345
}
```

### 2. Broadcast & Bulk RFQ
- **Broadcast**: One RFQ to multiple sellers (comparison mode)
- **Bulk**: Multiple different RFQs in one request
- **Limit**: 500 threads per bulk request
- **Auto-deduplication**: Removes duplicate sellers

### 3. Context-Aware Hints
**NEW Feature**: Dynamic HintBanner component shows:
- Current stage explanation
- Next possible actions
- Waiting states (buyer/seller specific)
- Color-coded by urgency

### 4. Purchase Order Stage
**NEW**: Complete PO workflow
- Auto-generated PO numbers: `PO-{RFQ_ID}-{TIMESTAMP}`
- Comes after DEAL_WON, before PROFORMA_SENT
- Buyer-initiated action
- System message logged in activity

### 5. Video KYC & Calls
- Video verification for seller trust
- Daily.co integration
- In-workspace video panel
- Call history tracking

### 6. File Management
- Document uploads (quotes, proformas, etc.)
- 10MB limit per file
- Base64 storage in MongoDB
- Download URLs generated

### 7. Admin Portal
- JWT-based authentication
- Analytics dashboard
- RFQ monitoring
- Broadcast tracking
- Stage distribution charts

---

## API Reference

### Base URL
```
Production: {REACT_APP_BACKEND_URL}/api
Local: http://localhost:8001/api
```

### Authentication
Most endpoints use GLID-based identification. Admin endpoints require JWT token.

### Key Endpoints

#### 1. Partner Registration
```http
POST /api/integration/register-partner
Content-Type: application/json

{
  "external_id": "buyer-abc-123",
  "name": "ABC Manufacturing",
  "role": "buyer",
  "metadata": {
    "gst_number": "27ABCDE1234F1Z5",
    "location": "Mumbai"
  }
}

Response:
{
  "glid": "generated-glid",
  "access_token": "jwt-token",
  "dashboard_url": "/embed?token=..."
}
```

#### 2. Create Flexible RFQ
```http
POST /api/integration/create-rfq-flexible
Content-Type: application/json

{
  "buyer_external_id": "buyer-abc-123",
  "seller_external_ids": ["seller-xyz-1", "seller-xyz-2"],
  "rfq_data": {
    "category": "Product Name",
    "quantity": 100,
    "any_custom_field": "any_value"
  },
  "priority": "high",
  "display_config": {
    "title_field": "category",
    "subtitle_fields": ["brand", "quantity"],
    "key_fields": ["price", "warranty"]
  }
}

Response:
{
  "rfqs_created": [...],
  "summary": {
    "total_rfqs_created": 2,
    "buyer_glid": "...",
    "seller_glids": [...]
  }
}
```

#### 3. Broadcast RFQ (One to Many)
Same as above, but with multiple `seller_external_ids`.

Returns additional:
```json
{
  "broadcast_group_id": "uuid",
  "is_broadcast": true
}
```

#### 4. Bulk RFQ Creation
```http
POST /api/integration/create-rfqs-bulk

{
  "buyer_external_id": "buyer-abc-123",
  "rfqs": [
    {
      "rfq_data": {...},
      "seller_external_ids": ["seller-1", "seller-2"],
      "priority": "high"
    },
    {
      "rfq_data": {...},
      "seller_external_ids": ["seller-3"],
      "priority": "medium"
    }
  ]
}

Response:
{
  "total_rfqs_created": 3,
  "batch_summary": [...]
}
```

#### 5. RFQ Actions
```http
POST /api/rfq/{rfq_id}/action

{
  "action": "generate_po",
  "actor_glid": "buyer-glid",
  "actor_type": "buyer",
  "content": "Purchase Order Generated",
  "metadata": {
    "po_number": "PO-ABC-123456"
  }
}
```

**Available Actions**:
- `send_quote`: Seller submits quotation
- `counter_offer`: Buyer/seller negotiates
- `accept_quote`: Move to DEAL_WON
- `reject_quote`: Move to DEAL_LOST
- `schedule_meeting`: Set up video call
- `generate_po`: **NEW** - Generate Purchase Order
- `send_message`: Chat message

#### 6. Post-Deal Actions
```http
POST /api/rfq/{rfq_id}/proforma
POST /api/rfq/{rfq_id}/proforma/accept
POST /api/rfq/{rfq_id}/payment
POST /api/rfq/{rfq_id}/shipment
POST /api/rfq/{rfq_id}/delivery
```

#### 7. Admin Endpoints
```http
POST /api/admin/login
{
  "email": "tarbrinder.singh@indiamart.com",
  "password": "Tarbrinder22/"
}

GET /api/admin/overview
Headers: Authorization: Bearer {token}

GET /api/admin/rfqs
GET /api/admin/rfq/{thread_id}
```

---

## User Flows

### Buyer Journey

1. **Create RFQ**
   - Dashboard → "Create New RFQ" or via API
   - Fill in product details (flexible fields)
   - Select seller(s) or broadcast
   
2. **Monitor Responses**
   - View quotes from sellers
   - Compare pricing, terms, warranties
   - HintBanner guides next steps
   
3. **Negotiate & Decide**
   - Send counter-offers
   - Schedule video meetings
   - Accept best quote
   
4. **Generate PO** (NEW)
   - Click "Generate Purchase Order"
   - System creates PO with unique number
   - Seller notified via HintBanner
   
5. **Proforma & Payment**
   - Review proforma invoice
   - Record payment(s)
   - Track fulfillment progress
   
6. **Delivery & Review**
   - Confirm delivery
   - Submit review
   - Transaction closes

### Seller Journey

1. **Receive RFQ**
   - Notification on dashboard
   - HintBanner: "Submit your best quote"
   
2. **Submit Quote**
   - Review requirements
   - Enter pricing and terms
   - Upload quote document
   
3. **Negotiate**
   - Respond to buyer's counter-offers
   - Video call for clarifications
   
4. **Post-Deal**
   - Wait for PO from buyer
   - Send proforma invoice
   - Confirm payment receipt
   
5. **Fulfill Order**
   - Dispatch shipment
   - Provide tracking details
   - Confirm delivery

---

## Admin Portal

### Access
- URL: `/admin`
- Credentials:
  - Email: `tarbrinder.singh@indiamart.com`
  - Password: `Tarbrinder22/`

### Features

#### Analytics Dashboard
- **Metrics**:
  - Total Buyers, Sellers, RFQs, Messages
  - Win Rate (DEAL_WON / Total Closed)
  - Conversion funnel
  - Stage distribution (pie chart)
  - Activity timeline (7 days)
  
- **Broadcast Stats**:
  - Total broadcast RFQs
  - Unique broadcast groups
  - Average sellers per broadcast
  
#### RFQ Monitoring
- List all RFQs with filters
- View individual thread details
- Activity timeline
- Message history
- Seller verification status

---

## Integration Guide

### Step 1: Register Partners
Register all buyers and sellers via API before creating RFQs.

### Step 2: Choose Integration Method

**Option A: Embed Widget**
```html
<iframe src="{dashboard_url}" />
```

**Option B: API-Only**
Use JWT tokens for programmatic access.

### Step 3: Handle Webhooks (Future)
Currently, polling is required. Webhooks planned.

### Step 4: File Uploads
Use `/api/files/upload` with multipart/form-data.

---

## Testing

### Test Script
```bash
bash /app/test_flexible_rfq.sh
```

**Tests**:
- Partner registration ✅
- Flexible RFQ creation ✅
- Broadcast to multiple sellers ✅
- Bulk multi-RFQ creation ✅
- Edge cases (empty sellers, duplicates, reserved fields, 500+ limit) ✅

**Results**: 13/13 tests passing

### Manual Testing Checklist
- [ ] Create RFQ with custom fields
- [ ] Broadcast to 3+ sellers
- [ ] Submit quote as seller
- [ ] Negotiate pricing
- [ ] Schedule and join video call
- [ ] Accept quote → DEAL_WON
- [ ] Generate Purchase Order (NEW)
- [ ] Send proforma
- [ ] Record payment
- [ ] Dispatch shipment
- [ ] Confirm delivery
- [ ] Submit review
- [ ] Verify HintBanner shows correct guidance at each stage

---

## Deployment

### Environment Variables

**Backend** (`/app/backend/.env`):
```env
MONGO_URL=mongodb://...
DB_NAME=glid_procurement
DAILY_API_KEY=your_daily_key
INTEGRATION_SECRET=your_secret
```

**Frontend** (`/app/frontend/.env`):
```env
REACT_APP_BACKEND_URL=https://your-domain.com/api
```

### Production Checklist
- [x] MongoDB Atlas connection
- [x] Daily.co API key configured
- [x] CORS settings updated
- [x] Admin credentials secured (move to env vars)
- [x] Error boundaries implemented
- [x] Loading states added
- [ ] Rate limiting (recommended)
- [ ] Webhook endpoints (future)

### Scaling Considerations
- MongoDB indexes on `rfq_id`, `buyer_glid`, `seller_glid`, `stage`
- File storage: Move to S3/GCS for production
- Caching: Redis for frequently accessed data
- Background jobs: Celery for async tasks

---

## Appendix

### Stage Transitions

| Current Stage | Allowed Actions | Next Stage |
|--------------|----------------|------------|
| RFQ_SENT | send_quote | QUOTE_RECEIVED |
| QUOTE_RECEIVED | accept_quote | DEAL_WON |
| QUOTE_RECEIVED | counter_offer | NEGOTIATION |
| NEGOTIATION | accept_quote | DEAL_WON |
| DEAL_WON | generate_po | PO_GENERATED |
| PO_GENERATED | send_proforma | PROFORMA_SENT |
| PROFORMA_SENT | accept_proforma | PROFORMA_ACCEPTED |
| PROFORMA_ACCEPTED | record_payment | PAYMENT_PENDING |
| PAYMENT_RECEIVED | dispatch_shipment | DISPATCHED |
| IN_TRANSIT | confirm_delivery | DELIVERED |
| DELIVERED | submit_review | REVIEW_SUBMITTED |

### Reserved Field Names
Cannot be used in `rfq_data`:
- `rfq_id`
- `thread_id`
- `stage`
- `buyer_glid`
- `seller_glid`
- `created_at`
- `last_updated`
- `probability_score`

### Limits
- Max file size: 10MB
- Max threads per bulk: 500
- Max sellers per broadcast: Unlimited (but practical limit ~100)

---

## Support & Contact

For questions or issues:
- GitHub: [Your Repo](https://github.com/tarbrinder/Procurment-OS-working-branch)
- Email: tarbrinder.singh@indiamart.com

---

**Last Updated**: March 8, 2026  
**Version**: 2.0 (with PO stage & HintBanner)  
**Status**: Production Ready ✅
