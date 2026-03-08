# GLID Procurement Lead Manager – Demo

## Original Problem Statement
Build a standalone web application called "GLID Procurement Lead Manager – Demo" — an independent Lead Management & RFQ Lifecycle System embeddable in an iframe.

## Core Requirements
- **Dual Views**: Buyer and Seller with toggle
- **GLID-based Filtering**: Data filtered by mock Global Location ID network
- **Dashboards**: Separate KPI dashboards for Buyers and Sellers
- **RFQ Lifecycle**: Full pipeline from RFQ_SENT → DEAL_WON/DEAL_LOST
- **Real-time Sync**: 2-second polling between views
- **Video Calls**: Daily.co integration with ringing, acceptance, KYC verification
- **Post-Deal Procurement Lifecycle**: Proforma invoices, payments, shipments, delivery, complaints, reviews

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI
- **Database**: MongoDB (files stored as base64)
- **Video**: Daily.co integration
- **Real-time**: Long polling (2s interval)

## What's Implemented (Mar 2, 2026)

### Phase 1: Core RFQ Management ✅
- Landing page with Buyer/Seller role selection and GLID picker
- Buyer & Seller dashboards with KPI strips and pie charts
- RFQ creation, management, and state machine
- Message thread with real-time sync
- CSV export, search, filter by stage

### Phase 2: Video Calls ✅
- Daily.co video room creation
- Call initiation, ringing with Web Audio API ringtone, accept/decline/end
- Incoming calls widget on dashboards with audio notifications
- Seller verification ("Verified Seller" badge) after video KYC
- SELLER_VERIFIED as dedicated stage in flow

### Phase 3: Post-Deal Procurement Lifecycle ✅
- **Proforma Invoices**: Seller sends, buyer accepts/rejects, revision history
- **Payment Tracking**: Buyer records payments, seller confirms/rejects, progress bar
- **Shipments**: Seller adds with LR/tracking numbers, carrier, e-way bill
- **Delivery Confirmation**: Buyer confirms receipt (full/partial), quality check
- **Complaints**: Raise/respond/resolve/escalate, blocks stage progression
- **Reviews & Trust Score**: 1-5 star rating, seller response, aggregated trust score
- **File Sharing**: Upload/download files (PDF, images, Excel, CAD) up to 10MB
- **Auto Stage Progression**: Automatic stage changes based on lifecycle events
- **Fulfillment Progress Bar**: Visual progress indicator for post-deal stages

### Phase 4: UX Improvements ✅ (Mar 2, 2026)
- **Scrollable left panel**: Stage journey/procurement tabs scroll independently
- **Fixed messaging window**: Message thread stays in view at all times
- **Inline Action Bar**: Quick actions from messaging area (Accept Proforma, Record Payment, Dispatch Shipment, Confirm Delivery)
- **Dashboard Notification Bell**: Activity feed with unread count badge
- **Audio ringtone**: Web Audio API ringtone for incoming calls
- **Edge case guards**: Validation prevents actions at wrong stages (e.g., can't ship before payment)
- **Dashboard KPIs**: Added "In Fulfillment" count, post-deal stages properly categorized
- **SELLER_VERIFIED stage**: Added as pre-deal stage with video call verification hint

### Key Stages
Pre-deal: RFQ_SENT → SELLER_VERIFIED → QUOTE_RECEIVED → NEGOTIATION → MEETING_SCHEDULED → DEAL_WON/DEAL_LOST
Post-deal: DEAL_WON → PROFORMA_SENT → PROFORMA_ACCEPTED → PAYMENT_PENDING → PAYMENT_PARTIAL → PAYMENT_RECEIVED → DISPATCHED → IN_TRANSIT → DELIVERED → REVIEW_SUBMITTED → CLOSED

## Backlog / Future Tasks
- **P2**: Third-party logistics API integration (Delhivery, Bluedart) for real-time shipment tracking

## Test Credentials
No auth required. URL params control the view:
- Buyer: `?view=buyer&glid=1` (or 2, 3)
- Seller: `?view=seller&glid=1.1` (or 1.2, 1.3, etc.)
