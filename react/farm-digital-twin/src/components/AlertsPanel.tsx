import { type FC } from "react";
import type { ZoneData } from "../api";
import "./AlertsPanel.css";

interface Props {
  zones: ZoneData[];
}

interface Alert {
  id: string;
  type: "critical" | "warning" | "info";
  icon: string;
  message: string;
}

const AlertsPanel: FC<Props> = ({ zones }) => {
  const alerts: Alert[] = [];

  zones.forEach((z) => {
    if (z.status === "CRITICAL") {
      alerts.push({
        id: `${z.zone_id}-crit`,
        type: "critical",
        icon: "🚨",
        message: `Zone ${z.zone_id} — Soil moisture critically low (${z.moisture.toFixed(1)}%)`,
      });
    }

    if (z.drying_rate === "FAST") {
      alerts.push({
        id: `${z.zone_id}-dry`,
        type: "warning",
        icon: "🔥",
        message: `Zone ${z.zone_id} — ${z.prediction}. High evaporation rate detected.`,
      });
    } else if (z.drying_rate === "MEDIUM") {
      alerts.push({
        id: `${z.zone_id}-dry-med`,
        type: "warning",
        icon: "⚠️",
        message: `Zone ${z.zone_id} — ${z.prediction}. Moderate drying rate.`,
      });
    }

    if (z.decision === "DELAY") {
      alerts.push({
        id: `${z.zone_id}-rain`,
        type: "info",
        icon: "🌧️",
        message: `Zone ${z.zone_id} — Rain expected (${z.rain_probability.toFixed(0)}%). Irrigation delayed.`,
      });
    }

    if (z.temperature > 35) {
      alerts.push({
        id: `${z.zone_id}-heat`,
        type: "warning",
        icon: "🌡️",
        message: `Zone ${z.zone_id} — Heat warning: ${z.temperature.toFixed(1)}°C.`,
      });
    }
  });

  return (
    <section className="alerts-panel animate-in" id="alerts-panel">
      <h2 className="section-title">Alerts & Recommendations</h2>
      {alerts.length === 0 ? (
        <div className="alerts-panel__empty glass-card">
          <span>✅</span>
          <p>All zones healthy — no active alerts.</p>
        </div>
      ) : (
        <div className="alerts-panel__list">
          {alerts.map((a) => (
            <div key={a.id} className={`alerts-panel__item alerts-panel__item--${a.type} glass-card`}>
              <span className="alerts-panel__icon">{a.icon}</span>
              <p>{a.message}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default AlertsPanel;
