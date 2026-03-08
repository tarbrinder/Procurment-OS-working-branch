# GLID Procurement OS - User Guide

## Welcome to GLID Procurement OS! 🎯

A comprehensive procurement lifecycle management platform designed to streamline RFQ (Request for Quotation) processes between buyers and sellers.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Buyer Guide](#buyer-guide)
3. [Seller Guide](#seller-guide)
4. [RFQ Lifecycle](#rfq-lifecycle)
5. [Video Calls & Verification](#video-calls--verification)
6. [Post-Deal Management](#post-deal-management)
7. [Integration Console](#integration-console)
8. [Tips & Best Practices](#tips--best-practices)

---

## Getting Started

### Accessing the Platform

1. **Open the application** in your web browser
2. **Choose your role**: Buyer or Seller
3. **Select your GLID** (Global Location ID) from the dropdown
4. **Click "Proceed to Dashboard"** to access your workspace

### Understanding GLIDs

- **Buyer GLIDs**: Single digit (e.g., "1", "2", "3")
- **Seller GLIDs**: Decimal format (e.g., "1.1", "1.2", "2.1")
- GLIDs represent your organizational identity in the network
- Each GLID can connect with multiple partners

---

## Buyer Guide

### Dashboard Overview

Your buyer dashboard shows:

- **Total Leads**: All RFQs you've created
- **Active RFQs**: RFQs in progress (not won/lost)
- **Quotes Received**: Sellers have responded with quotes
- **Negotiation Ongoing**: Active negotiations
- **Deals Won**: Successfully closed deals
- **In Fulfillment**: Orders being fulfilled
- **Stage Distribution Chart**: Visual breakdown of RFQ stages

### Creating an RFQ

1. Click **"Create RFQ"** button on your dashboard
2. Fill in the details:
   - **Seller**: Choose from connected sellers
   - **Product Name**: What you need
   - **Quantity**: How much you need
   - **Budget**: Your target price
   - **Description**: Detailed specifications
   - **Priority**: High, Medium, or Low
3. Click **"Create RFQ"**
4. The RFQ is sent to the seller automatically

### Managing RFQs

#### Viewing RFQs

- **All**: See all your RFQs
- **Filter by Stage**: Click stage badges to filter
- **Search**: Use search bar to find specific products
- **Sort**: Automatically sorted by last updated

#### RFQ Actions

Click on any RFQ to open the workspace where you can:

- **View Messages**: See conversation history
- **Send Messages**: Communicate with seller
- **Accept Quote**: Move to deal won
- **Counter Offer**: Negotiate pricing
- **Reject Quote**: Decline and close
- **Schedule Meeting**: Set up discussions
- **Initiate Video Call**: Start video verification

### Post-Deal Management (After Deal Won)

#### 1. Proforma Invoice
- Seller sends proforma invoice
- Review line items, pricing, and terms
- **Accept** to proceed or **Reject** to renegotiate

#### 2. Payment
- Record your payments with:
  - Amount paid
  - Payment method
  - Reference number
  - Milestone (advance/final/partial)
- Attach payment proof documents
- Seller confirms receipt
- Progress bar shows payment completion

#### 3. Shipment Tracking
- View shipment details from seller:
  - LR Number
  - Tracking Number
  - Carrier name
  - E-way Bill
  - Quantity shipped
- Track delivery status

#### 4. Delivery Confirmation
- Confirm delivery when received:
  - Full / Partial delivery
  - Quality status (OK / Damaged / Mixed)
  - Quantity received
  - Upload photos if needed
- Stage progresses to DELIVERED

#### 5. Complaints (if needed)
- Raise complaints for:
  - Quality issues
  - Delivery delays
  - Quantity mismatch
  - Payment disputes
  - Other issues
- Track complaint status
- Add supporting documents
- Complaints block stage progression until resolved

#### 6. Review & Rating
- After delivery, submit review:
  - 1-5 star rating
  - Written feedback
  - Builds seller trust score
- Seller can respond to your review

### Video Calls

**Initiating a Video Call:**
1. Open an RFQ workspace
2. Click **"Start Video Call"** button
3. Call rings on seller's dashboard
4. Wait for seller to accept
5. Conduct video KYC verification
6. Mark seller as "Verified" after successful KYC

**Benefits of Verification:**
- Verified sellers get a ✓ badge
- Builds trust in the platform
- Stage progresses to SELLER_VERIFIED

---

## Seller Guide

### Dashboard Overview

Your seller dashboard shows:

- **Total Incoming**: All RFQs received
- **Pending Response**: RFQs awaiting your quote
- **Negotiation Ongoing**: Active negotiations
- **Deals Closed**: Won and lost deals
- **In Fulfillment**: Orders you're fulfilling
- **Stage Distribution Chart**: Visual breakdown

### Responding to RFQs

1. **View Incoming RFQs** on your dashboard
2. **Click on an RFQ** to open workspace
3. **Review Requirements**: Product, quantity, budget
4. **Send Quote**:
   - Enter your quoted amount
   - Add details in message
   - Attach quote documents if needed
5. **Negotiate**: Respond to buyer counter-offers
6. **Wait for Decision**: Buyer accepts or rejects

### Post-Deal Fulfillment (After Deal Won)

#### 1. Send Proforma Invoice
- Create detailed proforma:
  - Line items with descriptions
  - Amounts and tax
  - Payment terms
  - Delivery timeline
- Attach PDF invoice if needed
- Submit for buyer approval
- Revise if buyer rejects

#### 2. Confirm Payments
- View payment records from buyer
- Verify payment receipt
- **Confirm** if received correctly
- **Reject** if there are discrepancies
- Payment confirmation enables shipment

#### 3. Dispatch Shipment
- After full payment received:
  - Enter LR Number
  - Add Tracking Number
  - Specify Carrier name
  - E-way Bill number
  - Quantity shipped
  - Any special notes
- Stage progresses to DISPATCHED/IN_TRANSIT

#### 4. Track Delivery
- Monitor delivery status
- Buyer confirms receipt
- View delivery notes and photos

#### 5. Handle Complaints
- Respond to buyer complaints promptly
- Provide resolution plans
- Work towards resolving issues
- Request escalation if needed

#### 6. Respond to Reviews
- View buyer ratings and feedback
- Respond professionally
- Build your trust score
- Higher trust scores attract more business

### Video Call Management

**Receiving Video Calls:**
1. Incoming call notification appears
2. See caller details and product
3. **Accept** to join or **Decline** to reject
4. Conduct video meeting
5. Get verified by buyer for trust building

---

## RFQ Lifecycle

### Pre-Deal Stages

1. **RFQ_SENT** (40% probability)
   - Initial stage when RFQ is created
   - Seller needs to respond

2. **SELLER_VERIFIED** (50% probability)
   - After successful video KYC
   - Increases deal confidence

3. **QUOTE_RECEIVED** (60% probability)
   - Seller has sent a quote
   - Buyer reviews pricing

4. **NEGOTIATION** (75% probability)
   - Active price negotiations
   - Back-and-forth offers

5. **MEETING_SCHEDULED** (85% probability)
   - Meeting set up
   - Final discussions planned

6. **DEAL_WON** (100% probability)
   - Buyer accepts quote
   - Moves to fulfillment

7. **DEAL_LOST** (0% probability)
   - Buyer rejects quote
   - RFQ closed

### Post-Deal Stages

8. **PROFORMA_SENT** (100%, 20% fulfillment)
   - Seller sends invoice
   - Awaiting buyer approval

9. **PROFORMA_ACCEPTED** (100%, 30% fulfillment)
   - Buyer accepts invoice
   - Ready for payment

10. **PAYMENT_PENDING** (100%, 40% fulfillment)
    - Awaiting payment from buyer
    - No payments received yet

11. **PAYMENT_PARTIAL** (100%, 50% fulfillment)
    - Partial payment received
    - Awaiting balance

12. **PAYMENT_RECEIVED** (100%, 60% fulfillment)
    - Full payment confirmed
    - Ready for dispatch

13. **DISPATCHED** (100%, 70% fulfillment)
    - Goods dispatched
    - Shipment details added

14. **IN_TRANSIT** (100%, 80% fulfillment)
    - Shipment in transit
    - Tracking active

15. **DELIVERED** (100%, 90% fulfillment)
    - Buyer confirms delivery
    - Quality checked

16. **REVIEW_SUBMITTED** (100%, 95% fulfillment)
    - Buyer submits review
    - Seller can respond

17. **CLOSED** (100%, 100% fulfillment)
    - Transaction complete
    - All actions finished

### Auto Stage Progression

The system automatically progresses stages when:
- Proforma accepted → PAYMENT_PENDING
- Payment received → PAYMENT_RECEIVED
- Full payment → PAYMENT_RECEIVED
- Shipment dispatched → DISPATCHED
- Tracking added → IN_TRANSIT
- Delivery confirmed → DELIVERED
- Review submitted → CLOSED

### Complaint Blocking

**Active complaints prevent stage progression** until resolved or escalated.

---

## Video Calls & Verification

### Features

- **WebRTC-based Video**: High-quality video calls
- **Daily.co Integration**: Reliable infrastructure
- **Ringing Notifications**: Audio alerts for incoming calls
- **Screen Sharing**: Share documents during calls
- **Chat**: In-call messaging
- **KYC Verification**: Verify seller identity

### Best Practices

1. **Good Lighting**: Ensure clear video visibility
2. **Stable Internet**: Minimum 2 Mbps recommended
3. **Quiet Environment**: Minimize background noise
4. **Prepare Documents**: Have business documents ready
5. **Professional Conduct**: Maintain business etiquette

### Troubleshooting

- **Camera/Mic Not Working**: Check browser permissions
- **Call Not Connecting**: Refresh page and retry
- **Poor Quality**: Check internet speed
- **No Ringtone**: Check browser audio settings

---

## Post-Deal Management

### File Uploads

**Supported Formats:**
- Documents: PDF, DOC, DOCX, XLS, XLSX
- Images: JPG, PNG, HEIC, HEIF
- CAD Files: DWG, DXF

**File Size Limit:** 10 MB per file

**Use Cases:**
- Proforma invoices
- Payment receipts
- Quality certificates
- Shipment documents
- Delivery photos
- Complaint evidence

### Progress Tracking

**Fulfillment Progress Bar** shows:
- Current stage completion percentage
- Visual indicator of transaction progress
- Updated automatically as stages progress

### Document Management

- **Upload**: Attach files at any stage
- **Download**: View/download all files
- **Organize**: Files tagged by RFQ
- **Share**: Both parties see all files

---

## Integration Console

### For Developers

Access via **"Integration Console"** link on landing page.

**Features:**
- Partner registration
- JWT token generation
- RFQ creation via API
- Embed URLs for iframe integration
- Webhook management

**Use Cases:**
- Embed procurement flows in your app
- Integrate with existing ERP systems
- Automate RFQ creation
- Receive real-time event notifications

**Documentation:**
See API Documentation for complete integration guide.

---

## Tips & Best Practices

### For Buyers

✅ **Create Detailed RFQs**
- Provide complete specifications
- Include quality standards
- Mention delivery requirements

✅ **Communicate Clearly**
- Respond promptly to quotes
- Ask questions early
- Document all agreements

✅ **Verify Sellers**
- Use video calls for important deals
- Check seller reviews and trust scores
- Request samples when needed

✅ **Manage Payments**
- Record all payments accurately
- Attach payment proofs
- Confirm receipt with seller

✅ **Confirm Deliveries Promptly**
- Inspect goods immediately
- Report issues quickly
- Submit honest reviews

### For Sellers

✅ **Respond Quickly**
- Reply to RFQs within 24 hours
- Provide competitive quotes
- Include all costs upfront

✅ **Be Professional in Video Calls**
- Show business registration documents
- Explain capabilities clearly
- Build buyer confidence

✅ **Accurate Proforma Invoices**
- Itemize all costs
- Clarify payment terms
- Set realistic delivery timelines

✅ **Timely Fulfillment**
- Confirm payments quickly
- Dispatch on schedule
- Provide tracking information

✅ **Handle Complaints Well**
- Respond promptly to issues
- Offer fair resolutions
- Learn from feedback

### General Tips

📊 **Use Dashboard Analytics**
- Monitor stage distributions
- Track win rates
- Identify bottlenecks

📁 **Document Everything**
- Upload important files
- Keep payment records
- Save communication history

🔔 **Enable Notifications**
- Check notification bell regularly
- Respond to activities promptly
- Stay updated on RFQ status

💬 **Communicate Effectively**
- Use message threads for all communication
- Be clear and concise
- Keep conversations professional

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Esc` | Close modals/dialogs |
| `Tab` | Navigate form fields |
| `Enter` | Submit forms |

---

## Mobile Access

The platform is **responsive and mobile-friendly**:
- Access from any device
- Touch-optimized interface
- Mobile video call support
- On-the-go RFQ management

---

## Data Privacy & Security

- **No Authentication Required** (Demo mode)
- **File Storage**: Base64 encoded in database
- **Video Calls**: End-to-end encrypted via Daily.co
- **Data Isolation**: GLIDs separate organizational data

---

## Support & Help

**Need Help?**
- Check this user guide first
- Review API documentation for integrations
- Contact system administrator
- Submit feedback for improvements

---

## Glossary

- **GLID**: Global Location Identifier - Your organizational ID
- **RFQ**: Request for Quotation - Buyer's product request
- **Proforma Invoice**: Preliminary invoice before shipping
- **LR Number**: Lorry Receipt - Shipment document number
- **E-way Bill**: Electronic way bill for goods transport
- **KYC**: Know Your Customer - Identity verification
- **Trust Score**: Seller rating based on reviews

---

## Version Information

**Current Version:** 4.0 (March 2026)

**Recent Updates:**
- Inline action bar for quick actions
- Fixed messaging window
- Scrollable navigation panels
- Dashboard notification improvements
- Enhanced fulfillment tracking

---

Thank you for using GLID Procurement OS! 🚀
