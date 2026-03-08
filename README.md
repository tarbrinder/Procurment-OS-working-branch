# GLID Procurement OS 🚀

> A comprehensive procurement lifecycle management platform for RFQ (Request for Quotation) processes between buyers and sellers.

[![React](https://img.shields.io/badge/React-19.0.0-blue.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-green.svg)](https://fastapi.tiangolo.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4.4+-green.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [Documentation](#-documentation)
- [Tech Stack](#-tech-stack)
- [Screenshots](#-screenshots)
- [Development](#-development)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [Support](#-support)

## ✨ Features

### Core Functionality
- 🏢 **Dual Role System**: Separate buyer and seller dashboards
- 📊 **Dashboard Analytics**: Real-time KPIs and stage distribution charts
- 💼 **RFQ Management**: Complete lifecycle from creation to closure
- 💬 **Real-time Messaging**: Thread-based communication with 2s polling
- 📹 **Video Calls**: Daily.co integration with KYC verification
- 📄 **Document Management**: File upload/download (PDF, images, CAD files up to 10MB)

### Post-Deal Procurement Lifecycle
- 📑 **Proforma Invoices**: Send, accept, reject with revision history
- 💳 **Payment Tracking**: Record payments with progress bars and confirmations
- 📦 **Shipment Management**: LR numbers, tracking, e-way bills
- ✅ **Delivery Confirmation**: Quality checks and photo uploads
- 🚨 **Complaint System**: Raise, respond, resolve, escalate with stage blocking
- ⭐ **Reviews & Trust Scores**: 5-star ratings with seller responses

### Advanced Features
- 🔔 **Notification System**: Activity feed with unread badges
- 🎯 **Inline Actions**: Quick actions from messaging panel
- 📈 **Probability Scoring**: Deal likelihood indicators
- 🔄 **Auto Stage Progression**: Smart stage transitions based on actions
- 🔗 **Integration API**: JWT-based API for external system integration
- 🪝 **Webhook Support**: Real-time event notifications

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+ & Yarn
- MongoDB 4.4+

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd procurement-os

# Backend setup
cd backend
pip install -r requirements.txt

# Frontend setup
cd ../frontend
yarn install

# Start services
sudo supervisorctl restart all
```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **API Documentation**: http://localhost:8001/docs

### Quick Demo

1. Open http://localhost:3000
2. Click "Enter as Buyer"
3. Select GLID "1" (Tata Industries)
4. Click "Proceed to Dashboard"
5. Explore pre-seeded RFQs and features

## 🏗️ Architecture

```
┌─────────────────┐
│  React Frontend │ (Port 3000)
│  + Tailwind CSS │
└────────┬────────┘
         │ REST API
         ↓
┌─────────────────┐
│  FastAPI        │ (Port 8001)
│  Backend        │
└────────┬────────┘
         │ Motor
         ↓
┌─────────────────┐
│  MongoDB        │ (Port 27017)
│  Database       │
└─────────────────┘
```

### Key Components

**Frontend:**
- React 19 with React Router
- Shadcn UI component library
- Axios for API communication
- Daily.co for video calls

**Backend:**
- FastAPI with async support
- Motor (async MongoDB driver)
- Pydantic for validation
- JWT for integration auth

**Database:**
- MongoDB with 14 collections
- Seeded with sample data
- Indexed for performance

## 📚 Documentation

Comprehensive documentation is available:

- **[User Guide](docs/USER_GUIDE.md)**: Complete end-user documentation
- **[API Documentation](docs/API_DOCUMENTATION.md)**: Full API reference with examples
- **[Developer Guide](docs/DEVELOPER_GUIDE.md)**: Architecture, patterns, and development guide

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.0.0 | UI Framework |
| React Router | 7.5.1 | Routing |
| Tailwind CSS | 3.4.17 | Styling |
| Shadcn UI | Latest | Component Library |
| Axios | 1.8.4 | HTTP Client |
| Daily.co | 0.87.0 | Video Calls |
| Recharts | 3.6.0 | Charts |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| FastAPI | Latest | Web Framework |
| Uvicorn | Latest | ASGI Server |
| Motor | Latest | MongoDB Driver |
| Pydantic | Latest | Data Validation |
| httpx | Latest | HTTP Client |

### Database
| Technology | Version | Purpose |
|------------|---------|---------|
| MongoDB | 4.4+ | Document Database |

## 📸 Screenshots

### Landing Page
![Landing Page](docs/images/landing.png)

### Buyer Dashboard
![Buyer Dashboard](docs/images/buyer-dashboard.png)

### RFQ Workspace
![RFQ Workspace](docs/images/rfq-workspace.png)

### Video Call
![Video Call](docs/images/video-call.png)

*Note: Add screenshots to `docs/images/` directory*

## 💻 Development

### Project Structure

```
/app/
├── backend/              # FastAPI backend
│   ├── server.py        # Main application
│   ├── requirements.txt # Dependencies
│   └── tests/           # Backend tests
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── lib/         # Utilities & API
│   │   └── hooks/       # Custom hooks
│   └── package.json
├── docs/                # Documentation
└── test_reports/        # Test results
```

### Environment Variables

**Backend (.env)**
```bash
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
CORS_ORIGINS="*"
DAILY_API_KEY="your-daily-co-key"
```

**Frontend (.env)**
```bash
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=443
```

### Running Development Servers

```bash
# Backend
cd backend
uvicorn server:app --reload --host 0.0.0.0 --port 8001

# Frontend
cd frontend
yarn start
```

### Code Style

- **Python**: PEP 8, type hints, async/await
- **JavaScript**: ESLint, functional components, hooks
- **Commits**: Conventional commits (feat, fix, docs, etc.)

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest tests/ -v
```

### Frontend Tests

```bash
cd frontend
yarn test
```

### Manual API Testing

```bash
# Get all GLIDs
curl http://localhost:8001/api/glids

# Get buyer dashboard
curl http://localhost:8001/api/buyer/1/dashboard

# Create RFQ
curl -X POST http://localhost:8001/api/rfqs \
  -H "Content-Type: application/json" \
  -d '{"buyer_glid":"1","seller_glid":"1.1","product":"Test","quantity":100,"budget":10000}'
```

## 🚢 Deployment

### Production Build

```bash
# Frontend build
cd frontend
yarn build

# Serve with nginx or any static server
```

### Docker Deployment

```bash
# Build and run with docker-compose
docker-compose up -d
```

See [Developer Guide](docs/DEVELOPER_GUIDE.md) for detailed deployment instructions.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Contribution Guidelines

- Follow the code style
- Write tests for new features
- Update documentation
- Use conventional commit messages

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check [User Guide](docs/USER_GUIDE.md) and [API Docs](docs/API_DOCUMENTATION.md)
- **Issues**: Create an issue in the repository
- **Questions**: Open a discussion in the repository

## 🗺️ Roadmap

- [ ] Third-party logistics API integration
- [ ] WhatsApp/SMS notifications
- [ ] Mobile app (React Native)
- [ ] Advanced analytics and reporting
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Bulk RFQ operations

## 📊 Project Status

**Current Version**: 4.0 (March 2026)

**Status**: ✅ Production Ready

**Recent Updates:**
- Inline action bar for quick actions
- Fixed messaging window
- Scrollable navigation panels
- Dashboard notification improvements
- Enhanced fulfillment tracking
- Error boundaries and loading states
- Comprehensive documentation

## 🙏 Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) for the amazing Python framework
- [React](https://react.dev/) for the UI library
- [Shadcn UI](https://ui.shadcn.com/) for beautiful components
- [Daily.co](https://www.daily.co/) for video infrastructure
- [Tailwind CSS](https://tailwindcss.com/) for styling

## 📞 Contact

For inquiries or support, please open an issue in the repository.

---

**Built with ❤️ for streamlined procurement management**
