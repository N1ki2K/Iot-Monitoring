import type express from "express";
import {
  buildAuthResponse,
  createAccessToken,
  getErrorCode,
  getUserByRefreshToken,
  hashPassword,
  logAudit,
  normalizeUserRow,
  pool,
  revokeRefreshToken,
  rotateRefreshToken,
  USER_PUBLIC_COLUMNS,
  verifyPassword,
} from "../common.js";

export const registerAuthRoutes = (app: express.Express) => {
  app.post("/api/auth/register", async (req, res) => {
    const { username, email, password } = req.body ?? {};
    if (!username || !email || !password) {
      return res.status(400).json({ error: "username, email, and password are required" });
    }

    try {
      const passwordHash = await hashPassword(password);
      const result = await pool.query(
        `INSERT INTO users (username, email, password, role)
         VALUES ($1, $2, $3, 'user')
         RETURNING ${USER_PUBLIC_COLUMNS}`,
        [username, email, passwordHash]
      );
      const response = normalizeUserRow(result.rows[0]);
      const authResponse = await buildAuthResponse(response);
      await logAudit({
        req,
        actor: { id: response.id, email: response.email },
        action: "user.register",
        entityType: "user",
        entityId: response.id,
      });
      return res.status(201).json(authResponse);
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
        `SELECT id, username, email, password, role, is_admin, invited_by, invited_at, must_change_password, created_at
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

      const normalizedUser = normalizeUserRow(user);
      const response = await buildAuthResponse({
        ...normalizedUser,
        invited_by: user.invited_by ?? null,
        invited_at: user.invited_at ?? null,
      });
      await logAudit({
        req,
        actor: { id: user.id, email: user.email },
        action: "user.login",
        entityType: "user",
        entityId: user.id,
      });
      return res.json(response);
    } catch (error) {
      console.error("Login failed:", error);
      return res.status(500).json({ error: "failed to login" });
    }
  });

  app.post("/api/auth/refresh", async (req, res) => {
    const { refreshToken } = req.body ?? {};
    if (!refreshToken) {
      return res.status(400).json({ error: "refreshToken is required" });
    }

    try {
      const rotated = await rotateRefreshToken(refreshToken);
      if (!rotated) {
        return res.status(401).json({ error: "invalid refresh token" });
      }

      const response = {
        ...rotated.user,
        token: await createAccessToken(rotated.user),
        refreshToken: rotated.refreshToken,
      };

      await logAudit({
        req,
        actor: { id: rotated.user.id, email: rotated.user.email },
        action: "user.refresh",
        entityType: "user",
        entityId: rotated.user.id,
      });
      return res.json(response);
    } catch (error) {
      console.error("Refresh failed:", error);
      return res.status(500).json({ error: "failed to refresh session" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    const { refreshToken } = req.body ?? {};
    if (!refreshToken) {
      return res.status(400).json({ error: "refreshToken is required" });
    }

    try {
      const session = await getUserByRefreshToken(refreshToken);
      await revokeRefreshToken(refreshToken);
      await logAudit({
        req,
        actor: session ? { id: session.user.id, email: session.user.email } : null,
        action: "user.logout",
        entityType: "user",
        entityId: session?.user.id ?? null,
      });
      return res.status(204).send();
    } catch (error) {
      console.error("Logout failed:", error);
      return res.status(500).json({ error: "failed to logout" });
    }
  });
};
