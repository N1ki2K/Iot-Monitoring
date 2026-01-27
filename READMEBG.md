# IoT Система за Мониторинг

Система за мониторинг на IoT сензори в реално време с ESP32 устройства, MQTT обработка и React табло за управление.

## Архитектура

```
ESP32 (Wokwi) → MQTT Брокер → Backend Обработка → PostgreSQL → Backend API → React Frontend
```

## Файлова Структура

```
Iot-Monitoring/
├── .env                          # Централизирана конфигурация
├── README.md
│
├── backend/                      # Node.js + Express API
│   ├── src/
│   │   ├── api.ts               # REST API сървър (порт 3000)
│   │   └── ingest.ts            # MQTT → PostgreSQL обработка
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── frontend/                     # React + Vite табло
│   ├── src/
│   │   ├── api/
│   │   │   └── index.ts         # API клиент (axios)
│   │   ├── components/
│   │   │   ├── Chart.tsx        # Recharts линейна графика
│   │   │   ├── Dashboard.tsx    # Основен изглед на таблото
│   │   │   ├── DataTable.tsx    # Таблица с пагинация
│   │   │   ├── DeviceSelector.tsx
│   │   │   ├── SensorCard.tsx   # Карти със сензорни метрики
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   └── index.ts         # TypeScript интерфейси
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css            # Tailwind v4 стилове
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   └── README.md
│
├── device/                       # ESP32 фърмуер
│   └── wokwi/
│       ├── sketch.ino           # Arduino код за сензори
│       └── diagram.json         # Wokwi схема на веригата
│
├── infra/                        # Инфраструктурни конфигурации
│   ├── mosquitto/               # MQTT брокер конфигурация
│   └── README.md
│
├── docs/                         # Документация
├── mobile/                       # Android приложение (Kotlin)
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml
│   │   │   ├── java/com/monitoring/iotmon/
│   │   │   │   └── MainActivity.kt
│   │   │   └── res/
│   │   │       ├── layout/
│   │   │       │   └── widget_sensor.xml
│   │   │       ├── drawable/     # Фонове и икони за уиджет
│   │   │       ├── mipmap-*/     # Икони на приложението
│   │   │       ├── values/       # Цветове, текстове, тема
│   │   │       └── xml/          # Backup + метаданни за уиджет
│   │   ├── build.gradle.kts
│   │   └── proguard-rules.pro
│   ├── build.gradle.kts
│   ├── settings.gradle.kts
│   ├── gradle.properties
│   ├── gradle/
│   │   └── wrapper/
│   ├── gradlew
│   └── gradlew.bat
├── packages/                     # Споделени пакети
│   └── shared-types/            # Споделени TypeScript типове
│       ├── src/
│       │   ├── models/
│       │   │   ├── user.ts      # Потребителски типове (AuthUser и др.)
│       │   │   ├── reading.ts   # Типове за показания
│       │   │   ├── controller.ts # Типове за контролери
│       │   │   └── api.ts       # Типове за API отговори
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
└── tools/                        # Помощни скриптове (бъдещо)
```

## Бърз Старт

### 1. Настройка на Средата

Копирайте и конфигурирайте `.env` файла в основната директория на проекта:

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

# Мобилно приложение (сменете с IP на устройството)
MOBILE_API_URL=http://172.21.129.86:3000/api/
```

### 2. Стартиране на Инфраструктурата (PostgreSQL + MQTT)

Изберете един от вариантите:

**Вариант А: Docker Compose (препоръчително за локална разработка)**

```bash
cd infra
export POSTGRES_DB=iot
export POSTGRES_USER=iot
export POSTGRES_PASSWORD=iotpass
docker compose up -d
```

Това стартира:
- MQTT брокер на `localhost:1883`
- PostgreSQL на `localhost:5432`
- Adminer на `http://localhost:8080`

**Вариант Б: Използвайте собствен PostgreSQL + Mosquitto**

Уверете се, че PostgreSQL съответства на стойностите в `.env` и MQTT брокерът съответства на `MQTT_URL`.

### 3. Инициализация на Базата Данни

Отворете Adminer на `http://localhost:8080` и влезте със:

| Поле       | Стойност   |
|------------|------------|
| Система    | PostgreSQL |
| Сървър     | `db`       |
| Потребител | `iot`      |
| Парола     | `iotpass`  |
| База данни | `iot`      |

Кликнете "SQL command" и изпълнете следното за създаване на таблицата `readings`:

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

### 4. Инсталиране на Зависимости

```bash
# От основната директория - инсталира всички workspace-и
npm install

# Компилиране на споделените типове (задължително при първо стартиране)
npm run build:types
```

### 5. Стартиране

**Вариант А: Стартиране на всичко заедно (от основната директория)**

```bash
# API + Frontend
npm run dev

# API + MQTT Обработка + Frontend
npm run dev:all
```

**Вариант Б: Стартиране поотделно (от основната директория)**

| Команда              | Описание                                 |
|----------------------|------------------------------------------|
| `npm run dev`        | Стартира API + Frontend заедно           |
| `npm run dev:all`    | Стартира API + MQTT Обработка + Frontend |
| `npm run dev:api`    | Стартира само Backend API                |
| `npm run dev:fe`     | Стартира само Frontend                   |
| `npm run dev:ingest` | Стартира само MQTT Обработка             |
| `npm run build`      | Компилира shared-types + frontend        |

**Вариант В: Стартиране от отделни папки**

```bash
# Backend (от backend/)
cd backend
npm install
npm run api      # API сървър
npm run ingest   # MQTT обработка (в отделен терминал)

# Frontend (от frontend/)
cd frontend
npm install
npm run dev
```

Отворете `http://localhost:5173`

### 6. Стартиране на Wokwi Симулация

Стартирайте ESP32 симулацията на [wokwi.com](https://wokwi.com) или локално.

Обновете `device/wokwi/config.h` да съответства на вашия брокер:
- За локален Mosquitto: задайте `MQTT_HOST` към IP адреса на вашата машина в локалната мрежа.

Уверете се, че `MQTT_TOPIC` в `config.h` съответства на `MQTT_TOPIC` в `.env`.

#### (По избор) Локално Компилиране на Wokwi Фърмуер

Репозиторито вече съдържа предварително компилиран фърмуер в `device/wokwi/build/`. Ако искате да го прекомпилирате:

```bash
# Инсталиране на ESP32 ядро
arduino-cli core install esp32:esp32

# Инсталиране на необходимите библиотеки
arduino-cli lib install "DHT sensor library" "Adafruit Unified Sensor" "PubSubClient"

# Компилиране на скеча в device/wokwi/build
arduino-cli compile --fqbn esp32:esp32:esp32 device/wokwi --output-dir device/wokwi/build
```

## Сензори

| Сензор        | Поле                | Мерна единица |
|---------------|---------------------|---------------|
| DHT22         | Температура         | °C            |
| DHT22         | Влажност            | %             |
| Фоторезистор  | Светлина            | lux (raw ADC) |
| Микрофон      | Звук                | raw ADC       |
| MQ-135        | Качество на въздуха | raw ADC       |

## API Крайни Точки

| Метод | Крайна точка                    | Описание                        |
|-------|---------------------------------|---------------------------------|
| GET | `/api/devices`                    | Списък на всички устройства     |
| GET | `/api/latest/:deviceId`           | Последно показание              |
| GET | `/api/history/:deviceId?hours=24` | Исторически показания           |
| GET | `/api/readings?page=1&limit=20`   | Показания с пагинация и търсене |

Вижте `backend/README.md` и `frontend/README.md` за пълна документация.

## Мобилно Приложение (Android)

Android приложението е изградено с Kotlin и Jetpack Compose.

### Функционалности
- Табло със сензорни данни в реално време
- Push известия с персонализирани прагове
- Биометрична автентикация (пръстов отпечатък/лице)
- Уиджет за началния екран
- QR код скенер за добавяне на устройства
- Тъмна тема

### Компилиране и Стартиране

```bash
cd mobile

# Компилиране на debug APK
./gradlew assembleDebug

# Инсталиране на свързано устройство
./gradlew installDebug

# Или използвайте Android Studio
```

APK файлът ще бъде в `mobile/app/build/outputs/apk/debug/app-debug.apk`

### Конфигурация

Обновете `MOBILE_API_URL` в `.env` да сочи към IP адреса на вашия backend сървър (не localhost, използвайте IP адреса на машината в локалната мрежа за физически устройства).
