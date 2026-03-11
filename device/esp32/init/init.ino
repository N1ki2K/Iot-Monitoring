#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <math.h>

#define DHT_PIN       4
#define DHT_TYPE      DHT22

#define LIGHT_PIN     34
#define AIR_PIN       35
#define SOUND_PIN     32

#define TARGET_CHIP_MODEL         "ESP32-D0WD-V3"
#define DEVICE_ID_PREFIX          "esp32"
#define SERIAL_BAUD_RATE          115200
#define ANALOG_RESOLUTION_BITS    12
#define ADC_MAX_VALUE             ((1 << ANALOG_RESOLUTION_BITS) - 1)
#define ADC_MIDPOINT              (ADC_MAX_VALUE / 2.0f)
#define PUBLISH_INTERVAL_MS       5000UL
#define MQTT_RETRY_DELAY_MS       2000UL
#define SOUND_SAMPLE_COUNT        256
#define MIN_SOUND_DBFS            -90.0f
#define SPL_OFFSET_DB             84.0f
#define AIR_BASELINE_RAW          1850.0f

//#define WIFI_SSID                 "PGKNMA"
//#define WIFI_PASS                 "24071927"
#define WIFI_SSID                   "C:/Malware/Virus.exe"
#define WIFI_PASS                   "123456890!"

//#define MQTT_HOST                 "192.168.88.90" //arch
//#define MQTT_HOST                 "192.168.88.77" //mach
#define MQTT_HOST                 "192.168.181.86" //mobile
#define MQTT_PORT                 1883

// MQTT topics
#define TOPIC_STATUS              "iot/esp32/status"
#define TOPIC_DATA                "iot/esp32/telemetry"

WiFiClient espClient;
PubSubClient mqttClient(espClient);
DHT dht(DHT_PIN, DHT_TYPE);

unsigned long lastPublish = 0;

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

void connectMQTT() {

  while (!mqttClient.connected()) {

    Serial.print("Connecting to MQTT... ");

    String clientId = String(DEVICE_ID_PREFIX) + "-" + String((uint32_t)ESP.getEfuseMac(), HEX);

    if (mqttClient.connect(clientId.c_str())) {

      Serial.println("connected");
      Serial.print("Target chip: ");
      Serial.println(TARGET_CHIP_MODEL);

      mqttClient.publish(TOPIC_STATUS, "online", true);

    } else {

      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" retrying in 2 seconds...");

      delay(MQTT_RETRY_DELAY_MS);
    }
  }
}

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

float readSoundDbFs(int &soundRaw) {

  int samples[SOUND_SAMPLE_COUNT];
  double sumSamples = 0.0;
  int minSample = ADC_MAX_VALUE;
  int maxSample = 0;

  for (int i = 0; i < SOUND_SAMPLE_COUNT; i++) {
    int sample = analogRead(SOUND_PIN);
    samples[i] = sample;
    sumSamples += sample;

    if (sample < minSample) minSample = sample;
    if (sample > maxSample) maxSample = sample;
  }

  soundRaw = maxSample - minSample;

  float meanSample = sumSamples / SOUND_SAMPLE_COUNT;
  double sumSquares = 0.0;

  for (int i = 0; i < SOUND_SAMPLE_COUNT; i++) {
    float centered = samples[i] - meanSample;
    sumSquares += centered * centered;
  }

  float rms = sqrt(sumSquares / SOUND_SAMPLE_COUNT);

  if (rms <= 0.0f) return MIN_SOUND_DBFS;

  float dbFs = 20.0f * log10(rms / ADC_MIDPOINT);

  if (dbFs < MIN_SOUND_DBFS) return MIN_SOUND_DBFS;

  return dbFs;
}

float estimateSoundSpl(float soundDbFs) {

  if (soundDbFs <= MIN_SOUND_DBFS) return 0.0f;

  return soundDbFs + SPL_OFFSET_DB;
}

float estimateAirBaselinePct(int airRaw) {

  if (AIR_BASELINE_RAW <= 0.0f) return 0.0f;

  return (airRaw / AIR_BASELINE_RAW) * 100.0f;
}

void publishSensorData() {

  float temperature = safeReadTemperature();
  float humidity = safeReadHumidity();

  int lightRaw = analogRead(LIGHT_PIN);
  int airRaw   = analogRead(AIR_PIN);
  int soundRaw = 0;
  float soundDbFs = readSoundDbFs(soundRaw);
  float soundEstSpl = estimateSoundSpl(soundDbFs);
  float airBaselinePct = estimateAirBaselinePct(airRaw);

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

  Serial.print("Air baseline %: ");
  Serial.println(airBaselinePct, 2);

  Serial.print("Sound raw: ");
  Serial.println(soundRaw);

  Serial.print("Sound dBFS: ");
  Serial.println(soundDbFs, 2);

  Serial.print("Sound est SPL: ");
  Serial.println(soundEstSpl, 2);

  Serial.println("---------------------------");

  String payload = "{";

  payload += "\"t\":" + String(temperature, 2) + ",";
  payload += "\"h\":" + String(humidity, 2) + ",";
  payload += "\"lux\":" + String(lightRaw) + ",";
  payload += "\"sound\":" + String(soundRaw) + ",";
  payload += "\"sound_dbfs\":" + String(soundDbFs, 2) + ",";
  payload += "\"sound_est_spl\":" + String(soundEstSpl, 2) + ",";
  payload += "\"aq\":" + String(airRaw) + ",";
  payload += "\"air_baseline_pct\":" + String(airBaselinePct, 2);

  payload += "}";

  mqttClient.publish(TOPIC_DATA, payload.c_str());
}

void setup() {

  Serial.begin(SERIAL_BAUD_RATE);

  delay(1000);

  dht.begin();

  analogReadResolution(ANALOG_RESOLUTION_BITS);

  connectWiFi();

  mqttClient.setServer(MQTT_HOST, MQTT_PORT);

  connectMQTT();

  Serial.print(TARGET_CHIP_MODEL);
  Serial.println(" IoT multi-sensor MQTT started");
}

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
