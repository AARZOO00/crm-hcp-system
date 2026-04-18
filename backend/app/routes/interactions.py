from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from datetime import datetime, timezone

from app.database import get_db
from app.models.interaction import Interaction
from app.models.schemas import (
    InteractionCreate, InteractionUpdate, InteractionResponse,
    DashboardStats, ReminderCreate, ReminderResponse
)

router = APIRouter()


# ── CRUD ─────────────────────────────────────────────────────────────────────

@router.post("/log-interaction", response_model=InteractionResponse, status_code=201)
def log_interaction(payload: InteractionCreate, db: Session = Depends(get_db)):
    interaction = Interaction(**payload.model_dump())
    db.add(interaction)
    db.commit()
    db.refresh(interaction)
    return interaction


@router.get("/interactions", response_model=List[InteractionResponse])
def get_interactions(
    skip:             int            = 0,
    limit:            int            = 100,
    hcp_name:         Optional[str]  = Query(None),
    interaction_type: Optional[str]  = Query(None),
    sentiment:        Optional[str]  = Query(None),
    date_from:        Optional[str]  = Query(None),
    date_to:          Optional[str]  = Query(None),
    search:           Optional[str]  = Query(None),    # full-text
    sort_by:          str            = Query("date_time"),
    sort_order:       str            = Query("desc"),
    db: Session = Depends(get_db),
):
    q = db.query(Interaction)

    if hcp_name:
        q = q.filter(Interaction.hcp_name.ilike(f"%{hcp_name}%"))
    if interaction_type:
        q = q.filter(Interaction.interaction_type == interaction_type)
    if sentiment:
        q = q.filter(Interaction.sentiment == sentiment)
    if date_from:
        q = q.filter(Interaction.date_time >= datetime.fromisoformat(date_from))
    if date_to:
        q = q.filter(Interaction.date_time <= datetime.fromisoformat(date_to))
    if search:
        q = q.filter(or_(
            Interaction.notes.ilike(f"%{search}%"),
            Interaction.summary.ilike(f"%{search}%"),
            Interaction.hcp_name.ilike(f"%{search}%"),
            Interaction.follow_up_actions.ilike(f"%{search}%"),
        ))

    col = getattr(Interaction, sort_by, Interaction.date_time)
    q = q.order_by(col.desc() if sort_order == "desc" else col.asc())

    return q.offset(skip).limit(limit).all()


@router.get("/interactions/{interaction_id}", response_model=InteractionResponse)
def get_interaction(interaction_id: int, db: Session = Depends(get_db)):
    row = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not row:
        raise HTTPException(404, "Interaction not found")
    return row


@router.put("/edit-interaction/{interaction_id}", response_model=InteractionResponse)
def edit_interaction(interaction_id: int, payload: InteractionUpdate, db: Session = Depends(get_db)):
    row = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not row:
        raise HTTPException(404, "Interaction not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/interactions/{interaction_id}")
def delete_interaction(interaction_id: int, db: Session = Depends(get_db)):
    row = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not row:
        raise HTTPException(404, "Interaction not found")
    db.delete(row)
    db.commit()
    return {"message": f"Interaction {interaction_id} deleted"}


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard(db: Session = Depends(get_db)):
    all_rows = db.query(Interaction).all()
    total    = len(all_rows)

    pos  = sum(1 for r in all_rows if r.sentiment == "positive")
    neu  = sum(1 for r in all_rows if r.sentiment == "neutral")
    neg  = sum(1 for r in all_rows if r.sentiment == "negative")

    # Interactions by type
    type_counts: dict = {}
    for r in all_rows:
        type_counts[r.interaction_type] = type_counts.get(r.interaction_type, 0) + 1

    # Top HCPs by interaction count
    hcp_counts: dict = {}
    for r in all_rows:
        hcp_counts[r.hcp_name] = hcp_counts.get(r.hcp_name, 0) + 1
    top_hcps = sorted(
        [{"name": k, "count": v} for k, v in hcp_counts.items()],
        key=lambda x: x["count"], reverse=True
    )[:5]

    # Products mentioned
    prod_counts: dict = {}
    for r in all_rows:
        for p in (r.products_discussed or []):
            prod_counts[p] = prod_counts.get(p, 0) + 1
    products_mentioned = sorted(
        [{"name": k, "count": v} for k, v in prod_counts.items()],
        key=lambda x: x["count"], reverse=True
    )[:8]

    # Recent (5 latest)
    recent = sorted(all_rows, key=lambda r: r.date_time, reverse=True)[:5]
    recent_list = [
        {"id": r.id, "hcp_name": r.hcp_name, "interaction_type": r.interaction_type,
         "date_time": r.date_time.isoformat() if r.date_time else "",
         "sentiment": r.sentiment, "summary": r.summary}
        for r in recent
    ]

    # Pending reminders (reminder_date in future, not sent)
    now = datetime.now(timezone.utc)
    pending = sum(
        1 for r in all_rows
        if r.reminder_date and not r.reminder_sent and r.reminder_date > now
    )

    return DashboardStats(
        total_interactions=total,
        positive_count=pos,
        neutral_count=neu,
        negative_count=neg,
        interactions_by_type=type_counts,
        top_hcps=top_hcps,
        recent_interactions=recent_list,
        pending_reminders=pending,
        products_mentioned=products_mentioned,
    )


# ── Reminders ─────────────────────────────────────────────────────────────────

@router.post("/reminders", response_model=ReminderResponse)
def set_reminder(payload: ReminderCreate, db: Session = Depends(get_db)):
    row = db.query(Interaction).filter(Interaction.id == payload.interaction_id).first()
    if not row:
        raise HTTPException(404, "Interaction not found")
    row.reminder_date = payload.reminder_date
    row.reminder_note = payload.reminder_note
    row.reminder_sent = False
    db.commit()
    db.refresh(row)
    return ReminderResponse(
        id=row.id, hcp_name=row.hcp_name,
        reminder_date=row.reminder_date,
        reminder_note=row.reminder_note,
        reminder_sent=row.reminder_sent,
    )


@router.get("/reminders/pending", response_model=List[ReminderResponse])
def get_pending_reminders(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    rows = db.query(Interaction).filter(
        Interaction.reminder_date != None,
        Interaction.reminder_sent == False,
        Interaction.reminder_date >= now,
    ).order_by(Interaction.reminder_date.asc()).all()
    return [
        ReminderResponse(
            id=r.id, hcp_name=r.hcp_name,
            reminder_date=r.reminder_date,
            reminder_note=r.reminder_note,
            reminder_sent=r.reminder_sent,
        ) for r in rows
    ]


@router.patch("/reminders/{interaction_id}/mark-sent")
def mark_reminder_sent(interaction_id: int, db: Session = Depends(get_db)):
    row = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not row:
        raise HTTPException(404, "Interaction not found")
    row.reminder_sent = True
    db.commit()
    return {"message": "Reminder marked as sent"}


# ── Timeline ──────────────────────────────────────────────────────────────────

@router.get("/timeline")
def get_timeline(
    hcp_name:   Optional[str] = Query(None),
    limit:      int           = Query(50),
    db: Session = Depends(get_db)
):
    q = db.query(Interaction).order_by(Interaction.date_time.desc())
    if hcp_name:
        q = q.filter(Interaction.hcp_name.ilike(f"%{hcp_name}%"))
    rows = q.limit(limit).all()
    return [
        {
            "id":               r.id,
            "hcp_name":         r.hcp_name,
            "interaction_type": r.interaction_type,
            "date_time":        r.date_time.isoformat() if r.date_time else "",
            "sentiment":        r.sentiment,
            "sentiment_score":  r.sentiment_score,
            "summary":          r.summary,
            "key_points":       r.key_points or [],
            "products_discussed": r.products_discussed or [],
            "reminder_date":    r.reminder_date.isoformat() if r.reminder_date else None,
        }
        for r in rows
    ]
