import type express from "express";
import {
  getErrorCode,
  getRequester,
  hashPassword,
  logAudit,
  normalizeFlag,
  pool,
  verifyPassword,
} from "../common.js";

export const registerProfileRoutes = (app: express.Express) => {
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
         RETURNING id, username, email, role, is_admin, invited_by, invited_at, must_change_password, created_at`,
        [username, email, requester.id]
      );
      const updated = result.rows[0];
      const response = {
        ...updated,
        is_admin: normalizeFlag(updated.is_admin) ? 1 : 0,
        must_change_password: normalizeFlag(updated.must_change_password),
      };
      await logAudit({
        req,
        actor: { id: requester.id, email: requester.email },
        action: "user.update_profile",
        entityType: "user",
        entityId: requester.id,
        metadata: { username, email },
      });
      return res.json(response);
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
      const result = await pool.query(`SELECT password FROM users WHERE id = $1`, [
        requester.id,
      ]);
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
        `UPDATE users SET password = $1, must_change_password = FALSE WHERE id = $2`,
        [passwordHash, requester.id]
      );
      await logAudit({
        req,
        actor: { id: requester.id, email: requester.email },
        action: "user.update_password",
        entityType: "user",
        entityId: requester.id,
      });
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
      await logAudit({
        req,
        actor: { id: requester.id, email: requester.email },
        action: "user.delete",
        entityType: "user",
        entityId: requester.id,
      });
      return res.status(204).send();
    } catch (error) {
      console.error("Delete account failed:", error);
      return res.status(500).json({ error: "failed to delete account" });
    }
  });
};
