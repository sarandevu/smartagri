import { type FC } from "react";
import type { ZoneData } from "../api";
import "./ZoneCard.css";

interface Props {
  zone: ZoneData;
  onTogglePump: (zoneId: string, action: "ON" | "OFF") => void;
}

const statusMeta: Record<string, { label: string; cls: string }> = {
  GOOD: { label: "Good", cls: "good" },
  MODERATE: { label: "Moderate", cls: "moderate" },
  CRITICAL: { label: "Critical", cls: "critical" },
};

const ZoneCard: FC<Props> = ({ zone, onTogglePump }) => {
  const meta = statusMeta[zone.status] ?? statusMeta.GOOD;
  const moisturePct = Math.min(100, Math.max(0, zone.moisture));

  return (
    <div className="zone-card glass-card animate-in" id={`zone-card-${zone.zone_id}`}>
      {/* Header */}
      <div className="zone-card__header">
        <h3 className="zone-card__name">Zone {zone.zone_id}</h3>
        <span className={`badge badge--${meta.cls}`}>
          <span className={`zone-card__dot zone-card__dot--${meta.cls}`} />
          {meta.label}
        </span>
      </div>

      {/* Moisture gauge */}
      <div className="zone-card__gauge">
        <div className="zone-card__gauge-track">
          <div
            className={`zone-card__gauge-fill zone-card__gauge-fill--${meta.cls}`}
            style={{ width: `${moisturePct}%` }}
          />
        </div>
        <span className="zone-card__gauge-value">{zone.moisture.toFixed(1)}%</span>
      </div>
      <p className="zone-card__label">Soil Moisture</p>

      {/* Metrics grid */}
      <div className="zone-card__metrics">
        <div className="zone-card__metric">
          <span className="zone-card__metric-icon">🌡️</span>
          <span>{zone.temperature.toFixed(1)}°C</span>
        </div>
        <div className="zone-card__metric">
          <span className="zone-card__metric-icon">💧</span>
          <span>{zone.humidity.toFixed(0)}%</span>
        </div>
        <div className="zone-card__metric">
          <span className="zone-card__metric-icon">☀️</span>
          <span>{zone.light_intensity.toFixed(0)} lx</span>
        </div>
        <div className="zone-card__metric">
          <span className="zone-card__metric-icon">🌧️</span>
          <span>{zone.rain_probability.toFixed(0)}%</span>
        </div>
      </div>

      {/* Prediction */}
      <div className="zone-card__prediction">
        <span className="zone-card__prediction-icon">⏳</span>
        <span>{zone.prediction}</span>
      </div>

      {/* Decision + pump */}
      <div className="zone-card__actions">
        <span className={`badge badge--${zone.decision === "IRRIGATE" ? "critical" : zone.decision === "DELAY" ? "moderate" : "good"}`}>
          {zone.decision.replace("_", " ")}
        </span>
        <button
          className={`btn btn--${zone.pump_status === "ON" ? "danger" : "success"} btn--sm`}
          onClick={() =>
            onTogglePump(zone.zone_id, zone.pump_status === "ON" ? "OFF" : "ON")
          }
        >
          Pump {zone.pump_status === "ON" ? "⏹ OFF" : "▶ ON"}
        </button>
      </div>
    </div>
  );
};

export default ZoneCard;
