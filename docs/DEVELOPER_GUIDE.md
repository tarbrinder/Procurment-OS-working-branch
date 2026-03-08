# GLID Procurement OS - Developer Guide

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Client Browser                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │         React Frontend (Port 3000)              │   │
│  │  - React 19 + React Router                      │   │
│  │  - Tailwind CSS + Shadcn UI                     │   │
│  │  - Axios for API calls                          │   │
│  │  - Daily.co for video                           │   │
│  └─────────────────┬───────────────────────────────┘   │
└────────────────────┼───────────────────────────────────┘
                     │ HTTP/REST
                     ↓
┌─────────────────────────────────────────────────────────┐
│              FastAPI Backend (Port 8001)                │
│  ┌─────────────────────────────────────────────────┐   │
│  │  - FastAPI + Uvicorn                            │   │
│  │  - Pydantic models                              │   │
│  │  - JWT integration tokens                       │   │
│  │  - Daily.co API integration                     │   │
│  └─────────────────┬───────────────────────────────┘   │
└────────────────────┼───────────────────────────────────┘
                     │ Motor (Async)
                     ↓
┌─────────────────────────────────────────────────────────┐
│              MongoDB Database (Port 27017)              │
│  Collections:                                           │
│  - glid_network, rfqs, messages, activity_logs          │
│  - video_rooms, video_calls, proforma_invoices          │
│  - payments, shipments, delivery_records                │
│  - complaints, reviews, files, partners, webhooks       │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack

#### Frontend
- **Framework**: React 19.0.0
- **Routing**: React Router DOM 7.5.1
- **Styling**: Tailwind CSS 3.4.17
- **UI Components**: Radix UI + Shadcn
- **HTTP Client**: Axios 1.8.4
- **Video**: Daily.co JavaScript SDK 0.87.0
- **Forms**: React Hook Form 7.56.2
- **Charts**: Recharts 3.6.0
- **Build Tool**: Create React App + CRACO 7.1.0

#### Backend
- **Framework**: FastAPI
- **Server**: Uvicorn
- **Database Driver**: Motor (Async MongoDB)
- **Validation**: Pydantic
- **JWT**: PyJWT
- **HTTP Client**: httpx
- **File Storage**: Base64 encoding

#### Database
- **MongoDB**: Document database
- **Driver**: Motor (async)
- **Connection**: Local (mongodb://localhost:27017)

#### Deployment
- **Process Manager**: Supervisor
- **Backend**: Uvicorn with hot reload
- **Frontend**: React dev server (yarn start)
- **Ports**: 8001 (backend), 3000 (frontend)

---

## Project Structure

```
/app/
├── backend/
│   ├── server.py              # Main FastAPI application
│   ├── requirements.txt       # Python dependencies
│   ├── .env                   # Environment variables
│   └── tests/                 # Backend tests
│       ├── test_iteration4_features.py
│       ├── test_new_features_iter3.py
│       └── test_procurement_lifecycle.py
│
├── frontend/
│   ├── public/
│   │   └── index.html         # HTML entry point
│   ├── src/
│   │   ├── App.js             # Main React component
│   │   ├── App.css            # Global styles
│   │   ├── index.js           # React entry point
│   │   ├── index.css          # Base styles
│   │   ├── components/        # Reusable components
│   │   │   ├── ui/            # Shadcn UI components
│   │   │   ├── ErrorBoundary.js
│   │   │   ├── Loading.js
│   │   │   ├── MessageThread.js
│   │   │   ├── VideoCallPanel.js
│   │   │   ├── PostDealTabs.js
│   │   │   └── ... (other components)
│   │   ├── pages/             # Page components
│   │   │   ├── LandingPage.js
│   │   │   ├── BuyerDashboard.js
│   │   │   ├── SellerDashboard.js
│   │   │   ├── RFQWorkspace.js
│   │   │   ├── IntegrationConsole.js
│   │   │   └── EmbedPage.js
│   │   ├── lib/               # Utilities
│   │   │   ├── api.js         # API client
│   │   │   ├── constants.js   # Constants
│   │   │   └── utils.js       # Helper functions
│   │   └── hooks/             # Custom hooks
│   │       └── use-toast.js
│   ├── package.json           # Node dependencies
│   ├── tailwind.config.js     # Tailwind configuration
│   ├── postcss.config.js      # PostCSS configuration
│   ├── craco.config.js        # CRACO configuration
│   ├── components.json        # Shadcn configuration
│   └── .env                   # Frontend environment
│
├── docs/                      # Documentation
│   ├── API_DOCUMENTATION.md
│   ├── USER_GUIDE.md
│   └── DEVELOPER_GUIDE.md     # This file
│
├── memory/
│   └── PRD.md                 # Product Requirements
│
├── test_reports/              # Test results
│   ├── iteration_1.json
│   ├── iteration_2.json
│   ├── iteration_4.json
│   └── pytest/
│
├── tests/                     # Root tests
│   └── __init__.py
│
├── README.md                  # Project README
└── backend_test.py            # Backend test script
```

---

## Development Setup

### Prerequisites

- Python 3.8+
- Node.js 16+ & Yarn
- MongoDB 4.4+
- Git

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd procurement-os

# Backend setup
cd backend
pip install -r requirements.txt

# Frontend setup
cd ../frontend
yarn install

# Start MongoDB (if not running)
sudo systemctl start mongodb

# Start all services
sudo supervisorctl restart all
```

### Environment Variables

#### Backend (.env)
```bash
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
CORS_ORIGINS="*"
DAILY_API_KEY="your-daily-co-api-key"  # For video calls
INTEGRATION_SECRET="auto-generated"     # For JWT tokens
```

#### Frontend (.env)
```bash
REACT_APP_BACKEND_URL=https://your-app.preview.emergentagent.com
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
```

### Running Locally

```bash
# Backend (http://localhost:8001)
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Frontend (http://localhost:3000)
cd frontend
yarn start

# Or use supervisor
sudo supervisorctl status
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
```

### Accessing the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **API Docs**: http://localhost:8001/docs (FastAPI Swagger)
- **MongoDB**: mongodb://localhost:27017

---

## Code Architecture

### Backend Architecture

#### FastAPI Application Structure

```python
app = FastAPI()
api_router = APIRouter(prefix="/api")

# MongoDB Connection
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Collections
db.glid_network
db.rfqs
db.messages
db.activity_logs
# ... (14 total collections)
```

#### Key Backend Patterns

**1. Pydantic Models for Validation**
```python
class CreateRFQRequest(BaseModel):
    buyer_glid: str
    seller_glid: str
    product: str
    quantity: int
    budget: float
    description: str = ""
    priority: str = "medium"
```

**2. Async MongoDB Operations**
```python
@api_router.post("/rfqs")
async def create_rfq(req: CreateRFQRequest):
    rfq = {
        "rfq_id": str(uuid.uuid4()),
        "stage": "RFQ_SENT",
        # ...
    }
    await db.rfqs.insert_one(rfq)
    return rfq
```

**3. Stage Management**
```python
PROBABILITY_MAP = {
    "RFQ_SENT": 40,
    "SELLER_VERIFIED": 50,
    # ...
}

# Auto stage progression
async def check_auto_stage(rfq_id: str):
    # Logic to progress stages based on events
```

**4. Error Handling**
```python
if not rfq:
    raise HTTPException(
        status_code=404, 
        detail="RFQ not found"
    )
```

#### Database Seeding

On startup, the backend seeds the database with:
- 12 GLID nodes (3 buyers, 9 sellers)
- 9 sample RFQs at various stages
- Sample messages and activity logs

```python
@app.on_event("startup")
async def seed_database():
    count = await db.glid_network.count_documents({})
    if count == 0:
        # Seed data...
```

### Frontend Architecture

#### React Context Pattern

```javascript
const AppContext = createContext(null);

function AppProvider({ children }) {
  const [view, setView] = useState(null);
  const [glid, setGlid] = useState(null);
  const [glidInfo, setGlidInfo] = useState(null);
  
  return (
    <AppContext.Provider value={{ view, glid, glidInfo, ... }}>
      {children}
    </AppContext.Provider>
  );
}
```

#### Component Patterns

**1. Page Components** (pages/)
- Full-page layouts
- Route-level components
- Fetch and manage data

**2. Feature Components** (components/)
- Reusable business logic
- MessageThread, VideoCallPanel, etc.

**3. UI Components** (components/ui/)
- Pure presentational components
- Shadcn UI library
- Highly reusable

#### API Client Pattern

```javascript
// lib/api.js
const api = axios.create({ 
  baseURL: `${BACKEND_URL}/api` 
});

export const fetchRfq = (rfqId) => 
  api.get(`/rfqs/${rfqId}`);

export const createRfq = (data) => 
  api.post("/rfqs", data);
```

#### State Management

- **Global State**: React Context (AppContext)
- **Component State**: useState hooks
- **Side Effects**: useEffect hooks
- **Memoization**: useCallback, useMemo

#### Real-time Updates

```javascript
useEffect(() => {
  const interval = setInterval(() => {
    // Poll for updates every 2 seconds
    fetchMessages(rfqId);
  }, 2000);
  
  return () => clearInterval(interval);
}, [rfqId]);
```

---

## API Design Patterns

### RESTful Endpoints

**Resource-Based URLs**
```
GET    /api/rfqs              # List all
GET    /api/rfqs/{id}         # Get one
POST   /api/rfqs              # Create
POST   /api/rfqs/{id}/actions # Perform action
```

**View-Specific Endpoints**
```
GET /api/buyer/{glid}/rfqs
GET /api/seller/{glid}/rfqs
GET /api/buyer/{glid}/dashboard
GET /api/seller/{glid}/dashboard
```

**Nested Resources**
```
GET  /api/rfqs/{id}/messages
POST /api/rfqs/{id}/messages
GET  /api/rfqs/{id}/activity
POST /api/rfqs/{id}/proforma
```

### Response Format

**Success Response**
```json
{
  "data": { ... },
  "status": "success"
}
```

**Error Response**
```json
{
  "detail": "Error message"
}
```

### Integration API

JWT-based authentication for embedded integration:

```python
def generate_token(external_id, role, name, partner_id):
    payload = {
        "external_id": external_id,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    return jwt.encode(payload, SECRET, algorithm="HS256")
```

---

## Database Schema

### Key Collections

#### glid_network
```javascript
{
  glid: "1",
  type: "buyer",
  name: "Tata Industries",
  connections: ["1.1", "1.2"]
}
```

#### rfqs
```javascript
{
  rfq_id: "uuid",
  buyer_glid: "1",
  seller_glid: "1.1",
  product: "Steel Pipes",
  quantity: 5000,
  budget: 250000,
  description: "...",
  stage: "NEGOTIATION",
  probability_score: 75,
  priority: "high",
  created_at: "ISO timestamp",
  last_updated: "ISO timestamp"
}
```

#### messages
```javascript
{
  message_id: "uuid",
  rfq_id: "uuid",
  sender_glid: "1",
  sender_type: "buyer",
  content: "Message text",
  message_type: "text",
  metadata: {},
  created_at: "ISO timestamp"
}
```

#### proforma_invoices
```javascript
{
  invoice_id: "uuid",
  rfq_id: "uuid",
  amount: 240000,
  tax_amount: 43200,
  total_amount: 283200,
  payment_terms: "...",
  line_items: [...],
  notes: "...",
  file_ids: [],
  status: "sent",
  revision: 1,
  revision_history: [],
  created_at: "ISO timestamp"
}
```

### Indexes

Recommended indexes for performance:

```javascript
// RFQs
db.rfqs.createIndex({ buyer_glid: 1, last_updated: -1 });
db.rfqs.createIndex({ seller_glid: 1, last_updated: -1 });
db.rfqs.createIndex({ stage: 1 });

// Messages
db.messages.createIndex({ rfq_id: 1, created_at: 1 });

// Activity Logs
db.activity_logs.createIndex({ rfq_id: 1, created_at: -1 });
```

---

## Testing

### Backend Tests

```bash
cd backend
pytest tests/ -v
```

**Test Files:**
- `test_procurement_lifecycle.py` - Full lifecycle tests
- `test_iteration4_features.py` - Feature-specific tests
- `test_new_features_iter3.py` - Recent additions

**Test Example:**
```python
def test_create_rfq():
    response = client.post("/api/rfqs", json={
        "buyer_glid": "1",
        "seller_glid": "1.1",
        "product": "Test Product",
        "quantity": 100,
        "budget": 10000
    })
    assert response.status_code == 200
    assert response.json()["stage"] == "RFQ_SENT"
```

### Frontend Tests

```bash
cd frontend
yarn test
```

**Testing Components:**
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import LandingPage from './LandingPage';

test('renders buyer button', () => {
  render(<LandingPage />);
  const button = screen.getByTestId('enter-buyer-btn');
  expect(button).toBeInTheDocument();
});
```

### Manual Testing

Use `curl` for API testing:

```bash
# Get all GLIDs
curl http://localhost:8001/api/glids

# Get buyer dashboard
curl http://localhost:8001/api/buyer/1/dashboard

# Create RFQ
curl -X POST http://localhost:8001/api/rfqs \
  -H "Content-Type: application/json" \
  -d '{"buyer_glid":"1","seller_glid":"1.1",...}'
```

---

## Adding New Features

### Backend Feature

1. **Define Pydantic Model**
```python
class NewFeatureRequest(BaseModel):
    field1: str
    field2: int
```

2. **Create Endpoint**
```python
@api_router.post("/new-feature")
async def new_feature(req: NewFeatureRequest):
    # Implementation
    return {"status": "success"}
```

3. **Add Database Operations**
```python
await db.collection_name.insert_one(document)
```

4. **Update Documentation**

### Frontend Feature

1. **Create Component**
```javascript
// components/NewFeature.js
export default function NewFeature() {
  return <div>...</div>;
}
```

2. **Add API Function**
```javascript
// lib/api.js
export const newFeatureApi = (data) => 
  api.post("/new-feature", data);
```

3. **Integrate in Page**
```javascript
import NewFeature from '@/components/NewFeature';
// Use in render
```

4. **Add Styling**
```css
/* App.css or inline Tailwind */
```

---

## Performance Optimization

### Backend

**1. Database Query Optimization**
```python
# Use projection to limit fields
await db.rfqs.find({}, {"_id": 0, "rfq_id": 1, "product": 1})

# Use indexes for sorting
await db.rfqs.find({}).sort("last_updated", -1)
```

**2. Async Operations**
```python
# Run parallel queries
results = await asyncio.gather(
    db.rfqs.find({}).to_list(100),
    db.messages.find({}).to_list(100)
)
```

**3. Connection Pooling**
Motor handles connection pooling automatically.

### Frontend

**1. Code Splitting**
```javascript
const LazyComponent = lazy(() => import('./Component'));
```

**2. Memoization**
```javascript
const memoizedValue = useMemo(() => 
  expensiveComputation(data), 
  [data]
);

const MemoizedComponent = memo(Component);
```

**3. Debouncing**
```javascript
const debouncedSearch = useCallback(
  debounce((query) => fetchResults(query), 300),
  []
);
```

**4. Virtual Scrolling**
For long lists, consider react-window or react-virtualized.

---

## Security Considerations

### Backend Security

**1. Input Validation**
- Pydantic models validate all inputs
- Type checking enforced
- Custom validators for business logic

**2. CORS Configuration**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**3. JWT Authentication** (Integration API)
```python
INTEGRATION_SECRET = os.environ.get("INTEGRATION_SECRET")
payload = jwt.decode(token, INTEGRATION_SECRET)
```

**4. File Upload Limits**
```python
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
```

### Frontend Security

**1. Environment Variables**
- Never commit `.env` files
- Use `REACT_APP_` prefix for public variables

**2. XSS Protection**
- React escapes by default
- Avoid `dangerouslySetInnerHTML`

**3. API Error Handling**
```javascript
try {
  const response = await api.get('/endpoint');
} catch (error) {
  // Handle errors gracefully
  console.error(error);
}
```

---

## Deployment

### Production Checklist

**Backend:**
- [ ] Set `DB_NAME` to production database
- [ ] Configure `CORS_ORIGINS` to specific domains
- [ ] Set `DAILY_API_KEY` for video calls
- [ ] Use production MongoDB instance
- [ ] Enable MongoDB authentication
- [ ] Set up backup strategy
- [ ] Configure logging
- [ ] Set up monitoring (Sentry, etc.)

**Frontend:**
- [ ] Update `REACT_APP_BACKEND_URL`
- [ ] Build optimized production bundle (`yarn build`)
- [ ] Configure CDN for static assets
- [ ] Set up HTTPS
- [ ] Enable gzip compression
- [ ] Configure caching headers

**Infrastructure:**
- [ ] Set up reverse proxy (Nginx)
- [ ] Configure SSL certificates
- [ ] Set up database backups
- [ ] Configure monitoring
- [ ] Set up log aggregation
- [ ] Plan scaling strategy

### Docker Deployment

```dockerfile
# Backend Dockerfile
FROM python:3.9
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]

# Frontend Dockerfile
FROM node:16
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install
COPY . .
RUN yarn build
CMD ["yarn", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  mongodb:
    image: mongo:4.4
    ports:
      - "27017:27017"
  backend:
    build: ./backend
    ports:
      - "8001:8001"
    depends_on:
      - mongodb
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

---

## Troubleshooting

### Common Issues

**1. Backend Not Starting**
```bash
# Check logs
tail -f /var/log/supervisor/backend.err.log

# Check MongoDB
systemctl status mongodb

# Test Python imports
python -c "import fastapi; print('OK')"
```

**2. Frontend Build Errors**
```bash
# Clear cache
rm -rf node_modules yarn.lock
yarn install

# Check Node version
node --version  # Should be 16+
```

**3. Database Connection Issues**
```bash
# Test MongoDB connection
mongo --eval "db.adminCommand('ping')"

# Check environment variables
cat backend/.env
```

**4. CORS Errors**
- Verify `CORS_ORIGINS` in backend .env
- Check `REACT_APP_BACKEND_URL` in frontend .env
- Ensure backend is accessible from frontend

---

## Contributing

### Code Style

**Python (Backend)**
- Follow PEP 8
- Use type hints
- Document functions with docstrings

**JavaScript (Frontend)**
- Use ESLint configuration
- Follow React best practices
- Use functional components and hooks

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/new-feature
```

### Commit Messages

Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code restructuring
- `test:` Adding tests
- `chore:` Maintenance

---

## Resources

### Documentation
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev/)
- [MongoDB Docs](https://docs.mongodb.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Shadcn UI](https://ui.shadcn.com/)
- [Daily.co API](https://docs.daily.co/)

### Tools
- [Postman](https://www.postman.com/) - API testing
- [MongoDB Compass](https://www.mongodb.com/products/compass) - Database GUI
- [React DevTools](https://react.dev/learn/react-developer-tools) - Browser extension

---

## FAQ

**Q: How do I reset the database?**
```bash
mongo
use test_database
db.dropDatabase()
# Restart backend to re-seed
```

**Q: How do I add a new GLID?**
Add to `SEED_GLIDS` in `backend/server.py` and restart.

**Q: Can I use PostgreSQL instead of MongoDB?**
Yes, but requires rewriting database layer.

**Q: How do I enable video calls?**
Set `DAILY_API_KEY` in backend `.env` with your Daily.co API key.

---

## Changelog

See [test_reports/](../test_reports/) for iteration history.

---

## License

See LICENSE file in repository root.

---

## Support

For technical support:
- Create an issue in the repository
- Contact the development team
- Check documentation first

---

Happy Coding! 🚀
