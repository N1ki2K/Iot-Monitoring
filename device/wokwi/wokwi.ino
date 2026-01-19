#include <WiFi.h>
#include <PubSubClient.h>
#include "DHT.h"
#include "config.h"

#define DHTTYPE DHT22

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);
DHT dht(PIN_DHT, DHTTYPE);

static int readAnalogAvg(int pin, int samples = 20) {
  long sum = 0;
  for (int i = 0; i < samples; i++) {
    sum += analogRead(pin);
    delay(2);
  }
  return (int)(sum / samples);
}

static void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
}

static void connectMQTT() {
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  while (!mqtt.connected()) {
    String clientId = "wokwi-esp32-" + String((uint32_t)ESP.getEfuseMac(), HEX);
    if (mqtt.connect(clientId.c_str())) {
      Serial.println("MQTT connected");
    } else {
      Serial.print("MQTT failed rc=");
      Serial.println(mqtt.state());
      delay(1000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(200);

  dht.begin();
  analogReadResolution(12); // 0..4095

  connectWiFi();
  connectMQTT();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (!mqtt.connected()) connectMQTT();
  mqtt.loop();

  float t = dht.readTemperature();
  float h = dht.readHumidity();

  if (isnan(t) || isnan(h)) {
    Serial.println("DHT read failed");
    delay(2000);
    return;
  }

  int luxRaw   = readAnalogAvg(PIN_LUX);
  int soundRaw = readAnalogAvg(PIN_SOUND);
  int airRaw   = readAnalogAvg(PIN_AIR);

  // Payload fields: t, h, lux, sound, aq
  String payload = "{";
  payload += "\"t\":" + String(t, 2) + ",";
  payload += "\"h\":" + String(h, 2) + ",";
  payload += "\"lux\":" + String(luxRaw) + ",";
  payload += "\"sound\":" + String(soundRaw) + ",";
  payload += "\"aq\":" + String(airRaw);
  payload += "}";

  mqtt.publish(MQTT_TOPIC, payload.c_str());
  Serial.println(payload);

  delay(TELEMETRY_INTERVAL);
}
