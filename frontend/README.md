# IoT Monitoring Frontend

React dashboard for the IoT Monitoring system. Displays real-time sensor data from ESP32 devices.

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS v4
- Recharts (charts)
- Lucide React (icons)
- Axios (API client)

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Opens at `http://localhost:5173`

## Build

```bash
npm run build
```

## Environment Variables

| Variable       | Default                     | Description     |
|----------------|-----------------------------|-----------------|
| `VITE_API_URL` | `http://localhost:3000/api` | Backend API URL |

## Search Syntax

The data table supports field-specific search queries:

| Search | Matches |
|--------|---------|
| `t:25` | temperature = 25 |
| `t:>25` | temperature > 25 |
| `t:>=20` | temperature >= 20 |
| `t:20-30` | temperature between 20 and 30 |
| `h:60` | humidity = 60 |
| `h:<70` | humidity < 70 |
| `lux:>1000` | light > 1000 |
| `s:500-800` | sound between 500 and 800 |
| `co2:>400` | CO2 > 400 |
| `ts:2024-01-15` | readings from that date |
| `d:shrek` | device_id contains "shrek" |
| `shrek` | device_id contains "shrek" (default) |

### Field Prefixes

| Prefix | Field |
|--------|-------|
| `t:` or `temp:` | Temperature |
| `h:` or `humidity:` | Humidity |
| `lux:` or `l:` | Light |
| `s:` or `sound:` | Sound |
| `co2:`, `air:`, or `aq:` | CO2 / Air Quality |
| `ts:`, `date:`, or `time:` | Timestamp |
| `d:` or `device:` | Device ID |

### Operators

| Operator | Example | Description |
|----------|---------|-------------|
| (none) | `t:25` | Equals |
| `>` | `t:>25` | Greater than |
| `>=` | `t:>=25` | Greater than or equal |
| `<` | `t:<25` | Less than |
| `<=` | `t:<=25` | Less than or equal |
| `-` | `t:20-30` | Range (between) |

### Combining Searches

Multiple conditions can be combined (AND logic):

```
t:>20 h:<80
```

This finds readings where temperature > 20 AND humidity < 80.
