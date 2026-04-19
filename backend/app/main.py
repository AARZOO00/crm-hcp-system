from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import interactions, ai_routes

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


@app.on_event("startup")
def startup():
    import sqlalchemy as sa
    from app.database import engine, Base

    # Create tables
    try:
        Base.metadata.create_all(bind=engine)
        print("✓ Tables created/verified")
    except Exception as e:
        print(f"⚠ create_all skipped: {e}")

    # Add new columns safely (won't fail if already exist)
    new_columns = [
        "ALTER TABLE interactions ADD COLUMN IF NOT EXISTS sentiment_score FLOAT DEFAULT 0.0",
        "ALTER TABLE interactions ADD COLUMN IF NOT EXISTS key_points JSON DEFAULT '[]'::json",
        "ALTER TABLE interactions ADD COLUMN IF NOT EXISTS suggested_follow_ups JSON DEFAULT '[]'::json",
        "ALTER TABLE interactions ADD COLUMN IF NOT EXISTS reminder_date TIMESTAMP WITH TIME ZONE",
        "ALTER TABLE interactions ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE",
        "ALTER TABLE interactions ADD COLUMN IF NOT EXISTS reminder_note TEXT DEFAULT ''",
    ]
    try:
        with engine.connect() as conn:
            for sql in new_columns:
                try:
                    conn.execute(sa.text(sql))
                except Exception:
                    pass  # column already exists
            conn.commit()
        print("✓ Migrations done")
    except Exception as e:
        print(f"⚠ Migration skipped: {e}")


@app.get("/")
def root():
    return {"message": "HCP CRM API is running", "status": "ok"}