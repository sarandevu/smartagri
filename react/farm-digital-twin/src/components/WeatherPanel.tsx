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

  return (
    <section className="weather animate-in" id="weather-panel">
      <h2 className="section-title">Weather Conditions</h2>
      <div className="weather__grid">
        {/* Rain */}
        <div className="weather__card glass-card">
          <span className="weather__big-icon">{rainIcon}</span>
          <div>
            <p className="weather__value">{avgRainProb.toFixed(0)}%</p>
            <p className="weather__label">Rain Probability</p>
            <p className="weather__hint">{rainLabel}</p>
          </div>
        </div>

        {/* Temperature */}
        <div className="weather__card glass-card">
          <span className="weather__big-icon">🌡️</span>
          <div>
            <p className="weather__value">{avgTemp.toFixed(1)}°C</p>
            <p className="weather__label">Avg Temperature</p>
            <p className="weather__hint">
              {avgTemp > 35 ? "Very hot" : avgTemp > 30 ? "Warm" : "Comfortable"}
            </p>
          </div>
        </div>

        {/* Humidity */}
        <div className="weather__card glass-card">
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
    </section>
  );
};

export default WeatherPanel;
