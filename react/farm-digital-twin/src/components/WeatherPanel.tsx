import { type FC } from "react";
import type { ZoneData } from "../api";
import "./WeatherPanel.css";

interface Props {
  zones: ZoneData[];
}

const WeatherPanel: FC<Props> = ({ zones }) => {
  // Aggregate weather data across zones
  const avgRainProb =
    zones.length > 0
      ? zones.reduce((s, z) => s + z.rain_probability, 0) / zones.length
      : 0;
  const avgTemp =
    zones.length > 0
      ? zones.reduce((s, z) => s + z.temperature, 0) / zones.length
      : 0;
  const avgHumidity =
    zones.length > 0
      ? zones.reduce((s, z) => s + z.humidity, 0) / zones.length
      : 0;

  const rainIcon = avgRainProb > 70 ? "🌧️" : avgRainProb > 30 ? "⛅" : "☀️";
  const rainLabel =
    avgRainProb > 70 ? "Rain likely" : avgRainProb > 30 ? "Partly cloudy" : "Clear skies";

  // Decide Manual Irrigation Advice
  let manualAdvice = "";
  let adviceColor = "";

  if (avgRainProb > 70) {
    manualAdvice = "A high probability of rain is detected. Manual irrigation is NOT recommended at this time to prevent overwatering.";
    adviceColor = "var(--accent-blue)";
  } else if (avgTemp > 32 && avgHumidity < 45) {
    manualAdvice = "Intense heat and low humidity detected. High evaporation rates expected! Consider a manual short burst of irrigation to cool the topsoil.";
    adviceColor = "var(--accent-yellow)";
  } else {
    manualAdvice = "Atmospheric conditions are stable. Rely on the automated Predictive Engine for optimal moisture targeting.";
    adviceColor = "var(--accent-green)";
  }

  return (
    <section className="weather animate-in" id="weather-panel">
      <h2 className="section-title" style={{ marginBottom: "16px" }}>Weather & Evaporation Analytics</h2>
      
      <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
        
        <div style={{ padding: "16px", background: "rgba(255,255,255,0.03)", borderLeft: `4px solid ${adviceColor}`, borderRadius: "var(--radius-sm)" }}>
          <h4 style={{ margin: "0 0 8px 0", color: "var(--text-primary)", fontSize: "0.95rem" }}>Operator Recommendation</h4>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.5 }}>
            {manualAdvice}
          </p>
        </div>

        <div className="weather__grid">
          <div className="weather__card glass-card" style={{ background: "transparent", border: "none", boxShadow: "none" }}>
            <span className="weather__big-icon">{rainIcon}</span>
            <div>
              <p className="weather__value">{avgRainProb.toFixed(0)}%</p>
              <p className="weather__label">Rain Probability</p>
              <p className="weather__hint">{rainLabel}</p>
            </div>
          </div>
          
          <div className="weather__card glass-card" style={{ background: "transparent", border: "none", boxShadow: "none" }}>
            <span className="weather__big-icon">🌡️</span>
            <div>
              <p className="weather__value">{avgTemp.toFixed(1)}°C</p>
              <p className="weather__label">Avg Temperature</p>
              <p className="weather__hint">
                {avgTemp > 35 ? "Very hot" : avgTemp > 30 ? "Warm" : "Comfortable"}
              </p>
            </div>
          </div>
          
          <div className="weather__card glass-card" style={{ background: "transparent", border: "none", boxShadow: "none" }}>
            <span className="weather__big-icon">💨</span>
            <div>
              <p className="weather__value">{avgHumidity.toFixed(0)}%</p>
              <p className="weather__label">Avg Humidity</p>
              <p className="weather__hint">
                {avgHumidity < 40 ? "Dry air" : avgHumidity < 70 ? "Normal" : "Humid"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WeatherPanel;
