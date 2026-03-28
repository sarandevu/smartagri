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
import { supabase, type ZoneData } from "../api";
import "./MoistureChart.css";

interface Props {
  zones: ZoneData[];
}

const COLORS = ["#3b82f6", "#22c55e", "#eab308", "#ef4444", "#a855f7", "#06b6d4"];

const MoistureChart: FC<Props> = ({ zones }) => {
  const [selectedZone, setSelectedZone] = useState<string>(
    zones[0]?.zone_id ?? "A"
  );
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedZone) return;
    
    async function fetchHistory() {
      const { data } = await supabase
        .from('sensor_data')
        .select('*')
        .order('id', { ascending: false })
        .limit(20); // Capture last 20 events for the graph

      if (data && data.length > 0) {
        // Reverse array so time goes left-to-right on Axis (oldest to newest)
        const reversed = [...data].reverse();
        
        const mapped = reversed.map((row, i) => {
          const rawM = selectedZone === "1" ? row.soil_moisture1 : row.soil_moisture_2;
          const pctM = Math.max(0, Math.min(100, 100 - ((rawM || 0) / 4095.0) * 100));
          
          return {
            index: i + 1,
            time: row.created_at
              ? new Date(row.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : `#${i + 1}`,
            moisture: pctM,
            temperature: row.temperature || 0,
            humidity: row.humidity || 0,
            light: row.light || 0,
            flow: row.flow || 0
          };
        });
        setHistory(mapped);
      } else {
        setHistory([]);
      }
    }
    
    fetchHistory();
  }, [selectedZone, zones]); // Re-run whenever realtime 'zones' prop updates 

  const chartData = history;

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
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2E45" />
              <XAxis
                dataKey="time"
                tick={{ fill: "#A0AEC0", fontSize: 11 }}
                axisLine={{ stroke: "#2A2E45" }}
              />
              <YAxis
                tick={{ fill: "#A0AEC0", fontSize: 11 }}
                axisLine={{ stroke: "#2A2E45" }}
              />
              <Tooltip
                contentStyle={{
                  background: "#16213E",
                  border: "1px solid #2A2E45",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#EAEAEA"
                }}
                itemStyle={{ color: "#EAEAEA" }}
              />
              <Legend wrapperStyle={{ color: "#A0AEC0" }} />
              <Line
                type="monotone"
                dataKey="moisture"
                stroke="#00CFFF"
                strokeWidth={3}
                dot={{ fill: '#00CFFF', r: 2 }}
                activeDot={{ r: 6, fill: '#00CFFF', stroke: '#fff', strokeWidth: 2 }}
                name="Moisture %"
              />
              <Line
                type="monotone"
                dataKey="temperature"
                stroke="#FFC300"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: '#FFC300' }}
                name="Temp °C"
              />
              <Line
                type="monotone"
                dataKey="humidity"
                stroke="#00FF9C"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: '#00FF9C' }}
                name="Humidity %"
              />
              <Line
                type="monotone"
                dataKey="light"
                stroke="#a855f7"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: '#a855f7' }}
                name="Light (lux)"
              />
              <Line
                type="monotone"
                dataKey="flow"
                stroke="#3A86FF"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: '#3A86FF' }}
                name="Flow (L/min)"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
};

export default MoistureChart;
