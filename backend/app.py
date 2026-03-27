"""
Farm Digital Twin — Backend API
Predictive Irrigation & Automation System
"""

import sqlite3
import random
import os
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

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
# Core Logic  (exactly per plan.txt)
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
    return "OFF"  # manual default; overridden by /api/pump


def flow_rate(pump_status: str) -> float:
    if pump_status == "ON":
        return round(random.uniform(1.5, 4.5), 2)  # simulated L/min
    return 0.0


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────

@app.route("/api/sensor-data", methods=["POST"])
def receive_sensor_data():
    """Receive sensor readings, run logic, return decision & persist."""
    data = request.get_json(force=True)

    zone_id = data.get("zone_id", "A")
    moisture = float(data.get("moisture", 50))
    temperature = float(data.get("temperature", 25))
    humidity = float(data.get("humidity", 50))
    light_intensity = float(data.get("light_intensity", 300))
    rain_probability = float(data.get("rain_probability", 0))
    mode = data.get("mode", "AUTO").upper()

    status = detect_status(moisture)
    drying_rate, prediction = predict_soil(temperature, humidity)
    decision = weather_decision(rain_probability, moisture)
    pump_status = auto_control(mode, decision)
    water = flow_rate(pump_status)
    timestamp = datetime.utcnow().isoformat()

    # Persist
    conn = get_db()
    conn.execute(
        """INSERT INTO sensor_logs
           (zone_id, moisture, temperature, humidity, light_intensity,
            rain_probability, status, prediction, drying_rate, decision,
            pump_status, water_flow_rate, mode, timestamp)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (zone_id, moisture, temperature, humidity, light_intensity,
         rain_probability, status, prediction, drying_rate, decision,
         pump_status, water, mode, timestamp),
    )
    conn.commit()
    conn.close()

    return jsonify({
        "zone_id": zone_id,
        "status": status,
        "prediction": prediction,
        "drying_rate": drying_rate,
        "decision": decision,
        "pump_status": pump_status,
        "water_flow_rate": water,
        "mode": mode,
        "timestamp": timestamp,
    })


@app.route("/api/zones", methods=["GET"])
def get_zones():
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
    return jsonify([dict(r) for r in rows])


@app.route("/api/zone/<zone_id>/history", methods=["GET"])
def zone_history(zone_id):
    """Return the last 50 records for a zone (for charts)."""
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM sensor_logs WHERE zone_id = ? ORDER BY id DESC LIMIT 50",
        (zone_id,),
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows][::-1])  # oldest-first


@app.route("/api/pump", methods=["POST"])
def manual_pump():
    """Manual pump override — sets pump ON/OFF for a zone."""
    data = request.get_json(force=True)
    zone_id = data.get("zone_id", "A")
    action = data.get("action", "OFF").upper()

    conn = get_db()
    # Fetch latest row for this zone to keep other fields
    row = conn.execute(
        "SELECT * FROM sensor_logs WHERE zone_id = ? ORDER BY id DESC LIMIT 1",
        (zone_id,),
    ).fetchone()

    if not row:
        conn.close()
        return jsonify({"error": "Zone not found"}), 404

    water = flow_rate(action)
    timestamp = datetime.utcnow().isoformat()

    conn.execute(
        """INSERT INTO sensor_logs
           (zone_id, moisture, temperature, humidity, light_intensity,
            rain_probability, status, prediction, drying_rate, decision,
            pump_status, water_flow_rate, mode, timestamp)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (zone_id, row["moisture"], row["temperature"], row["humidity"],
         row["light_intensity"], row["rain_probability"], row["status"],
         row["prediction"], row["drying_rate"], "MANUAL_OVERRIDE",
         action, water, "MANUAL", timestamp),
    )
    conn.commit()
    conn.close()

    return jsonify({
        "zone_id": zone_id,
        "pump_status": action,
        "water_flow_rate": water,
        "timestamp": timestamp,
    })


@app.route("/api/stats", methods=["GET"])
def dashboard_stats():
    """Aggregate stats for the dashboard overview."""
    conn = get_db()

    # Latest per zone
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

    return jsonify({
        "total_zones": total_zones,
        "active_alerts": active_alerts,
        "pumps_on": pumps_on,
        "total_water_used": round(total_water, 2),
        "zones": [dict(r) for r in rows],
    })


# ──────────────────────────────────────────────
# Startup
# ──────────────────────────────────────────────

if __name__ == "__main__":
    init_db()
    print("🌱 Farm Digital Twin backend running on http://localhost:5000")
    app.run(debug=True, port=5000)
