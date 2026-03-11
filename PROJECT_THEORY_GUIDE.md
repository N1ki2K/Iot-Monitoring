# IoT Monitoring Project Theory Guide

This file is a practical knowledge base for writing the theory/documentation section for the IoT Monitoring project. It is based on the current repository state and is intended to give someone enough context to explain what the system is, why it exists, how it works, and how its parts fit together.

## 1. Project Summary

### Project name

IoT Monitoring System

### One-sentence description

A multi-client IoT platform that collects environmental telemetry from ESP32-based devices over MQTT, stores it in PostgreSQL, and exposes it through a Node.js API to web and Android clients.

### Short academic-style abstract

The project implements an Internet of Things monitoring system for collecting, storing, and visualizing environmental sensor data. An ESP32 controller reads temperature, humidity, light, sound, and air-quality-related values and publishes telemetry to an MQTT broker. A backend ingestion service subscribes to the telemetry topic, validates and stores incoming data in PostgreSQL, and a REST API exposes user, device, reading, audit, and health-management functionality. A React web dashboard and an Android client provide monitoring, device claiming, administration, and historical analysis features. The system follows a modular monorepo structure and uses shared TypeScript models to keep the backend and frontend synchronized.

## 2. Problem Statement

This project addresses the need for low-cost, near real-time monitoring of environmental conditions through connected sensors. In many home, lab, classroom, workshop, or small-building scenarios, raw sensor values are difficult to use unless they are:

- collected continuously
- stored historically
- accessible remotely
- linked to specific users and devices
- visualized in a usable interface
- manageable by administrators

Without a central monitoring system, sensor readings remain isolated on the hardware device and are difficult to analyze over time. This project solves that by building a full pipeline from physical sensor acquisition to human-facing dashboards and mobile access.

## 3. Main Goal and Objectives

### Main goal

To design and implement a complete IoT monitoring platform that acquires telemetry from sensor-equipped controllers and delivers it securely to users through web and mobile applications.

### Core objectives

- acquire sensor readings from an ESP32-based controller
- publish telemetry using MQTT
- persist readings in a relational database
- expose readings and management operations through a REST API
- support user registration, login, and profile management
- support device registration, assignment, and claiming through pairing codes or QR payloads
- provide historical and latest-reading visualization
- support administrator-only operations
- maintain audit logs for sensitive actions
- provide system health and operational statistics

## 4. Why This Architecture Was Chosen

The architecture is intentionally split into clear layers:

- device layer: captures physical-world data
- messaging layer: decouples telemetry producers from consumers
- backend layer: handles ingest, persistence, business logic, and authorization
- data layer: stores structured historical records
- presentation layer: web and mobile interfaces

This separation improves maintainability and allows each layer to evolve independently. MQTT is suitable for lightweight telemetry transport. PostgreSQL is appropriate for structured telemetry plus relational entities such as users, controllers, and assignments. A REST API is straightforward for both web and Android clients.

## 5. Repository Structure

The repository is a monorepo with the following major areas:

- `backend/`: Express API, MQTT ingest worker, SQL migrations, backend tests
- `frontend/`: React + Vite web dashboard
- `packages/shared-types/`: shared TypeScript interfaces used by frontend and backend
- `infra/`: Docker Compose configuration for PostgreSQL, Mosquitto, and Adminer
- `device/`: ESP32 firmware and device configuration
- `mobile/`: Android application and home-screen widget
- `docs/`: hardware PDFs and project notes

### 5.1 Root file structure

The most important repository structure can be presented like this:

```text
Iot-Monitoring/
├── .env
├── package.json
├── package-lock.json
├── README.md
├── READMEBG.md
├── PROJECT_THEORY_GUIDE.md
├── backend/
│   ├── package.json
│   ├── README.md
│   ├── Dockerfile
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
│   │   └── 009_rename_co2_ppm_to_air_quality_raw.sql
│   └── src/
│       ├── api.ts
│       ├── ingest.ts
│       ├── api.test.ts
│       ├── ingest.test.ts
│       └── api/
│           ├── common.ts
│           └── routes/
│               ├── auth.ts
│               ├── profile.ts
│               ├── users.ts
│               ├── controllers.ts
│               ├── readings.ts
│               └── audit.ts
├── frontend/
│   ├── package.json
│   ├── README.md
│   ├── Dockerfile
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── api/
│       ├── components/
│       ├── utils/
│       └── types/
├── packages/
│   └── shared-types/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           └── models/
├── infra/
│   ├── .env.example
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   ├── deploy.sh
│   └── mosquitto/
│       └── mosquitto.conf
├── device/
│   └── esp32/
│       └── init/
│           └── init.ino
├── mobile/
   ├── build.gradle.kts
   ├── settings.gradle.kts
   ├── gradlew
   └── app/
       ├── build.gradle.kts
       └── src/main/
           ├── AndroidManifest.xml
           ├── java/

```

### 5.2 Why this structure is useful

This structure separates responsibilities clearly:

- `backend/` contains server-side logic and persistence behavior
- `frontend/` contains the browser client
- `mobile/` contains the Android client
- `device/` contains embedded firmware
- `infra/` contains local deployment infrastructure
- `packages/shared-types/` contains common contracts between backend and frontend

This layout is appropriate for a full-stack IoT project because each subsystem has a clear place in the repository while still remaining part of one coordinated codebase.

### 5.3 ESP32 firmware structure

The real ESP32 project structure currently present in the repository is:

```text
device/
└── esp32/
    └── init/
        └── init.ino
```

### 5.4 ESP32 structure explanation

The ESP32 side is currently compact and centered around a single firmware entry file:

- `device/esp32/init/init.ino`: main firmware file responsible for initialization, sensor reading, Wi-Fi connection, MQTT connection, and telemetry publishing

This simple structure is reasonable for a prototype-stage embedded application because:

- the firmware logic is still small enough to remain understandable in one entry file
- hardware initialization and telemetry behavior are tightly related
- the project’s complexity is concentrated more on backend, data management, and client applications than on embedded abstraction layers

If the firmware grows later, this structure could be expanded into separate files for:

- network setup
- sensor drivers
- MQTT publishing
- configuration constants
- calibration logic

## 6. Technology Stack

### Backend

- Node.js
- TypeScript
- Express
- `pg` for PostgreSQL access
- `mqtt` for broker communication
- `dotenv` for environment configuration

Why these backend technologies were used:

- Node.js fits event-driven I/O well, which is useful for API handling and MQTT-driven workloads.
- TypeScript improves maintainability by adding static typing to backend code and reducing interface mismatches.
- Express was chosen because it is simple, mature, and sufficient for a modular REST API without adding unnecessary framework complexity.
- `pg` gives direct and predictable access to PostgreSQL, which is appropriate for a project where SQL queries are explicit and readable.
- `mqtt` is a natural choice because the system consumes broker messages directly.
- `dotenv` keeps local and deployment configuration outside the codebase.

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- Axios

Why these frontend technologies were used:

- React is appropriate for a dashboard-style application with reusable UI components and state-driven rendering.
- TypeScript improves reliability in API consumption and component interfaces.
- Vite provides fast startup and straightforward frontend tooling, which is useful in a multi-package repository.
- Tailwind CSS allows rapid construction of dashboard layouts without a large custom CSS architecture.
- Recharts is suitable for telemetry visualization because the project needs line and data-driven charts rather than highly specialized graphics.
- Axios provides a simple and familiar HTTP client abstraction for REST calls.

### Mobile

- Kotlin
- Android SDK
- Retrofit
- OkHttp
- Gson

Why these mobile technologies were used:

- Kotlin is the standard modern language for Android development and provides strong null-safety and concise syntax.
- Retrofit simplifies REST API integration through interface-based endpoint definitions.
- OkHttp provides request interception, timeout handling, and header injection for mobile API calls.
- Gson is sufficient for JSON serialization and deserialization in a project with conventional API payloads.

### Infrastructure

- PostgreSQL 16
- Eclipse Mosquitto
- Adminer
- Docker Compose

Why these infrastructure technologies were used:

- PostgreSQL is a strong fit because the system needs both telemetry storage and relational business data such as users, assignments, and audit logs.
- Mosquitto is lightweight, widely used, and suitable for local or small-scale MQTT broker deployment.
- Adminer is useful during development because it gives quick database visibility without requiring a separate desktop client.
- Docker Compose makes local setup reproducible and reduces environment-specific configuration issues.

### Device

- ESP32
- Arduino-style C++
- DHT22 sensor support
- analog sensor reads for light, sound, and air-quality-related values

Why these device technologies were used:

- ESP32 is a strong choice for IoT coursework and prototyping because it is affordable, widely supported, and includes built-in Wi-Fi.
- Arduino-style C++ simplifies firmware development and matches the ecosystem commonly used with ESP32 boards.
- DHT22 is a common temperature and humidity sensor that is easy to integrate for environmental monitoring scenarios.
- Analog sensor inputs are appropriate for simple prototype measurements such as light, sound, and raw air-quality values.

## 6.1 Why These Technologies Fit the Problem

The problem being solved is not only "read some sensors." The real problem is to build a complete monitoring pipeline that:

- gathers measurements from physical devices
- transfers them reliably over a network
- stores them historically
- allows controlled user access
- presents the information in a usable form
- remains practical to develop and deploy in a student or prototype environment

Because of that, the chosen technologies fit the problem in different layers.

### Hardware and embedded layer

- ESP32 fits the problem because the system needs a low-cost microcontroller with built-in Wi-Fi, enough GPIO support for sensors, and a large development ecosystem.
- Arduino-style C++ fits the problem because it reduces firmware complexity and allows fast development of sensor reading and network communication logic.
- DHT22 and analog sensors fit the problem because the project focuses on environmental monitoring, where temperature, humidity, light, sound, and air-quality-related signals are directly relevant.

### Communication layer

- MQTT fits the problem because sensor data is small, frequent, and event-based. Devices only need to publish messages, which is simpler than maintaining full request-response communication with the server.
- A broker-based model fits the problem because it decouples the device from the backend. The ESP32 does not need to know anything about database structure, API routes, or client applications.
- JSON payloads fit the problem because they are lightweight enough for telemetry and easy to produce and parse across embedded, backend, and client layers.

### Backend layer

- Node.js fits the problem because the backend handles many I/O-driven operations such as HTTP requests, database queries, and MQTT message handling.
- Express fits the problem because the API needs to expose clear REST endpoints for readings, users, controllers, audit logs, and health data without introducing unnecessary architectural overhead.
- TypeScript fits the problem because the system contains multiple connected modules and shared data structures; static typing reduces integration mistakes.

### Data storage layer

- PostgreSQL fits the problem because the project must store both time-based telemetry and relational business data such as users, controllers, roles, assignments, and audit logs.
- SQL fits the problem because filtering, sorting, pagination, and relationship-based access checks are central features of the system.
- A relational database is a stronger fit here than a simple flat-file or in-memory store because the application has real entity relationships and administrative operations.

### Web client layer

- React fits the problem because monitoring dashboards require reusable components, dynamic updates, and conditional views for different user roles.
- Vite fits the problem because frontend development benefits from fast iteration and a simple build pipeline.
- Tailwind CSS fits the problem because the project needs a practical way to build many dashboard and admin screens quickly.
- Recharts fits the problem because historical telemetry is best understood visually, and chart components are a core part of the user-facing monitoring experience.

### Mobile client layer

- Kotlin fits the problem because the project includes a native Android application and widget support, which benefit from the standard Android development stack.
- Retrofit and OkHttp fit the problem because the mobile app needs a reliable and maintainable way to consume REST endpoints and attach request headers.
- A mobile client fits the problem itself because monitoring data is more useful when users can access it away from a desktop workstation.

### Infrastructure and development layer

- Mosquitto fits the problem because the system requires a lightweight MQTT broker that is easy to run locally.
- Docker Compose fits the problem because the project depends on multiple cooperating services and needs a repeatable local environment.
- Adminer fits the problem because database inspection is useful during development, testing, and debugging of telemetry records and user relationships.

### Shared contract layer

- Shared TypeScript types fit the problem because the frontend and backend both operate on the same concepts: readings, users, controllers, audit entries, and health responses.
- This reduces duplication and ensures that data exchanged between layers remains consistent.

### Overall justification

Taken together, these technologies fit the problem because they balance:

- low hardware cost
- practical implementation effort
- support for real-time telemetry flow
- structured historical storage
- multi-user access control
- maintainable full-stack development

In other words, the chosen stack is not accidental. It matches the exact needs of an IoT monitoring system that must connect embedded hardware, backend services, databases, and end-user applications into one coherent platform.

## 7. System Architecture

The system follows this data path:

```text
ESP32 device
  -> MQTT broker
  -> backend ingest worker
  -> PostgreSQL database
  -> backend REST API
  -> web dashboard / Android app
```

### Layer responsibilities

#### 7.1 Device layer

The ESP32 reads sensor values and publishes JSON telemetry to the MQTT topic:

`iot/esp32/telemetry`

The current firmware sends:

- `t`: temperature
- `h`: humidity
- `lux`: light raw value
- `sound`: sound raw value
- `aq`: raw air-quality value

The backend ingest service also supports additional optional sound and air baseline fields:

- `sound_dbfs`
- `sound_est_spl`
- `air_baseline_pct`

#### 7.2 Messaging layer

MQTT is used because it is lightweight and well-suited to low-power or intermittent IoT devices. It supports publish/subscribe communication and decouples the ESP32 from backend storage logic.

#### 7.3 Ingestion layer

The ingestion worker subscribes to the telemetry topic, parses JSON payloads, extracts the device ID from the MQTT topic path, and inserts readings into PostgreSQL.

#### 7.4 API layer

The Express API exposes endpoints for:

- authentication
- user profile management
- user administration
- controller administration
- device claiming and assignment
- latest and historical readings
- paginated reading search
- audit log access
- health and usage statistics

#### 7.5 Presentation layer

Two clients consume the REST API:

- a React web application for dashboards and administration
- an Android mobile application with widget support

## 8. Main Functional Modules

### 8.1 Telemetry acquisition module

Responsible for:

- reading sensors on the ESP32
- packaging values in JSON
- sending payloads through MQTT at a fixed interval

The current firmware uses a telemetry interval of `5000 ms`.

### 8.2 Telemetry ingestion module

Responsible for:

- connecting to the MQTT broker
- subscribing to the configured topic
- parsing payloads
- inserting readings into the `readings` table

### 8.3 User management module

Supports:

- registration
- login
- profile retrieval
- profile update
- password change
- account deletion
- admin invite flow
- user referral flow
- admin editing and deletion of users

### 8.4 Controller management module

Supports:

- listing controllers
- creating controllers from known device IDs
- generating unique 5-digit pairing codes
- claiming devices by pairing code or QR payload text
- assigning controllers to users
- renaming assignments
- removing assignments

### 8.5 Monitoring and visualization module

Supports:

- listing devices
- fetching latest device reading
- fetching device history by hours
- paginated reading table
- field-specific search and filtering
- sorting by supported sensor fields

### 8.6 Audit and health module

Supports:

- audit logging of sensitive actions
- filtering and paging audit records
- purging audit logs
- viewing operational statistics for administrators

## 9. Data Flow Explanation

This is the end-to-end movement of data through the system and is one of the most important parts to explain in a theory section.

### 9.1 Sensor acquisition

The data flow begins at the ESP32 controller. Connected sensors measure environmental values such as:

- temperature
- humidity
- light intensity as a raw analog value
- sound level as a raw analog value
- air-quality-related value as a raw analog value

The microcontroller reads these values periodically. At this stage, the data exists only inside the device memory.

### 9.2 Payload creation on the device

After reading the sensors, the firmware converts the measurements into a JSON payload. This payload acts as a common transport format between the device and the backend.

Example structure:

```json
{
  "t": 24.5,
  "h": 61.2,
  "lux": 1200,
  "sound": 430,
  "aq": 780
}
```

Using JSON makes the message easy to generate on the device and easy to parse in the backend.

### 9.3 Telemetry transmission through MQTT

Once the JSON payload is created, the ESP32 publishes it to the MQTT broker under a topic that identifies the device. The topic structure includes the device identifier, which allows the backend to understand which controller sent the data.

At this point:

- the device is the publisher
- the MQTT broker is the message intermediary
- the backend ingest worker is the subscriber

MQTT is important here because the device does not need a direct database connection or knowledge of backend internals. It only needs to publish telemetry to the broker.

### 9.4 Broker to ingest service

The backend ingest service maintains a connection to the MQTT broker and subscribes to the configured telemetry topic. When a message arrives:

1. the broker forwards the message to the ingest worker
2. the ingest worker reads the MQTT topic
3. the ingest worker extracts the `device_id` from the topic path
4. the ingest worker parses the JSON payload
5. the ingest worker maps payload fields to database columns

This step separates transport logic from persistence logic. The broker only carries the message, while the ingest worker interprets and stores it.

### 9.5 Persistence in PostgreSQL

After the message is parsed, the ingest worker inserts a new row into the `readings` table. This transforms short-lived telemetry into durable historical data.

Typical mapping:

- MQTT topic device segment -> `device_id`
- `t` -> `temperature_c`
- `h` -> `humidity_pct`
- `lux` -> `lux`
- `sound` -> `sound`
- `aq` -> `air_quality_raw`

Optional values such as `sound_dbfs`, `sound_est_spl`, and `air_baseline_pct` can also be stored if present.

Once inserted, the reading becomes available for:

- latest-value queries
- historical charts
- filtering and search
- administrative statistics

### 9.6 Access through the REST API

The API layer does not receive data directly from the device. Instead, it reads already stored records from PostgreSQL. This means the API is responsible for serving data to clients, not for ingesting telemetry from hardware.

The API exposes different access patterns:

- `GET /api/latest/:deviceId` for the most recent reading
- `GET /api/history/:deviceId` for readings over a period of time
- `GET /api/readings` for paginated and searchable data access
- `GET /api/devices` for available device identifiers

This separation improves system clarity because ingestion and client access are handled by different backend components.

### 9.7 User and controller relationship in the flow

Before data reaches the final user interface, the system checks whether the requester is allowed to view the requested device.

The access path is:

1. the client sends a request with the current user identity
2. the backend resolves the user from the `users` table
3. the backend checks the `user_controllers` and `controllers` tables
4. if the user is assigned to the controller, the reading data is returned
5. if the user is an administrator, broader access is allowed

This means the system does not expose every device to every user. Telemetry is filtered according to user-device relationships.

### 9.8 Delivery to web and mobile clients

After authorization succeeds, the API returns JSON responses to the frontend and Android client. Those clients then transform the raw response into user-facing views.

The web and mobile applications use the data for:

- dashboard cards showing the latest values
- historical charts
- device lists and selectors
- tabular search and filtering
- administrative screens

At this final stage, raw sensor readings become meaningful information for the user.

### 9.9 Full end-to-end flow in one sequence

The complete movement of data can be described as:

1. Sensors measure physical conditions.
2. The ESP32 reads the sensor values.
3. The firmware converts the readings into JSON.
4. The device publishes the JSON message to the MQTT broker.
5. The broker forwards the message to the backend ingest subscriber.
6. The ingest service extracts the device ID from the topic and parses the payload.
7. The ingest service inserts the reading into PostgreSQL.
8. A web or mobile client sends an HTTP request to the REST API.
9. The API authenticates the requester and checks device access rules.
10. The API queries PostgreSQL for the requested readings.
11. The API returns the data as JSON.
12. The client renders the information as charts, tables, cards, or admin views.

### 9.10 Why this data flow is important

This flow shows that the system is not just a sensor reader. It is a complete pipeline with:

- acquisition
- transmission
- processing
- storage
- authorization
- presentation

That is exactly the kind of systems-level explanation that should appear in the theory part of the project.

## 10. Database Model

The project uses PostgreSQL. The effective schema is a combination of base tables plus SQL migrations.

### 10.1 Main entities

#### `readings`

Stores telemetry records. Important fields include:

- `id`
- `device_id`
- `ts`
- `temperature_c`
- `humidity_pct`
- `lux`
- `sound`
- `sound_dbfs`
- `sound_est_spl`
- `air_quality_raw`
- `air_baseline_pct`

Purpose:

- historical storage of device measurements
- latest-reading retrieval
- charting and search

#### `users`

Stores user accounts and access data. Important fields include:

- `id`
- `username`
- `email`
- `password`
- `role`
- `is_admin`
- `invited_by`
- `invited_at`
- `must_change_password`
- `created_at`

Purpose:

- authentication
- role-based access logic
- invite/refer workflows

#### `controllers`

Stores registered IoT controllers. Important fields include:

- `id`
- `device_id`
- `label`
- `pairing_code`
- `created_at`

Purpose:

- maps raw telemetry-producing device IDs into managed, claimable entities

#### `user_controllers`

Join table between users and controllers. Important fields include:

- `user_id`
- `controller_id`
- `label`
- `created_at`

Purpose:

- grants a user access to a controller
- allows user-specific naming of assigned devices

#### `audit_logs`

Stores administrator and account activity records. Important fields include:

- `id`
- `actor_id`
- `actor_email`
- `action`
- `entity_type`
- `entity_id`
- `metadata`
- `ip_address`
- `user_agent`
- `created_at`

Purpose:

- traceability
- operational accountability
- admin reporting

### 10.2 Relationship explanation

- one user can have many controller assignments
- one controller can be assigned to many users
- one controller/device can produce many readings
- one user can generate many audit log entries

### 10.3 Why a relational model fits

A relational database is appropriate because the system has both telemetry and structured business entities. Unlike a pure time-series-only design, this project must also support users, roles, assignments, and audit relationships.

## 11. API Design

The backend is organized into route modules:

- auth routes
- profile routes
- user routes
- controller routes
- reading routes
- audit routes

### 11.1 Authentication endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`

### 11.2 Profile endpoints

- `GET /api/me`
- `PATCH /api/me`
- `PATCH /api/me/password`
- `DELETE /api/me`

### 11.3 User administration endpoints

- `GET /api/users`
- `GET /api/users/:userId`
- `PATCH /api/users/:userId`
- `DELETE /api/users/:userId`
- `PATCH /api/users/:userId/role`
- `POST /api/admin/users/invite`
- `POST /api/users/refer`

### 11.4 Controller endpoints

- `GET /api/controllers`
- `GET /api/controllers/available-devices`
- `POST /api/controllers`
- `POST /api/controllers/claim`
- `DELETE /api/controllers/:controllerId`
- `GET /api/users/:userId/controllers`
- `POST /api/users/:userId/controllers`
- `PATCH /api/users/:userId/controllers/:controllerId`
- `DELETE /api/users/:userId/controllers`

### 11.5 Reading endpoints

- `GET /api/devices`
- `GET /api/latest/:deviceId`
- `GET /api/history/:deviceId`
- `GET /api/readings`

### 11.6 Audit and health endpoints

- `GET /api/audit`
- `DELETE /api/audit`
- `GET /api/admin/health`

## 12. Authorization Model

The current project does not use JWT or session-based authentication. Instead, the clients identify the current user through the request header:

`x-user-id`

The backend resolves the requester from the database and applies role checks.

### Current authorization rules

- unauthenticated users can register and log in
- authenticated standard users can manage their own profile
- standard users can access only their assigned devices
- administrators can access system-wide user, controller, audit, and health features

### Important theory note

When documenting the system, describe this as a simplified authentication/authorization approach suitable for a prototype, coursework project, or controlled environment. It should not be presented as a production-grade identity mechanism.

## 13. Search and Data Query Logic

The reading table endpoint supports field-based search syntax. This is a useful feature to mention in the theory because it shows that the system is not only collecting data but also supporting analysis.

Examples:

- `t:>25`
- `h:<70`
- `lux:>1000`
- `s:500-800`
- `co2:>400`
- `ts:2024-01-15`
- `d:shrek`

Supported concepts:

- exact match
- comparison operators
- ranges
- date matching
- device ID text filtering
- sorting
- pagination

## 14. Shared Types and Monorepo Design

The project includes a shared package:

`packages/shared-types/`

This package contains common interfaces such as:

- readings
- controllers
- users
- audit entries
- health-related models

### Why this matters

Shared models reduce duplication and lower the risk of mismatches between backend responses and frontend expectations. This is a good architectural point to highlight in a theory chapter about maintainability.

## 15. Web Client Role

The React frontend provides:

- authentication screens
- monitoring dashboard
- charts
- device selection
- settings management
- admin dashboard
- audit log screen
- system health screen
- password-change-required flow

The frontend acts as the primary rich client for operational use and administration.

## 16. Mobile Client Role

The Android app provides:

- login and registration
- profile actions
- device monitoring
- historical reading retrieval
- device claiming
- assignment label editing
- user and controller admin flows
- notification and widget-related support

The app sends:

- `x-user-id`
- `x-client: mobile`

The mobile client expands system usability beyond the desktop browser and supports quick status access through a home-screen widget.

## 17. Device/Firmware Logic

The ESP32 firmware currently:

- connects to Wi-Fi
- connects to the MQTT broker
- initializes the DHT22 sensor
- reads analog values from configured pins
- builds a JSON message
- publishes telemetry every 5 seconds

This is a simple and appropriate design for a prototype because it minimizes firmware complexity and pushes storage and analysis responsibilities to the backend.

## 18. Environment and Deployment Model

The local environment is designed around Docker Compose infrastructure plus separately run application processes.

### Infrastructure services

- PostgreSQL on `localhost:5432`
- Mosquitto on `localhost:1883`
- Adminer on `http://localhost:8080`

### Typical local workflow

1. Install root dependencies with `npm install`.
2. Build shared types with `npm run build:types`.
3. Start infrastructure from `infra/` using Docker Compose.
4. Run database migrations through the backend.
5. Start the API.
6. Start the ingest worker.
7. Start the frontend.
8. Point the mobile app to the LAN-accessible API URL if testing on a device.

## 19. Quality Attributes

These are useful for the theory section under non-functional requirements.

### 19.1 Maintainability

Supported by:

- monorepo structure
- separated modules
- shared types
- SQL migrations

### 19.2 Scalability

Partially supported by:

- decoupled MQTT ingest
- database-backed persistence
- multiple clients consuming the same API

Current limitations remain because the system is still single-backend-instance oriented and does not include advanced message buffering or distributed processing.

### 19.3 Usability

Supported by:

- dashboard views
- chart visualizations
- filtering and search
- pairing-code device claiming
- Android access

### 19.4 Security

Supported by:

- password hashing with `scrypt`
- admin role checks
- audit trail for sensitive actions

But limited by:

- header-based identity instead of token-based auth
- no explicit TLS handling in local development
- development-friendly defaults

### 19.5 Reliability

Supported by:

- PostgreSQL persistence
- auditability
- health metrics
- MQTT reconnection logic in firmware

## 20. Security Design Notes

The backend hashes passwords using `scrypt`, which is a strong password hashing approach for stored credentials. This is a real design strength and should be mentioned explicitly.

At the same time, the current authentication transport model is simplified. If writing a formal theory or thesis, present this honestly:

- password storage is handled responsibly
- authorization logic exists
- auditing exists
- identity propagation is simplified for development and should be upgraded for production

Recommended future security improvements:

- JWT or session-based authentication
- refresh tokens or secure cookie sessions
- HTTPS everywhere
- stronger request validation
- rate limiting
- role/permission abstraction beyond `is_admin`

## 21. Testing Strategy

The repository already includes test files in multiple areas:

- backend tests with Vitest
- frontend tests with Vitest
- Android unit tests with Gradle

This supports a theory discussion around multi-layer testing:

- backend endpoint and service behavior tests
- frontend utility/API tests
- mobile repository and utility tests

If needed in a document, you can describe the current state as partial automated testing rather than full end-to-end coverage.

## 22. Current Limitations

This section is important in a serious project theory.

- authentication is simplified and not production-grade
- the MQTT topic configuration appears centered on a single default topic pattern in local setup
- sensor data is largely raw and not deeply calibrated
- no advanced alerting pipeline is described in the backend
- no role hierarchy beyond basic admin/user behavior
- no full end-to-end test suite across device, backend, and clients
- no explicit offline synchronization strategy for mobile clients
- no message retention, dead-letter handling, or broker-side QoS strategy is documented

## 23. Possible Future Improvements

- replace header-based identity with JWT or secure sessions
- support multiple device topic subscriptions dynamically
- add calibrated sensor interpretation and threshold alerting
- add notifications for abnormal readings
- add device heartbeat/offline detection
- add per-device metadata and richer configuration
- separate ingest and API services more formally for scaling
- add end-to-end integration tests
- support analytics, anomaly detection, or forecasting

## 24. Suggested Theory Chapter Structure

If someone is writing a thesis, report, or coursework theory section, this structure will fit the project well.

### Chapter 1. Introduction

- context of IoT monitoring
- motivation for environmental telemetry systems
- problem statement
- goals and objectives

### Chapter 2. Analysis of Existing Technologies

- IoT systems and telemetry concepts
- MQTT as a messaging protocol
- REST APIs for client access
- relational databases for telemetry and user management
- ESP32 as a low-cost IoT controller

### Chapter 3. System Requirements

- functional requirements
- non-functional requirements
- user roles
- device management requirements

### Chapter 4. System Architecture and Design

- high-level architecture
- module decomposition
- data flow
- client-server interaction
- database design

### Chapter 5. Implementation Approach

- backend implementation
- frontend implementation
- mobile implementation
- firmware implementation
- infrastructure setup

### Chapter 6. Security and Reliability

- password hashing
- access control
- audit logging
- health monitoring
- limitations

### Chapter 7. Testing and Validation

- unit tests
- API validation
- UI validation
- manual device-to-dashboard verification

### Chapter 8. Conclusion and Future Work

- achieved goals
- known tradeoffs
- possible extensions

## 25. Ready-to-Use Functional Requirements

These can be copied into a formal document and adapted.

- The system shall collect telemetry from IoT devices.
- The system shall transmit telemetry through MQTT.
- The system shall store telemetry in a PostgreSQL database.
- The system shall provide registration and login for users.
- The system shall allow users to view their assigned devices.
- The system shall allow administrators to create and manage controllers.
- The system shall allow devices to be claimed through pairing codes or QR data.
- The system shall provide latest and historical readings.
- The system shall provide paginated and searchable reading views.
- The system shall record audit logs for sensitive operations.
- The system shall expose health information for administrative monitoring.
- The system shall provide both web and mobile client access.

## 26. Ready-to-Use Non-Functional Requirements

- The system should be modular and maintainable.
- The system should support near real-time telemetry ingestion.
- The system should preserve historical readings reliably.
- The system should provide role-based access to sensitive operations.
- The system should be deployable in a local development environment using Docker Compose.
- The system should support extensibility for additional sensors and features.
- The system should provide a usable interface on both desktop and mobile devices.

## 27. Suggested Diagrams to Include

Whoever writes the theory should strongly consider adding these diagrams:

- high-level architecture diagram
- component diagram
- deployment diagram
- database ER diagram
- sequence diagram for telemetry ingestion
- sequence diagram for user login
- sequence diagram for device claiming

## 28. Good Thesis/Report Angles for This Project

Depending on the academic framing, this project can be presented as:

- an IoT telemetry platform
- a distributed sensor monitoring system
- a client-server system for environmental monitoring
- a full-stack IoT application with mobile and web clients
- a prototype for smart home or smart lab monitoring

## 29. Important Accuracy Notes

When writing the theory, keep these details aligned with the current codebase:

- the backend is Express-based and written in TypeScript
- the frontend uses React 19 and Vite
- the mobile app is native Android in Kotlin
- the database is PostgreSQL
- the message broker is Mosquitto over MQTT
- password hashing uses `scrypt`
- current identity propagation uses `x-user-id`, not JWT
- controllers are claimable through a generated 5-digit pairing code
- audit logging and admin health endpoints are implemented

## 30. Final Writing Advice

If the goal is to create a formal theory section, do not just describe files. Explain:

- what problem each module solves
- how data moves through the system
- how the design supports users and administrators
- what tradeoffs exist between simplicity and production readiness

The strongest theory for this project will present it as a modular IoT monitoring platform with a clear separation between telemetry acquisition, transport, persistence, business logic, and user-facing applications.
