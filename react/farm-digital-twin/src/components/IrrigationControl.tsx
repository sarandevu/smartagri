import { type FC } from "react";
import type { ZoneData } from "../api";
import "./IrrigationControl.css";

interface Props {
  zones: ZoneData[];
  onTogglePump: (zoneId: string, action: "ON" | "OFF") => void;
}

const IrrigationControl: FC<Props> = ({ zones, onTogglePump }) => {
  return (
    <section className="irrigation animate-in" id="irrigation-control">
      <h2 className="section-title">Irrigation Control</h2>
      <div className="irrigation__grid">
        {zones.map((z) => (
          <div key={z.zone_id} className="irrigation__row glass-card">
            <div className="irrigation__zone-info">
              <h4>Zone {z.zone_id}</h4>
              <span className={`badge badge--${z.status === "CRITICAL" ? "critical" : z.status === "MODERATE" ? "moderate" : "good"}`}>
                {z.status}
              </span>
            </div>

            <div className="irrigation__controls">
              <div className="irrigation__mode">
                <span className="irrigation__label">Mode</span>
                <span className={`irrigation__mode-badge ${z.mode === "AUTO" ? "irrigation__mode-badge--auto" : "irrigation__mode-badge--manual"}`}>
                  {z.mode}
                </span>
              </div>

              <div className="irrigation__pump">
                <span className="irrigation__label">Pump</span>
                <button
                  className={`irrigation__pump-btn ${z.pump_status === "ON" ? "irrigation__pump-btn--on" : "irrigation__pump-btn--off"}`}
                  onClick={() =>
                    onTogglePump(z.zone_id, z.pump_status === "ON" ? "OFF" : "ON")
                  }
                >
                  <span className="irrigation__pump-dot" />
                  {z.pump_status}
                </button>
              </div>

              <div className="irrigation__decision">
                <span className="irrigation__label">Decision</span>
                <span>{z.decision.replace("_", " ")}</span>
              </div>
            </div>
          </div>
        ))}
        {zones.length === 0 && (
          <p className="irrigation__empty">No zones registered yet. Send sensor data to get started.</p>
        )}
      </div>
    </section>
  );
};

export default IrrigationControl;
