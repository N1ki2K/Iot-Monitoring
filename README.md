# IoT Monitoring System

Monorepo for an IoT monitoring platform with ESP32 telemetry ingestion, a Node.js API, a React dashboard, shared TypeScript types, Docker-based local infrastructure, and an Android client.

## Overview

The system ingests MQTT messages from devices, stores readings in PostgreSQL, and exposes them through an API consumed by the web frontend and mobile app.

```text
Physical ESP32 -> MQTT broker -> backend ingest -> PostgreSQL -> backend API -> web / mobile clients
```

## What Is In This Repo

- `backend/`: Express API, MQTT ingest worker, SQL migrations, and backend tests
- `frontend/`: React + Vite dashboard for auth, monitoring, admin, audit, and health views
- `packages/shared-types/`: shared TypeScript models used by frontend and backend
- `infra/`: Docker Compose stack for Mosquitto, PostgreSQL, and Adminer
- `device/`: ESP32 firmware for the physical board
- `mobile/`: Android app and home-screen widget
- `docs/`: hardware PDFs and project notes

## File Structure

```text
Iot-Monitoring/
├── .env
├── package.json
├── README.md
├── backend/
│   ├── package.json
│   ├── README.md
│   ├── scripts/
│   │   └── migrate.ts
│   ├── sql/
│   │   ├── 001_create_audit_logs.sql
│   │   ├── 002_add_user_role.sql
│   │   ├── 004_add_user_is_admin.sql
│   │   ├── 005_add_user_invite_fields.sql
│   │   ├── 006_add_sound_dbfs.sql
│   │   ├── 007_add_sound_est_spl.sql
│   │   ├── 008_add_air_baseline_pct.sql
│   │   ├── 009_rename_co2_ppm_to_air_quality_raw.sql
│   │   └── 010_drop_legacy_user_flag.sql
│   └── src/
│       ├── api.ts
│       ├── api.test.ts
│       ├── ingest.ts
│       └── ingest.test.ts
├── device/
│   └── esp32/
│       └── init/
│           └── init.ino
├── docs/
│   ├── Espressif Systems_01292021_esp32.pdf
│   ├── MQ-135-Gas-Sensor-Schematic.pdf
│   ├── SNS-MQ135.pdf
│   └── unit-tests-needed.md
├── frontend/
│   ├── package.json
│   ├── README.md
│   ├── public/
│   └── src/
│       ├── api/
│       │   ├── index.ts
│       │   └── index.test.ts
│       ├── components/
│       │   ├── AdminDashboard.tsx
│       │   ├── AuditLogs.tsx
│       │   ├── Auth.tsx
│       │   ├── Chart.tsx
│       │   ├── Dashboard.tsx
│       │   ├── DataTable.tsx
│       │   ├── DeviceSelector.tsx
│       │   ├── HealthStatCard.tsx
│       │   ├── PasswordChangeRequired.tsx
│       │   ├── ProfileMenu.tsx
│       │   ├── SensorCard.tsx
│       │   ├── Settings.tsx
│       │   ├── SystemHealth.tsx
│       │   ├── UserInviteModal.tsx
│       │   └── index.ts
│       ├── test/
│       │   └── setup.ts
│       ├── types/
│       │   └── index.ts
│       ├── utils/
│       │   ├── air.ts
│       │   ├── flags.ts
│       │   ├── flags.test.ts
│       │   └── readings.ts
│       ├── App.tsx
│       ├── index.css
│       └── main.tsx
├── infra/
│   ├── .env
│   ├── .env.example
│   ├── README.md
│   ├── docker-compose.prod.yml
│   ├── docker-compose.yml
│   ├── mosquitto/
│   └── postgres/
├── mobile/
│   ├── app/
│   │   ├── build.gradle.kts
│   │   ├── proguard-rules.pro
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       ├── java/
│   │       └── res/
│   ├── build.gradle.kts
│   ├── gradle/
│   ├── gradle.properties
│   ├── gradlew
│   ├── gradlew.bat
│   └── settings.gradle.kts
├── packages/
│   └── shared-types/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           └── models/
```

## Current Features

### Backend

- REST API with Express
- MQTT ingest worker that writes sensor readings to PostgreSQL
- user registration and login
- account self-service endpoints: profile update, password change, account deletion
- admin flows for inviting users, managing controllers, assigning devices, viewing audit logs, and viewing health stats
- SQL migration runner in `backend/scripts/migrate.ts`

### Frontend

- login and registration flow
- dashboard with latest reading cards, charts, device selection, and readings table
- controller claiming by 5-digit pairing code or QR payload text
- admin dashboard for users and controllers
- audit log screen
- system health screen
- account settings and forced password-change flow

### Mobile and Device

- Android client under `mobile/`
- Android home-screen widget declared in `AndroidManifest.xml`
- physical ESP32 firmware under `device/esp32/init/init.ino`

## Tech Stack

- Backend: Node.js, Express, TypeScript, `pg`, `mqtt`
- Frontend: React 19, Vite, TypeScript, Tailwind CSS, Recharts
- Shared package: workspace-local TypeScript package
- Infrastructure: PostgreSQL 16, Eclipse Mosquitto, Adminer, Docker Compose
- Mobile: Android / Gradle / Kotlin

## Environment Variables

The backend loads the root `.env` file. The frontend uses `VITE_*` variables from the same workspace setup.

Example root `.env`:

```env
# PostgreSQL
PGHOST=127.0.0.1
PGPORT=5432
PGUSER=iot
PGPASSWORD=iotpass
PGDATABASE=iot

# MQTT
MQTT_URL=mqtt://127.0.0.1:1883
MQTT_TOPIC=iot/esp32/telemetry

# API
PORT=3000
CORS_ORIGINS=http://localhost:5173
JWT_SECRET=replace-this-with-a-long-random-secret
JWT_EXPIRES_IN_SECONDS=3600

# Frontend
VITE_API_URL=http://localhost:3000/api

# Mobile
MOBILE_API_URL=http://YOUR-LAN-IP:3000/api
```

Notes:

- `MOBILE_API_URL` must point to your machine's LAN IP for a physical device or emulator setup that cannot use browser localhost.
- `JWT_SECRET` should be a long random secret and must be set in the root `.env` for backend bearer-token auth.
- `JWT_EXPIRES_IN_SECONDS` controls access-token lifetime in seconds.
- The backend now fails startup if `JWT_SECRET` is missing.
- `infra/.env.example` contains Compose-specific database defaults for the infrastructure stack.

## Local Setup

### 1. Install dependencies

From the repo root:

```bash
npm install
npm run build:types
```

### 2. Start infrastructure

From `infra/`:

```bash
cp .env.example .env
docker compose up -d
```

This starts:

- Mosquitto on `localhost:1883`
- PostgreSQL on `localhost:5432`
- Adminer on `http://localhost:8080`

### 3. Create the root `.env`

Create `/home/shrek/Documents/Projects/Iot-Monitoring/.env` using the example in the "Environment Variables" section and adjust values for your local services.

### 4. Create the database and base tables

If you are using the Docker Compose stack, PostgreSQL will already be running on `localhost:5432`. Create the database first:

```bash
psql -h 127.0.0.1 -p 5432 -U iot -d postgres -c "CREATE DATABASE iot;"
```

Then connect and create the base schema:

```sql
-- Sensor readings from IoT devices
CREATE TABLE IF NOT EXISTS readings (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(64) NOT NULL,
  ts TIMESTAMP DEFAULT NOW(),
  temperature_c DECIMAL(5,2),
  humidity_pct DECIMAL(5,2),
  lux INTEGER,
  sound INTEGER,
  co2_ppm INTEGER
);

CREATE INDEX IF NOT EXISTS idx_readings_device_ts ON readings(device_id, ts DESC);

-- User accounts
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(64) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- IoT controllers/devices
CREATE TABLE IF NOT EXISTS controllers (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(64) UNIQUE NOT NULL,
  label TEXT,
  pairing_code VARCHAR(6) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User-to-controller assignments
CREATE TABLE IF NOT EXISTS user_controllers (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  controller_id INTEGER REFERENCES controllers(id) ON DELETE CASCADE,
  label TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, controller_id)
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
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

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs (entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs (entity_id);
```

Example `psql` session:

```bash
psql -h 127.0.0.1 -p 5432 -U iot -d iot
```

Paste the SQL above into that session.

### 5. Run database migrations

From the repo root:

```bash
npm run migrate -w backend
```

The migration files in `backend/sql/` add the newer columns used by the current backend, including invite metadata and the newer sound and air-quality fields.

### 6. Start the app

From the repo root:

```bash
npm run dev
```

Or run API, ingest, and frontend together:

```bash
npm run dev:all
```

Open `http://localhost:5173`.

## Workspace Scripts

### Root

| Command | Purpose |
|---|---|
| `npm run dev` | Run backend API and frontend together |
| `npm run dev:all` | Run backend API, MQTT ingest worker, and frontend |
| `npm run dev:api` | Run only the backend API |
| `npm run dev:ingest` | Run only the MQTT ingest worker |
| `npm run dev:fe` | Run only the frontend |
| `npm run build` | Build shared types and frontend |
| `npm run build:types` | Build shared TypeScript package |
| `npm run build:fe` | Build frontend only |
| `npm run install:all` | Install deps and build shared types |
| `npm run test:all` | Run backend, frontend, and mobile tests |

### Backend

| Command | Purpose |
|---|---|
| `npm run api -w backend` | Start API server |
| `npm run ingest -w backend` | Start MQTT ingest worker |
| `npm run migrate -w backend` | Apply SQL migrations |
| `npm run test:ci -w backend` | Run backend tests with coverage |

### Frontend

| Command | Purpose |
|---|---|
| `npm run dev -w frontend` | Start Vite dev server |
| `npm run build -w frontend` | Production build |
| `npm run test:ci -w frontend` | Run frontend tests with coverage |

## API Surface

Representative endpoints exposed by `backend/src/api.ts`:

### Auth and user

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`
- `PATCH /api/me`
- `PATCH /api/me/password`
- `DELETE /api/me`
- `GET /api/users`
- `GET /api/users/:userId`
- `PATCH /api/users/:userId`
- `DELETE /api/users/:userId`
- `PATCH /api/users/:userId/role`

Auth behavior:

- `POST /api/auth/register` and `POST /api/auth/login` return the authenticated user plus a JWT access token.
- Protected backend routes expect `Authorization: Bearer <token>`.
- The backend signs and verifies bearer tokens using `JWT_SECRET` from the root `.env`.

### Controllers and assignments

- `GET /api/controllers`
- `GET /api/controllers/available-devices`
- `POST /api/controllers`
- `POST /api/controllers/claim`
- `DELETE /api/controllers/:controllerId`
- `GET /api/users/:userId/controllers`
- `POST /api/users/:userId/controllers`
- `PATCH /api/users/:userId/controllers/:controllerId`
- `DELETE /api/users/:userId/controllers`

### Monitoring and admin

- `GET /api/health`
- `GET /api/admin/health`
- `GET /api/audit`
- `DELETE /api/audit`
- `GET /api/devices`
- `GET /api/latest/:deviceId`
- `GET /api/history/:deviceId`
- `GET /api/readings`

## Sensor Payloads

The ingest worker currently expects MQTT messages shaped like:

```json
{
  "t": 23.4,
  "h": 41.2,
  "lux": 318,
  "sound": 512,
  "sound_dbfs": -42.1,
  "sound_est_spl": 61.3,
  "aq": 287,
  "air_baseline_pct": 96.4
}
```

These are written into the `readings` table along with the device ID parsed from the MQTT topic.

## Physical ESP32 Firmware

The physical board firmware lives in `device/esp32/init/init.ino`.

- update the Wi-Fi and MQTT values in `device/esp32/init/init.ino`
- keep the device topic aligned with `MQTT_TOPIC` in the root `.env`
- flash the sketch to your ESP32 and verify it publishes telemetry over MQTT

## Testing

Available automated tests:

- backend: Vitest in `backend/src/*.test.ts`
- frontend: Vitest in `frontend/src/**/*.test.ts`
- mobile: Gradle test task via `./gradlew test`

Run everything from the root:

```bash
npm run test:all
```

## Additional Docs

- [backend README](/home/shrek/Documents/Projects/Iot-Monitoring/backend/README.md)
- [frontend README](/home/shrek/Documents/Projects/Iot-Monitoring/frontend/README.md)
- [infra README](/home/shrek/Documents/Projects/Iot-Monitoring/infra/README.md)
