import pandas as pd
from app.database import SessionLocal
from app.models.interaction import Interaction
from datetime import datetime

def load_csv_to_db():
    db = SessionLocal()

    df = pd.read_csv("data/medical_consultations.csv")

    for _, row in df.iterrows():
        interaction = Interaction(
            hcp_name=f"Dr {row['doctor_id']}",  # doctor_id ko name bana diya
            interaction_type=row.get("appointment_type", "Consultation"),
            notes=row.get("consultation_reason", "General checkup"),
            date_time=datetime.utcnow()  # Add timestamp
        )

        db.add(interaction)

    db.commit()
    db.close()

    print("✅ Data inserted successfully")