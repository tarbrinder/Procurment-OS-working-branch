# GLID Procurement OS - Authentication & Data Flow Analysis

## 🔍 Executive Summary

**Authentication Model**: This is a **DEMO application with NO traditional authentication**. It uses a **GLID-based identification system** where users select their identity via URL parameters or UI dropdowns.

**Current Model**: **Demonstration/Sandbox Mode**
- ❌ No username/password
- ❌ No JWT tokens for main access (only for integration API)
- ✅ GLID-based identification
- ✅ URL parameter driven
- ✅ Frontend state management

---

## 🎯 How Buyer/Seller Access Works

### Method 1: URL Parameters (Direct Access)

**Format:**
```
https://your-app.com/?view={buyer|seller}&glid={glid_value}
```

**Examples:**
```bash
# Buyer access
https://your-app.com/?view=buyer&glid=1

# Seller access  
https://your-app.com/?view=seller&glid=1.1
```

**What Happens:**
1. User opens URL with parameters
2. `App.js` reads URL params in `useEffect`:
   ```javascript
   const params = new URLSearchParams(window.location.search);
   const urlView = params.get("view");  // "buyer" or "seller"
   const urlGlid = params.get("glid");   // "1" or "1.1" etc.
   ```
3. Sets React context state: `view` and `glid`
4. Redirects to appropriate dashboard (`/buyer` or `/seller`)
5. Dashboard fetches data using GLID

### Method 2: Landing Page Selection (UI Flow)

**User Flow:**
1. Open `https://your-app.com/`
2. Click **"Enter as Buyer"** or **"Enter as Seller"**
3. Select GLID from dropdown (populated from `/api/glids`)
4. Click **"Proceed to Dashboard"**
5. Navigate to dashboard with selected identity

**Code Flow:**
```javascript
// LandingPage.js
const handleEnter = (role) => {
  setView(role);      // "buyer" or "seller"
  setGlid(null);      // Reset GLID selection
};

const handleProceed = () => {
  if (view && glid) {
    navigate(`/${view}`);  // Navigate to /buyer or /seller
  }
};
```

---

## 🔑 GLID System Explained

### What is a GLID?

**GLID** = **Global Location Identifier**

A unique identifier representing an organization or entity in the procurement network.

### GLID Format:

```
Buyer GLIDs:    Single digit (1, 2, 3, ...)
Seller GLIDs:   Decimal format (1.1, 1.2, 2.1, ...)
```

### Example GLIDs:

**Buyers:**
```json
{
  "glid": "1",
  "type": "buyer",
  "name": "Tata Industries",
  "connections": ["1.1", "1.2", "1.3", "1.4"]
}
```

**Sellers:**
```json
{
  "glid": "1.1",
  "type": "seller",
  "name": "Steel Solutions Ltd",
  "connections": ["1", "2", "3"]
}
```

### How GLIDs Are Stored:

**MongoDB Collection: `glid_network`**
```javascript
db.glid_network.find({})
// Returns all GLIDs with type, name, connections
```

### How GLIDs Are Seeded:

On backend startup (`backend/server.py`):
```python
SEED_GLIDS = [
    {"glid": "1", "type": "buyer", "name": "Tata Industries", ...},
    {"glid": "2", "type": "buyer", "name": "Reliance Procurement", ...},
    {"glid": "1.1", "type": "seller", "name": "Steel Solutions Ltd", ...},
    # ... 12 total GLIDs
]

@app.on_event("startup")
async def seed_database():
    count = await db.glid_network.count_documents({})
    if count == 0:
        await db.glid_network.insert_many(SEED_GLIDS)
```

---

## 📊 Data Flow: How Users See Their RFQs

### 1. Frontend Fetches GLIDs (On App Load)

**API Call:**
```javascript
// App.js - on mount
fetchGlids()
  .then((res) => setAllGlids(res.data.glids))
```

**Backend Endpoint:**
```python
@api_router.get("/glids")
async def get_all_glids():
    glids = await db.glid_network.find({}, {"_id": 0}).to_list(100)
    return {"glids": glids}
```

**Response:**
```json
{
  "glids": [
    {"glid": "1", "type": "buyer", "name": "Tata Industries", ...},
    {"glid": "1.1", "type": "seller", "name": "Steel Solutions Ltd", ...}
  ]
}
```

### 2. User Selects Identity (view + glid)

**Frontend State (React Context):**
```javascript
const [view, setView] = useState(null);      // "buyer" or "seller"
const [glid, setGlid] = useState(null);      // "1" or "1.1"
const [glidInfo, setGlidInfo] = useState(null);
```

**State is shared across entire app via Context:**
```javascript
<AppContext.Provider value={{ view, glid, glidInfo, ... }}>
  {children}
</AppContext.Provider>
```

### 3. Dashboard Fetches Data Using GLID

**Buyer Dashboard:**
```javascript
// BuyerDashboard.js
const { glid, view } = useAppContext();  // Get from context

// Fetch buyer-specific data
const [dashRes, rfqsRes] = await Promise.all([
  fetchBuyerDashboard(glid),       // GET /api/buyer/{glid}/dashboard
  fetchBuyerRfqs(glid, {...})      // GET /api/buyer/{glid}/rfqs
]);
```

**Backend Filtering:**
```python
@api_router.get("/buyer/{glid}/rfqs")
async def get_buyer_rfqs(glid: str, stage: Optional[str] = None, ...):
    query = {"buyer_glid": glid}  # Filter by buyer's GLID
    if stage:
        query["stage"] = stage
    rfqs = await db.rfqs.find(query, {"_id": 0}).sort("last_updated", -1).to_list(100)
    return {"rfqs": rfqs}
```

**Seller Dashboard:**
```javascript
// SellerDashboard.js
const [dashRes, rfqsRes] = await Promise.all([
  fetchSellerDashboard(glid),      // GET /api/seller/{glid}/dashboard
  fetchSellerRfqs(glid, {...})     // GET /api/seller/{glid}/rfqs
]);
```

**Backend Filtering:**
```python
@api_router.get("/seller/{glid}/rfqs")
async def get_seller_rfqs(glid: str, stage: Optional[str] = None, ...):
    query = {"seller_glid": glid}  # Filter by seller's GLID
    if stage:
        query["stage"] = stage
    rfqs = await db.rfqs.find(query, {"_id": 0}).sort("last_updated", -1).to_list(100)
    return {"rfqs": rfqs}
```

### 4. Real-Time Updates (Polling)

**Frontend polls every 2 seconds:**
```javascript
useEffect(() => {
  loadData();  // Initial load
  const interval = setInterval(loadData, 2000);  // Poll every 2s
  return () => clearInterval(interval);
}, [glid, view]);
```

---

## 🔐 Integration API (For External Systems)

For **external systems** that want to embed this OS, there's a **JWT-based integration API**.

### Registration Flow:

**1. Register Partner:**
```bash
POST /api/integration/register-partner
{
  "external_id": "company-123",
  "name": "Acme Corp",
  "role": "buyer",
  "metadata": {}
}
```

**Response:**
```json
{
  "message": "Partner registered",
  "partner_id": "uuid",
  "glid": "100"  // Auto-assigned GLID
}
```

**2. Generate JWT Token:**
```bash
POST /api/integration/generate-token
{
  "external_id": "company-123",
  "expires_minutes": 60
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "partner": {
    "external_id": "company-123",
    "role": "buyer",
    "glid": "100"
  },
  "embed_url_template": "https://app.com/embed?token=..."
}
```

**3. Embed in Your App:**
```html
<iframe src="https://app.com/embed?token=eyJhbGciOiJIUzI1NiIs..."></iframe>
```

**Backend Token Validation:**
```python
def verify_token(token: str):
    try:
        payload = jwt.decode(token, INTEGRATION_SECRET, algorithms=["HS256"])
        return payload  # Contains external_id, role, glid
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
```

---

## 📋 Complete User Journey Examples

### Example 1: Buyer Access via URL

**Step-by-Step:**

1. **User receives link:**
   ```
   https://app.com/?view=buyer&glid=1
   ```

2. **App.js reads params:**
   ```javascript
   const urlView = "buyer";
   const urlGlid = "1";
   setView("buyer");
   setGlid("1");
   navigate("/buyer");  // Redirect to buyer dashboard
   ```

3. **BuyerDashboard.js loads:**
   ```javascript
   const { glid, view } = useAppContext();  // glid = "1", view = "buyer"
   
   // Fetch data
   GET /api/buyer/1/dashboard
   GET /api/buyer/1/rfqs
   ```

4. **Backend queries:**
   ```javascript
   // MongoDB query
   db.rfqs.find({ buyer_glid: "1" })
   
   // Returns only RFQs where buyer_glid = "1"
   ```

5. **User sees:**
   - Dashboard with KPIs for GLID 1
   - RFQ list for buyer GLID 1
   - Can create new RFQs
   - Can view individual RFQ workspaces

### Example 2: Seller Access via Landing Page

**Step-by-Step:**

1. **User opens:** `https://app.com/`

2. **Landing Page displays:**
   - "Enter as Buyer" button
   - "Enter as Seller" button

3. **User clicks "Enter as Seller":**
   ```javascript
   handleEnter("seller");  // Sets view = "seller"
   ```

4. **Dropdown shows seller GLIDs:**
   ```javascript
   const sellers = allGlids.filter(g => g.type === "seller");
   // ["1.1", "1.2", "1.3", "2.1", "2.2", "3.1", "3.2", "3.3"]
   ```

5. **User selects "1.1 - Steel Solutions Ltd":**
   ```javascript
   setGlid("1.1");
   ```

6. **User clicks "Proceed to Dashboard":**
   ```javascript
   navigate("/seller");  // Go to seller dashboard
   ```

7. **SellerDashboard.js fetches:**
   ```javascript
   GET /api/seller/1.1/dashboard
   GET /api/seller/1.1/rfqs
   ```

8. **Backend queries:**
   ```javascript
   db.rfqs.find({ seller_glid: "1.1" })
   ```

9. **User sees:**
   - Dashboard with seller KPIs
   - Incoming RFQs for seller GLID 1.1
   - Can respond to RFQs
   - Can send quotes

---

## 🛡️ Security Considerations

### Current Demo Model:

⚠️ **This is NOT production-ready authentication!**

**Vulnerabilities in Demo Mode:**

1. **No Authentication:**
   - Anyone can access any GLID by changing URL
   - No password protection
   - No session management

2. **GLID Spoofing:**
   - User can manually change `?glid=1` to `?glid=2`
   - Can impersonate any buyer or seller

3. **Data Exposure:**
   - All GLIDs visible via `/api/glids`
   - No access control
   - No audit trail

### Production Requirements:

For **production deployment**, you MUST add:

1. **User Authentication:**
   ```python
   # Add authentication system
   from fastapi import Depends, HTTPException
   from fastapi.security import OAuth2PasswordBearer
   
   oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
   
   async def get_current_user(token: str = Depends(oauth2_scheme)):
       # Verify JWT token
       # Return user object with glid
       pass
   
   @api_router.get("/buyer/{glid}/rfqs")
   async def get_buyer_rfqs(
       glid: str, 
       current_user = Depends(get_current_user)
   ):
       # Verify current_user.glid == glid
       if current_user.glid != glid:
           raise HTTPException(status_code=403, detail="Access denied")
       # ... fetch data
   ```

2. **Session Management:**
   - Use JWT tokens or session cookies
   - Store user sessions in Redis or database
   - Implement token refresh mechanism

3. **GLID Authorization:**
   - Map users to GLIDs in database
   - Verify user has permission to access GLID
   - Implement role-based access control (RBAC)

4. **User Database:**
   ```javascript
   // New collection: users
   {
     user_id: "uuid",
     email: "user@company.com",
     password_hash: "...",
     glid: "1",
     role: "buyer",
     permissions: ["view_rfqs", "create_rfqs", ...]
   }
   ```

5. **Access Control:**
   ```python
   # Middleware to verify GLID access
   async def verify_glid_access(glid: str, current_user: User):
       if current_user.glid != glid:
           raise HTTPException(403, "Cannot access other organization's data")
       return True
   ```

---

## 📖 Parameter Format Reference

### URL Parameters (Frontend)

**Landing Page & Dashboard Access:**
```
Format: /?view={view_type}&glid={glid_value}

Parameters:
- view: "buyer" or "seller" (required)
- glid: GLID string (required)

Examples:
/?view=buyer&glid=1
/?view=seller&glid=1.1
/?view=buyer&glid=2
```

**RFQ Workspace:**
```
Format: /rfq/{rfq_id}?view={view_type}&glid={glid_value}

Parameters:
- rfq_id: UUID of RFQ (path parameter)
- view: "buyer" or "seller" (query parameter)
- glid: GLID string (query parameter)

Example:
/rfq/abc-123-def?view=buyer&glid=1
```

**Embed Page (Integration):**
```
Format: /embed?token={jwt_token}
        /embed/rfq/{rfq_id}?token={jwt_token}

Parameters:
- token: JWT token from integration API (required)
- rfq_id: UUID of RFQ (optional, for specific RFQ view)

Example:
/embed?token=eyJhbGciOiJIUzI1NiIs...
```

### API Parameters (Backend)

**Common Patterns:**

**GLID in Path:**
```bash
GET /api/buyer/{glid}/dashboard
GET /api/seller/{glid}/rfqs
GET /api/glids/{glid}

# Example
GET /api/buyer/1/dashboard
```

**Query Parameters:**
```bash
GET /api/buyer/{glid}/rfqs?stage=NEGOTIATION&search=steel

Parameters:
- stage (optional): Filter by RFQ stage
- search (optional): Search by product name

# Example
GET /api/buyer/1/rfqs?stage=NEGOTIATION
```

**Notifications:**
```bash
GET /api/{view_type}/{glid}/notifications?since=2026-03-08T10:00:00Z

Parameters:
- view_type: "buyer" or "seller" (path)
- glid: GLID string (path)
- since: ISO timestamp (optional query)

# Example
GET /api/buyer/1/notifications?since=2026-03-08T10:00:00Z
```

---

## 📚 Documentation Coverage

### Is This Documented?

**✅ Partially Documented:**

1. **API Documentation** (`docs/API_DOCUMENTATION.md`)
   - ✅ All API endpoints documented
   - ✅ GLID usage in endpoints shown
   - ✅ Integration API with JWT tokens explained
   - ❌ Authentication model not explicitly stated
   - ❌ URL parameter format not documented

2. **User Guide** (`docs/USER_GUIDE.md`)
   - ✅ "Accessing the Platform" section explains UI flow
   - ✅ GLID concept explained
   - ❌ URL parameter access not mentioned
   - ❌ No security warnings for demo mode

3. **Developer Guide** (`docs/DEVELOPER_GUIDE.md`)
   - ✅ Architecture diagrams show data flow
   - ✅ Integration API documented
   - ✅ JWT token flow explained
   - ❌ Demo authentication model not clarified
   - ❌ Production authentication requirements not specified

### ❌ Missing Documentation:

1. **Authentication Model**
   - How identity is established
   - GLID-based access explanation
   - URL parameter format
   - Security implications of demo mode

2. **Production Migration Guide**
   - How to add real authentication
   - User-to-GLID mapping strategy
   - Session management approach
   - Access control implementation

3. **Data Privacy**
   - How GLIDs isolate data
   - Multi-tenancy considerations
   - Preventing cross-GLID access

---

## 🎯 Summary

### Current System:

**Authentication**: ❌ None (Demo Mode)
**Identification**: ✅ GLID-based (URL params or UI selection)
**Data Filtering**: ✅ Backend filters by GLID
**Integration**: ✅ JWT tokens for external embedding

### How It Works:

1. **User selects identity** via URL params or UI
2. **Frontend stores** `view` and `glid` in React Context
3. **All API calls** include GLID in path: `/api/buyer/{glid}/...`
4. **Backend filters** data by GLID: `{buyer_glid: glid}` or `{seller_glid: glid}`
5. **Real-time updates** poll every 2 seconds

### Parameter Format:

**Frontend (URL):**
```
/?view=buyer&glid=1
/rfq/{rfq_id}?view=buyer&glid=1
```

**Backend (API):**
```
GET /api/buyer/{glid}/rfqs
GET /api/seller/{glid}/dashboard
```

### Documentation Status:

- ✅ API endpoints documented
- ✅ Integration flow documented
- ⚠️ Authentication model needs clarification
- ❌ URL parameter format not documented
- ❌ Production migration guide missing

---

## 📝 Recommendations

### Immediate Actions:

1. **Add Authentication Section** to User Guide
2. **Document URL Parameter Format** in all guides
3. **Add Security Warning** about demo mode
4. **Create Production Migration Guide**

### For Production Deployment:

1. **Implement OAuth2/JWT authentication**
2. **Add user database** with GLID mapping
3. **Implement access control** middleware
4. **Add session management**
5. **Audit trail** for all actions
6. **Rate limiting** per user/GLID
7. **HTTPS enforcement**
8. **CORS configuration** for specific domains

---

## 📞 Questions Answered:

✅ **How are buyer/seller details added?**
- Currently: Pre-seeded in database on startup
- Production: Would need admin panel or API to register new GLIDs

✅ **How do they see their threads/RFQs?**
- Frontend sends GLID to backend via API path parameter
- Backend filters MongoDB queries by `buyer_glid` or `seller_glid`

✅ **Do we need to pass from frontend?**
- Yes, GLID must be in API path: `/api/buyer/{glid}/rfqs`
- Frontend gets GLID from URL params or user selection

✅ **Which format?**
- **Frontend**: `?view=buyer&glid=1` (URL query params)
- **Backend**: `/api/buyer/1/rfqs` (path parameter)

✅ **Does documentation cover everything?**
- ⚠️ Partially - API endpoints yes, authentication model no
- This document fills the gaps

---

*Created: March 8, 2026*
*For: GLID Procurement OS Enhancement Project*
