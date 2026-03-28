#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <BH1750.h>
#include <DHT.h>
#include "time.h"

// WiFi
const char* ssid = "Netillaya";
const char* password = "kassukudu";

// Supabase
const char* server = "https://lotlrsthxzldecynghbc.supabase.co/rest/v1/sensor_data";
const char* apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvdGxyc3RoeHpsZGVjeW5naGJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1OTYxMjcsImV4cCI6MjA5MDE3MjEyN30.Lsy68LfPDz8cLpLbdEa0oG9TwSK9VbsPYLr-UT_hlp4";

// Pins
#define SOIL1 33
#define SOIL2 35
#define DHTPIN 4
#define DHTTYPE DHT11
#define RELAY_PIN 26
#define FLOW_PIN 27

DHT dht(DHTPIN, DHTTYPE);
BH1750 lightMeter;

// Flow
volatile int pulseCount = 0;
float flowRate = 0;

// Thresholds
int soilThreshold = 5000;
float tempThreshold = 25.0;
float humidityThreshold = 50.0;
float lightThreshold = 2000.0;

// Interrupt
void IRAM_ATTR pulseCounter() {
  pulseCount++;
}

void setup() {
  Serial.begin(115200);

  pinMode(SOIL1, INPUT);
  pinMode(SOIL2, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(FLOW_PIN, INPUT_PULLUP);

  digitalWrite(RELAY_PIN, HIGH); // OFF

  dht.begin();
  Wire.begin(21, 22);
  lightMeter.begin();

  attachInterrupt(digitalPinToInterrupt(FLOW_PIN), pulseCounter, RISING);

  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true);
  delay(100);

  // Fallback Public DNS: Overrides corrupted local Hotspot Router resolutions
  IPAddress primaryDNS(8, 8, 8, 8);
  IPAddress secondaryDNS(1, 1, 1, 1);
  WiFi.config(INADDR_NONE, INADDR_NONE, INADDR_NONE, primaryDNS, secondaryDNS);

  WiFi.begin(ssid, password);
  Serial.print("Connecting WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConnected!");
  delay(2000); // Network stack stabilization grace period
  
  configTime(19800, 0, "pool.ntp.org", "time.nist.gov");
}

void loop() {

  // 🌱 Soil
  int soil1 = analogRead(SOIL1);
  int soil2 = analogRead(SOIL2);

  // 🌡️ DHT11
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();

  // ☀️ Light
  float lux = lightMeter.readLightLevel();

  // 🌊 Flow
  pulseCount = 0;
  delay(1000);
  flowRate = pulseCount * 2.25;

  // 🧠 SMART MULTI-SENSOR LOGIC
  // If either soil sensor is dry, trigger the relay (buzzer / pump)
  bool soilDry = (soil1 < soilThreshold || soil2 < soilThreshold);

  if (soilDry) {
    digitalWrite(RELAY_PIN, HIGH);   // Relay/Buzzer ON (If your module is Active HIGH, change this to HIGH)
    Serial.println("Irrigation ON (Buzzer/Pump Active)");
  } else {
    digitalWrite(RELAY_PIN, LOW);  // Relay/Buzzer OFF (If your module is Active HIGH, change this to LOW)
    Serial.println("Irrigation OFF");
  }

  // 📊 Debug
  Serial.println("------ DATA ------");
  Serial.print("Soil1: "); Serial.println(soil1);
  Serial.print("Soil2: "); Serial.println(soil2);
  Serial.print("Temp: "); Serial.println(temp);
  Serial.print("Humidity: "); Serial.println(hum);
  Serial.print("Light: "); Serial.println(lux);
  Serial.print("Flow: "); Serial.println(flowRate);

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Reconnecting...");
    WiFi.disconnect();
    WiFi.reconnect();
  }

  // 📡 Send to Supabase
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClientSecure client;
    client.setInsecure(); // Skip SSL certificate validation

    HTTPClient http;
    http.begin(client, server);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", apiKey);
    http.addHeader("Authorization", String("Bearer ") + apiKey);

    struct tm timeinfo;
    String timeString = "";
    if(getLocalTime(&timeinfo)){
      char timeStringBuff[50];
      strftime(timeStringBuff, sizeof(timeStringBuff), "%Y-%m-%dT%H:%M:%S+05:30", &timeinfo);
      timeString = String(timeStringBuff);
    }

    String payload = String("{\"soil_moisture1\":") + soil1 +
                     ",\"soil_moisture_2\":" + soil2 +
                     ",\"temperature\":" + temp +
                     ",\"humidity\":" + hum +
                     ",\"light\":" + (int)lux +
                     ",\"flow\":" + flowRate;

    if (timeString != "") {
      payload += ",\"created_at\":\"" + timeString + "\"";
    }
    payload += "}";

    int response = http.POST(payload);
    Serial.print("Response: ");
    Serial.println(response);
    
    if (response > 0) {
      Serial.println(http.getString());
    }

    http.end();
  }

  delay(15000);
}