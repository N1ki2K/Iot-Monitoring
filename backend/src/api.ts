import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import express from "express";
import cors from "cors";
import {
  createAccessToken,
  ensureAdmin,
  extractPairingCode,
  generatePairingCode,
  getRequester,
  getJwtSecret,
  hashPassword,
  normalizeFlag,
  requestMetricsMiddleware,
  verifyPassword,
} from "./api/common.js";
import { registerAuthRoutes } from "./api/routes/auth.js";
import { registerProfileRoutes } from "./api/routes/profile.js";
import { registerUserRoutes } from "./api/routes/users.js";
import { registerAuditRoutes } from "./api/routes/audit.js";
import { registerControllerRoutes } from "./api/routes/controllers.js";
import { registerReadingRoutes } from "./api/routes/readings.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env") });

if (process.env.NODE_ENV !== "test") {
  getJwtSecret();
}

export const app = express();

const corsOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  })
);
app.use(express.json());
app.use(requestMetricsMiddleware);

app.get("/api/health", (_req, res) => {
  return res.status(200).json({ ok: true });
});

registerAuthRoutes(app);
registerProfileRoutes(app);
registerUserRoutes(app);
registerAuditRoutes(app);
registerControllerRoutes(app);
registerReadingRoutes(app);

export {
  getRequester,
  createAccessToken,
  ensureAdmin,
  getJwtSecret,
  normalizeFlag,
  extractPairingCode,
  generatePairingCode,
  hashPassword,
  verifyPassword,
};

export const startServer = () => {
  const PORT = process.env.PORT ?? 3000;
  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
  });
};

/* c8 ignore next */
if (process.env.NODE_ENV !== "test") {
  startServer();
}
