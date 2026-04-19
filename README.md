# 🏥 PharmaSync CRM — AI-First HCP Interaction Logger

> Full-stack AI-powered CRM for pharmaceutical field representatives to log, manage, and analyze Healthcare Professional (HCP) interactions using natural language.

**Live Demo:** [https://crm-hcp-system.netlify.app](https://crm-hcp-system.netlify.app)  
**Tech Stack:** React · FastAPI · PostgreSQL (Supabase) · LangGraph · OpenAI

---

## 📁 Project Structure

```
crm-hcp-system/
│
├── data/
│   └── medical_consultations.csv        # Sample HCP consultation dataset (100 records)
│
├── backend/
│   ├── app/
│   │   ├── main.py                      # FastAPI app, CORS, startup migrations
│   │   ├── database.py                  # SQLAlchemy engine (Supabase-compatible)
│   │   ├── models/
│   │   │   ├── interaction.py           # ORM model — Interaction table
│   │   │   └── schemas.py               # Pydantic schemas (request/response)
│   │   ├── routes/
│   │   │   ├── interactions.py          # CRUD + search/filter/dashboard/reminders
│   │   │   └── ai_routes.py             # AI processing endpoints
│   │   ├── agents/
│   │   │   └── langgraph_agent.py       # LangGraph multi-step AI pipeline
│   │   └── services/                    # (reserved for future services)
│   ├── data/
│   │   └── medical_consultations.csv    # Same dataset (backend reference copy)
│   ├── requirements.txt
│   ├── .python-version                  # Pins Python 3.11.9 for Render
│   ├── render.yaml                      # Render deployment config
│   └── Dockerfile
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js                       # Shell, sidebar, 4-tab routing
│   │   ├── App.css                      # Full dark pharma design system
│   │   ├── index.js
│   │   ├── store/
│   │   │   ├── store.js                 # Redux store
│   │   │   └── interactionsSlice.js     # All state + async thunks
│   │   └── components/
│   │       ├── Dashboard.js             # KPIs, sentiment chart, top HCPs
│   │       ├── LogInteractionScreen.js  # Form + AI chat (two-panel layout)
│   │       ├── ChatAssistant.js         # Natural language AI assistant
│   │       ├── InteractionsList.js      # History grid with search/filter
│   │       ├── Timeline.js              # Chronological timeline view
│   │       ├── SearchFilter.js          # 6-field filter panel
│   │       └── ReminderModal.js         # Set follow-up reminder
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml
├── runtime.txt
└── README.md
```

---

## 🗂️ Data Folder — `medical_consultations.csv`

The `data/` folder contains **100 real-format medical consultation records** used for seeding and testing.

### CSV Columns

| Column | Type | Example | Description |
|--------|------|---------|-------------|
| `consultation_id` | integer | `1` | Unique record ID |
| `patient_id` | string | `PT0813` | Patient identifier code |
| `doctor_id` | string | `DOC012` | Doctor identifier code |
| `patient_age` | integer | `12` | Patient age in years |
| `date` | date | `2025-02-10` | Consultation date (YYYY-MM-DD) |
| `symptoms` | string | `Abdominal pain` | Primary symptoms reported |
| `payment_type` | string | `Private` / `Insurance` | How consultation was paid |

### Sample Data (first 5 rows)

```csv
consultation_id,patient_id,doctor_id,patient_age,date,symptoms,payment_type
1,PT0813,DOC012,12,2025-02-10,Abdominal pain,Private
2,PT2032,DOC005,28,2025-04-25,Skin rash,Insurance
3,PT0780,DOC012,67,2025-08-30,Skin rash,Private
4,PT1908,DOC002,81,2025-05-10,Diabetes monitoring,Private
5,PT1322,DOC006,59,2025-02-19,Cough,Insurance
6,PT0666,DOC011,86,2025-01-20,Injury,Private
7,PT2672,DOC010,54,2025-05-01,Allergy symptoms,Private
8,PT2213,DOC003,5,2025-09-19,Anxiety,Insurance
```

### How to Use This Data

**Option 1 — Import via Supabase Dashboard (easiest):**
1. Supabase → Table Editor → `interactions` table
2. Click **Insert → Import data from CSV**
3. Upload `medical_consultations.csv`

**Option 2 — SQL COPY command:**
```sql
COPY interactions(consultation_id, patient_id, doctor_id, patient_age, date, symptoms, payment_type)
FROM '/path/to/medical_consultations.csv'
WITH (FORMAT csv, HEADER true);
```

**Option 3 — Python seed script:**
```python
import pandas as pd
import requests

df = pd.read_csv('data/medical_consultations.csv')
for _, row in df.iterrows():
    requests.post('http://localhost:8000/api/log-interaction', json={
        "hcp_name": f"Dr. {row['doctor_id']}",
        "interaction_type": "In-Person Visit",
        "date_time": f"{row['date']}T10:00:00",
        "notes": row['symptoms'],
        "sentiment": "neutral"
    })
```

---

## 🚀 Local Setup

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 14+ **or** Supabase account (free)

### 1. Clone

```bash
git clone https://github.com/AARZOO00/crm-hcp-system
cd crm-hcp-system
```

### 2. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
```

Create `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/hcp_crm
OPENAI_API_KEY=your_openai_api_key_here
```

```bash
# Start backend (tables auto-created on startup)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

✅ Backend running at: `http://localhost:8000`  
✅ API docs at: `http://localhost:8000/docs`

### 3. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:8000/api
```

```bash
npm start
```

✅ App running at: `http://localhost:3000`

---

## ☁️ Deployment

### Database — Supabase (Free)

1. Create project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → Database → Connection Pooling**
3. Copy **Transaction pooler URL** (port `6543`) — IPv4 compatible:
   ```
   postgresql://postgres.xxxx:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
   ```

> ⚠️ Use the **pooler URL** (port 6543), NOT the direct URL (port 5432). Render's free tier only supports IPv4, and the direct Supabase URL uses IPv6.

### Backend — Render

1. Connect GitHub repo → New Web Service
2. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Environment Variables:
   ```
   DATABASE_URL  = postgresql://postgres.xxx:pass@pooler.supabase.com:6543/postgres
   OPENAI_API_KEY = sk-...   (optional — mock AI works without it)
   ```

### Frontend — Netlify ✅ (Already Live)

```bash
cd frontend
npm run build
# Deploy build/ folder to Netlify
```

Environment variable in Netlify:
```
REACT_APP_API_URL = https://your-backend.onrender.com/api
```

---

## 🌐 API Reference

### Interactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check |
| `POST` | `/api/log-interaction` | Create new interaction |
| `GET` | `/api/interactions` | List all (supports filters) |
| `GET` | `/api/interactions/{id}` | Get single record |
| `PUT` | `/api/edit-interaction/{id}` | Update interaction |
| `DELETE` | `/api/interactions/{id}` | Delete interaction |

### Search & Filter (`GET /api/interactions`)

```
?hcp_name=Sharma          # filter by doctor name
?sentiment=positive        # positive | neutral | negative
?interaction_type=Webinar  # filter by type
?date_from=2025-01-01      # from date
?date_to=2025-12-31        # to date
?search=CardioPlus         # full-text search in notes/summary
?sort_by=date_time&sort_order=desc
```

### Dashboard & Timeline

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard` | KPIs, sentiment stats, top HCPs |
| `GET` | `/api/timeline` | Chronological feed |

### Reminders

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/reminders` | Set reminder on interaction |
| `GET` | `/api/reminders/pending` | Upcoming reminders |
| `PATCH` | `/api/reminders/{id}/mark-sent` | Mark as done |

### AI Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ai-process` | Full 4-step AI pipeline |
| `POST` | `/api/ai/sentiment` | Sentiment analysis only |
| `POST` | `/api/ai/suggest-followup` | Follow-up suggestions |
| `POST` | `/api/ai/summarize` | Summarize text |
| `GET` | `/api/ai/hcp-history/{name}` | Past interactions for HCP |

---

## 🤖 LangGraph AI Pipeline

```
User types natural language
         │
         ▼
  [detect_intent]
         │
    ┌────┴─────────────────────────────┐
    │                                  │
  "log"                           other intents
    │                                  │
    ▼                          edit / summarize /
[1] extract_entities           sentiment / suggest /
    │                          fetch_history
    ▼
[2] analyze_sentiment
    │   → positive / neutral / negative
    │   → score: -1.0 to +1.0
    ▼
[3] summarize_data
    │   → 2-sentence summary
    │   → key bullet points
    ▼
[4] suggest_follow_ups
    │   → 3-5 prioritized actions
    │   → priority level
    ▼
  Auto-fills form ✅
```

**No API key needed** — built-in mock AI uses regex extraction and works fully offline.

---

## ✨ Features

| Feature | Status | Description |
|---------|--------|-------------|
| 🤖 AI Chat Assistant | ✅ | Type natural language → form auto-fills |
| 💡 Sentiment Analysis | ✅ | Positive/Neutral/Negative + numeric score |
| 📋 Smart Follow-ups | ✅ | AI suggests 3-5 prioritized next actions |
| 📊 Dashboard | ✅ | KPIs, charts, top HCPs, products |
| 🕐 Timeline View | ✅ | Chronological alternating timeline |
| 🔍 Search & Filter | ✅ | 6 filter fields + full-text search |
| 🔔 Reminders | ✅ | Per-interaction follow-up reminders |
| ✏️ Edit Mode | ✅ | Click edit on any past interaction |
| 📱 Responsive | ✅ | Desktop + mobile |

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string |
| `OPENAI_API_KEY` | ❌ Optional | Uses mock AI if not set |

---

## 🐳 Docker

```bash
# Run entire stack locally
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

---

## 🧪 Try These in the Chat

```
Met Dr. Priya Sharma, discussed CardioPlus. She was very interested.
```
```
Phone call with Dr. Mehta about OmegaHealth. He had concerns about side effects.
```
```
Suggest follow-up actions for this interaction
```
```
Fetch history for Dr. Sharma
```
```
Analyze sentiment: doctor was resistant and raised multiple objections
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Redux Toolkit |
| **Styling** | Custom CSS (dark pharma theme), DM Sans + Syne fonts |
| **Backend** | Python 3.11, FastAPI |
| **Database** | PostgreSQL via Supabase |
| **ORM** | SQLAlchemy 2.0 + Alembic |
| **AI Agent** | LangGraph state machine |
| **LLM** | OpenAI GPT-4o-mini (or mock) |
| **Hosting** | Render (backend) + Netlify (frontend) |

---

## 👩‍💻 Author

**Aarzoo** — [github.com/AARZOO00](https://github.com/AARZOO00)

---

*Built with ❤️ for pharmaceutical field representatives*