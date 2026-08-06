<div align="center">

# 🏦 Ledger — AI Insurance Claims Underwriting Platform

**A production-grade, full-stack AI underwriting system for intelligent insurance claims processing, fraud detection, and IRDAI-compliant reporting.**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Gemini AI](https://img.shields.io/badge/Gemini-1.5_Flash-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)
[![AWS](https://img.shields.io/badge/AWS-S3_%C2%B7_Textract_%C2%B7_FraudDetector-FF9900?style=flat-square&logo=amazonaws&logoColor=white)](https://aws.amazon.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

</div>

---

## 📌 What is Ledger?

**Ledger** is a full-stack AI underwriting platform built to automate and augment the insurance claims workflow. It combines **rule-based deterministic engines**, **Google Gemini AI**, and **AWS services** to help underwriters make faster, more accurate, and fully auditable decisions on health, motor, life, travel, and property claims.

> Built to reflect real-world insurance operations in India, Ledger implements IRDAI-standard waiting period checks, co-pay calculations, tariff analysis, and regulatory audit report generation — all in one platform.

---

## ✨ Key Features

### 🤖 AI-Powered Claim Analysis
- **Google Gemini 1.5 Flash** generates structured claim summaries with policy clause citations
- Deterministic fallback engine for zero-dependency offline operation
- AI recommendations: `Approve`, `Reject`, `Review`, `Escalate`
- Confidence scoring and reasoning transparency

### 🛡️ Multi-Layer Risk & Fraud Detection
- **Rule-based Risk Scoring Engine** — flags waiting period violations, unusually high claims, document deficiencies
- **AWS Fraud Detector integration** — ML fraud probability score blended (60/40 weighted average) with rule score
- Pre-Existing Disease (PED) detection with IRDAI waiting period classification (30-day / 2-year / 4-year)
- Hospital network classification (Empanelled vs. Non-Empanelled)

### 📄 IRDAI-Compliant Reporting
- Auto-generated, self-contained HTML audit reports suitable for regulatory submission
- Print-to-PDF ready, downloadable settlement letters
- Full audit trail with timestamps and decision history

### ⚙️ Policy Intelligence Engines

| Engine | Description |
|--------|-------------|
| `pedEngine` | Pre-Existing Disease & IRDAI waiting period analysis |
| `riskEngine` | Deterministic risk scoring (0-100) with band classification |
| `subLimitEngine` | Room rent, ICU, and procedure sub-limit calculations |
| `coPayEngine` | Co-pay percentage deduction calculations |
| `accumulatorEngine` | Policy-year claim accumulation tracking |
| `tariffEngine` | GIPSA tariff schedule compliance analysis |
| `universalPolicyEngine` | Multi-policy type (Health/Motor/Life/Travel/Property) evaluation |

### 🔴 Real-Time Event System
- Server-Sent Events (SSE) for live claim notifications
- Instant dashboard updates when claims are submitted, approved, or escalated
- Role-aware notifications (Underwriter / Senior Underwriter / Admin / Claimant)

### 🔐 Enterprise-Grade Security
- JWT authentication with token blacklisting
- Role-Based Access Control (RBAC): `claimant` → `underwriter` → `senior_underwriter` → `admin`
- Helmet.js security headers, CORS allowlist, express-rate-limit
- bcrypt password hashing, input validation via express-validator
- Request IP audit logging on all protected routes

### ☁️ AWS Service Layer

| AWS Service | Purpose |
|-------------|---------|
| Amazon S3 + KMS | Encrypted document storage |
| AWS Textract | OCR and field extraction from claim documents |
| AWS Fraud Detector | ML-powered fraud probability scoring |
| AWS SNS | Email notifications for claim status changes |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        LEDGER PLATFORM                          │
├────────────────────┬────────────────────┬───────────────────────┤
│     Frontend       │    Backend API      │   External Services   │
│                    │                    │                       │
│  React 18 + Vite   │  Node.js / Express │  Google Gemini AI     │
│  Tailwind CSS      │  Python / FastAPI  │  AWS S3 + KMS         │
│  Recharts          │  JWT + RBAC        │  AWS Textract (OCR)   │
│  SSE Client        │  SSE Server        │  AWS Fraud Detector   │
│  react-hot-toast   │  Rate Limiting     │  MS SQL Server        │
└────────────────────┴────────────────────┴───────────────────────┘
                              │
                   ┌──────────────────┐
                   │  Database Layer  │
                   │  MS SQL Server   │
                   │  (SQLite: dev)   │
                   └──────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Tailwind CSS, Recharts, Lucide Icons |
| **Backend (JS)** | Node.js, Express 4, JWT, Helmet, Multer |
| **Backend (Python)** | FastAPI, Pydantic, Uvicorn, PySpark |
| **AI** | Google Gemini 1.5 Flash, OpenRouter (fallback) |
| **Database** | Microsoft SQL Server / SQLite (dev mode) |
| **Cloud** | AWS S3, Textract, Fraud Detector, SNS, KMS |
| **Auth** | JWT + bcrypt, RBAC, token blacklist |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- MS SQL Server (or use built-in SQLite mode)
- Google Gemini API key (optional — runs with deterministic fallback)

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/underwriter-ai.git
cd underwriter-ai
```

### 2. Configure environment variables

```bash
cd backend
cp .env.example .env
# Edit .env with your credentials
```

Key variables in `.env`:

```env
JWT_SECRET=your_strong_jwt_secret_here
GEMINI_API_KEY=              # Optional — uses deterministic engine if blank
AWS_ACCESS_KEY_ID=           # Optional — uses mock layer if blank
USE_MSSQL=false              # Set to true for SQL Server
```

### 3. Install & run the backend

```bash
# Node.js backend
cd backend
npm install
npm run dev       # Runs on http://localhost:5000

# Python backend (alternative)
cd backend/python
pip install -r requirements.txt
python run_server.py   # Runs on http://localhost:5000
```

### 4. Install & run the frontend

```bash
cd frontend
npm install
npm run dev       # Runs on http://localhost:5173
```

### 5. Seed the database (optional)

```bash
cd backend
npm run seed
```

> Use the included SQL schema at `backend/schema.sql` to set up your MS SQL Server database.

---

## 👥 User Roles

| Role | Access |
|------|--------|
| `claimant` | Submit claims, track own claim status |
| `underwriter` | View claims, AI analysis, approve/reject/escalate |
| `senior_underwriter` | Everything above + receive escalations, override decisions |
| `admin` | Full system access — user management, all claims, reports |

---

## 📊 Sample Dataset

The repository includes a synthetic dataset of **50 insurance policies** in `underwriter_50_people_dataset/` for demo and testing purposes. Each record contains realistic:
- Policy details (Health, Motor, Life, Travel, Property)
- Claimant demographics
- Pre-existing conditions
- Claim history patterns

---

## 🔌 API Reference

The backend exposes a RESTful API on port `5000`. Key endpoint groups:

| Group | Endpoints |
|-------|-----------|
| **Auth** | `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/logout` |
| **Claims** | `GET /api/claims`, `POST /api/claims`, `PATCH /api/claims/:id/status` |
| **AI Analysis** | `POST /api/claims/:id/ai-analyze` |
| **Documents** | `POST /api/claims/:id/documents`, `GET /api/claims/:id/documents` |
| **Reports** | `GET /api/claims/:id/irdai-report`, `GET /api/claims/:id/settlement-letter` |
| **Analytics** | `GET /api/analytics/summary` |
| **Admin** | `GET /api/admin/users`, `POST /api/admin/users` |
| **Real-time** | `GET /api/events` (SSE) |

---

## 🏛️ Compliance & Standards

- **IRDAI Circular No. IRDA/HLT/REG/CIR/194/09/2020** — Waiting period classification
- **GIPSA Tariff Schedule** — Tariff compliance analysis for empanelled hospitals
- **IS/ISO 27001** — Data handling and audit trail practices
- **India Data Protection** — PII handling with encryption at rest (KMS)

---

## 📁 Project Structure

```
underwriter-ai/
├── backend/
│   ├── src/
│   │   ├── server.js              # Main Express server (RBAC, JWT, SSE)
│   │   ├── gemini.js              # Google Gemini AI integration
│   │   ├── riskEngine.js          # Deterministic risk scoring
│   │   ├── pedEngine.js           # PED & waiting period detection
│   │   ├── subLimitEngine.js      # Sub-limit calculations
│   │   ├── coPayEngine.js         # Co-pay engine
│   │   ├── tariffEngine.js        # GIPSA tariff analysis
│   │   ├── accumulatorEngine.js   # Claim accumulation tracking
│   │   ├── universalPolicyEngine.js # Multi-policy type evaluation
│   │   ├── irdaiReportGenerator.js  # IRDAI HTML audit report
│   │   ├── settlementLetterGenerator.js # Settlement letter generation
│   │   ├── awsServices.js         # AWS S3/Textract/Fraud Detector layer
│   │   ├── hospitalNetwork.js     # Hospital empanelment classification
│   │   ├── auth.js                # JWT + bcrypt auth utilities
│   │   ├── middleware.js          # RBAC, audit logger, error handler
│   │   ├── db.js                  # Database abstraction layer
│   │   └── sse.js                 # Server-Sent Events manager
│   ├── python/                    # FastAPI alternative backend
│   │   ├── main.py
│   │   ├── risk_engine.py
│   │   ├── aws_services.py
│   │   └── auth.py
│   ├── schema.sql                 # MS SQL Server schema
│   └── .env.example               # Environment template
├── frontend/
│   └── src/
│       ├── views/                 # Page-level components
│       │   ├── LoginView.jsx
│       │   ├── ClaimSubmissionView.jsx
│       │   ├── UnderwriterLedgerView.jsx
│       │   ├── CaseDetailView.jsx
│       │   ├── AnalyticsView.jsx
│       │   └── AdminView.jsx
│       ├── components/            # Shared UI components
│       └── hooks/                 # Custom React hooks (useSSE)
├── sample_upload_files/           # Demo claim documents
├── underwriter_50_people_dataset/ # Synthetic demo dataset
└── README.md
```

---

## 🤝 Contributing

Contributions, issues and feature requests are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 👤 Author

**Narayanan** — AI Engineer

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=flat-square&logo=linkedin&logoColor=white)](https://linkedin.com/in/YOUR_LINKEDIN)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/YOUR_USERNAME)

---

<div align="center">

**If this project helped you, please give it a ⭐ — it helps others find it!**

*Built with ❤️ for the Indian insurance industry*

</div>
