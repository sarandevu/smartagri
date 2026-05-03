"""
Farm Digital Twin — Backend API
Predictive Irrigation & Automation System
(FastAPI Version)
"""

import sqlite3
import random
import os
import asyncio
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any

from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(title="Farm Digital Twin API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "farm.db")

# ──────────────────────────────────────────────
# Database helpers
# ──────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sensor_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            zone_id TEXT NOT NULL,
            moisture REAL,
            temperature REAL,
            humidity REAL,
            light_intensity REAL,
            rain_probability REAL,
            status TEXT,
            prediction TEXT,
            drying_rate TEXT,
            decision TEXT,
            pump_status TEXT,
            water_flow_rate REAL,
            mode TEXT,
            timestamp TEXT
        )
    """)
    conn.commit()
    conn.close()


# ──────────────────────────────────────────────
# Pydantic Models for Input Validation
# ──────────────────────────────────────────────

class SensorPayload(BaseModel):
    zone_id: str = "A"
    moisture: float = 50.0
    temperature: float = 25.0
    humidity: float = 50.0
    light_intensity: float = 300.0
    rain_probability: float = 0.0
    mode: str = "AUTO"

class PumpPayload(BaseModel):
    zone_id: str = "A"
    action: str = "OFF"


# ──────────────────────────────────────────────
# Core Logic
# ──────────────────────────────────────────────

def detect_status(moisture: float) -> str:
    if moisture < 30:
        return "CRITICAL"
    elif moisture < 60:
        return "MODERATE"
    return "GOOD"


def predict_soil(temperature: float, humidity: float) -> tuple:
    if temperature > 32 and humidity < 40:
        return "FAST", "Dry in 2 hours"
    elif temperature > 30:
        return "MEDIUM", "Dry in 4 hours"
    return "LOW", "Stable"


def weather_decision(rain_probability: float, moisture: float) -> str:
    if rain_probability > 70:
        return "DELAY"
    elif moisture < 30:
        return "IRRIGATE"
    return "NO_ACTION"


def auto_control(mode: str, decision: str) -> str:
    if mode == "AUTO":
        return "ON" if decision == "IRRIGATE" else "OFF"
    return "OFF"


def flow_rate(pump_status: str) -> float:
    if pump_status == "ON":
        return round(random.uniform(1.5, 4.5), 2)
    return 0.0


# ──────────────────────────────────────────────
# Supabase Background Sync Task
# ──────────────────────────────────────────────

def prepopulate_db():
    conn = get_db()
    count = conn.execute("SELECT COUNT(*) as c FROM sensor_logs").fetchone()["c"]
    if count == 0 and supabase:
        print("🔄 Prepopulating SQLite from Supabase history...")
        try:
            response = supabase.table("sensor_data").select("*").order("id", desc=True).limit(50).execute()
            if response.data:
                rows = response.data[::-1] # process oldest first
                for row in rows:
                    soil1 = row.get("soil_moisture1", 0)
                    soil2 = row.get("soil_moisture_2", 0)
                    moist_1 = max(0, min(100, 100 - (soil1 / 4095.0) * 100))
                    moist_2 = max(0, min(100, 100 - (soil2 / 4095.0) * 100))
                    temperature = float(row.get("temperature", 25))
                    humidity = float(row.get("humidity", 50))
                    light = float(row.get("light", 300))
                    flow = float(row.get("flow", 0.0))
                    timestamp = row.get("created_at") or datetime.utcnow().isoformat()
                    
                    zones_to_process = [("1", float(moist_1)), ("2", float(moist_2))]
                    
                    for z_id, moisture in zones_to_process:
                        status = detect_status(moisture)
                        drying_rate, prediction = predict_soil(temperature, humidity)
                        decision = weather_decision(0.0, moisture)
                        pump_status = auto_control("AUTO", decision)
                        
                        conn.execute(
                            """INSERT INTO sensor_logs
                               (zone_id, moisture, temperature, humidity, light_intensity,
                                rain_probability, status, prediction, drying_rate, decision,
                                pump_status, water_flow_rate, mode, timestamp)
                               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                            (z_id, moisture, temperature, humidity, light,
                             0.0, status, prediction, drying_rate, decision,
                             pump_status, flow, "AUTO", timestamp),
                        )
                conn.commit()
                # Update last processed ID
                global last_processed_id
                last_processed_id = response.data[0].get("id")
                print("✅ Prepopulated history from Supabase.")
        except Exception as e:
            print(f"Error prepopulating: {e}")
    conn.close()

last_processed_id = None

async def sync_supabase_to_sqlite():
    global last_processed_id
    print("🔄 Started Supabase Sync Background Task...")
    while True:
        try:
            if supabase:
                response = supabase.table("sensor_data").select("*").order("id", desc=True).limit(1).execute()
                
                if response.data:
                    latest_row = response.data[0]
                    current_id = latest_row.get("id")
                    
                    if current_id != last_processed_id:
                        last_processed_id = current_id
                        
                        soil1 = latest_row.get("soil_moisture1", 0)
                        soil2 = latest_row.get("soil_moisture_2", 0)
                        
                        # Convert analog to moisture %
                        moist_1 = max(0, min(100, 100 - (soil1 / 4095.0) * 100))
                        moist_2 = max(0, min(100, 100 - (soil2 / 4095.0) * 100))
                        
                        temperature = float(latest_row.get("temperature", 25))
                        humidity = float(latest_row.get("humidity", 50))
                        light = float(latest_row.get("light", 300))
                        flow = float(latest_row.get("flow", 0.0))
                        
                        # Process both zones
                        zones_to_process = [
                            ("1", float(moist_1)), 
                            ("2", float(moist_2))
                        ]
                        
                        # Use same timestamp for both
                        timestamp = datetime.utcnow().isoformat()
                        
                        conn = get_db()
                        for z_id, moisture in zones_to_process:
                            status = detect_status(moisture)
                            drying_rate, prediction = predict_soil(temperature, humidity)
                            
                            rain_probability = 0.0 
                            decision = weather_decision(rain_probability, moisture)
                            pump_status = auto_control("AUTO", decision)
                            
                            conn.execute(
                                """INSERT INTO sensor_logs
                                   (zone_id, moisture, temperature, humidity, light_intensity,
                                    rain_probability, status, prediction, drying_rate, decision,
                                    pump_status, water_flow_rate, mode, timestamp)
                                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                                (z_id, moisture, temperature, humidity, light,
                                 rain_probability, status, prediction, drying_rate, decision,
                                 pump_status, flow, "AUTO", timestamp),
                            )
                        conn.commit()
                        conn.close()
                        print(f"✅ Synced row {current_id} from Supabase. Created entries for Zone 1 and Zone 2.")
        except Exception as e:
            print(f"Error fetching from Supabase: {e}")
            
        await asyncio.sleep(5)


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────

@app.post("/api/sensor-data")
def receive_sensor_data(data: SensorPayload):
    """Receive legacy direct POSTs and process."""
    status = detect_status(data.moisture)
    drying_rate, prediction = predict_soil(data.temperature, data.humidity)
    decision = weather_decision(data.rain_probability, data.moisture)
    
    pump_status = auto_control(data.mode.upper(), decision)
    water = flow_rate(pump_status)
    timestamp = datetime.utcnow().isoformat()

    conn = get_db()
    conn.execute(
        """INSERT INTO sensor_logs
           (zone_id, moisture, temperature, humidity, light_intensity,
            rain_probability, status, prediction, drying_rate, decision,
            pump_status, water_flow_rate, mode, timestamp)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (data.zone_id, data.moisture, data.temperature, data.humidity, data.light_intensity,
         data.rain_probability, status, prediction, drying_rate, decision,
         pump_status, water, data.mode.upper(), timestamp),
    )
    conn.commit()
    conn.close()

    return {
        "zone_id": data.zone_id,
        "status": status,
        "prediction": prediction,
        "drying_rate": drying_rate,
        "decision": decision,
        "pump_status": pump_status,
        "water_flow_rate": water,
        "mode": data.mode.upper(),
        "timestamp": timestamp,
    }


@app.get("/api/zones")
def get_zones() -> List[Dict[str, Any]]:
    """Return the latest state for every zone."""
    conn = get_db()
    rows = conn.execute(
        """SELECT * FROM sensor_logs
           WHERE id IN (
               SELECT MAX(id) FROM sensor_logs GROUP BY zone_id
           )
           ORDER BY zone_id"""
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/api/zone/{zone_id}/history")
def zone_history(zone_id: str) -> List[Dict[str, Any]]:
    """Return the last 50 records for a zone (for charts)."""
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM sensor_logs WHERE zone_id = ? ORDER BY id DESC LIMIT 50",
        (zone_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows][::-1]


@app.post("/api/pump")
def manual_pump(payload: PumpPayload):
    """Manual pump override."""
    action = payload.action.upper()
    
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM sensor_logs WHERE zone_id = ? ORDER BY id DESC LIMIT 1",
        (payload.zone_id,),
    ).fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Zone not found")

    water = flow_rate(action)
    timestamp = datetime.utcnow().isoformat()

    conn.execute(
        """INSERT INTO sensor_logs
           (zone_id, moisture, temperature, humidity, light_intensity,
            rain_probability, status, prediction, drying_rate, decision,
            pump_status, water_flow_rate, mode, timestamp)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (payload.zone_id, row["moisture"], row["temperature"], row["humidity"],
         row["light_intensity"], row["rain_probability"], row["status"],
         row["prediction"], row["drying_rate"], "MANUAL_OVERRIDE",
         action, water, "MANUAL", timestamp),
    )
    conn.commit()
    conn.close()

    return {
        "zone_id": payload.zone_id,
        "pump_status": action,
        "water_flow_rate": water,
        "timestamp": timestamp,
    }


@app.get("/api/stats")
def dashboard_stats():
    """Aggregate stats."""
    conn = get_db()

    rows = conn.execute(
        """SELECT * FROM sensor_logs
           WHERE id IN (SELECT MAX(id) FROM sensor_logs GROUP BY zone_id)"""
    ).fetchall()

    total_zones = len(rows)
    active_alerts = sum(1 for r in rows if r["status"] == "CRITICAL")
    pumps_on = sum(1 for r in rows if r["pump_status"] == "ON")

    total_water = conn.execute(
        "SELECT COALESCE(SUM(water_flow_rate), 0) as total FROM sensor_logs"
    ).fetchone()["total"]

    conn.close()

    return {
        "total_zones": total_zones,
        "active_alerts": active_alerts,
        "pumps_on": pumps_on,
        "total_water_used": round(total_water, 2),
        "zones": [dict(r) for r in rows],
    }


# ──────────────────────────────────────────────
# Startup Initialization
# ──────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    init_db()
    if supabase:
        prepopulate_db()
        asyncio.create_task(sync_supabase_to_sqlite())
    else:
        print("⚠️ Supabase client not initialized (check .env file). Sync task disabled.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=5000, reload=True)

