import crypto from "crypto";
import type express from "express";
import { Pool } from "pg";

export const USER_PUBLIC_COLUMNS =
  "id, username, email, role, is_admin, invited_by, invited_at, must_change_password, created_at";

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

type AccessTokenPayload = {
  sub: number;
  email: string;
  role?: string;
  is_admin: number;
  iat: number;
  exp: number;
};

const encodeBase64Url = (value: string | Buffer) => Buffer.from(value).toString("base64url");

const decodeBase64Url = (value: string) => Buffer.from(value, "base64url").toString("utf8");

const getJwtSecret = () => process.env.JWT_SECRET ?? "dev-jwt-secret-change-me";

const getJwtExpirySeconds = () => {
  const parsed = Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 3600);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3600;
};

export const normalizeFlag = (value: unknown) =>
  value === true || value === 1 || value === "1";

export const normalizeUserRow = <
  T extends {
    id: unknown;
    is_admin: unknown;
    must_change_password: unknown;
  },
>(
  row: T
) => ({
  ...row,
  id: Number(row.id),
  is_admin: normalizeFlag(row.is_admin) ? 1 : 0,
  must_change_password: normalizeFlag(row.must_change_password),
});

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

export const createAccessToken = (user: {
  id: number;
  email: string;
  role?: string;
  is_admin?: number;
}) => {
  const now = Math.floor(Date.now() / 1000);
  const payload: AccessTokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    is_admin: user.is_admin ?? 0,
    iat: now,
    exp: now + getJwtExpirySeconds(),
  };
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = encodeBase64Url(JSON.stringify(header));
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", getJwtSecret())
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

export const verifyAccessToken = (token: string): AccessTokenPayload | null => {
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    return null;
  }

  const expectedSignature = crypto
    .createHmac("sha256", getJwtSecret())
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");
  const actualBuffer = Buffer.from(encodedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const header = JSON.parse(decodeBase64Url(encodedHeader)) as { alg?: string; typ?: string };
    if (header.alg !== "HS256" || header.typ !== "JWT") {
      return null;
    }

    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as AccessTokenPayload;
    if (!payload?.sub || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};

const extractRequesterId = (req: express.Request) => {
  const authHeader = req.header("authorization");
  const tokenMatch = authHeader?.match(/^Bearer\s+(.+)$/i);
  if (tokenMatch) {
    return verifyAccessToken(tokenMatch[1].trim())?.sub ?? null;
  }

  if (process.env.NODE_ENV === "test") {
    const fallbackId = Number(req.header("x-user-id"));
    return fallbackId || null;
  }

  return null;
};

export const getRequester = async (req: express.Request) => {
  const requesterId = extractRequesterId(req);
  if (!requesterId) return null;
  const result = await pool.query(
    `SELECT ${USER_PUBLIC_COLUMNS}
     FROM users
     WHERE id = $1`,
    [requesterId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return normalizeUserRow(row);
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
