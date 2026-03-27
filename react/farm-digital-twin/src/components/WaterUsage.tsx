import { type FC } from "react";
import type { DashboardStats } from "../api";
import "./WaterUsage.css";

interface Props {
  stats: DashboardStats | null;
}

const WaterUsage: FC<Props> = ({ stats }) => {
  const totalWater = stats?.total_water_used ?? 0;
  const pumpsOn = stats?.pumps_on ?? 0;
  const totalZones = stats?.total_zones ?? 1;
  const efficiency = totalZones > 0 ? ((1 - pumpsOn / totalZones) * 100) : 100;

  return (
    <section className="water-usage animate-in" id="water-usage">
      <h2 className="section-title">Water Usage</h2>
      <div className="water-usage__grid">
        {/* Total used */}
        <div className="water-usage__card glass-card">
          <div className="water-usage__card-header">
            <span className="water-usage__card-icon">🌊</span>
            <span className="water-usage__card-label">Total Used</span>
          </div>
          <p className="water-usage__value">
            {totalWater.toFixed(1)} <span className="water-usage__unit">L</span>
          </p>
        </div>

        {/* Active flow */}
        <div className="water-usage__card glass-card">
          <div className="water-usage__card-header">
            <span className="water-usage__card-icon">💧</span>
            <span className="water-usage__card-label">Active Pumps</span>
          </div>
          <p className="water-usage__value">{pumpsOn}</p>
        </div>

        {/* Efficiency */}
        <div className="water-usage__card glass-card">
          <div className="water-usage__card-header">
            <span className="water-usage__card-icon">📊</span>
            <span className="water-usage__card-label">Efficiency</span>
          </div>
          <div className="water-usage__efficiency">
            <div className="water-usage__eff-track">
              <div
                className="water-usage__eff-fill"
                style={{ width: `${Math.min(100, efficiency)}%` }}
              />
            </div>
            <span className="water-usage__eff-value">{efficiency.toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WaterUsage;
