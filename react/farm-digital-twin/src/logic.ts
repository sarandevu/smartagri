import type { ZoneData } from "./api";

// Evaluation pure logic function defined by the user's logic.txt framework
export function evaluateZone(
  zoneId: string,
  history: any[],
  moistureField: string
): ZoneData {
  if (!history || history.length === 0) return null as any;

  const current = history[0];
  const rawMoisture = current[moistureField] || 0;
  
  // ESP32 Analog Raw to Percentage (100% = 0, 0% = 4095)
  const currentMoistPct = Math.max(0, Math.min(100, 100 - (rawMoisture / 4095.0) * 100));

  const temp = current.temperature || 25;
  const humidity = current.humidity || 50;
  const light = current.light || 300;
  const flow = current.flow || 0;
  
  // Mock external weather input since it isn't recorded by ESP32 physical sensors
  const rain_probability = 0;

  // STEP 1: NORMALIZATION
  const moist_norm = currentMoistPct / 100.0;
  const temp_norm = Math.min(temp / 50.0, 1.0);
  const hum_norm = Math.min(humidity / 100.0, 1.0);
  const light_norm = Math.min(light / 5000.0, 1.0);

  // STEP 2: DRYING FACTOR (ENVIRONMENT MODEL)
  let drying_factor = (temp_norm * 0.4) + ((1 - hum_norm) * 0.3) + (light_norm * 0.3);

  // STEP 6: TREND ANALYSIS & STEP 7: FEEDBACK CORRECTION
  let avgPast = currentMoistPct;
  let confidence = "HIGH";
  let reason = "Optimal sensor behavior.";
  let user_pump_history = false;
  let past_moisture_before_pump = 0;

  if (history.length > 1) {
    let sum = 0;
    const loopMax = Math.min(6, history.length);
    for (let i = 1; i < loopMax; i++) {
        const pastRaw = history[i][moistureField] || 0;
        const pastPct = Math.max(0, Math.min(100, 100 - (pastRaw / 4095.0) * 100));
        sum += pastPct;
        
        if (!user_pump_history && history[i].flow > 0) {
            user_pump_history = true;
            past_moisture_before_pump = pastPct;
        }
    }
    avgPast = sum / (loopMax - 1);
    const trend = avgPast - currentMoistPct;
    
    if (trend > 5) {
        drying_factor *= 1.2; 
    }

    if (user_pump_history) {
        let actual_change = currentMoistPct - past_moisture_before_pump;
        if (actual_change < 5) {
            drying_factor *= 1.15;
            confidence = "MEDIUM";
            reason = "Feedback: Soil absorbing water slower than expected in history.";
        }
    }

    if (Math.abs(currentMoistPct - avgPast) > 25) {
        confidence = "LOW";
        reason = "Warning: Sensors detecting erratic shifts. Reliability lowered.";
    }
  }

  // STEP 3: SHORT-TERM PREDICTION
  let predicted_moisture = moist_norm - (drying_factor * 0.25);

  // STEP 4: WEATHER ADJUSTMENT
  if (rain_probability > 85) {
      predicted_moisture += 0.35;
  } else if (rain_probability > 70) {
      predicted_moisture += 0.20;
  }

  // STEP 8: RISK CLASSIFICATION
  let risk: "CRITICAL" | "MODERATE" | "GOOD" = "GOOD";
  if (predicted_moisture < 0.3) {
      risk = "CRITICAL"; // maps to HIGH risk UX safely
  } else if (predicted_moisture < 0.5) {
      risk = "MODERATE";
  }

  // STEP 9: FINAL DECISION LOGIC
  let decision = "NO_ACTION";
  if (rain_probability > 70) {
      decision = "DELAY_IRRIGATION";
  } else if (predicted_moisture < 0.3) {
      decision = "IRRIGATE";
  } else if (predicted_moisture < 0.5) {
      decision = "MONITOR";
  }

  // STEP 10: CONTROL OUTPUT
  const pump_status = decision === "IRRIGATE" ? "ON" : "OFF";
  
  // Format metadata for the React UX ZoneCard mapping
  const drying_rate_str = drying_factor > 0.6 ? "FAST" : (drying_factor > 0.4 ? "MEDIUM" : "LOW");
  let prediction_str = "Stable";
  if (predicted_moisture < 0.3) {
      prediction_str = "Critical in 2h";
  } else if (predicted_moisture < 0.5) {
      prediction_str = "Dry in 4h";
  }

  return {
    zone_id: zoneId,
    moisture: currentMoistPct,
    temperature: temp,
    humidity: humidity,
    light_intensity: light,
    rain_probability: rain_probability,
    status: risk,
    prediction: prediction_str,
    drying_rate: drying_rate_str,
    decision: decision.replace("_", " "),
    pump_status: pump_status,
    water_flow_rate: flow,
    mode: "AUTO",
    timestamp: current.created_at || new Date().toISOString(),
    confidence: confidence,
    reason: reason
  };
}
