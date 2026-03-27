import { useState, useEffect, useCallback, useRef } from "react";
import {
  getStats,
  togglePump,
  sendSensorData,
  type DashboardStats,
  type ZoneData,
} from "./api";
import Sidebar from "./components/Sidebar";
import DashboardOverview from "./components/DashboardOverview";
import ZoneCard from "./components/ZoneCard";
import AlertsPanel from "./components/AlertsPanel";
import IrrigationControl from "./components/IrrigationControl";
import WaterUsage from "./components/WaterUsage";
import WeatherPanel from "./components/WeatherPanel";
import MoistureChart from "./components/MoistureChart";
import "./App.css";

/* ── Simulated sensor payloads for demo ─── */
const DEMO_ZONES = ["A", "B", "C", "D"];

function randomSensor(zoneId: string) {
  return {
    zone_id: zoneId,
    moisture: +(Math.random() * 80 + 10).toFixed(1),
    temperature: +(Math.random() * 15 + 22).toFixed(1),
    humidity: +(Math.random() * 50 + 20).toFixed(1),
    light_intensity: +(Math.random() * 800 + 100).toFixed(0),
    rain_probability: +(Math.random() * 100).toFixed(0),
    mode: "AUTO" as const,
  };
}

export default function App() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [seeded, setSeeded] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  /* ── Fetch dashboard data ─── */
  const refresh = useCallback(async () => {
    try {
      const res = await getStats();
      setStats(res.data);
      setZones(res.data.zones ?? []);
    } catch {
      /* backend might not be running yet */
    }
  }, []);

  /* ── Seed demo data on first load ─── */
  useEffect(() => {
    async function seed() {
      try {
        for (const z of DEMO_ZONES) {
          await sendSensorData(randomSensor(z));
        }
        setSeeded(true);
      } catch {
        /* backend not running — that's ok */
      }
    }
    if (!seeded) seed();
  }, [seeded]);

  /* ── Auto-refresh every 5 s ─── */
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  /* ── Pump toggle handler ─── */
  const handleTogglePump = async (zoneId: string, action: "ON" | "OFF") => {
    await togglePump(zoneId, action);
    refresh();
  };

  /* ── Nav scroll ─── */
  const handleNavigate = (section: string) => {
    setActiveSection(section);
    sectionRefs.current[section]?.scrollIntoView({ behavior: "smooth" });
  };

  const setRef = (id: string) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  };

  return (
    <div className="app-layout">
      <Sidebar activeSection={activeSection} onNavigate={handleNavigate} />

      <main className="app-main">
        {/* Header */}
        <header className="app-header">
          <div>
            <h1 className="app-header__title">Farm Digital Twin</h1>
            <p className="app-header__subtitle">
              Predictive Irrigation & Automation Dashboard
            </p>
          </div>
          <button className="btn btn--primary" onClick={refresh}>
            🔄 Refresh
          </button>
        </header>

        {/* Sections */}
        <div ref={setRef("dashboard")}>
          <DashboardOverview stats={stats} />
        </div>

        <div ref={setRef("zones")} className="zones-section">
          <h2 className="section-title">Zone Monitoring</h2>
          <div className="zones-grid">
            {zones.map((z) => (
              <ZoneCard key={z.zone_id} zone={z} onTogglePump={handleTogglePump} />
            ))}
            {zones.length === 0 && (
              <p className="empty-hint">
                No zone data yet. Start the backend and sensor data will appear here.
              </p>
            )}
          </div>
        </div>

        <div ref={setRef("alerts")}>
          <AlertsPanel zones={zones} />
        </div>

        <div ref={setRef("irrigation")}>
          <IrrigationControl zones={zones} onTogglePump={handleTogglePump} />
        </div>

        <div ref={setRef("water")}>
          <WaterUsage stats={stats} />
        </div>

        <div ref={setRef("weather")}>
          <WeatherPanel zones={zones} />
        </div>

        <div ref={setRef("charts")}>
          <MoistureChart zones={zones} />
        </div>
      </main>
    </div>
  );
}
