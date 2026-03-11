import crypto from "crypto";
import type express from "express";
import { Pool } from "pg";

export const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

export const requestMetrics = {
  total: 0,
  byStatus: new Map<string, number>(),
  byRoute: new Map<string, number>(),
  since: new Date(),
};

export const requestMetricsMiddleware: express.RequestHandler = (req, res, next) => {
  res.on("finish", () => {
    requestMetrics.total += 1;
    const statusKey = String(res.statusCode);
    requestMetrics.byStatus.set(
      statusKey,
      (requestMetrics.byStatus.get(statusKey) ?? 0) + 1
    );
    const routePath = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path;
    const routeKey = `${req.method} ${routePath}`;
    requestMetrics.byRoute.set(
      routeKey,
      (requestMetrics.byRoute.get(routeKey) ?? 0) + 1
    );
  });
  next();
};

export const normalizeFlag = (value: unknown) =>
  value === true || value === 1 || value === "1";

export const extractPairingCode = (raw: unknown): string | null => {
  if (raw == null) return null;
  if (typeof raw === "number") {
    const code = String(raw).padStart(5, "0");
    return /^\d{5}$/.test(code) ? code : null;
  }
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    return (
      extractPairingCode(obj.code) ??
      extractPairingCode(obj.pairing_code) ??
      extractPairingCode(obj.pairingCode)
    );
  }
  if (typeof raw !== "string") return null;

  const value = raw.trim();
  if (!value) return null;
  if (/^\d{5}$/.test(value)) return value;

  try {
    const parsed = JSON.parse(value) as unknown;
    const parsedCode = extractPairingCode(parsed);
    if (parsedCode) return parsedCode;
  } catch {
    // Not JSON; continue parsing.
  }

  try {
    const url = new URL(value);
    const fromQuery =
      url.searchParams.get("code") ??
      url.searchParams.get("pairing_code") ??
      url.searchParams.get("pairingCode");
    const queryCode = extractPairingCode(fromQuery);
    if (queryCode) return queryCode;
  } catch {
    // Not a URL; continue parsing.
  }

  const match = value.match(/\b(\d{5})\b/);
  return match ? match[1] : null;
};

export const getRequester = async (req: express.Request) => {
  const requesterId = Number(req.header("x-user-id"));
  if (!requesterId) return null;
  const result = await pool.query(
    `SELECT id, username, email, role, is_admin, invited_by, invited_at, must_change_password, created_at
     FROM users
     WHERE id = $1`,
    [requesterId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    ...row,
    id: Number(row.id),
    is_admin: normalizeFlag(row.is_admin) ? 1 : 0,
    must_change_password: normalizeFlag(row.must_change_password),
  };
};

export const ensureAdmin = (
  user: { role?: string; is_admin?: number } | null
) => Boolean(user && (user.role === "admin" || user.is_admin === 1));

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

export const generateTempPassword = () => crypto.randomBytes(6).toString("hex");

const scryptAsync = (password: string, salt: Buffer) =>
  new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey as Buffer);
    });
  });

export const logAudit = async ({
  req,
  actor,
  action,
  entityType,
  entityId,
  metadata,
}: {
  req: express.Request;
  actor: { id: number; email: string } | null;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  metadata?: Record<string, unknown>;
}) => {
  try {
    const clientHeader = req.header("x-client")?.toLowerCase().trim();
    const userAgent = req.header("user-agent") ?? "";
    const inferredClient =
      userAgent && /android|ios|okhttp|reactnative|expo/i.test(userAgent)
        ? "mobile"
        : userAgent
          ? "web"
          : null;
    const clientTag = clientHeader || inferredClient;
    const metadataWithClient =
      clientTag && (!metadata || !("client" in metadata))
        ? { ...metadata, client: clientTag }
        : metadata;
    await pool.query(
      `INSERT INTO audit_logs (actor_id, actor_email, action, entity_type, entity_id, metadata, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        actor?.id ?? null,
        actor?.email ?? null,
        action,
        entityType,
        entityId ? String(entityId) : null,
        metadataWithClient ? JSON.stringify(metadataWithClient) : null,
        req.ip ?? null,
        userAgent || null,
      ]
    );
  } catch (error) {
    console.error("Audit log failed:", error);
  }
};

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

export const getErrorCode = (error: unknown) => {
  if (error && typeof error === "object" && "code" in error) {
    const typed = error as { code?: string };
    return typed.code;
  }
  return undefined;
};
