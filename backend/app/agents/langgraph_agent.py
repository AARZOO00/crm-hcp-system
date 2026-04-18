"""
UPGRADED LangGraph Agent — multi-step pipeline:
  extract → sentiment → summarize → suggest_follow_up

Plus 5 named tools: Log, Edit, Summarize, SuggestFollowUp, FetchHistory.
Falls back to deterministic mock if OPENAI_API_KEY is absent.
"""
import os, json, re
from typing import TypedDict, Optional, List
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

try:
    from langgraph.graph import StateGraph, END
    LANGGRAPH_AVAILABLE = True
except ImportError:
    LANGGRAPH_AVAILABLE = False

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
USE_MOCK = not OPENAI_API_KEY or OPENAI_API_KEY in ("your_openai_api_key_here", "mock")


# ─────────────────────────────────────────────────────────────────────────────
# Mock LLM
# ─────────────────────────────────────────────────────────────────────────────

def mock_llm_response(prompt: str) -> str:
    p = prompt.lower()

    doc_m   = re.search(r'dr\.?\s+([a-zA-Z]+)', p)
    doc     = f"Dr. {doc_m.group(1).capitalize()}" if doc_m else "Dr. Unknown"

    prod_m  = re.search(r'(product\s+[a-zA-Z0-9]+|cardio\w*|omega\w*|gluco\w*)', p)
    product = prod_m.group(0).title() if prod_m else "ProductX"

    if any(w in p for w in ["interested","positive","great","excellent","happy","receptive","impressed"]):
        sentiment, score = "positive", 0.75
    elif any(w in p for w in ["concerned","worried","negative","unhappy","resistant","doubt"]):
        sentiment, score = "negative", -0.6
    else:
        sentiment, score = "neutral", 0.0

    itype = ("Phone Call" if any(w in p for w in ["call","phone"]) else
             "Email"       if "email" in p else
             "Conference"  if any(w in p for w in ["conference","event","summit"]) else
             "In-Person Visit")

    follow_ups = [
        f"Send {product} clinical trial data to {doc}",
        f"Schedule follow-up meeting with {doc} in 14 days",
        f"Share {product} updated brochure via email",
        "Record any samples dispensed during this visit",
        f"Log {doc}'s feedback in the CRM system"
    ]

    return json.dumps({
        "hcp_name":             doc,
        "interaction_type":     itype,
        "date_time":            datetime.now().strftime("%Y-%m-%dT%H:%M"),
        "notes":                f"Meeting with {doc} to discuss {product}. Doctor expressed {sentiment} sentiment.",
        "follow_up_actions":    f"Send {product} info to {doc}. Schedule follow-up within 2 weeks.",
        "sentiment":            sentiment,
        "sentiment_score":      score,
        "products_discussed":   [product],
        "summary":              f"Visited {doc} and discussed {product}. Outcome: {sentiment}.",
        "key_points":           [
            f"HCP: {doc}",
            f"Product discussed: {product}",
            f"Sentiment: {sentiment}",
            "Follow-up scheduled"
        ],
        "suggested_follow_ups": follow_ups,
        "priority":             "high" if sentiment == "positive" else "medium",
        "next_meeting_suggestion": f"Schedule follow-up with {doc} within 14 days",
        "message":              f"✅ Logged for {doc} | Sentiment: {sentiment} | {len(follow_ups)} follow-ups suggested."
    })


def call_llm(prompt: str, system: str = "") -> str:
    if USE_MOCK:
        return mock_llm_response(prompt)
    try:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_API_KEY)
        msgs = ([{"role":"system","content":system}] if system else []) + \
               [{"role":"user","content":prompt}]
        r = client.chat.completions.create(model="gpt-4o-mini", messages=msgs, temperature=0.3)
        return r.choices[0].message.content
    except Exception as e:
        print(f"LLM error ({e}) — using mock")
        return mock_llm_response(prompt)


def _clean_json(raw: str) -> dict:
    clean = re.sub(r'```json|```', '', raw).strip()
    return json.loads(clean)


# ─────────────────────────────────────────────────────────────────────────────
# Individual pipeline step functions (also usable as standalone tools)
# ─────────────────────────────────────────────────────────────────────────────

def extract_entities(raw_text: str) -> dict:
    """Step 1 — Extract structured fields from raw text."""
    system = """You are a pharma CRM assistant. Extract structured info from interaction notes.
Return ONLY valid JSON with:
  hcp_name, interaction_type (In-Person Visit|Phone Call|Email|Conference|Webinar),
  date_time (ISO, today if absent), notes, products_discussed (array), raw_text
No extra text."""
    try:
        return _clean_json(call_llm(raw_text, system))
    except Exception:
        return mock_extract(raw_text)


def mock_extract(raw_text: str) -> dict:
    p = raw_text.lower()
    doc_m = re.search(r'dr\.?\s+([a-zA-Z]+)', p)
    prod_m = re.search(r'(product\s+[a-zA-Z0-9]+|\b[A-Z][a-z]+[A-Z]\w*)', raw_text)
    doc = f"Dr. {doc_m.group(1).capitalize()}" if doc_m else "Dr. Unknown"
    product = prod_m.group(0) if prod_m else "ProductX"
    itype = ("Phone Call" if any(w in p for w in ["call","phone"]) else
             "Email" if "email" in p else "In-Person Visit")
    return {"hcp_name": doc, "interaction_type": itype,
            "date_time": datetime.now().strftime("%Y-%m-%dT%H:%M"),
            "notes": raw_text, "products_discussed": [product], "raw_text": raw_text}


def analyze_sentiment(data: dict) -> dict:
    """Step 2 — Dedicated sentiment analysis node."""
    system = """Analyze the sentiment of this pharma HCP interaction.
Return ONLY JSON: {"sentiment": "positive|neutral|negative", "sentiment_score": float -1.0 to 1.0,
"sentiment_reason": "brief explanation"}"""
    text = data.get("notes", "") or data.get("raw_text", "")
    try:
        result = _clean_json(call_llm(text, system))
        data.update({
            "sentiment":       result.get("sentiment", "neutral"),
            "sentiment_score": result.get("sentiment_score", 0.0),
            "sentiment_reason": result.get("sentiment_reason", "")
        })
    except Exception:
        p = text.lower()
        if any(w in p for w in ["interested","positive","great","happy","receptive"]):
            data.update({"sentiment":"positive","sentiment_score":0.7})
        elif any(w in p for w in ["concerned","negative","worried","resistant"]):
            data.update({"sentiment":"negative","sentiment_score":-0.6})
        else:
            data.update({"sentiment":"neutral","sentiment_score":0.0})
    return data


def summarize_data(data: dict) -> dict:
    """Step 3 — Generate summary + key points."""
    system = """Summarize this pharma HCP interaction.
Return ONLY JSON: {"summary": "2-sentence summary", "key_points": ["point1","point2","point3"]}"""
    try:
        result = _clean_json(call_llm(json.dumps(data), system))
        data.update({"summary": result.get("summary",""), "key_points": result.get("key_points",[])})
    except Exception:
        hcp = data.get("hcp_name","HCP")
        data.setdefault("summary", f"Interaction with {hcp} recorded.")
        data.setdefault("key_points", [f"HCP: {hcp}", "Sentiment: " + data.get("sentiment","neutral")])
    return data


def suggest_follow_ups(data: dict) -> dict:
    """Step 4 — Suggest prioritised follow-up actions."""
    system = """Based on this pharma HCP interaction, suggest 3-5 specific follow-up actions.
Return ONLY JSON: {"suggested_follow_ups":["action1",...], "priority":"high|medium|low",
"next_meeting_suggestion":"..."}"""
    try:
        result = _clean_json(call_llm(json.dumps(data), system))
        data.update({
            "suggested_follow_ups":    result.get("suggested_follow_ups", []),
            "priority":                result.get("priority", "medium"),
            "next_meeting_suggestion": result.get("next_meeting_suggestion", "")
        })
    except Exception:
        hcp      = data.get("hcp_name","HCP")
        products = data.get("products_discussed",[])
        prod_str = ", ".join(products) if products else "discussed products"
        data.update({
            "suggested_follow_ups": [
                f"Send {prod_str} clinical data to {hcp}",
                "Schedule follow-up in 2 weeks",
                "Share updated brochure via email",
                "Record samples dispensed"
            ],
            "priority": "medium",
            "next_meeting_suggestion": f"Follow up with {hcp} within 14 days"
        })
    return data


# ─────────────────────────────────────────────────────────────────────────────
# Full pipeline tool (extract → sentiment → summarize → suggest)
# ─────────────────────────────────────────────────────────────────────────────

def log_interaction_tool(raw_text: str) -> dict:
    """Tool 1 — Full multi-step pipeline for new interactions."""
    data = extract_entities(raw_text)
    data = analyze_sentiment(data)
    data = summarize_data(data)
    data = suggest_follow_ups(data)
    data["message"] = (
        f"✅ Logged for {data.get('hcp_name','?')} | "
        f"Sentiment: {data.get('sentiment','?')} | "
        f"{len(data.get('suggested_follow_ups',[]))} follow-ups suggested."
    )
    return data


def edit_interaction_tool(interaction_id: int, raw_text: str = "") -> dict:
    """Tool 2 — Modify existing interaction via NL instructions."""
    system = """Extract only the fields the user wants to change from this instruction.
Return ONLY JSON with any subset of: hcp_name, interaction_type, notes,
follow_up_actions, sentiment, products_discussed, summary. No other text."""
    try:
        updates = _clean_json(call_llm(raw_text, system))
    except Exception:
        updates = {}
    updates["id"] = interaction_id
    updates["message"] = f"✏️ Interaction #{interaction_id} updated."
    return updates


def summarize_interaction_tool(interaction_data: dict) -> dict:
    """Tool 3 — Standalone summarisation."""
    return summarize_data(dict(interaction_data))


def suggest_follow_up_tool(interaction_data: dict) -> dict:
    """Tool 4 — Standalone follow-up suggestions."""
    return suggest_follow_ups(dict(interaction_data))


def fetch_hcp_history_tool(hcp_name: str, db_interactions: list = None) -> dict:
    """Tool 5 — Retrieve past interactions for an HCP."""
    history = []
    if db_interactions:
        history = [i for i in db_interactions
                   if hcp_name.lower() in i.get("hcp_name","").lower()]
    if not history:
        history = [{
            "id": 99, "hcp_name": hcp_name,
            "interaction_type": "In-Person Visit",
            "date_time": (datetime.now() - timedelta(days=30)).isoformat(),
            "notes": "Previous visit — discussed product portfolio.",
            "sentiment": "positive", "summary": f"Last visit with {hcp_name} was positive."
        }]
    return {
        "hcp_name": hcp_name,
        "total_interactions": len(history),
        "history": history,
        "message": f"Found {len(history)} interaction(s) for {hcp_name}."
    }


def sentiment_only_tool(raw_text: str) -> dict:
    """Dedicated sentiment analysis on arbitrary text."""
    data = analyze_sentiment({"raw_text": raw_text, "notes": raw_text})
    data["message"] = f"Sentiment: {data['sentiment']} (score: {data.get('sentiment_score',0):.2f})"
    return data


# ─────────────────────────────────────────────────────────────────────────────
# LangGraph State
# ─────────────────────────────────────────────────────────────────────────────

class AgentState(TypedDict):
    raw_text:         str
    intent:           str
    interaction_data: dict
    result:           dict
    hcp_name:         str
    interaction_id:   Optional[int]
    db_interactions:  list


# ── Intent detection ─────────────────────────────────────────────────────────

def detect_intent_node(state: AgentState) -> AgentState:
    t = state["raw_text"].lower()
    if any(w in t for w in ["edit","update","change","modify"]):
        intent = "edit"
    elif any(w in t for w in ["summarize","summary","brief"]):
        intent = "summarize"
    elif any(w in t for w in ["sentiment","feeling","tone","mood"]):
        intent = "sentiment"
    elif any(w in t for w in ["follow","next step","action","suggest"]):
        intent = "suggest_follow_up"
    elif any(w in t for w in ["history","past","previous","fetch","retrieve"]):
        intent = "fetch_history"
    else:
        intent = "log"
    return {**state, "intent": intent}


def route_intent(state: AgentState) -> str:
    return state["intent"]


# ── Graph nodes ──────────────────────────────────────────────────────────────

def log_node(state: AgentState) -> AgentState:
    result = log_interaction_tool(state["raw_text"])
    return {**state, "result": result, "interaction_data": result}

def edit_node(state: AgentState) -> AgentState:
    result = edit_interaction_tool(state.get("interaction_id", 1), state["raw_text"])
    return {**state, "result": result}

def summarize_node(state: AgentState) -> AgentState:
    data = state.get("interaction_data") or {"raw_text": state["raw_text"]}
    result = summarize_interaction_tool(data)
    return {**state, "result": result}

def sentiment_node(state: AgentState) -> AgentState:
    result = sentiment_only_tool(state["raw_text"])
    return {**state, "result": result}

def suggest_follow_up_node(state: AgentState) -> AgentState:
    data = state.get("interaction_data") or {"raw_text": state["raw_text"]}
    result = suggest_follow_up_tool(data)
    return {**state, "result": result}

def fetch_history_node(state: AgentState) -> AgentState:
    hcp = state.get("hcp_name") or ""
    if not hcp:
        m = re.search(r'dr\.?\s+([a-zA-Z]+)', state["raw_text"], re.I)
        hcp = f"Dr. {m.group(1).capitalize()}" if m else "Unknown"
    result = fetch_hcp_history_tool(hcp, state.get("db_interactions", []))
    return {**state, "result": result}


# ── Build graph ──────────────────────────────────────────────────────────────

def build_langgraph_agent():
    if not LANGGRAPH_AVAILABLE:
        return None
    wf = StateGraph(AgentState)
    wf.add_node("detect_intent",     detect_intent_node)
    wf.add_node("log",               log_node)
    wf.add_node("edit",              edit_node)
    wf.add_node("summarize",         summarize_node)
    wf.add_node("sentiment",         sentiment_node)
    wf.add_node("suggest_follow_up", suggest_follow_up_node)
    wf.add_node("fetch_history",     fetch_history_node)
    wf.set_entry_point("detect_intent")
    wf.add_conditional_edges("detect_intent", route_intent, {
        "log":               "log",
        "edit":              "edit",
        "summarize":         "summarize",
        "sentiment":         "sentiment",
        "suggest_follow_up": "suggest_follow_up",
        "fetch_history":     "fetch_history",
    })
    for n in ["log","edit","summarize","sentiment","suggest_follow_up","fetch_history"]:
        wf.add_edge(n, END)
    return wf.compile()


_agent = None

def get_agent():
    global _agent
    if _agent is None:
        _agent = build_langgraph_agent()
    return _agent


def run_agent(raw_text: str, interaction_id: int = None,
              hcp_name: str = "", db_interactions: list = None) -> dict:
    """Public entry point — runs the LangGraph pipeline or falls back."""
    agent = get_agent()
    initial = {
        "raw_text": raw_text, "intent": "", "interaction_data": {},
        "result": {}, "hcp_name": hcp_name,
        "interaction_id": interaction_id,
        "db_interactions": db_interactions or [],
    }
    if agent:
        try:
            return agent.invoke(initial).get("result", {})
        except Exception as e:
            print(f"LangGraph invoke error: {e} — falling back")
    # Fallback
    s = detect_intent_node(initial)
    dispatch = {
        "log":               lambda: log_interaction_tool(raw_text),
        "edit":              lambda: edit_interaction_tool(interaction_id or 1, raw_text),
        "summarize":         lambda: summarize_interaction_tool({"raw_text": raw_text}),
        "sentiment":         lambda: sentiment_only_tool(raw_text),
        "suggest_follow_up": lambda: suggest_follow_up_tool({"raw_text": raw_text}),
        "fetch_history":     lambda: fetch_hcp_history_tool(hcp_name or "Unknown", db_interactions),
    }
    return dispatch.get(s["intent"], dispatch["log"])()
