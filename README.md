# 🏥 PharmaSync CRM — AI-First HCP Interaction Logger

A full-stack AI-powered CRM system for pharmaceutical field representatives to log, manage, and analyze Healthcare Professional (HCP) interactions using natural language.

---

## 📁 Folder Structure

```
crm-hcp/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app entry point
│   │   ├── database.py                # SQLAlchemy engine & session
│   │   ├── models/
│   │   │   ├── interaction.py         # ORM model (Interaction table)
│   │   │   └── schemas.py             # Pydantic request/response schemas
│   │   ├── routes/
│   │   │   ├── interactions.py        # CRUD API routes
│   │   │   └── ai_routes.py           # AI processing routes
│   │   └── agents/
│   │       └── langgraph_agent.py     # LangGraph agent with 5 tools
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js                     # App shell + sidebar + routing
│   │   ├── App.css                    # Full design system (dark pharma theme)
│   │   ├── index.js                   # React entry point
│   │   ├── store/
│   │   │   ├── store.js               # Redux store configuration
│   │   │   └── interactionsSlice.js   # Redux Toolkit slice (async thunks)
│   │   └── components/
│   │       ├── LogInteractionScreen.js # Left panel: interaction form
│   │       ├── ChatAssistant.js        # Right panel: AI chat interface
│   │       └── InteractionsList.js     # History view with cards
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
│
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start (Local — No Docker)

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 14+

### 1. Clone & Setup

```bash
git clone <repo-url>
cd crm-hcp
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL and OPENAI_API_KEY

# Create PostgreSQL database
psql -U postgres -c "CREATE DATABASE hcp_crm;"

# Run backend (tables auto-created on start)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env — set REACT_APP_API_URL=http://localhost:8000/api

# Start frontend
npm start
```

Open **http://localhost:3000** 🎉

---

## 🐳 Quick Start (Docker Compose)

```bash
# From project root
cp backend/.env.example backend/.env
# Optionally add your OpenAI key to backend/.env

docker-compose up --build
```

Services:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- PostgreSQL: localhost:5432

---

## 🔑 Environment Variables

### Backend `.env`

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hcp_crm
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Use Groq with Gemma2-9b-it instead of OpenAI
# OPENAI_BASE_URL=https://api.groq.com/openai/v1
# OPENAI_API_KEY=your_groq_api_key
```

### Frontend `.env`

```env
REACT_APP_API_URL=http://localhost:8000/api
```

> **Note:** If no `OPENAI_API_KEY` is set, the system uses a built-in **mock AI** that simulates entity extraction and form-filling using regex. Useful for local demos without an API key.

---

## 🤖 LangGraph Agent — 5 Tools

The agent (`backend/app/agents/langgraph_agent.py`) implements a full LangGraph state machine:

```
Input Text
    │
    ▼
[detect_intent_node]  ──── intent detection via keyword analysis
    │
    ├── "log"           → [LogInteractionTool]       → Extract entities, structure form data
    ├── "edit"          → [EditInteractionTool]       → Modify existing interaction
    ├── "summarize"     → [SummarizeInteractionTool]  → Generate concise summary
    ├── "suggest_..."   → [SuggestFollowUpTool]       → Recommend next actions
    └── "fetch_..."     → [FetchHCPHistoryTool]       → Retrieve past interactions
                                    │
                                   END
```

### Tool Descriptions

| Tool | Input | Output |
|------|-------|--------|
| `LogInteractionTool` | Raw natural language text | Structured JSON: HCP name, type, sentiment, products, follow-ups |
| `EditInteractionTool` | interaction_id + change instructions | Updated fields JSON |
| `SummarizeInteractionTool` | Interaction dict | 2-3 sentence summary + key points |
| `SuggestFollowUpTool` | Interaction dict | 3-5 prioritized follow-up actions |
| `FetchHCPHistoryTool` | HCP name + DB interactions | Past interaction history |

---

## 🌐 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/log-interaction` | Create new HCP interaction |
| `GET` | `/api/interactions` | List all interactions |
| `GET` | `/api/interactions/{id}` | Get single interaction |
| `PUT` | `/api/edit-interaction/{id}` | Update an interaction |
| `DELETE` | `/api/interactions/{id}` | Delete an interaction |
| `POST` | `/api/ai-process` | Process text with LangGraph AI agent |
| `GET` | `/api/ai/hcp-history/{name}` | Fetch interaction history for an HCP |

Full interactive docs: **http://localhost:8000/docs**

---

## 🎨 Features

### Log Interaction Screen
- **Left panel**: Full form with HCP Name, Type dropdown, DateTime, Products, Sentiment selector, Notes, Follow-up Actions
- **Right panel**: AI Chat Assistant with natural language input
- AI auto-fills form fields from natural language input
- Edit existing interactions from History view

### Chat Assistant
- Type natural language: *"Met Dr. Sharma, discussed CardioPlus, doctor was very interested"*
- AI extracts: HCP name, interaction type, products, sentiment
- Auto-fills the form instantly
- Shows structured result cards with follow-up suggestions
- Quick prompt buttons for common use cases
- Supports: Logging, Summarizing, Follow-up suggestions, History lookups

### History View
- Card grid with all logged interactions
- Sentiment color coding (green/amber/red)
- Product chips, follow-up preview
- One-click "Edit" to load interaction back into form

### Redux Store
- `interactionsSlice`: full CRUD + AI processing state
- Async thunks for all API calls
- Form state management with field-level updates
- Chat message history

---

## 🧪 Sample Interactions to Try

In the Chat Assistant, try:

```
Met Dr. Priya Sharma at City Hospital, discussed CardioPlus and OmegaHealth.
She was very interested and asked for clinical trial data.
```

```
Phone call with Dr. Mehta about ProductX. He was concerned about side effects.
```

```
Fetch history for Dr. Sharma
```

```
Suggest follow-up actions for this interaction
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Redux Toolkit, CSS (custom dark theme) |
| Backend | Python FastAPI |
| Database | PostgreSQL + SQLAlchemy ORM |
| AI Agent | LangGraph state machine |
| LLM | OpenAI GPT-4o-mini (or Groq Gemma2-9b-it, or Mock) |

---

## 📝 Notes

- The system works **fully offline** with the built-in mock LLM — no API key needed for demos
- To switch to Groq: set `OPENAI_BASE_URL=https://api.groq.com/openai/v1` and use a Groq API key
- Database tables are auto-created on backend startup via SQLAlchemy
- CORS is configured for `localhost:3000` — update `main.py` for production deployments
