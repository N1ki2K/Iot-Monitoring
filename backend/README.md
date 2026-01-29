# IoT Monitoring Backend

Backend services for the IoT Monitoring system. Includes an MQTT ingestion service and a REST API.

## Prerequisites

- Node.js 18+
- PostgreSQL database
- MQTT broker (local Mosquitto or HiveMQ)

## Installation

```bash
npm install
```

## Database Setup

Create the PostgreSQL database and table:

```sql
CREATE DATABASE iot;

\c iot

CREATE TABLE readings (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(64) NOT NULL,
  ts TIMESTAMP DEFAULT NOW(),
  temperature_c DECIMAL(5,2),
  humidity_pct DECIMAL(5,2),
  lux INTEGER,
  sound INTEGER,
  co2_ppm INTEGER
);

CREATE INDEX idx_readings_device_ts ON readings(device_id, ts DESC);

CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  actor_id INTEGER,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_actor_id ON audit_logs (actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs (action);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs (entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs (entity_id);
```

### Apply SQL Migrations

SQL files in `backend/sql` can be applied with:

```bash
npm run migrate
```

## Environment Variables

| Variable     | Default              | Description                    |
|--------------|----------------------|--------------------------------|
| `PGHOST`     | `127.0.0.1`          | PostgreSQL host                |
| `PGPORT`     | `5432`               | PostgreSQL port                |
| `PGUSER`     | `iot`                | PostgreSQL user                |
| `PGPASSWORD` | `iotpass`            | PostgreSQL password            |
| `PGDATABASE` | `iot`                | PostgreSQL database name       |
| `MQTT_URL`   | `mqtt://127.0.0.1:1883` | MQTT broker URL             |
| `MQTT_TOPIC` | `iot/shrek-esp32/telemetry` | MQTT topic to subscribe  |
| `PORT`       | `3000`               | API server port                |

## Running the Services

### MQTT Ingest Service

Subscribes to MQTT and writes sensor data to PostgreSQL.

**Local Mosquitto broker:**
```bash
npm run ingest
```

**Wokwi Web (HiveMQ broker):**
```bash
MQTT_URL=mqtt://broker.hivemq.com:1883 npm run ingest
```

Expected output:
```
MQTT connected
Subscribed to iot/shrek-esp32/telemetry
inserted shrek-esp32 { t: 25.30, h: 60.50, lux: 1234, sound: 456, aq: 789 }
```

### REST API Server

Serves sensor data via HTTP endpoints.

```bash
npm run api
```

Server starts at `http://localhost:3000`

## API Endpoints

### GET /api/devices

Returns a list of all device IDs that have sent data.

**Response:**
```json
["shrek-esp32", "other-device"]
```

### GET /api/latest/:deviceId

Returns the most recent reading for a device.

**Example:** `GET /api/latest/shrek-esp32`

**Response:**
```json
{
  "id": 123,
  "device_id": "shrek-esp32",
  "ts": "2024-01-15T10:30:00.000Z",
  "temperature_c": "25.30",
  "humidity_pct": "60.50",
  "lux": "1234",
  "sound": 456,
  "co2_ppm": 789
}
```

### GET /api/history/:deviceId

Returns historical readings for a device.

**Query Parameters:**
- `hours` (optional, default: 24) - Number of hours of history to return

**Example:** `GET /api/history/shrek-esp32?hours=12`

**Response:**
```json
[
  {
    "id": 100,
    "device_id": "shrek-esp32",
    "ts": "2024-01-15T00:00:00.000Z",
    "temperature_c": "24.50",
    "humidity_pct": "58.00",
    "lux": "1100",
    "sound": 420,
    "co2_ppm": 750
  },
  ...
]
```

## MQTT Payload Format

The ingest service expects JSON payloads on the topic `iot/{device_id}/telemetry`:

```json
{
  "t": 25.30,
  "h": 60.50,
  "lux": 1234,
  "sound": 456,
  "aq": 789
}
```

| Field   | Description              |
|---------|--------------------------|
| `t`     | Temperature in Celsius   |
| `h`     | Humidity percentage      |
| `lux`   | Light level (raw ADC)    |
| `sound` | Sound level (raw ADC)    |
| `aq`    | Air quality / CO2 (raw)  |
