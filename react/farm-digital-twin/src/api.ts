import axios from "axios";
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://lotlrsthxzldecynghbc.supabase.co";
export const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvdGxyc3RoeHpsZGVjeW5naGJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1OTYxMjcsImV4cCI6MjA5MDE3MjEyN30.Lsy68LfPDz8cLpLbdEa0oG9TwSK9VbsPYLr-UT_hlp4";
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
});

export interface SensorPayload {
  zone_id: string;
  moisture: number;
  temperature: number;
  humidity: number;
  light_intensity: number;
  rain_probability: number;
  mode: "AUTO" | "MANUAL";
}

export interface ZoneData {
  id?: number;
  zone_id: string;
  moisture: number;
  temperature: number;
  humidity: number;
  light_intensity: number;
  rain_probability: number;
  status: "CRITICAL" | "MODERATE" | "GOOD";
  prediction: string;
  drying_rate: string;
  decision: string;
  pump_status: "ON" | "OFF";
  water_flow_rate: number;
  mode: string;
  timestamp: string;
  confidence?: string;
  reason?: string;
}

export interface DashboardStats {
  total_zones: number;
  active_alerts: number;
  pumps_on: number;
  total_water_used: number;
  zones: ZoneData[];
}

export const sendSensorData = (data: SensorPayload) =>
  api.post<ZoneData>("/sensor-data", data);

export const getZones = () => api.get<ZoneData[]>("/zones");

export const getZoneHistory = (zoneId: string) =>
  api.get<ZoneData[]>(`/zone/${zoneId}/history`);

export const togglePump = (zone_id: string, action: "ON" | "OFF") =>
  api.post("/pump", { zone_id, action });

export const getStats = () => api.get<DashboardStats>("/stats");

export default api;
