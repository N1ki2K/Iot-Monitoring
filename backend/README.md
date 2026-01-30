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

Create the PostgreSQL database and tables:

```sql
CREATE DATABASE iot;

\c iot

-- Sensor readings from IoT devices
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

-- User accounts
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(64) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_dev BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- IoT controllers/devices
CREATE TABLE controllers (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(64) UNIQUE NOT NULL,
  label TEXT,
  pairing_code VARCHAR(6) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User-to-controller assignments (many-to-many)
CREATE TABLE user_controllers (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  controller_id INTEGER REFERENCES controllers(id) ON DELETE CASCADE,
  label TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, controller_id)
);

-- Audit logs for admin actions
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

### Schema Overview

| Table | Description |
|-------|-------------|
| `readings` | Sensor data from IoT devices |
| `users` | User accounts with roles (user/admin) |
| `controllers` | Registered IoT controllers |
| `user_controllers` | User-to-controller assignments |
| `audit_logs` | Admin action audit trail |

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
