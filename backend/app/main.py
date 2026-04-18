from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, SessionLocal
from app.routes import interactions, ai_routes
import sqlalchemy as sa

# ── Create app FIRST, add middleware SECOND ──────────────────────────────────
app = FastAPI(title="HCP CRM API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(interactions.router, prefix="/api", tags=["interactions"])
app.include_router(ai_routes.router, prefix="/api", tags=["ai"])


# ── Safe DB migration (adds missing columns without dropping data) ────────────
def run_migrations():
    """Add new columns to existing tables if they don't exist yet."""
    new_columns = [
        ("sentiment_score",      "ALTER TABLE interactions ADD COLUMN IF NOT EXISTS sentiment_score FLOAT DEFAULT 0.0"),
        ("key_points",           "ALTER TABLE interactions ADD COLUMN IF NOT EXISTS key_points JSON DEFAULT '[]'::json"),
        ("suggested_follow_ups", "ALTER TABLE interactions ADD COLUMN IF NOT EXISTS suggested_follow_ups JSON DEFAULT '[]'::json"),
        ("reminder_date",        "ALTER TABLE interactions ADD COLUMN IF NOT EXISTS reminder_date TIMESTAMP WITH TIME ZONE"),
        ("reminder_sent",        "ALTER TABLE interactions ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE"),
        ("reminder_note",        "ALTER TABLE interactions ADD COLUMN IF NOT EXISTS reminder_note TEXT DEFAULT ''"),
    ]
    try:
        with engine.connect() as conn:
            for col_name, sql in new_columns:
                try:
                    conn.execute(sa.text(sql))
                    print(f"  ✓ column '{col_name}' ensured")
                except Exception as e:
                    print(f"  ! column '{col_name}': {e}")
            conn.commit()
        print("DB migrations complete.")
    except Exception as e:
        print(f"Migration skipped (DB not ready?): {e}")


@app.on_event("startup")
def startup():
    # Create tables for any brand-new installs
    Base.metadata.create_all(bind=engine)
    # Safely add new columns to existing installs
    run_migrations()


@app.get("/")
def root():
    return {"message": "HCP CRM API is running", "status": "ok"}