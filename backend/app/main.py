from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import interactions, ai_routes

app = FastAPI(title="HCP CRM API", version="1.0.0")

# ✅ CORS FIX (IMPORTANT)
origins = [
    "http://localhost:3000",
    "https://crm-hcp-system.netlify.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ ROUTES
app.include_router(interactions.router, prefix="/api", tags=["interactions"])
app.include_router(ai_routes.router, prefix="/api", tags=["ai"])


# ✅ STARTUP (SAFE VERSION)
@app.on_event("startup")
def startup():
    import sqlalchemy as sa
    from app.database import engine, Base

    try:
        Base.metadata.create_all(bind=engine)
        print("✓ Tables ready")
    except Exception as e:
        print(f"⚠ create_all skipped: {e}")

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
                    pass
            conn.commit()
        print("✓ Migrations done")
    except Exception as e:
        print(f"⚠ Migration skipped: {e}")


# ✅ ROOT
@app.get("/")
def root():
    return {"message": "HCP CRM API is running", "status": "ok"}


# ✅ HEALTH CHECK
@app.get("/health")
def health():
    return {"status": "ok"}