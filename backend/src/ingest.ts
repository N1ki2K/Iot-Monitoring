import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env") });
import mqtt from "mqtt";
import { Pool } from "pg";

const MQTT_URL = process.env.MQTT_URL!;
const TOPIC = process.env.MQTT_TOPIC!;

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

const client = mqtt.connect(MQTT_URL);

client.on("connect", () => {
  console.log("MQTT connected");
  client.subscribe(TOPIC, (err) => {
    if (err) console.error("Subscribe error:", err);
    else console.log("Subscribed to", TOPIC);
  });
});

client.on("message", async (topic, payload) => {
  const parts = topic.split("/");
  const deviceId = parts[1];

  let msg;
  try {
    msg = JSON.parse(payload.toString("utf-8"));
  } catch (err) {
    console.warn("Invalid JSON:", payload.toString());
    return;
  }
  // expects: { t, h, lux, sound, co2 }

  await pool.query(
    `INSERT INTO readings (device_id, temperature_c, humidity_pct, lux, sound, co2_ppm)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [deviceId, msg.t ?? null, msg.h ?? null, msg.lux ?? null, msg.sound ?? null, msg.aq ?? null]
  );

  console.log("inserted", deviceId, msg);
});
