import express from "express";
  import cors from "cors";
  import { Pool } from "pg";

  const app = express();
  app.use(cors());
  app.use(express.json());

  const pool = new Pool({
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER ?? "iot",
    password: process.env.PGPASSWORD ?? "iotpass",
    database: process.env.PGDATABASE ?? "iot",
  });

  // List all devices
  app.get("/api/devices", async (req, res) => {
    const result = await pool.query(
      "SELECT DISTINCT device_id FROM readings ORDER BY device_id"
    );
    res.json(result.rows.map((r) => r.device_id));
  });

  // Latest reading for a device
  app.get("/api/latest/:deviceId", async (req, res) => {
    const { deviceId } = req.params;
    const result = await pool.query(
      `SELECT * FROM readings 
       WHERE device_id = $1 
       ORDER BY ts DESC 
       LIMIT 1`,
      [deviceId]
    );
    res.json(result.rows[0] ?? null);
  });

  // Historical readings
  app.get("/api/history/:deviceId", async (req, res) => {
    const { deviceId } = req.params;
    const hours = Number(req.query.hours) || 24;
    const result = await pool.query(
      `SELECT * FROM readings 
       WHERE device_id = $1 
         AND ts > NOW() - INTERVAL '1 hour' * $2
       ORDER BY ts ASC`,
      [deviceId, hours]
    );
    res.json(result.rows);
  });

  const PORT = process.env.PORT ?? 3000;
  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
  });