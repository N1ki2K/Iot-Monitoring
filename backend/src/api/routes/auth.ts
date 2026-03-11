import type express from "express";
import {
  getErrorCode,
  hashPassword,
  logAudit,
  normalizeFlag,
  pool,
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
         RETURNING id, username, email, role, is_admin, invited_by, invited_at, must_change_password, created_at`,
        [username, email, passwordHash]
      );
      const created = result.rows[0];
      const response = {
        ...created,
        is_admin: normalizeFlag(created.is_admin) ? 1 : 0,
        must_change_password: normalizeFlag(created.must_change_password),
      };
      await logAudit({
        req,
        actor: { id: created.id, email: created.email },
        action: "user.register",
        entityType: "user",
        entityId: created.id,
      });
      return res.status(201).json(response);
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

      const response = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        is_admin: normalizeFlag(user.is_admin) ? 1 : 0,
        invited_by: user.invited_by ?? null,
        invited_at: user.invited_at ?? null,
        must_change_password: normalizeFlag(user.must_change_password),
        created_at: user.created_at,
      };
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
};
