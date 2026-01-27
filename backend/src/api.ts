import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import crypto from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env") });
import express from "express";
import cors from "cors";
import { Pool } from "pg";

export const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

export const getRequester = async (req: express.Request) => {
  const requesterId = Number(req.header("x-user-id"));
  if (!requesterId) return null;
  const result = await pool.query(
    `SELECT id, username, email, is_admin, created_at FROM users WHERE id = $1`,
    [requesterId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    ...row,
    id: Number(row.id),
    is_admin: Number(row.is_admin),
  };
};

export const ensureAdmin = (user: { is_admin: number } | null) => {
  if (!user || user.is_admin !== 1) {
    return false;
  }
  return true;
};

export const generatePairingCode = async () => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
    const exists = await pool.query(
      `SELECT 1 FROM controllers WHERE pairing_code = $1`,
      [code]
    );
    if (exists.rowCount === 0) {
      return code;
    }
  }
  throw new Error("Failed to generate unique pairing code");
};

const scryptAsync = (password: string, salt: Buffer) =>
  new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey as Buffer);
    });
  });

export const hashPassword = async (password: string) => {
  const salt = crypto.randomBytes(16);
  const derivedKey = await scryptAsync(password, salt);
  return `scrypt$${salt.toString("hex")}$${derivedKey.toString("hex")}`;
};

export const verifyPassword = async (password: string, storedHash: string) => {
  const [scheme, saltHex, hashHex] = storedHash.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) {
    return false;
  }
  const salt = Buffer.from(saltHex, "hex");
  const derivedKey = await scryptAsync(password, salt);
  const storedKey = Buffer.from(hashHex, "hex");
  if (storedKey.length !== derivedKey.length) return false;
  return crypto.timingSafeEqual(storedKey, derivedKey);
};

const getErrorCode = (error: unknown) => {
  if (error && typeof error === "object" && "code" in error) {
    const typed = error as { code?: string };
    return typed.code;
  }
  return undefined;
};

app.post("/api/auth/register", async (req, res) => {
  const { username, email, password } = req.body ?? {};
  if (!username || !email || !password) {
    return res.status(400).json({ error: "username, email, and password are required" });
  }

  try {
    const passwordHash = await hashPassword(password);
    const result = await pool.query(
      `INSERT INTO users (username, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, is_admin, created_at`,
      [username, email, passwordHash]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    if (getErrorCode(error) === "23505") {
      return res.status(409).json({ error: "username or email already exists" });
    }
    console.error("Register failed:", error);
    return res.status(500).json({ error: "failed to register user" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  try {
    const result = await pool.query(
      `SELECT id, username, email, password, is_admin, created_at
       FROM users
       WHERE email = $1`,
      [email]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: "invalid credentials" });
    }
    const ok = await verifyPassword(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: "invalid credentials" });
    }

    return res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      is_admin: user.is_admin,
      created_at: user.created_at,
    });
  } catch (error) {
    console.error("Login failed:", error);
    return res.status(500).json({ error: "failed to login" });
  }
});

app.get("/api/me", async (req, res) => {
  const requester = await getRequester(req);
  if (!requester) {
    return res.status(401).json({ error: "missing user id" });
  }
  return res.json(requester);
});

app.patch("/api/me", async (req, res) => {
  const requester = await getRequester(req);
  const { username, email } = req.body ?? {};
  if (!requester) {
    return res.status(401).json({ error: "missing user id" });
  }
  if (!username || !email) {
    return res.status(400).json({ error: "username and email are required" });
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET username = $1, email = $2
       WHERE id = $3
       RETURNING id, username, email, is_admin, created_at`,
      [username, email, requester.id]
    );
    return res.json(result.rows[0]);
  } catch (error) {
    if (getErrorCode(error) === "23505") {
      return res.status(409).json({ error: "username or email already exists" });
    }
    console.error("Update profile failed:", error);
    return res.status(500).json({ error: "failed to update profile" });
  }
});

app.patch("/api/me/password", async (req, res) => {
  const requester = await getRequester(req);
  const { currentPassword, newPassword } = req.body ?? {};
  if (!requester) {
    return res.status(401).json({ error: "missing user id" });
  }
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "currentPassword and newPassword are required" });
  }

  try {
    const result = await pool.query(
      `SELECT password FROM users WHERE id = $1`,
      [requester.id]
    );
    const row = result.rows[0];
    if (!row) {
      return res.status(404).json({ error: "user not found" });
    }
    const ok = await verifyPassword(currentPassword, row.password);
    if (!ok) {
      return res.status(401).json({ error: "invalid password" });
    }
    const passwordHash = await hashPassword(newPassword);
    await pool.query(
      `UPDATE users SET password = $1 WHERE id = $2`,
      [passwordHash, requester.id]
    );
    return res.status(204).send();
  } catch (error) {
    console.error("Update password failed:", error);
    return res.status(500).json({ error: "failed to update password" });
  }
});

app.delete("/api/me", async (req, res) => {
  const requester = await getRequester(req);
  if (!requester) {
    return res.status(401).json({ error: "missing user id" });
  }

  try {
    await pool.query(`DELETE FROM users WHERE id = $1`, [requester.id]);
    return res.status(204).send();
  } catch (error) {
    console.error("Delete account failed:", error);
    return res.status(500).json({ error: "failed to delete account" });
  }
});

app.get("/api/users", async (req, res) => {
  const requester = await getRequester(req);
  if (!requester) {
    return res.status(401).json({ error: "missing user id" });
  }

  try {
    if (!ensureAdmin(requester)) {
      return res.status(403).json({ error: "admin access required" });
    }

    const result = await pool.query(
      `SELECT id, username, email, is_admin, created_at FROM users ORDER BY created_at DESC`
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("Fetch users failed:", error);
    return res.status(500).json({ error: "failed to fetch users" });
  }
});

app.get("/api/controllers", async (req, res) => {
  const requester = await getRequester(req);
  if (!requester || !ensureAdmin(requester)) {
    return res.status(403).json({ error: "admin access required" });
  }

  try {
    const result = await pool.query(
      `SELECT id, device_id, label, pairing_code, created_at
       FROM controllers
       ORDER BY created_at DESC`
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("Fetch controllers failed:", error);
    return res.status(500).json({ error: "failed to fetch controllers" });
  }
});

app.get("/api/controllers/available-devices", async (req, res) => {
  const requester = await getRequester(req);
  if (!requester || !ensureAdmin(requester)) {
    return res.status(403).json({ error: "admin access required" });
  }

  try {
    const result = await pool.query(
      `SELECT DISTINCT device_id FROM readings ORDER BY device_id`
    );
    return res.json(result.rows.map((row) => row.device_id));
  } catch (error) {
    console.error("Fetch available devices failed:", error);
    return res.status(500).json({ error: "failed to fetch devices" });
  }
});

app.post("/api/controllers", async (req, res) => {
  const requester = await getRequester(req);
  const { deviceId, label } = req.body ?? {};
  if (!requester || !ensureAdmin(requester)) {
    return res.status(403).json({ error: "admin access required" });
  }
  if (!deviceId) {
    return res.status(400).json({ error: "deviceId is required" });
  }

  try {
    const pairingCode = await generatePairingCode();
    const result = await pool.query(
      `INSERT INTO controllers (device_id, label, pairing_code)
       VALUES ($1, $2, $3)
       ON CONFLICT (device_id) DO UPDATE
         SET label = EXCLUDED.label,
             pairing_code = COALESCE(controllers.pairing_code, EXCLUDED.pairing_code)
       RETURNING id, device_id, label, pairing_code, created_at`,
      [deviceId, label ?? null, pairingCode]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Create controller failed:", error);
    return res.status(500).json({ error: "failed to create controller" });
  }
});

app.post("/api/controllers/claim", async (req, res) => {
  const requester = await getRequester(req);
  const { code, label } = req.body ?? {};
  if (!requester) {
    return res.status(401).json({ error: "missing user id" });
  }
  if (!code) {
    return res.status(400).json({ error: "code is required" });
  }
  if (!/^\d{5}$/.test(String(code))) {
    return res.status(400).json({ error: "code must be 5 digits" });
  }

  try {
    const controllerResult = await pool.query(
      `SELECT id, device_id, label, pairing_code, created_at
       FROM controllers
       WHERE pairing_code = $1`,
      [code]
    );
    const controller = controllerResult.rows[0];
    if (!controller) {
      return res.status(404).json({ error: "invalid code" });
    }

    await pool.query(
      `INSERT INTO user_controllers (user_id, controller_id, label)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, controller_id) DO UPDATE
         SET label = COALESCE(EXCLUDED.label, user_controllers.label)`,
      [requester.id, controller.id, label ?? null]
    );

    return res.json({
      controller,
    });
  } catch (error) {
    console.error("Claim controller failed:", error);
    return res.status(500).json({ error: "failed to claim controller" });
  }
});

app.delete("/api/controllers/:controllerId", async (req, res) => {
  const requester = await getRequester(req);
  const controllerId = Number(req.params.controllerId);
  if (!requester || !ensureAdmin(requester)) {
    return res.status(403).json({ error: "admin access required" });
  }
  if (!controllerId) {
    return res.status(400).json({ error: "invalid controller id" });
  }

  try {
    await pool.query(`DELETE FROM controllers WHERE id = $1`, [controllerId]);
    return res.status(204).send();
  } catch (error) {
    console.error("Delete controller failed:", error);
    return res.status(500).json({ error: "failed to delete controller" });
  }
});

app.get("/api/users/:userId/controllers", async (req, res) => {
  const requester = await getRequester(req);
  const userId = Number(req.params.userId);
  if (!requester || !userId) {
    return res.status(400).json({ error: "invalid user id" });
  }
  if (!ensureAdmin(requester) && requester.id !== userId) {
    return res.status(403).json({ error: "access denied" });
  }

  try {
    const result = await pool.query(
      `SELECT
         uc.user_id,
         uc.controller_id,
         c.device_id,
         c.label AS controller_label,
         uc.label AS assignment_label,
         c.pairing_code,
         uc.created_at
       FROM user_controllers uc
       JOIN controllers c ON c.id = uc.controller_id
       WHERE uc.user_id = $1
       ORDER BY uc.created_at DESC`,
      [userId]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("Fetch controllers failed:", error);
    return res.status(500).json({ error: "failed to fetch controllers" });
  }
});

app.post("/api/users/:userId/controllers", async (req, res) => {
  const requester = await getRequester(req);
  const userId = Number(req.params.userId);
  const { controllerId, label } = req.body ?? {};
  if (!requester || !userId || !controllerId) {
    return res.status(400).json({ error: "userId and controllerId are required" });
  }
  if (!ensureAdmin(requester)) {
    return res.status(403).json({ error: "admin access required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO user_controllers (user_id, controller_id, label)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, controller_id) DO UPDATE
         SET label = COALESCE(EXCLUDED.label, user_controllers.label)
       RETURNING user_id, controller_id, created_at`,
      [userId, controllerId, label ?? null]
    );
    return res.status(201).json(result.rows[0] ?? null);
  } catch (error) {
    console.error("Assign controller failed:", error);
    return res.status(500).json({ error: "failed to assign controller" });
  }
});

app.patch("/api/users/:userId/controllers/:controllerId", async (req, res) => {
  const requester = await getRequester(req);
  const userId = Number(req.params.userId);
  const controllerId = Number(req.params.controllerId);
  const { label } = req.body ?? {};
  if (!requester || !userId || !controllerId) {
    return res.status(400).json({ error: "invalid user or controller id" });
  }
  if (!ensureAdmin(requester) && requester.id !== userId) {
    return res.status(403).json({ error: "access denied" });
  }

  try {
    const result = await pool.query(
      `UPDATE user_controllers
       SET label = $1
       WHERE user_id = $2 AND controller_id = $3
       RETURNING user_id, controller_id, label`,
      [label ?? null, userId, controllerId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "assignment not found" });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Update controller label failed:", error);
    return res.status(500).json({ error: "failed to update controller label" });
  }
});

app.delete("/api/users/:userId/controllers", async (req, res) => {
  const requester = await getRequester(req);
  const userId = Number(req.params.userId);
  const { controllerId } = req.body ?? {};
  if (!requester || !userId || !controllerId) {
    return res.status(400).json({ error: "userId and controllerId are required" });
  }
  if (!ensureAdmin(requester) && requester.id !== userId) {
    return res.status(403).json({ error: "access denied" });
  }

  try {
    await pool.query(
      `DELETE FROM user_controllers WHERE user_id = $1 AND controller_id = $2`,
      [userId, controllerId]
    );
    return res.status(204).send();
  } catch (error) {
    console.error("Remove controller failed:", error);
    return res.status(500).json({ error: "failed to remove controller" });
  }
});

  // List all devices
  app.get("/api/devices", async (req, res) => {
    const requester = await getRequester(req);
    if (requester && requester.is_admin !== 1) {
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
    res.json(result.rows.map((r) => r.device_id));
  });

  // Latest reading for a device
  app.get("/api/latest/:deviceId", async (req, res) => {
    const { deviceId } = req.params;
    const requester = await getRequester(req);
    if (requester && requester.is_admin !== 1) {
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
    res.json(result.rows[0] ?? null);
  });

  // Historical readings
  app.get("/api/history/:deviceId", async (req, res) => {
    const { deviceId } = req.params;
    const hours = Number(req.query.hours) || 24;
    const requester = await getRequester(req);
    if (requester && requester.is_admin !== 1) {
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
    const requester = await getRequester(req);

    // Whitelist allowed sort columns
    const allowedSortColumns = ["id", "device_id", "ts", "temperature_c", "humidity_pct", "lux", "sound", "co2_ppm"];
    const safeSort = allowedSortColumns.includes(sortBy) ? sortBy : "ts";

    // Build WHERE clause
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (requester && requester.is_admin !== 1) {
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

export const startServer = () => {
  const PORT = process.env.PORT ?? 3000;
  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
  });
};

if (process.env.NODE_ENV !== "test") {
  startServer();
}
