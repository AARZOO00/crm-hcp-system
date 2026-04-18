from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.interaction import Interaction
from app.models.schemas import AIProcessRequest, AIProcessResponse
from app.agents.langgraph_agent import (
    run_agent, sentiment_only_tool, suggest_follow_up_tool,
    summarize_interaction_tool, fetch_hcp_history_tool
)

router = APIRouter()


def _db_list(db: Session):
    return [
        {"id": i.id, "hcp_name": i.hcp_name, "interaction_type": i.interaction_type,
         "date_time": str(i.date_time), "notes": i.notes,
         "sentiment": i.sentiment, "summary": i.summary}
        for i in db.query(Interaction).all()
    ]


@router.post("/ai-process", response_model=AIProcessResponse)
def ai_process(payload: AIProcessRequest, db: Session = Depends(get_db)):
    result = run_agent(
        raw_text=payload.text,
        interaction_id=payload.interaction_id,
        db_interactions=_db_list(db),
    )
    return result


@router.post("/ai/sentiment")
def ai_sentiment(payload: AIProcessRequest):
    """Dedicated sentiment analysis endpoint."""
    return sentiment_only_tool(payload.text)


@router.post("/ai/suggest-followup")
def ai_suggest(payload: AIProcessRequest):
    """Suggest follow-ups from arbitrary text."""
    return suggest_follow_up_tool({"raw_text": payload.text, "notes": payload.text})


@router.post("/ai/summarize")
def ai_summarize(payload: AIProcessRequest):
    """Summarize arbitrary text."""
    return summarize_interaction_tool({"raw_text": payload.text, "notes": payload.text})


@router.get("/ai/hcp-history/{hcp_name}")
def get_hcp_history(hcp_name: str, db: Session = Depends(get_db)):
    return fetch_hcp_history_tool(hcp_name, _db_list(db))
