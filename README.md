# HawkWatch 🦅

> **AI-Powered Secure Online Examination Platform with Multimodal Proctoring**  
> Computer Vision · Behavioral Biometrics · Deepfake Detection

---

## Architecture Overview

```
HawkWatch/
├── client/                 # React + Vite + Tailwind (port 5173)
│   ├── src/
│   │   ├── pages/          # LandingPage, Login, Register, Dashboard, ExamList, ExamRoom
│   │   ├── components/     # Sidebar, Navbar, ProctoringOverlay, ProtectedRoute
│   │   ├── context/        # AuthContext (JWT state management)
│   │   └── services/       # api.js (Axios + interceptors)
│   └── vite.config.js      # Tailwind v4 plugin + API proxy
│
├── server/                 # Node.js + Express REST API (port 5000)
│   ├── config/             # Centralized Configuration (Joi Validated)
│   ├── models/             # User, Exam, ProctoringSession, ExamAttempt
│   ├── controllers/        # auth, exam, proctoring
│   ├── routes/             # /api/auth, /api/exams, /api/proctoring
│   ├── middleware/         # JWT auth, role-based access, error handler
│   ├── services/           # aiProctoring.service.js (Node ↔ Python bridge)
│   └── server.js           # Express + Socket.IO entry point
│
├── ai-service/             # Python FastAPI AI Microservice (port 8000)
│   ├── main.py             # MediaPipe, OpenCV, deepfake detection, behavioral biometrics
│   └── requirements.txt
│
└── package.json            # Root: concurrently runs server + client
```

---

## AI Proctoring Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Face Detection | **MediaPipe FaceDetection** | Real-time face presence detection |
| Face Mesh | **MediaPipe FaceMesh** (468 landmarks) | Head pose, gaze, micro-expression |
| Head Pose | **OpenCV solvePnP** | Euler angle estimation (pitch/yaw/roll) |
| Identity Verify | **InsightFace ArcFace** | Cosine similarity against enrolled embedding |
| Deepfake Detection | **EfficientNet (FaceForensics++)** | Binary real/fake video classification |
| Behavioral Biometrics | **One-Class SVM / Autoencoder** | Typing rhythm + mouse dynamics anomaly |
| Phone/Object Detection | **YOLO** (planned) | Unauthorized device detection |
| Real-time Events | **Socket.IO** | Live flag streaming to examiner |
| Video Storage | **AWS S3** | Session recording storage |

### Proctoring Flag Types (14)
`face_not_detected` · `multiple_faces` · `face_mismatch` · `deepfake_detected` ·  
`gaze_deviation` · `head_pose_violation` · `audio_anomaly` · `tab_switch` ·  
`copy_paste` · `keyboard_shortcut` · `fullscreen_exit` · `behavioral_anomaly` ·  
`phone_detected` · `person_absent`

### Risk Score Formula
```
Risk Score (0–100) =
  Face Absence Rate   × 30
+ Deepfake Avg Score  × 25
+ Behavioral Anomaly  × 20
+ Flag Severity Score × 25
```

---

## Database Models (MongoDB Atlas)

| Model | Key Fields |
|-------|-----------|
| `User` | name, email, role (student/examiner/admin), faceEmbedding, biometricBaseline |
| `Exam` | title, duration, questions[], proctoring config, status lifecycle |
| `ProctoringSession` | flags[], frameAnalysisSummary, behavioralMetrics, riskScore, videoRecordingUrl |
| `ExamAttempt` | answers[], score, percentage, passed, tabSwitchCount |

---

## API Reference

### Auth — `/api/auth`
| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/register` | Create account |
| POST | `/login` | Get access + refresh tokens |
| POST | `/refresh` | Rotate tokens |
| GET  | `/me` | Current user |
| POST | `/logout` | Invalidate session |

### Exams — `/api/exams`
| Method | Endpoint | Role |
|--------|---------|------|
| GET | `/` | All roles |
| POST | `/` | examiner, admin |
| PUT | `/:id` | examiner (own), admin |
| DELETE | `/:id` | admin |
| PATCH | `/:id/publish` | examiner, admin |

### Proctoring — `/api/proctoring`
| Method | Endpoint | Role |
|--------|---------|------|
| POST | `/start` | student |
| POST | `/:id/end` | student |
| POST | `/:id/flag` | student |
| POST | `/:id/analyze-frame` | student |
| POST | `/:id/behavioral` | student |
| GET  | `/:id/report` | examiner, admin |

---

## Configuration Management

The backend uses a centralized configuration module (`server/config/index.js`) powered by **Joi** schema validation. This ensures the app fails fast at startup if critical environment variables are missing or incorrectly formatted.

**Important:** You must not access `process.env` directly in the backend codebase (outside of `server/config/index.js`). All environment variables must be registered in the schema and accessed through the exported config object.

```javascript
// Example usage:
const config = require('./config');
console.log(config.database.url);
```

---

## Quick Start

### Prerequisites
- Node.js ≥ 18
- Python 3.11 (for AI service)
- MongoDB Atlas cluster

### 1. Clone & install
```bash
git clone <repo-url> HawkWatch
cd HawkWatch
npm run install:all
```

### 2. Configure environment
```bash
# Server
cp server/.env.example server/.env
# Edit server/.env with your MongoDB URI, JWT secrets, AWS keys

# Client
cp client/.env.example client/.env    # (optional—proxy handles API)
```

### 3. Start dev servers
```bash
npm run dev
# Frontend: http://localhost:5173
# Backend:  http://localhost:5000
# Health:   http://localhost:5000/api/health
```

### 4. Start Python AI service (optional — stubs work without it)
```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## AWS Deployment

| Service | Usage |
|---------|-------|
| **EC2** | Node.js backend (PM2 process manager) |
| **AWS Amplify** | React frontend (CI/CD from main branch) |
| **S3** | Proctoring video/screenshot storage |
| **CloudFront** | CDN for frontend + HTTPS for API |
| **DocumentDB / Atlas** | MongoDB-compatible database |
| **ECR + ECS** | Python AI microservice container |

```
          ┌──────────────┐         ┌──────────────────┐
Users ──▶ │  CloudFront  │────────▶│  AWS Amplify     │  (React)
          │  (HTTPS CDN) │         └──────────────────┘
          │              │────────▶│  EC2 (Node.js)   │──▶ MongoDB Atlas
          └──────────────┘         │  + Socket.IO     │
                                   └────────┬─────────┘
                                            │ HTTP
                                   ┌────────▼─────────┐
                                   │  ECS (Python AI) │
                                   │  MediaPipe + CV  │
                                   └──────────────────┘
                                            │
                                   ┌────────▼─────────┐
                                   │  AWS S3           │  (Video storage)
                                   └──────────────────┘
```

---

## Roles

| Role | Permissions |
|------|------------|
| **Student** | Take exams, view own results |
| **Examiner** | Create/publish exams, monitor sessions, view reports |
| **Admin** | Full access: all above + user management |

---

## License
MIT — © 2026 HawkWatch
