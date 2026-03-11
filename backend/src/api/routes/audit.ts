import type express from "express";
import {
  ensureAdmin,
  getRequester,
  logAudit,
  pool,
  requestMetrics,
} from "../common.js";

export const registerAuditRoutes = (app: express.Express) => {
  app.get("/api/audit", async (req, res) => {
    const requester = await getRequester(req);
    if (!requester || !ensureAdmin(requester)) {
      return res.status(403).json({ error: "admin access required" });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const actorId = Number(req.query.actorId) || null;
    const action = (req.query.action as string) || "";
    const entityType = (req.query.entityType as string) || "";
    const entityId = (req.query.entityId as string) || "";

    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (actorId) {
      conditions.push(`actor_id = $${paramIndex}`);
      params.push(actorId);
      paramIndex++;
    }
    if (action) {
      conditions.push(`action = $${paramIndex}`);
      params.push(action);
      paramIndex++;
    }
    if (entityType) {
      conditions.push(`entity_type = $${paramIndex}`);
      params.push(entityType);
      paramIndex++;
    }
    if (entityId) {
      conditions.push(`entity_id = $${paramIndex}`);
      params.push(entityId);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    try {
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM audit_logs ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count, 10);

      const dataResult = await pool.query(
        `SELECT * FROM audit_logs ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
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
    } catch (error) {
      console.error("Fetch audit logs failed:", error);
      return res.status(500).json({ error: "failed to fetch audit logs" });
    }
  });

  app.delete("/api/audit", async (req, res) => {
    const requester = await getRequester(req);
    if (!requester || !ensureAdmin(requester)) {
      return res.status(403).json({ error: "admin access required" });
    }

    const before = req.query.before as string | undefined;
    const all = req.query.all === "true";

    if (!before && !all) {
      return res.status(400).json({ error: "before or all=true required" });
    }

    try {
      if (all) {
        await pool.query(`DELETE FROM audit_logs`);
      } else {
        await pool.query(`DELETE FROM audit_logs WHERE created_at < $1`, [before]);
      }
      await logAudit({
        req,
        actor: { id: requester.id, email: requester.email },
        action: "audit.purge",
        entityType: "audit_log",
        entityId: all ? "all" : before ?? null,
      });
      return res.status(204).send();
    } catch (error) {
      console.error("Purge audit logs failed:", error);
      return res.status(500).json({ error: "failed to purge audit logs" });
    }
  });

  app.get("/api/admin/health", async (req, res) => {
    const requester = await getRequester(req);
    if (!requester || !ensureAdmin(requester)) {
      return res.status(403).json({ error: "admin access required" });
    }

    try {
      const [
        dbSizeResult,
        tableStatsResult,
        controllerCountResult,
        distinctDevicesResult,
        activeDevicesResult,
        readingCountResult,
        latestReadingResult,
        userStatsResult,
      ] = await Promise.all([
        pool.query(`SELECT pg_database_size(current_database()) AS size_bytes`),
        pool.query(
          `SELECT relname AS table, pg_total_relation_size(relid) AS bytes, n_live_tup AS rows
           FROM pg_stat_user_tables
           ORDER BY bytes DESC`
        ),
        pool.query(`SELECT COUNT(*) FROM controllers`),
        pool.query(`SELECT COUNT(DISTINCT device_id) FROM readings`),
        pool.query(
          `SELECT COUNT(DISTINCT device_id) FROM readings WHERE ts > NOW() - INTERVAL '24 hours'`
        ),
        pool.query(`SELECT COUNT(*) FROM readings`),
        pool.query(`SELECT MAX(ts) AS latest FROM readings`),
        pool.query(
          `SELECT
             COUNT(*) AS total,
             SUM(CASE WHEN role = 'admin' OR LOWER(is_admin::text) IN ('t', 'true', '1') THEN 1 ELSE 0 END) AS admins,
             SUM(CASE WHEN invited_at IS NOT NULL THEN 1 ELSE 0 END) AS invited,
             SUM(CASE WHEN must_change_password THEN 1 ELSE 0 END) AS must_change_password
           FROM users`
        ),
      ]);

      const userStats = userStatsResult.rows[0];

      return res.json({
        serverTime: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        requests: {
          total: requestMetrics.total,
          byStatus: Object.fromEntries(requestMetrics.byStatus.entries()),
          byRoute: Object.fromEntries(requestMetrics.byRoute.entries()),
          since: requestMetrics.since.toISOString(),
        },
        database: {
          sizeBytes: Number(dbSizeResult.rows[0]?.size_bytes ?? 0),
          tableSizes: tableStatsResult.rows.map((row) => ({
            table: row.table,
            bytes: Number(row.bytes),
            rows: Number(row.rows),
          })),
        },
        devices: {
          totalControllers: Number(controllerCountResult.rows[0]?.count ?? 0),
          distinctDevices: Number(distinctDevicesResult.rows[0]?.count ?? 0),
          activeDevicesLast24h: Number(activeDevicesResult.rows[0]?.count ?? 0),
          totalReadings: Number(readingCountResult.rows[0]?.count ?? 0),
          latestReadingAt: latestReadingResult.rows[0]?.latest ?? null,
        },
        users: {
          total: Number(userStats?.total ?? 0),
          admins: Number(userStats?.admins ?? 0),
          invited: Number(userStats?.invited ?? 0),
          mustChangePassword: Number(userStats?.must_change_password ?? 0),
        },
      });
    } catch (error) {
      console.error("Fetch health stats failed:", error);
      return res.status(500).json({ error: "failed to fetch health stats" });
    }
  });
};
