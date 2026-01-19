import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env") });
import express from "express";
import cors from "cors";
import { Pool } from "pg";

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
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

  // Paginated readings with search and sort
  app.get("/api/readings", async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || "";
    const device = (req.query.device as string) || "";
    const sortBy = (req.query.sortBy as string) || "ts";
    const sortOrder = (req.query.sortOrder as string)?.toUpperCase() === "ASC" ? "ASC" : "DESC";

    // Whitelist allowed sort columns
    const allowedSortColumns = ["id", "device_id", "ts", "temperature_c", "humidity_pct", "lux", "sound", "co2_ppm"];
    const safeSort = allowedSortColumns.includes(sortBy) ? sortBy : "ts";

    // Build WHERE clause
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (device) {
      conditions.push(`device_id = $${paramIndex}`);
      params.push(device);
      paramIndex++;
    }

    // Parse search query with field prefixes
    // Supported: t:(temp), h:(humidity), lux:(lux), s:(sound), co2:(co2), ts:(timestamp), d:(device)
    // Supports operators: =, >, <, >=, <=, and ranges like 20-30
    if (search) {
      const fieldMap: Record<string, string> = {
        t: "temperature_c",
        temp: "temperature_c",
        h: "humidity_pct",
        humidity: "humidity_pct",
        lux: "lux",
        l: "lux",
        s: "sound",
        sound: "sound",
        co2: "co2_ppm",
        air: "co2_ppm",
        aq: "co2_ppm",
        ts: "ts",
        date: "ts",
        time: "ts",
        d: "device_id",
        device: "device_id",
      };

      // Match patterns like "t:25", "t:>25", "t:>=25", "t:20-30", "ts:2024-01-15"
      const searchPattern = /(\w+):([<>=]*)([^\s]+)/g;
      let match;
      let hasFieldSearch = false;

      while ((match = searchPattern.exec(search)) !== null) {
        const [, prefix, operator, value] = match;
        const column = fieldMap[prefix.toLowerCase()];

        if (column) {
          hasFieldSearch = true;

          if (column === "ts") {
            // Timestamp search - support date or datetime
            if (value.includes("-") && value.split("-").length === 3) {
              // Date format: 2024-01-15
              conditions.push(`DATE(ts) = $${paramIndex}`);
              params.push(value);
              paramIndex++;
            } else {
              conditions.push(`ts::text ILIKE $${paramIndex}`);
              params.push(`%${value}%`);
              paramIndex++;
            }
          } else if (column === "device_id") {
            // Device search - partial match
            conditions.push(`device_id ILIKE $${paramIndex}`);
            params.push(`%${value}%`);
            paramIndex++;
          } else {
            // Numeric field search
            const rangeMatch = value.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);

            if (rangeMatch) {
              // Range: t:20-30
              const [, min, max] = rangeMatch;
              conditions.push(`${column} >= $${paramIndex} AND ${column} <= $${paramIndex + 1}`);
              params.push(parseFloat(min), parseFloat(max));
              paramIndex += 2;
            } else if (operator) {
              // Operator: t:>25, t:>=25, t:<25, t:<=25
              const op = operator === "=" ? "=" : operator;
              conditions.push(`${column} ${op} $${paramIndex}`);
              params.push(parseFloat(value));
              paramIndex++;
            } else {
              // Exact or approximate match: t:25
              conditions.push(`${column} = $${paramIndex}`);
              params.push(parseFloat(value));
              paramIndex++;
            }
          }
        }
      }

      // If no field prefix found, search device_id by default
      if (!hasFieldSearch && search.trim()) {
        conditions.push(`device_id ILIKE $${paramIndex}`);
        params.push(`%${search.trim()}%`);
        paramIndex++;
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM readings ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated data
    const dataResult = await pool.query(
      `SELECT * FROM readings ${whereClause} ORDER BY ${safeSort} ${sortOrder} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    res.json({
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  const PORT = process.env.PORT ?? 3000;
  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
  });