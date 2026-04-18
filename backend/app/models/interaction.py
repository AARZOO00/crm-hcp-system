from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, Boolean, Float
from sqlalchemy.sql import func
from app.database import Base


class Interaction(Base):
    __tablename__ = "interactions"

    id                   = Column(Integer, primary_key=True, index=True)
    hcp_name             = Column(String(255), nullable=False, index=True)
    interaction_type     = Column(String(100), nullable=False)
    date_time            = Column(DateTime(timezone=True), nullable=False)
    notes                = Column(Text, default="")
    follow_up_actions    = Column(Text, default="")
    sentiment            = Column(String(50), default="neutral", index=True)
    sentiment_score      = Column(Float, default=0.0)          # -1.0 → +1.0
    products_discussed   = Column(JSON, default=list)
    summary              = Column(Text, default="")
    raw_text             = Column(Text, default="")
    key_points           = Column(JSON, default=list)          # AI-extracted bullets
    suggested_follow_ups = Column(JSON, default=list)          # AI suggestions stored
    reminder_date        = Column(DateTime(timezone=True), nullable=True)
    reminder_sent        = Column(Boolean, default=False)
    reminder_note        = Column(Text, default="")
    created_at           = Column(DateTime(timezone=True), server_default=func.now())
    updated_at           = Column(DateTime(timezone=True), onupdate=func.now())
