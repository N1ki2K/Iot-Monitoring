# IoT Monitoring System

Real-time IoT sensor monitoring system with ESP32 devices, MQTT ingestion, and a React dashboard.

## Architecture

```
ESP32 (Wokwi) → MQTT Broker → Backend Ingest → PostgreSQL → Backend API → React Frontend
```

## File Structure

```
Iot-Monitoring/
├── .env                          # Centralized environment config
├── README.md
│
├── backend/                      # Node.js + Express API
│   ├── src/
│   │   ├── api.ts               # REST API server (port 3000)
│   │   └── ingest.ts            # MQTT → PostgreSQL ingestion
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── frontend/                     # React + Vite dashboard
│   ├── src/
│   │   ├── api/
│   │   │   └── index.ts         # API client (axios)
│   │   ├── components/
│   │   │   ├── Chart.tsx        # Recharts line chart
│   │   │   ├── Dashboard.tsx    # Main dashboard layout
│   │   │   ├── DataTable.tsx    # Paginated data table
│   │   │   ├── DeviceSelector.tsx
│   │   │   ├── SensorCard.tsx   # Sensor metric cards
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   └── index.ts         # TypeScript interfaces
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css            # Tailwind v4 styles
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   └── README.md
│
├── device/                       # ESP32 firmware
│   └── wokwi/
│       ├── sketch.ino           # Arduino code for sensors
│       └── diagram.json         # Wokwi circuit diagram
│
├── infra/                        # Infrastructure configs
│   ├── mosquitto/               # MQTT broker config
│   └── README.md
│
├── docs/                         # Documentation
├── mobile/                       # Android app (Kotlin)
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml
│   │   │   ├── java/com/monitoring/iotmon/
│   │   │   │   └── MainActivity.kt
│   │   │   └── res/
│   │   │       ├── layout/
│   │   │       │   └── widget_sensor.xml
│   │   │       ├── drawable/     # Widget backgrounds + status icons
│   │   │       ├── mipmap-*/     # Launcher icons
│   │   │       ├── values/       # Colors, strings, theme
│   │   │       └── xml/          # Backup + widget metadata
│   │   ├── build.gradle.kts
│   │   └── proguard-rules.pro
│   ├── build.gradle.kts
│   ├── settings.gradle.kts
│   ├── gradle.properties
│   ├── gradle/
│   │   └── wrapper/
│   ├── gradlew
│   └── gradlew.bat
├── packages/                     # Shared packages
│   └── shared-types/            # Shared TypeScript types
│       ├── src/
│       │   ├── models/
│       │   │   ├── user.ts      # User types (AuthUser, etc.)
│       │   │   ├── reading.ts   # Reading types
│       │   │   ├── controller.ts # Controller types
│       │   │   └── api.ts       # API response types
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
└── tools/                        # Utility scripts (future)
```

## Quick Start

### 1. Setup Environment

Copy and configure the `.env` file in the project root:

```env
# PostgreSQL
PGHOST=127.0.0.1
PGPORT=5432
PGUSER=iot
PGPASSWORD=iotpass
PGDATABASE=iot

# MQTT
MQTT_URL=mqtt://127.0.0.1:1883
MQTT_TOPIC=iot/shrek-esp32/telemetry

# Backend
PORT=3000

# Frontend
VITE_API_URL=http://localhost:3000/api

# Mobile (change to device IP)
MOBILE_API_URL=http://172.21.129.86:3000/api/ 
```

### 2. Start Infrastructure (PostgreSQL + MQTT)

Choose one:

**Option A: Docker Compose (recommended for local dev)**

```bash
cd infra
export POSTGRES_DB=iot
export POSTGRES_USER=iot
export POSTGRES_PASSWORD=iotpass
docker compose up -d
```

This brings up:
- MQTT broker on `localhost:1883`
- PostgreSQL on `localhost:5432`
- Adminer on `http://localhost:8080`

**Option B: Use your own PostgreSQL + Mosquitto**

Make sure PostgreSQL matches the `.env` values and the MQTT broker matches `MQTT_URL`.

### 3. Initialize the Database

Open Adminer at `http://localhost:8080` and login with:

| Field    | Value      |
|----------|------------|
| System   | PostgreSQL |
| Server   | `db`       |
| Username | `iot`      |
| Password | `iotpass`  |
| Database | `iot`      |

Click "SQL command" and run the following to create the `readings` table:

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
```

### 4. Install Dependencies

```bash
# From project root - installs all workspaces
npm install

# Build shared types (required first time)
npm run build:types
```

### 5. Run Everything

**Option A: Run all together (from project root)**

```bash
# API + Frontend
npm run dev

# API + MQTT Ingest + Frontend
npm run dev:all
```

**Option B: Run individually (from project root)**

| Command              | Description                       |
|----------------------|-----------------------------------|
| `npm run dev`        | Runs API + Frontend together      |
| `npm run dev:all`    | Runs API + MQTT Ingest + Frontend |
| `npm run dev:api`    | Runs only the Backend API         |
| `npm run dev:fe`     | Runs only the Frontend            |
| `npm run dev:ingest` | Runs only MQTT Ingest             |
| `npm run build`      | Builds shared-types + frontend    |

**Option C: Run from individual folders**

```bash
# Backend (from backend/)
cd backend
npm install
npm run api      # API server
npm run ingest   # MQTT ingest (separate terminal)

# Frontend (from frontend/)
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`

### 6. Start Wokwi Simulation

Run the ESP32 simulation on [wokwi.com](https://wokwi.com) or locally.

Update `device/wokwi/config.h` to match your broker:
- For local Mosquitto: set `MQTT_HOST` to your machine IP on the LAN.

Make sure `MQTT_TOPIC` in `config.h` matches `MQTT_TOPIC` in `.env`.

#### (Optional) Build Wokwi Firmware Locally

The repo already includes prebuilt firmware in `device/wokwi/build/`. If you want to rebuild it:

```bash
# Install ESP32 core
arduino-cli core install esp32:esp32

# Install required libraries
arduino-cli lib install "DHT sensor library" "Adafruit Unified Sensor" "PubSubClient"

# Compile the sketch into device/wokwi/build
arduino-cli compile --fqbn esp32:esp32:esp32 device/wokwi --output-dir device/wokwi/build
```

## Sensors

| Sensor        | Field       | Unit          |
|---------------|-------------|---------------|
| DHT22         | Temperature | °C            |
| DHT22         | Humidity    | %             |
| Photoresistor | Light       | lux (raw ADC) |
| Microphone    | Sound       | raw ADC       |
| MQ-135        | Air Quality | raw ADC       |

## API Endpoints

| Method | Endpoint                          | Description                    |
|--------|-----------------------------------|--------------------------------|
| GET    | `/api/devices`                    | List all devices               |
| GET    | `/api/latest/:deviceId`           | Latest reading                 |
| GET    | `/api/history/:deviceId?hours=24` | Historical readings            |
| GET    | `/api/readings?page=1&limit=20`   | Paginated readings with search |

See `backend/README.md` and `frontend/README.md` for full documentation.

## Mobile App (Android)

The Android app is built with Kotlin and Jetpack Compose.

### Features
- Real-time sensor dashboard
- Push notifications with custom thresholds
- Biometric authentication (fingerprint/face)
- Home screen widget
- QR code scanner for device claiming
- Dark theme

### Build & Run

```bash
cd mobile

# Build debug APK
./gradlew assembleDebug

# Install on connected device
./gradlew installDebug

# Or use Android Studio
```

The APK will be at `mobile/app/build/outputs/apk/debug/app-debug.apk`

### Configuration

Update `MOBILE_API_URL` in `.env` to point to your backend server's IP address (not localhost, use your machine's LAN IP for physical devices).
