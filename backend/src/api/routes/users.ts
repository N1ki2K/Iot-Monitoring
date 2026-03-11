import type express from "express";
import {
  ensureAdmin,
  generateTempPassword,
  getErrorCode,
  getRequester,
  hashPassword,
  logAudit,
  normalizeFlag,
  pool,
} from "../common.js";

export const registerUserRoutes = (app: express.Express) => {
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
        `SELECT id, username, email, role, is_admin, invited_by, invited_at, must_change_password, created_at
         FROM users
         ORDER BY created_at DESC`
      );
      const response = result.rows.map((row) => ({
        ...row,
        is_admin: normalizeFlag(row.is_admin) ? 1 : 0,
        must_change_password: normalizeFlag(row.must_change_password),
      }));
      return res.json(response);
    } catch (error) {
      console.error("Fetch users failed:", error);
      return res.status(500).json({ error: "failed to fetch users" });
    }
  });

  app.post("/api/admin/users/invite", async (req, res) => {
    const requester = await getRequester(req);
    const { username, email, role } = req.body ?? {};
    if (!requester || !ensureAdmin(requester)) {
      return res.status(403).json({ error: "admin access required" });
    }
    if (!username || !email) {
      return res.status(400).json({ error: "username and email are required" });
    }
    const normalizedRole = role ?? "user";
    if (!["user", "admin"].includes(normalizedRole)) {
      return res.status(400).json({ error: "invalid role" });
    }

    try {
      const tempPassword = generateTempPassword();
      const passwordHash = await hashPassword(tempPassword);
      const invitedAt = new Date();
      const result = await pool.query(
        `INSERT INTO users (username, email, password, role, invited_by, invited_at, must_change_password)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)
         RETURNING id, username, email, role, is_admin, invited_by, invited_at, must_change_password, created_at`,
        [username, email, passwordHash, normalizedRole, requester.id, invitedAt]
      );
      const created = result.rows[0];
      const response = {
        ...created,
        is_admin: normalizeFlag(created.is_admin) ? 1 : 0,
        must_change_password: normalizeFlag(created.must_change_password),
      };
      await logAudit({
        req,
        actor: { id: requester.id, email: requester.email },
        action: "user.invite",
        entityType: "user",
        entityId: created.id,
        metadata: { username, email, role: normalizedRole },
      });
      return res.status(201).json({ user: response, tempPassword });
    } catch (error) {
      if (getErrorCode(error) === "23505") {
        return res.status(409).json({ error: "username or email already exists" });
      }
      console.error("Invite user failed:", error);
      return res.status(500).json({ error: "failed to invite user" });
    }
  });

  app.post("/api/users/refer", async (req, res) => {
    const requester = await getRequester(req);
    const { username, email } = req.body ?? {};
    if (!requester) {
      return res.status(401).json({ error: "missing user id" });
    }
    if (!username || !email) {
      return res.status(400).json({ error: "username and email are required" });
    }

    try {
      const tempPassword = generateTempPassword();
      const passwordHash = await hashPassword(tempPassword);
      const invitedAt = new Date();
      const result = await pool.query(
        `INSERT INTO users (username, email, password, role, invited_by, invited_at, must_change_password)
         VALUES ($1, $2, $3, 'user', $4, $5, TRUE)
         RETURNING id, username, email, role, is_admin, invited_by, invited_at, must_change_password, created_at`,
        [username, email, passwordHash, requester.id, invitedAt]
      );
      const created = result.rows[0];
      const response = {
        ...created,
        is_admin: normalizeFlag(created.is_admin) ? 1 : 0,
        must_change_password: normalizeFlag(created.must_change_password),
      };
      await logAudit({
        req,
        actor: { id: requester.id, email: requester.email },
        action: "user.refer",
        entityType: "user",
        entityId: created.id,
        metadata: { username, email, role: "user" },
      });
      return res.status(201).json({ user: response, tempPassword });
    } catch (error) {
      if (getErrorCode(error) === "23505") {
        return res.status(409).json({ error: "username or email already exists" });
      }
      console.error("Refer user failed:", error);
      return res.status(500).json({ error: "failed to refer user" });
    }
  });

  app.get("/api/users/:userId", async (req, res) => {
    const requester = await getRequester(req);
    const userId = Number(req.params.userId);
    if (!requester || !userId) {
      return res.status(400).json({ error: "invalid user id" });
    }
    if (!ensureAdmin(requester)) {
      return res.status(403).json({ error: "admin access required" });
    }

    try {
      const result = await pool.query(
        `SELECT id, username, email, role, is_admin, invited_by, invited_at, must_change_password, created_at
         FROM users
         WHERE id = $1`,
        [userId]
      );
      const row = result.rows[0];
      if (!row) {
        return res.status(404).json({ error: "user not found" });
      }
      return res.json({
        ...row,
        is_admin: normalizeFlag(row.is_admin) ? 1 : 0,
        must_change_password: normalizeFlag(row.must_change_password),
      });
    } catch (error) {
      console.error("Fetch user failed:", error);
      return res.status(500).json({ error: "failed to fetch user" });
    }
  });

  app.patch("/api/users/:userId", async (req, res) => {
    const requester = await getRequester(req);
    const userId = Number(req.params.userId);
    const { username, email, role, is_admin, must_change_password } = req.body ?? {};
    if (!requester || !userId) {
      return res.status(400).json({ error: "invalid user id" });
    }
    if (!ensureAdmin(requester)) {
      return res.status(403).json({ error: "admin access required" });
    }
    if (role !== undefined && !["user", "admin"].includes(role)) {
      return res.status(400).json({ error: "invalid role" });
    }

    const updates: string[] = [];
    const params: (string | number | boolean | null)[] = [];
    let paramIndex = 1;
    const metadata: Record<string, unknown> = {};

    if (username !== undefined) {
      updates.push(`username = $${paramIndex}`);
      params.push(username);
      metadata.username = username;
      paramIndex++;
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex}`);
      params.push(email);
      metadata.email = email;
      paramIndex++;
    }
    if (role !== undefined) {
      updates.push(`role = $${paramIndex}`);
      params.push(role);
      metadata.role = role;
      paramIndex++;
    }
    if (is_admin !== undefined) {
      updates.push(`is_admin = $${paramIndex}`);
      params.push(Boolean(is_admin));
      metadata.is_admin = Boolean(is_admin);
      paramIndex++;
    }
    if (must_change_password !== undefined) {
      updates.push(`must_change_password = $${paramIndex}`);
      params.push(Boolean(must_change_password));
      metadata.must_change_password = Boolean(must_change_password);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "no fields to update" });
    }

    try {
      const result = await pool.query(
        `UPDATE users
         SET ${updates.join(", ")}
         WHERE id = $${paramIndex}
         RETURNING id, username, email, role, is_admin, invited_by, invited_at, must_change_password, created_at`,
        [...params, userId]
      );
      const updated = result.rows[0];
      if (!updated) {
        return res.status(404).json({ error: "user not found" });
      }
      const response = {
        ...updated,
        is_admin: normalizeFlag(updated.is_admin) ? 1 : 0,
        must_change_password: normalizeFlag(updated.must_change_password),
      };
      await logAudit({
        req,
        actor: { id: requester.id, email: requester.email },
        action: "user.update",
        entityType: "user",
        entityId: userId,
        metadata,
      });
      return res.json(response);
    } catch (error) {
      if (getErrorCode(error) === "23505") {
        return res.status(409).json({ error: "username or email already exists" });
      }
      console.error("Update user failed:", error);
      return res.status(500).json({ error: "failed to update user" });
    }
  });

  app.delete("/api/users/:userId", async (req, res) => {
    const requester = await getRequester(req);
    const userId = Number(req.params.userId);
    if (!requester || !userId) {
      return res.status(400).json({ error: "invalid user id" });
    }
    if (!ensureAdmin(requester)) {
      return res.status(403).json({ error: "admin access required" });
    }
    if (requester.id === userId) {
      return res.status(400).json({ error: "cannot delete self" });
    }

    try {
      const targetResult = await pool.query(
        `SELECT id, email, role
         FROM users
         WHERE id = $1`,
        [userId]
      );
      const target = targetResult.rows[0];
      if (!target) {
        return res.status(404).json({ error: "user not found" });
      }

      const result = await pool.query(
        `DELETE FROM users WHERE id = $1 RETURNING id, email`,
        [userId]
      );
      const deleted = result.rows[0];
      await logAudit({
        req,
        actor: { id: requester.id, email: requester.email },
        action: "user.admin_delete",
        entityType: "user",
        entityId: userId,
        metadata: { email: deleted?.email ?? null },
      });
      return res.status(204).send();
    } catch (error) {
      console.error("Delete user failed:", error);
      return res.status(500).json({ error: "failed to delete user" });
    }
  });

  app.patch("/api/users/:userId/role", async (req, res) => {
    const requester = await getRequester(req);
    const userId = Number(req.params.userId);
    const { role } = req.body ?? {};
    if (!requester || !userId) {
      return res.status(400).json({ error: "invalid user id" });
    }
    if (!ensureAdmin(requester)) {
      return res.status(403).json({ error: "admin access required" });
    }
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ error: "invalid role" });
    }

    try {
      const result = await pool.query(
        `UPDATE users
         SET role = $1
         WHERE id = $2
         RETURNING id, username, email, role, is_admin, invited_by, invited_at, must_change_password, created_at`,
        [role, userId]
      );
      const updated = result.rows[0];
      if (!updated) {
        return res.status(404).json({ error: "user not found" });
      }
      const response = {
        ...updated,
        is_admin: normalizeFlag(updated.is_admin) ? 1 : 0,
        must_change_password: normalizeFlag(updated.must_change_password),
      };
      await logAudit({
        req,
        actor: { id: requester.id, email: requester.email },
        action: "user.update_role",
        entityType: "user",
        entityId: userId,
        metadata: { role },
      });
      return res.json(response);
    } catch (error) {
      console.error("Update role failed:", error);
      return res.status(500).json({ error: "failed to update role" });
    }
  });
};
