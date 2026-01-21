#ifndef CONFIG_H
#define CONFIG_H

// WiFi Configuration
#define WIFI_SSID "Wokwi-GUEST"
#define WIFI_PASS ""

// MQTT Broker Configuration
// Local Mosquitto: "localhost" or "127.0.0.1" or your IP
// Wokwi Web (HiveMQ): "broker.hivemq.com"
#define MQTT_HOST "10.232.149.86"
#define MQTT_PORT 1883

// MQTT Topic
#define MQTT_TOPIC "iot/shrek-esp32/telemetry"

// Device ID (extracted from topic, but can override)
#define DEVICE_ID "shrek-esp32"

// Sensor Pins
#define PIN_DHT   15
#define PIN_LUX   34
#define PIN_SOUND 35
#define PIN_AIR   32

// Telemetry interval (ms)
#define TELEMETRY_INTERVAL 5000

#endif
