import { type FC } from "react";
import type { ZoneData } from "../api";
import "./LandMap.css";

interface Props {
  zones: ZoneData[];
}

const LandMap: FC<Props> = ({ zones }) => {
  return (
    <section className="landmap-section animate-in" id="land-map">
      <div className="section-header" style={{ marginBottom: "8px" }}>
        <h2 className="section-title">Farm Spatial Simulation</h2>
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
          Real-time dynamic visualization of soil moisture saturation across zones. The topography physically shifts toward lush Green as continuous irrigation targets are met.
        </p>
      </div>

      <div className="landmap-grid glass-card">
        {zones.map((zone) => {
          // Dynamic color interpolation
          // 0% -> RGB(255, 76, 76) [RED/ORANGE]
          // 100% -> RGB(0, 255, 156) [GREEN]
          const m = Math.max(0, Math.min(100, zone.moisture));
          const r = Math.round(255 - (255 * m) / 100);
          const g = Math.round(76 + ((255 - 76) * m) / 100);
          const b = Math.round(76 + ((156 - 76) * m) / 100);
          
          const bgColor = `rgba(${r}, ${g}, ${b}, 0.2)`;
          const borderColor = `rgba(${r}, ${g}, ${b}, 0.7)`;

          return (
            <div 
              key={zone.zone_id} 
              className="landmap-plot" 
              style={{ 
                backgroundColor: bgColor, 
                borderColor: borderColor 
              }}
            >
              <div className="landmap-plot-inner">
                <h3 style={{ margin: 0, fontSize: "1.3rem", fontWeight: "800", color: "#EAEAEA" }}>Zone {zone.zone_id}</h3>
                <span style={{ fontSize: "0.85rem", color: borderColor, fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "30px" }}>
                  {zone.status}
                </span>
                <div style={{ fontSize: "2.4rem", fontWeight: "800", color: "#EAEAEA", textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
                  {zone.moisture.toFixed(1)}%
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Total Saturation
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default LandMap;
