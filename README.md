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
├── mobile/                       # Mobile app (future)
├── packages/                     # Shared packages (future)
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
```

### 2. Start PostgreSQL

Ensure PostgreSQL is running with the `readings` table created (see `backend/README.md`).

### 3. Run Backend

```bash
cd backend
npm install

# Start API server
npm run api

# Start MQTT ingest (separate terminal)
npm run ingest

# For Wokwi web (HiveMQ broker)
MQTT_URL=mqtt://broker.hivemq.com:1883 npm run ingest
```

### 4. Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`

### 5. Start Wokwi Simulation

Run the ESP32 simulation on [wokwi.com](https://wokwi.com) or locally.

## Sensors

| Sensor        | Field       | Unit          |
|---------------|-------------|---------------|
| DHT22         | Temperature | °C            |
| DHT22         | Humidity    | %             |
| Photoresistor | Light       | lux (raw ADC) |
| Microphone    | Sound       | raw ADC       |
| MQ-135        | Air Quality | raw ADC       |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/devices` | List all devices |
| GET | `/api/latest/:deviceId` | Latest reading |
| GET | `/api/history/:deviceId?hours=24` | Historical readings |
| GET | `/api/readings?page=1&limit=20` | Paginated readings with search |

See `backend/README.md` and `frontend/README.md` for full documentation.
