<p align="center">
  <img src="newsdetection/public/apple-touch-icon.png" alt="TruthScan AI" width="80" />
</p>

<h1 align="center">TruthScan AI — Fake News Detection Engine</h1>

<p align="center">
  <strong>Multi-model AI pipeline for real-time misinformation detection</strong><br/>
  7-stage RAG-powered analysis chain · Multimodal OCR · Live news scanning
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Redis-Upstash-DC382D?logo=redis&logoColor=white" />
  <img src="https://img.shields.io/badge/HuggingFace-Inference-FFD21E?logo=huggingface&logoColor=black" />
  <img src="https://img.shields.io/badge/Qwen2.5--VL-Multimodal-7C3AED" />
  <img src="https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white" />
</p>

---

## Overview

TruthScan AI is a production-grade fake news detection platform that combines multiple AI models, retrieval-augmented generation (RAG), and multimodal image understanding to analyze text, URLs, and images for misinformation. The system runs a 7-stage analysis pipeline producing credibility scores, risk assessments, and evidence-based verdicts.

**Live Production:**
- Frontend: [truthscannai.netlify.app](https://truthscannai.netlify.app)
- Backend API: Hosted on Render

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Netlify)                           │
│  React 19 · Vite 8 · Tailwind CSS · Framer Motion                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Detector │  │   Scan   │  │ LiveNews │  │ Reports/Profile  │   │
│  │  Page    │  │ Content  │  │  Feed    │  │   Dashboard      │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘   │
│       │              │              │                  │             │
│  ┌────▼──────────────▼──────────────▼──────────────────▼─────────┐  │
│  │              AI ORCHESTRATOR (7-Stage Pipeline)                │  │
│  │  Input → RAG Retrieval → 2× Classifiers → Sentiment →        │  │
│  │  LLM Reasoning → Credibility Engine → Verdict                 │  │
│  └───────────────────────────────────────────────────────────────┘  │
│       │                                                             │
│  ┌────▼─────────────────────────────────────────────────────────┐   │
│  │  HuggingFace Inference API  ·  NVIDIA NIM (via Netlify Fn)   │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                    REST API + WebSocket
                              │
┌─────────────────────────────▼───────────────────────────────────────┐
│                         BACKEND (Render)                             │
│  Node.js · Express 5 · MongoDB · Redis · BullMQ · Socket.IO        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────────────┐  │
│  │    Auth    │  │  Payments  │  │   Image Analysis (Qwen-VL)   │  │
│  │  JWT/OTP  │  │  Razorpay  │  │  OCR + Context + Signals     │  │
│  └────────────┘  └────────────┘  └──────────────────────────────┘  │
│                                                                     │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────────────┐  │
│  │   Redis    │  │   BullMQ   │  │       Socket.IO (/ws)        │  │
│  │  Caching   │  │   Worker   │  │    Live scan updates         │  │
│  └────────────┘  └────────────┘  └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## AI Pipeline — 7 Stages

| Stage | Model / Engine | Purpose |
|-------|---------------|---------|
| 1. Input | Qwen2.5-VL / Tesseract.js | OCR extraction + URL content fetching |
| 2. RAG Retrieval | Custom knowledge base (8 domains) | Fact-check context grounding |
| 3. Classifier Ensemble | RoBERTa + BERT-tiny (HuggingFace) | FAKE/REAL binary classification |
| 4. Sentiment & Manipulation | Twitter-RoBERTa + 9 regex patterns | Emotional manipulation detection |
| 5. LLM Reasoning | Zephyr-7B → Mistral-7B → Llama-3.1-70B | Evidence-based analysis with RAG context |
| 6. Source Reliability | Pattern-based heuristics | Attribution, credibility markers |
| 7. Credibility Engine | Weighted aggregation (35/15/30/20) | Final score + risk level + verdict |

### Multimodal Image Analysis (Backend)

```
Image Upload → Qwen2.5-VL (primary) → GLM-4.5V (fallback) → Legacy Chain
                                                                    │
                                              ┌─────────────────────┤
                                              │  DeepSeek-VL        │
                                              │  Florence-2 / Donut │
                                              │  TrOCR              │
                                              │  BLIP Captioning    │
                                              └─────────────────────┘
```

- Extracts all visible text (multilingual OCR)
- Generates contextual image description
- Detects misinformation visual signals
- SHA-256 hash-based Redis caching (7-day TTL)
- BullMQ background processing for heavy images (>350KB)

---

## Features

### Detection & Analysis
- **Text Analysis** — Paste any article, claim, or social media post
- **URL Analysis** — Auto-fetches and extracts article content from URLs
- **Image/Screenshot Analysis** — Camera capture, file upload, or remote URL
- **Live News Feed** — Real-time articles from Event Registry API with one-click AI fact-checking
- **Pipeline Visualizer** — Real-time 7-stage progress animation during analysis

### User System
- **Email + OTP Verification** — Brevo transactional email
- **Google OAuth** — Firebase Authentication
- **Profile Management** — Avatar upload (Cloudinary), password change, account deletion
- **Scan History** — Full history with Redis-cached retrieval

### Monetization
- **Freemium Model** — 2 free scans, then paywall
- **Razorpay Integration** — ₹150/month premium (30-day subscription)
- **Auto-expiry** — Downgrades to free when subscription expires

### Reports & Education
- **PDF Intelligence Reports** — Downloadable analysis reports (jsPDF)
- **Awareness Section** — Educational content on misinformation
- **Detailed Breakdowns** — Layer-by-layer scoring transparency

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.2.5 | UI framework |
| Vite | 8.0.10 | Build tool + dev server |
| Tailwind CSS | 3.4.19 | Utility-first styling |
| Framer Motion | 12.38.0 | Animations + transitions |
| React Router | 7.15.0 | Client-side routing |
| Firebase | 12.13.0 | Google OAuth |
| @huggingface/inference | 4.13.15 | Client-side AI model calls |
| Tesseract.js | 7.0.0 | Client-side OCR fallback |
| socket.io-client | 4.8.3 | Real-time WebSocket updates |
| jsPDF | 4.2.1 | PDF report generation |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | ≥18 | Runtime |
| Express | 5.2.1 | HTTP framework |
| Mongoose | 9.6.2 | MongoDB ODM |
| Redis | 5.12.1 | Caching + rate limiting |
| BullMQ | 5.76.8 | Background job queue |
| ioredis | 5.10.1 | Redis client for BullMQ |
| Socket.IO | 4.8.3 | WebSocket server |
| Razorpay | 2.9.6 | Payment gateway |
| Cloudinary | 1.41.3 | Image CDN + uploads |
| Helmet | 8.1.0 | Security headers |
| express-rate-limit | 8.5.1 | API rate limiting |
| bcryptjs | 3.0.3 | Password hashing |
| jsonwebtoken | 9.0.3 | JWT authentication |
| multer | 2.1.1 | File upload handling |

### Infrastructure
| Service | Purpose |
|---------|---------|
| Netlify | Frontend hosting + serverless functions |
| Render | Backend hosting |
| MongoDB Atlas | Database |
| Upstash Redis | Caching + queues + rate limiting |
| Cloudinary | Profile image storage |
| Brevo | Transactional email (OTP, welcome, payment confirmation) |
| HuggingFace | AI model inference (classifiers, sentiment, VLMs) |
| NVIDIA NIM | Llama-3.1-70B reasoning (via Netlify proxy) |
| Event Registry | Live news article feed |

---

## Project Structure

```
TruthScanAI-FakeNewsDetector/
├── backend/
│   ├── config/
│   │   ├── db.js                    # MongoDB connection
│   │   ├── redis.js                 # Redis client
│   │   └── queue.js                 # BullMQ queue bootstrap
│   ├── controllers/
│   │   ├── authController.js        # Signup, login, OTP, profile, Google OAuth
│   │   ├── scanController.js        # Save scan results, get history
│   │   ├── paymentController.js     # Razorpay order + verification
│   │   └── imageScanController.js   # Qwen2.5-VL image analysis endpoints
│   ├── middleware/
│   │   ├── authMiddleware.js        # JWT cookie verification
│   │   ├── usageMiddleware.js       # Free/premium quota enforcement
│   │   └── errorMiddleware.js       # Global error handler
│   ├── models/
│   │   ├── User.js                  # User schema (auth, subscription, scans)
│   │   ├── ScanHistory.js           # Scan result records
│   │   └── Subscription.js          # Payment/subscription records
│   ├── routes/
│   │   ├── authRoutes.js            # /api/auth/*
│   │   ├── scanRoutes.js            # /api/scan/*
│   │   └── paymentRoutes.js         # /api/payment/*
│   ├── services/
│   │   ├── qwenVLService.js         # Qwen2.5-VL multimodal OCR (primary)
│   │   ├── deepseekOCRService.js    # Legacy OCR/captioning fallback chain
│   │   └── emailService.js          # Brevo transactional email
│   ├── workers/
│   │   ├── imageAnalysisWorker.js   # BullMQ processor for heavy images
│   │   └── socket.js                # Socket.IO bridge for live updates
│   ├── utils/
│   │   ├── asyncHandler.js          # Express async error wrapper
│   │   ├── generateToken.js         # JWT cookie generation
│   │   └── razorpay.js              # Razorpay instance
│   ├── app.js                       # Express app setup (CORS, helmet, routes)
│   ├── server.js                    # HTTP server + Socket.IO + worker boot
│   └── package.json
│
├── newsdetection/                   # Frontend (React + Vite)
│   ├── netlify/functions/
│   │   └── nvidia-proxy.js          # Serverless NVIDIA API proxy
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Home.jsx             # Landing page
│   │   │   ├── DetectorPage.jsx     # Main detector (/detect)
│   │   │   ├── ScanContent.jsx      # Camera/upload scanner (/scan)
│   │   │   ├── LiveNews.jsx         # Real-time news feed + AI fact-check
│   │   │   ├── Profile.jsx          # User dashboard
│   │   │   ├── Pricing.jsx          # Plans + Razorpay checkout
│   │   │   ├── Reports.jsx          # PDF report generation
│   │   │   ├── Login.jsx / Signup.jsx
│   │   │   ├── Navbar.jsx / Footer.jsx
│   │   │   └── ...                  # Hero, BentoGrid, Awareness, etc.
│   │   ├── services/
│   │   │   ├── orchestrator.js      # 7-stage pipeline coordinator
│   │   │   ├── classifier.js        # 2× HF fake news classifiers
│   │   │   ├── sentiment.js         # Sentiment + manipulation detection
│   │   │   ├── reasoning.js         # LLM reasoning (Zephyr → Mistral → Llama)
│   │   │   ├── credibilityEngine.js # Weighted score aggregation
│   │   │   ├── retriever.js         # RAG fact-check knowledge base
│   │   │   ├── ocr.js              # Qwen-VL primary + Tesseract fallback
│   │   │   ├── huggingface.js       # Pipeline entry point + HTML formatter
│   │   │   ├── api.js              # Centralized backend API client
│   │   │   └── liveSocket.js        # Socket.IO client for live updates
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # Global auth state + localStorage hydration
│   │   ├── utils/
│   │   │   └── cleanOCRText.js      # OCR text normalization
│   │   ├── App.jsx                  # Router + providers
│   │   └── main.jsx                 # Entry point
│   ├── netlify.toml                 # Netlify build + redirects config
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
└── README.md
```

---

## API Reference

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | — | Register with email (sends OTP) |
| POST | `/api/auth/verify-otp` | — | Verify email OTP → sets JWT cookie |
| POST | `/api/auth/login` | — | Login → sets JWT cookie |
| POST | `/api/auth/google` | — | Google OAuth login |
| POST | `/api/auth/logout` | — | Clear JWT cookie |
| GET | `/api/auth/me` | JWT | Get user profile (Redis cached) |
| PUT | `/api/auth/me` | JWT | Update profile (multipart for avatar) |
| POST | `/api/auth/request-delete-otp` | JWT | Request account deletion OTP |
| POST | `/api/auth/delete-account` | JWT | Confirm deletion with OTP |
| POST | `/api/auth/support` | JWT | Send support query email |

### Scan & Analysis
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/scan/text` | JWT + Quota | Save scan result to history |
| GET | `/api/scan/history` | JWT | Get user's scan history (cached) |
| POST | `/api/scan/image` | — | Multimodal OCR (Qwen2.5-VL) |
| POST | `/api/scan/image/url` | — | Analyze remote image URL |
| GET | `/api/scan/image/:jobId` | JWT | Poll background job status |

### Payments
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/payment/create-order` | JWT | Create Razorpay order (₹150) |
| POST | `/api/payment/verify-payment` | JWT | Verify + activate premium |

### WebSocket
| Event | Direction | Description |
|-------|-----------|-------------|
| `subscribe` | Client → Server | Join user room for updates |
| `image-analysis:update` | Server → Client | Background job completion |

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- MongoDB Atlas account
- Upstash Redis account
- HuggingFace API token
- Razorpay account (for payments)
- Cloudinary account (for image uploads)
- Brevo account (for transactional email)

### Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in all environment variables in .env
npm install
npm run dev
```

### Frontend Setup

```bash
cd newsdetection
cp .env.example .env
# Fill in VITE_API_URL, VITE_NVIDIA_API_KEY, VITE_HF_TOKEN
npm install
npm run dev
```

### Environment Variables

<details>
<summary><strong>Backend (.env)</strong></summary>

```env
PORT=5001
NODE_ENV=development
MONGO_URI=mongodb+srv://...
JWT_SECRET=<openssl rand -hex 32>
CLIENT_URL=http://localhost:5173
REDIS_URL=rediss://default:...@....upstash.io:6379
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
RAZORPAY_KEY_ID=rzp_...
RAZORPAY_KEY_SECRET=...
BREVO_API_KEY=xkeysib-...
BREVO_FROM_EMAIL=your@email.com
BREVO_FROM_NAME=TruthScanAI
HF_TOKEN=hf_...
IMAGE_WORKER_CONCURRENCY=2
```
</details>

<details>
<summary><strong>Frontend (.env)</strong></summary>

```env
VITE_API_URL=http://localhost:5001
VITE_NVIDIA_API_KEY=nvapi-...
VITE_HF_TOKEN=hf_...
```
</details>

---

## Deployment

### Frontend → Netlify
- Build command: `npm run build`
- Publish directory: `dist`
- Node version: 20
- Set environment variables in Netlify dashboard
- NVIDIA proxy function auto-deploys from `netlify/functions/`

### Backend → Render
- Build command: `npm install`
- Start command: `npm start`
- Node version: ≥18
- Set all backend environment variables
- Health check: `GET /` returns 200

---

## Security

- **JWT httpOnly cookies** with `SameSite=None; Secure` for cross-origin production
- **Helmet** security headers
- **Redis-backed rate limiting** — 100 req/15min global, 10 req/15min for auth
- **bcrypt** password hashing (10 rounds)
- **OTP verification** for signup and account deletion
- **CORS whitelist** — only allowed origins can make credentialed requests
- **Multer file filtering** — only image MIME types accepted
- **Input validation** on all endpoints

---

## Performance

- **Redis caching** — User profiles (1h), scan history (1h), image analysis (7d)
- **BullMQ background processing** — Heavy images processed async with WebSocket delivery
- **Parallel model execution** — Classifier + Sentiment run concurrently
- **Cascading model fallback** — Never blocks on a single model failure
- **SHA-256 deduplication** — Identical images served from cache instantly
- **Rate limiting** — Prevents abuse without impacting legitimate users

---

## License

ISC

---

<p align="center">
  Built with multiple AI models, zero tolerance for misinformation.
</p>
