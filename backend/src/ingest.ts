import mqtt from "mqtt";
import { Pool } from "pg";

const MQTT_URL = process.env.MQTT_URL ?? "mqtt://127.0.0.1:1883";
const TOPIC = process.env.MQTT_TOPIC ?? "iot/+/telemetry";

const pool = new Pool({
  host: process.env.PGHOST ?? "127.0.0.1",
  port: Number(process.env.PGPORT ?? 5432),
  user: process.env.PGUSER ?? "iot",
  password: process.env.PGPASSWORD ?? "iotpass",
  database: process.env.PGDATABASE ?? "iot",
});

const client = mqtt.connect(MQTT_URL);

client.on("connect", () => {
  console.log("MQTT connected");
  client.subscribe(TOPIC, (err) => {
  if (err) console.error("Subscribe error:", err);
  else console.log("Subscribed to", TOPIC);
});
;
});

client.on("message", async (topic, payload) => {
  // topic: iot/<device_id>/telemetry
  const parts = topic.split("/");
  const deviceId = parts[1];

  const msg = JSON.parse(payload.toString("utf-8"));
  // expects: { t, h, lux, sound, co2 }

  await pool.query(
    `INSERT INTO readings (device_id, temperature_c, humidity_pct, lux, sound, co2_ppm)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [deviceId, msg.t ?? null, msg.h ?? null, msg.lux ?? null, msg.sound ?? null, msg.co2 ?? null]
  );

  console.log("inserted", deviceId, msg);
});
