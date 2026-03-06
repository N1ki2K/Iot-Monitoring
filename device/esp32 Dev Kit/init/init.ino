#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

// =========================
// Pin mapping
// =========================
#define DHT_PIN       4
#define DHT_TYPE      DHT22

#define LIGHT_PIN     34
#define AIR_PIN       35
#define SOUND_PIN     32

// =========================
// WiFi + MQTT config
// =========================
const char* WIFI_SSID = "PGKNMA";
const char* WIFI_PASS = "24071927";

const char* MQTT_HOST = "192.168.88.39";
const int   MQTT_PORT = 1883;

// MQTT topics
const char* TOPIC_STATUS = "iot/shrek-esp32/status";
const char* TOPIC_DATA   = "iot/shrek-esp32/telemetry";

WiFiClient espClient;
PubSubClient mqttClient(espClient);
DHT dht(DHT_PIN, DHT_TYPE);

unsigned long lastPublish = 0;
const unsigned long PUBLISH_INTERVAL_MS = 5000;

// =========================
// WiFi connection
// =========================
void connectWiFi() {

  Serial.print("Connecting to WiFi");

  WiFi.begin(WIFI_SSID, WIFI_PASS);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

// =========================
// MQTT connection
// =========================
void connectMQTT() {

  while (!mqttClient.connected()) {

    Serial.print("Connecting to MQTT... ");

    String clientId = "esp32-" + String((uint32_t)ESP.getEfuseMac(), HEX);

    if (mqttClient.connect(clientId.c_str())) {

      Serial.println("connected");

      mqttClient.publish(TOPIC_STATUS, "online", true);

    } else {

      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" retrying in 2 seconds...");

      delay(2000);
    }
  }
}

// =========================
// Safe sensor reads
// =========================
float safeReadTemperature() {

  float value = dht.readTemperature();

  if (isnan(value)) return -999.0;

  return value;
}

float safeReadHumidity() {

  float value = dht.readHumidity();

  if (isnan(value)) return -999.0;

  return value;
}

// =========================
// Publish sensor data
// =========================
void publishSensorData() {

  float temperature = safeReadTemperature();
  float humidity = safeReadHumidity();

  int lightRaw = analogRead(LIGHT_PIN);
  int airRaw   = analogRead(AIR_PIN);
  int soundRaw = analogRead(SOUND_PIN);

  Serial.println("----- SENSOR READINGS -----");

  if (temperature == -999 || humidity == -999) {
    Serial.println("DHT22 read failed");
  } else {

    Serial.print("Temperature: ");
    Serial.print(temperature);
    Serial.println(" C");

    Serial.print("Humidity: ");
    Serial.print(humidity);
    Serial.println(" %");
  }

  Serial.print("Light raw: ");
  Serial.println(lightRaw);

  Serial.print("Air raw: ");
  Serial.println(airRaw);

  Serial.print("Sound raw: ");
  Serial.println(soundRaw);

  Serial.println("---------------------------");

  // EXACT JSON payload from your original code
  String payload = "{";

  payload += "\"t\":" + String(temperature, 2) + ",";
  payload += "\"h\":" + String(humidity, 2) + ",";
  payload += "\"lux\":" + String(lightRaw) + ",";
  payload += "\"sound\":" + String(soundRaw) + ",";
  payload += "\"aq\":" + String(airRaw);

  payload += "}";

  mqttClient.publish(TOPIC_DATA, payload.c_str());
}

// =========================
// Setup
// =========================
void setup() {

  Serial.begin(115200);

  delay(1000);

  dht.begin();

  analogReadResolution(12);

  connectWiFi();

  mqttClient.setServer(MQTT_HOST, MQTT_PORT);

  connectMQTT();

  Serial.println("ESP32 IoT multi-sensor MQTT started");
}

// =========================
// Loop
// =========================
void loop() {

  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  if (!mqttClient.connected()) {
    connectMQTT();
  }

  mqttClient.loop();

  unsigned long now = millis();

  if (now - lastPublish >= PUBLISH_INTERVAL_MS) {

    lastPublish = now;

    publishSensorData();
  }
}
