import type express from "express";
import { ensureAdmin, getRequester, pool } from "../common.js";

export const registerReadingRoutes = (app: express.Express) => {
  app.get("/api/devices", async (req, res) => {
    const requester = await getRequester(req);
    if (requester && !ensureAdmin(requester)) {
      const result = await pool.query(
        `SELECT DISTINCT c.device_id
         FROM user_controllers uc
         JOIN controllers c ON c.id = uc.controller_id
         WHERE uc.user_id = $1
         ORDER BY c.device_id`,
        [requester.id]
      );
      return res.json(result.rows.map((r) => r.device_id));
    }

    const result = await pool.query(
      "SELECT device_id FROM controllers ORDER BY device_id"
    );
    return res.json(result.rows.map((r) => r.device_id));
  });

  app.get("/api/latest/:deviceId", async (req, res) => {
    const { deviceId } = req.params;
    const requester = await getRequester(req);
    if (requester && !ensureAdmin(requester)) {
      const accessCheck = await pool.query(
        `SELECT 1
         FROM user_controllers uc
         JOIN controllers c ON c.id = uc.controller_id
         WHERE uc.user_id = $1 AND c.device_id = $2`,
        [requester.id, deviceId]
      );
      if (accessCheck.rowCount === 0) {
        return res.status(403).json({ error: "access denied" });
      }
    }

    const result = await pool.query(
      `SELECT * FROM readings
       WHERE device_id = $1
       ORDER BY ts DESC
       LIMIT 1`,
      [deviceId]
    );
    return res.json(result.rows[0] ?? null);
  });

  app.get("/api/history/:deviceId", async (req, res) => {
    const { deviceId } = req.params;
    const hours = Number(req.query.hours) || 24;
    const requester = await getRequester(req);
    if (requester && !ensureAdmin(requester)) {
      const accessCheck = await pool.query(
        `SELECT 1
         FROM user_controllers uc
         JOIN controllers c ON c.id = uc.controller_id
         WHERE uc.user_id = $1 AND c.device_id = $2`,
        [requester.id, deviceId]
      );
      if (accessCheck.rowCount === 0) {
        return res.status(403).json({ error: "access denied" });
      }
    }

    const result = await pool.query(
      `SELECT * FROM readings
       WHERE device_id = $1
         AND ts > NOW() - INTERVAL '1 hour' * $2
       ORDER BY ts ASC`,
      [deviceId, hours]
    );
    return res.json(result.rows);
  });

  app.get("/api/readings", async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || "";
    const device = (req.query.device as string) || "";
    const sortBy = (req.query.sortBy as string) || "ts";
    const sortOrder =
      (req.query.sortOrder as string)?.toUpperCase() === "ASC" ? "ASC" : "DESC";
    const requester = await getRequester(req);

    const allowedSortColumns = [
      "id",
      "device_id",
      "ts",
      "temperature_c",
      "humidity_pct",
      "lux",
      "sound",
      "sound_dbfs",
      "sound_est_spl",
      "air_quality_raw",
      "air_baseline_pct",
    ];
    const safeSort = allowedSortColumns.includes(sortBy) ? sortBy : "ts";

    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (requester && !ensureAdmin(requester)) {
      if (device) {
        const accessCheck = await pool.query(
          `SELECT 1
           FROM user_controllers uc
           JOIN controllers c ON c.id = uc.controller_id
           WHERE uc.user_id = $1 AND c.device_id = $2`,
          [requester.id, device]
        );
        if (accessCheck.rowCount === 0) {
          return res.status(403).json({ error: "access denied" });
        }
      } else {
        conditions.push(
          `device_id IN (
            SELECT c.device_id
            FROM user_controllers uc
            JOIN controllers c ON c.id = uc.controller_id
            WHERE uc.user_id = $${paramIndex}
          )`
        );
        params.push(requester.id);
        paramIndex++;
      }
    }

    if (device) {
      conditions.push(`device_id = $${paramIndex}`);
      params.push(device);
      paramIndex++;
    }

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
        db: "sound_dbfs",
        dbfs: "sound_dbfs",
        sounddb: "sound_dbfs",
        sound_dbfs: "sound_dbfs",
        spl: "sound_est_spl",
        soundspl: "sound_est_spl",
        sound_est_spl: "sound_est_spl",
        airpct: "air_baseline_pct",
        airpercent: "air_baseline_pct",
        air_baseline_pct: "air_baseline_pct",
        airraw: "air_quality_raw",
        air_quality_raw: "air_quality_raw",
        co2: "air_quality_raw",
        air: "air_quality_raw",
        aq: "air_quality_raw",
        ts: "ts",
        date: "ts",
        time: "ts",
        d: "device_id",
        device: "device_id",
      };

      const searchPattern = /(\w+):([<>=]*)([^\s]+)/g;
      let match: RegExpExecArray | null;
      let hasFieldSearch = false;

      while ((match = searchPattern.exec(search)) !== null) {
        const [, prefix, operator, value] = match;
        const column = fieldMap[prefix.toLowerCase()];

        if (!column) continue;
        hasFieldSearch = true;

        if (column === "ts") {
          if (value.includes("-") && value.split("-").length === 3) {
            conditions.push(`DATE(ts) = $${paramIndex}`);
            params.push(value);
            paramIndex++;
          } else {
            conditions.push(`ts::text ILIKE $${paramIndex}`);
            params.push(`%${value}%`);
            paramIndex++;
          }
          continue;
        }

        if (column === "device_id") {
          conditions.push(`device_id ILIKE $${paramIndex}`);
          params.push(`%${value}%`);
          paramIndex++;
          continue;
        }

        const rangeMatch = value.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
        if (rangeMatch) {
          const [, min, max] = rangeMatch;
          conditions.push(
            `${column} >= $${paramIndex} AND ${column} <= $${paramIndex + 1}`
          );
          params.push(parseFloat(min), parseFloat(max));
          paramIndex += 2;
        } else if (operator) {
          const op = operator === "=" ? "=" : operator;
          conditions.push(`${column} ${op} $${paramIndex}`);
          params.push(parseFloat(value));
          paramIndex++;
        } else {
          conditions.push(`${column} = $${paramIndex}`);
          params.push(parseFloat(value));
          paramIndex++;
        }
      }

      if (!hasFieldSearch && search.trim()) {
        conditions.push(`device_id ILIKE $${paramIndex}`);
        params.push(`%${search.trim()}%`);
        paramIndex++;
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM readings ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await pool.query(
      `SELECT * FROM readings ${whereClause} ORDER BY ${safeSort} ${sortOrder} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return res.json({
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });
};
