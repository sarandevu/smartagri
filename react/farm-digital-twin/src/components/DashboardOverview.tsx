import { type FC } from "react";
import type { DashboardStats } from "../api";
import "./DashboardOverview.css";

interface Props {
  stats: DashboardStats | null;
}

const DashboardOverview: FC<Props> = ({ stats }) => {
  const cards = [
    {
      label: "Total Zones",
      value: stats?.total_zones ?? 0,
      icon: "🗺️",
      color: "blue",
    },
    {
      label: "Active Alerts",
      value: stats?.active_alerts ?? 0,
      icon: "🚨",
      color: "red",
    },
    {
      label: "Pumps Active",
      value: stats?.pumps_on ?? 0,
      icon: "⚡",
      color: "green",
    },
    {
      label: "Water Used (L)",
      value: stats?.total_water_used?.toFixed(1) ?? "0.0",
      icon: "💧",
      color: "cyan",
    },
  ];

  return (
    <section className="overview animate-in" id="dashboard-overview">
      <h2 className="section-title">Overview</h2>
      <div className="overview__grid">
        {cards.map((c) => (
          <div key={c.label} className={`overview__card glass-card overview__card--${c.color}`}>
            <span className="overview__card-icon">{c.icon}</span>
            <div>
              <p className="overview__card-value">{c.value}</p>
              <p className="overview__card-label">{c.label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default DashboardOverview;
