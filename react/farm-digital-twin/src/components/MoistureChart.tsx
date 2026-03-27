import { useState, useEffect, type FC } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { getZoneHistory, type ZoneData } from "../api";
import "./MoistureChart.css";

interface Props {
  zones: ZoneData[];
}

const COLORS = ["#3b82f6", "#22c55e", "#eab308", "#ef4444", "#a855f7", "#06b6d4"];

const MoistureChart: FC<Props> = ({ zones }) => {
  const [selectedZone, setSelectedZone] = useState<string>(
    zones[0]?.zone_id ?? "A"
  );
  const [history, setHistory] = useState<ZoneData[]>([]);

  useEffect(() => {
    if (!selectedZone) return;
    getZoneHistory(selectedZone)
      .then((res) => setHistory(res.data))
      .catch(() => setHistory([]));
  }, [selectedZone]);

  const chartData = history.map((h, i) => ({
    index: i + 1,
    time: h.timestamp
      ? new Date(h.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : `#${i + 1}`,
    moisture: h.moisture,
    temperature: h.temperature,
    humidity: h.humidity,
  }));

  return (
    <section className="chart-section animate-in" id="moisture-chart">
      <div className="chart-section__header">
        <h2 className="section-title">Analytics — Moisture Over Time</h2>
        <div className="chart-section__tabs">
          {zones.map((z, i) => (
            <button
              key={z.zone_id}
              className={`chart-section__tab ${
                selectedZone === z.zone_id ? "chart-section__tab--active" : ""
              }`}
              style={
                selectedZone === z.zone_id
                  ? { borderColor: COLORS[i % COLORS.length] }
                  : {}
              }
              onClick={() => setSelectedZone(z.zone_id)}
            >
              Zone {z.zone_id}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-section__chart glass-card">
        {chartData.length === 0 ? (
          <p className="chart-section__empty">
            No history data yet for Zone {selectedZone}. Submit sensor readings to populate.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="time"
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              />
              <Tooltip
                contentStyle={{
                  background: "#1e293b",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="moisture"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                name="Moisture %"
              />
              <Line
                type="monotone"
                dataKey="temperature"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                name="Temp °C"
              />
              <Line
                type="monotone"
                dataKey="humidity"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                name="Humidity %"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
};

export default MoistureChart;
