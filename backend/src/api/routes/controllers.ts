import type express from "express";
import {
  ensureAdmin,
  extractPairingCode,
  generatePairingCode,
  getRequester,
  logAudit,
  pool,
} from "../common.js";

export const registerControllerRoutes = (app: express.Express) => {
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
      const controller = result.rows[0];
      await logAudit({
        req,
        actor: { id: requester.id, email: requester.email },
        action: "controller.create",
        entityType: "controller",
        entityId: controller.id,
        metadata: { deviceId, label: label ?? null },
      });
      return res.status(201).json(controller);
    } catch (error) {
      console.error("Create controller failed:", error);
      return res.status(500).json({ error: "failed to create controller" });
    }
  });

  app.post("/api/controllers/claim", async (req, res) => {
    const requester = await getRequester(req);
    const { code, qrData, qrCode, label } = req.body ?? {};
    if (!requester) {
      return res.status(401).json({ error: "missing user id" });
    }
    const normalizedCode =
      extractPairingCode(code) ??
      extractPairingCode(qrData) ??
      extractPairingCode(qrCode);
    if (!normalizedCode) {
      return res.status(400).json({ error: "valid 5-digit code or QR data is required" });
    }

    try {
      const controllerResult = await pool.query(
        `SELECT id, device_id, label, pairing_code, created_at
         FROM controllers
         WHERE pairing_code = $1`,
        [normalizedCode]
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
      await logAudit({
        req,
        actor: { id: requester.id, email: requester.email },
        action: "controller.claim",
        entityType: "controller",
        entityId: controller.id,
        metadata: { deviceId: controller.device_id, label: label ?? null },
      });

      return res.json({ controller });
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
      await logAudit({
        req,
        actor: { id: requester.id, email: requester.email },
        action: "controller.delete",
        entityType: "controller",
        entityId: controllerId,
      });
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
      await logAudit({
        req,
        actor: { id: requester.id, email: requester.email },
        action: "user_controller.assign",
        entityType: "user_controller",
        entityId: `${userId}:${controllerId}`,
        metadata: { userId, controllerId, label: label ?? null },
      });
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
      await logAudit({
        req,
        actor: { id: requester.id, email: requester.email },
        action: "user_controller.update_label",
        entityType: "user_controller",
        entityId: `${userId}:${controllerId}`,
        metadata: { userId, controllerId, label: label ?? null },
      });
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
      await logAudit({
        req,
        actor: { id: requester.id, email: requester.email },
        action: "user_controller.remove",
        entityType: "user_controller",
        entityId: `${userId}:${controllerId}`,
        metadata: { userId, controllerId },
      });
      return res.status(204).send();
    } catch (error) {
      console.error("Remove controller failed:", error);
      return res.status(500).json({ error: "failed to remove controller" });
    }
  });
};
