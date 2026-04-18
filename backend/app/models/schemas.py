from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ── Interaction ──────────────────────────────────────────────────────────────

class InteractionBase(BaseModel):
    hcp_name:             str
    interaction_type:     str
    date_time:            datetime
    notes:                Optional[str]       = ""
    follow_up_actions:    Optional[str]       = ""
    sentiment:            Optional[str]       = "neutral"
    sentiment_score:      Optional[float]     = 0.0
    products_discussed:   Optional[List[str]] = []
    summary:              Optional[str]       = ""
    raw_text:             Optional[str]       = ""
    key_points:           Optional[List[str]] = []
    suggested_follow_ups: Optional[List[str]] = []
    reminder_date:        Optional[datetime]  = None
    reminder_note:        Optional[str]       = ""


class InteractionCreate(InteractionBase):
    pass


class InteractionUpdate(BaseModel):
    hcp_name:             Optional[str]       = None
    interaction_type:     Optional[str]       = None
    date_time:            Optional[datetime]  = None
    notes:                Optional[str]       = None
    follow_up_actions:    Optional[str]       = None
    sentiment:            Optional[str]       = None
    sentiment_score:      Optional[float]     = None
    products_discussed:   Optional[List[str]] = None
    summary:              Optional[str]       = None
    key_points:           Optional[List[str]] = None
    suggested_follow_ups: Optional[List[str]] = None
    reminder_date:        Optional[datetime]  = None
    reminder_note:        Optional[str]       = None
    reminder_sent:        Optional[bool]      = None


class InteractionResponse(InteractionBase):
    id:            int
    reminder_sent: Optional[bool]    = False
    created_at:    Optional[datetime] = None
    updated_at:    Optional[datetime] = None

    class Config:
        from_attributes = True


# ── AI ───────────────────────────────────────────────────────────────────────

class AIProcessRequest(BaseModel):
    text:           str
    interaction_id: Optional[int] = None


class AIProcessResponse(BaseModel):
    hcp_name:                Optional[str]       = None
    interaction_type:        Optional[str]       = None
    date_time:               Optional[str]       = None
    notes:                   Optional[str]       = None
    follow_up_actions:       Optional[str]       = None
    sentiment:               Optional[str]       = None
    sentiment_score:         Optional[float]     = None
    products_discussed:      Optional[List[str]] = None
    summary:                 Optional[str]       = None
    key_points:              Optional[List[str]] = None
    message:                 Optional[str]       = None
    suggested_follow_ups:    Optional[List[str]] = None
    priority:                Optional[str]       = None
    next_meeting_suggestion: Optional[str]       = None


# ── Dashboard ────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_interactions:   int
    positive_count:       int
    neutral_count:        int
    negative_count:       int
    interactions_by_type: dict
    top_hcps:             List[dict]
    recent_interactions:  List[dict]
    pending_reminders:    int
    products_mentioned:   List[dict]


# ── Reminder ─────────────────────────────────────────────────────────────────

class ReminderCreate(BaseModel):
    interaction_id: int
    reminder_date:  datetime
    reminder_note:  Optional[str] = ""


class ReminderResponse(BaseModel):
    id:            int
    hcp_name:      str
    reminder_date: Optional[datetime]
    reminder_note: Optional[str]
    reminder_sent: bool

    class Config:
        from_attributes = True
