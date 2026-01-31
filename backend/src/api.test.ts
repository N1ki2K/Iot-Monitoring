import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express, Request } from "express";

let queryMock: ReturnType<typeof vi.fn>;

vi.mock("pg", () => ({
  Pool: vi.fn(() => ({
    query: (...args: unknown[]) => queryMock(...args),
  })),
}));

const loadApi = async () => {
  process.env.NODE_ENV = "test";
  return await import("./api.js");
};

const adminRow = {
  id: 1,
  username: "Admin",
  email: "admin@example.com",
  role: "admin",
  created_at: "2024-01-01",
};

const devRow = {
  id: 1,
  username: "Dev",
  email: "dev@example.com",
  role: "dev",
  is_dev: true,
  created_at: "2024-01-01",
};

const userRow = {
  id: 2,
  username: "User",
  email: "user@example.com",
  role: "user",
  created_at: "2024-01-02",
};

describe("api endpoints", () => {
  let app: Express;
  let hashPassword: (password: string) => Promise<string>;
  let verifyPassword: (password: string, storedHash: string) => Promise<boolean>;
  let generatePairingCode: () => Promise<string>;
  let ensureAdmin: (user: { role: string } | null) => boolean;
  let getRequester: (req: Request) => Promise<{ id: number; role: string } | null>;

  beforeEach(async () => {
    queryMock = vi.fn();
    vi.resetModules();
    ({
      app,
      hashPassword,
      verifyPassword,
      generatePairingCode,
      ensureAdmin,
      getRequester,
    } = await loadApi());
  });

  it("hashPassword/verifyPassword round-trip", async () => {
    const hash = await hashPassword("secret");
    expect(await verifyPassword("secret", hash)).toBe(true);
    expect(await verifyPassword("nope", hash)).toBe(false);
  });

  it("ensureAdmin returns expected boolean", () => {
    expect(ensureAdmin({ role: "admin" })).toBe(true);
    expect(ensureAdmin({ role: "dev" })).toBe(true);
    expect(ensureAdmin({ role: "user" })).toBe(false);
    expect(ensureAdmin(null)).toBe(false);
  });

  it("getRequester returns null when header missing", async () => {
    const req = { header: () => undefined } as unknown as Request;
    expect(await getRequester(req)).toBeNull();
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("getRequester returns normalized user", async () => {
    queryMock.mockResolvedValueOnce({ rows: [adminRow] });
    const req = { header: (name: string) => (name === "x-user-id" ? "1" : undefined) } as unknown as Request;
    const user = await getRequester(req);
    expect(user).toMatchObject({
      id: 1,
      role: "admin",
      username: "Admin",
    });
  });

  it("generatePairingCode retries until unique", async () => {
    queryMock
      .mockResolvedValueOnce({ rowCount: 1, rows: [1] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const code = await generatePairingCode();
    expect(code).toMatch(/^\d{5}$/);
    expect(queryMock).toHaveBeenCalledTimes(2);
  });

  it("POST /api/auth/register validates payload", async () => {
    const res = await request(app).post("/api/auth/register").send({});
    expect(res.status).toBe(400);
  });

  it("POST /api/auth/register creates user", async () => {
    queryMock.mockResolvedValueOnce({ rows: [userRow] });
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "User", email: "user@example.com", password: "pw" });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe("user@example.com");
  });

  it("POST /api/auth/register handles duplicates", async () => {
    queryMock.mockRejectedValueOnce({ code: "23505" });
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "User", email: "user@example.com", password: "pw" });
    expect(res.status).toBe(409);
  });

  it("POST /api/auth/login validates payload", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
  });

  it("POST /api/auth/login rejects invalid credentials", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@example.com", password: "pw" });
    expect(res.status).toBe(401);
  });

  it("POST /api/auth/login rejects bad password", async () => {
    const badHash = await hashPassword("different");
    queryMock.mockResolvedValueOnce({ rows: [{ ...userRow, password: badHash }] });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@example.com", password: "pw" });
    expect(res.status).toBe(401);
  });

  it("POST /api/auth/login succeeds", async () => {
    const goodHash = await hashPassword("pw");
    queryMock.mockResolvedValueOnce({ rows: [{ ...userRow, password: goodHash }] });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@example.com", password: "pw" });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(2);
  });

  it("GET /api/me requires auth", async () => {
    const res = await request(app).get("/api/me");
    expect(res.status).toBe(401);
  });

  it("GET /api/me returns requester", async () => {
    queryMock.mockResolvedValueOnce({ rows: [userRow] });
    const res = await request(app).get("/api/me").set("x-user-id", "2");
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("user@example.com");
  });

  it("PATCH /api/me validates fields", async () => {
    queryMock.mockResolvedValueOnce({ rows: [userRow] });
    const res = await request(app).patch("/api/me").set("x-user-id", "2").send({});
    expect(res.status).toBe(400);
  });

  it("PATCH /api/me updates profile", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [userRow] })
      .mockResolvedValueOnce({ rows: [{ ...userRow, username: "Updated" }] });
    const res = await request(app)
      .patch("/api/me")
      .set("x-user-id", "2")
      .send({ username: "Updated", email: "user@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.username).toBe("Updated");
  });

  it("PATCH /api/me/password validates payload", async () => {
    queryMock.mockResolvedValueOnce({ rows: [userRow] });
    const res = await request(app)
      .patch("/api/me/password")
      .set("x-user-id", "2")
      .send({});
    expect(res.status).toBe(400);
  });

  it("PATCH /api/me/password rejects wrong password", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [userRow] })
      .mockResolvedValueOnce({ rows: [{ password: await hashPassword("old") }] });
    const res = await request(app)
      .patch("/api/me/password")
      .set("x-user-id", "2")
      .send({ currentPassword: "nope", newPassword: "new" });
    expect(res.status).toBe(401);
  });

  it("PATCH /api/me/password updates password", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [userRow] })
      .mockResolvedValueOnce({ rows: [{ password: await hashPassword("old") }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .patch("/api/me/password")
      .set("x-user-id", "2")
      .send({ currentPassword: "old", newPassword: "new" });
    expect(res.status).toBe(204);
  });

  it("DELETE /api/me deletes account", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [userRow] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).delete("/api/me").set("x-user-id", "2");
    expect(res.status).toBe(204);
  });

  it("GET /api/users requires admin", async () => {
    queryMock.mockResolvedValueOnce({ rows: [userRow] });
    const res = await request(app).get("/api/users").set("x-user-id", "2");
    expect(res.status).toBe(403);
  });

  it("GET /api/users returns list for admin", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockResolvedValueOnce({ rows: [userRow] });
    const res = await request(app).get("/api/users").set("x-user-id", "1");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("POST /api/admin/users/invite requires admin", async () => {
    queryMock.mockResolvedValueOnce({ rows: [userRow] });
    const res = await request(app)
      .post("/api/admin/users/invite")
      .set("x-user-id", "2")
      .send({ username: "New", email: "new@example.com" });
    expect(res.status).toBe(403);
  });

  it("POST /api/admin/users/invite validates payload", async () => {
    queryMock.mockResolvedValueOnce({ rows: [adminRow] });
    const res = await request(app)
      .post("/api/admin/users/invite")
      .set("x-user-id", "1")
      .send({});
    expect(res.status).toBe(400);
  });

  it("POST /api/admin/users/invite creates user", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockResolvedValueOnce({
        rows: [
          {
            ...userRow,
            email: "new@example.com",
            invited_by: 1,
            must_change_password: true,
          },
        ],
      });
    const res = await request(app)
      .post("/api/admin/users/invite")
      .set("x-user-id", "1")
      .send({ username: "New", email: "new@example.com" });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("new@example.com");
    expect(res.body.tempPassword).toBeDefined();
  });

  it("POST /api/admin/users/invite rejects invalid role", async () => {
    queryMock.mockResolvedValueOnce({ rows: [adminRow] });
    const res = await request(app)
      .post("/api/admin/users/invite")
      .set("x-user-id", "1")
      .send({ username: "New", email: "new@example.com", role: "invalid" });
    expect(res.status).toBe(400);
  });

  it("POST /api/admin/users/invite rejects non-dev inviting admin", async () => {
    queryMock.mockResolvedValueOnce({ rows: [adminRow] });
    const res = await request(app)
      .post("/api/admin/users/invite")
      .set("x-user-id", "1")
      .send({ username: "New", email: "new@example.com", role: "admin" });
    expect(res.status).toBe(403);
  });

  it("POST /api/admin/users/invite rejects duplicates", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockRejectedValueOnce({ code: "23505" });
    const res = await request(app)
      .post("/api/admin/users/invite")
      .set("x-user-id", "1")
      .send({ username: "New", email: "new@example.com" });
    expect(res.status).toBe(409);
  });

  it("GET /api/users/:id rejects non-admin", async () => {
    queryMock.mockResolvedValueOnce({ rows: [userRow] });
    const res = await request(app).get("/api/users/2").set("x-user-id", "2");
    expect(res.status).toBe(403);
  });

  it("GET /api/users/:id returns 404 for missing user", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get("/api/users/99").set("x-user-id", "1");
    expect(res.status).toBe(404);
  });

  it("GET /api/users/:id returns user", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockResolvedValueOnce({ rows: [userRow] });
    const res = await request(app).get("/api/users/2").set("x-user-id", "1");
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("user@example.com");
  });

  it("PATCH /api/users/:id rejects non-admin", async () => {
    queryMock.mockResolvedValueOnce({ rows: [userRow] });
    const res = await request(app)
      .patch("/api/users/2")
      .set("x-user-id", "2")
      .send({ username: "Updated" });
    expect(res.status).toBe(403);
  });

  it("PATCH /api/users/:id rejects non-dev role changes", async () => {
    queryMock.mockResolvedValueOnce({ rows: [adminRow] });
    const res = await request(app)
      .patch("/api/users/2")
      .set("x-user-id", "1")
      .send({ role: "admin" });
    expect(res.status).toBe(403);
  });

  it("PATCH /api/users/:id rejects no fields", async () => {
    queryMock.mockResolvedValueOnce({ rows: [adminRow] });
    const res = await request(app)
      .patch("/api/users/2")
      .set("x-user-id", "1")
      .send({});
    expect(res.status).toBe(400);
  });

  it("PATCH /api/users/:id updates user", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ ...adminRow, role: "dev", is_dev: true }] })
      .mockResolvedValueOnce({ rows: [{ ...userRow, username: "Updated" }] });
    const res = await request(app)
      .patch("/api/users/2")
      .set("x-user-id", "1")
      .send({ username: "Updated" });
    expect(res.status).toBe(200);
    expect(res.body.username).toBe("Updated");
  });

  it("PATCH /api/users/:id updates is_admin field", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [devRow] })
      .mockResolvedValueOnce({ rows: [{ ...userRow, is_admin: true }] });
    const res = await request(app)
      .patch("/api/users/2")
      .set("x-user-id", "1")
      .send({ is_admin: true });
    expect(res.status).toBe(200);
  });

  it("PATCH /api/users/:id updates is_dev field", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [devRow] })
      .mockResolvedValueOnce({ rows: [{ ...userRow, is_dev: true }] });
    const res = await request(app)
      .patch("/api/users/2")
      .set("x-user-id", "1")
      .send({ is_dev: true });
    expect(res.status).toBe(200);
  });

  it("PATCH /api/users/:id updates must_change_password field", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [devRow] })
      .mockResolvedValueOnce({ rows: [{ ...userRow, must_change_password: true }] });
    const res = await request(app)
      .patch("/api/users/2")
      .set("x-user-id", "1")
      .send({ must_change_password: true });
    expect(res.status).toBe(200);
  });

  it("PATCH /api/users/:id returns 404 when user not found", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .patch("/api/users/999")
      .set("x-user-id", "1")
      .send({ username: "new" });
    expect(res.status).toBe(404);
  });

  it("PATCH /api/users/:id returns 409 on duplicate email", async () => {
    const err = new Error("duplicate");
    (err as { code?: string }).code = "23505";
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockRejectedValueOnce(err);
    const res = await request(app)
      .patch("/api/users/2")
      .set("x-user-id", "1")
      .send({ email: "taken@example.com" });
    expect(res.status).toBe(409);
  });

  it("DELETE /api/users/:id requires admin", async () => {
    queryMock.mockResolvedValueOnce({ rows: [userRow] });
    const res = await request(app).delete("/api/users/2").set("x-user-id", "2");
    expect(res.status).toBe(403);
  });

  it("DELETE /api/users/:id rejects deleting self", async () => {
    queryMock.mockResolvedValueOnce({ rows: [adminRow] });
    const res = await request(app).delete("/api/users/1").set("x-user-id", "1");
    expect(res.status).toBe(400);
  });

  it("DELETE /api/users/:id blocks deleting dev without dev access", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockResolvedValueOnce({ rows: [{ ...userRow, role: "dev", is_dev: true }] });
    const res = await request(app).delete("/api/users/2").set("x-user-id", "1");
    expect(res.status).toBe(403);
  });

  it("DELETE /api/users/:id allows dev to delete dev", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ ...adminRow, role: "dev", is_dev: true }] })
      .mockResolvedValueOnce({ rows: [{ ...userRow, role: "dev", is_dev: true }] })
      .mockResolvedValueOnce({ rows: [{ id: 2, email: "user@example.com" }] });
    const res = await request(app).delete("/api/users/2").set("x-user-id", "1");
    expect(res.status).toBe(204);
  });

  it("DELETE /api/users/:id deletes user", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockResolvedValueOnce({ rows: [{ ...userRow, role: "user", is_dev: false }] })
      .mockResolvedValueOnce({ rows: [{ id: 2, email: "user@example.com" }] });
    const res = await request(app).delete("/api/users/2").set("x-user-id", "1");
    expect(res.status).toBe(204);
  });

  it("DELETE /api/users/:id returns 404 when user not found", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).delete("/api/users/999").set("x-user-id", "1");
    expect(res.status).toBe(404);
  });

  it("DELETE /api/users/:id handles database error", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockResolvedValueOnce({ rows: [userRow] })
      .mockRejectedValueOnce(new Error("db"));
    const res = await request(app).delete("/api/users/2").set("x-user-id", "1");
    expect(res.status).toBe(500);
  });

  it("PATCH /api/users/:id/role rejects non-dev", async () => {
    queryMock.mockResolvedValueOnce({ rows: [adminRow] });
    const res = await request(app)
      .patch("/api/users/2/role")
      .set("x-user-id", "1")
      .send({ role: "admin" });
    expect(res.status).toBe(403);
  });

  it("PATCH /api/users/:id/role rejects invalid role", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ ...adminRow, role: "dev", is_dev: true }] });
    const res = await request(app)
      .patch("/api/users/2/role")
      .set("x-user-id", "1")
      .send({ role: "nope" });
    expect(res.status).toBe(400);
  });

  it("PATCH /api/users/:id/role updates role", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ ...adminRow, role: "dev", is_dev: true }] })
      .mockResolvedValueOnce({ rows: [{ ...userRow, role: "admin" }] });
    const res = await request(app)
      .patch("/api/users/2/role")
      .set("x-user-id", "1")
      .send({ role: "admin" });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("admin");
  });

  it("PATCH /api/users/:id/role returns 404 when user not found", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ ...adminRow, role: "dev", is_dev: true }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .patch("/api/users/999/role")
      .set("x-user-id", "1")
      .send({ role: "admin" });
    expect(res.status).toBe(404);
  });

  it("PATCH /api/users/:id/role handles database error", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ ...adminRow, role: "dev", is_dev: true }] })
      .mockRejectedValueOnce(new Error("db"));
    const res = await request(app)
      .patch("/api/users/2/role")
      .set("x-user-id", "1")
      .send({ role: "admin" });
    expect(res.status).toBe(500);
  });

  it("GET /api/audit rejects non-dev", async () => {
    queryMock.mockResolvedValueOnce({ rows: [adminRow] });
    const res = await request(app).get("/api/audit").set("x-user-id", "1");
    expect(res.status).toBe(403);
  });

  it("GET /api/audit returns paginated logs", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ ...adminRow, role: "dev", is_dev: true }] })
      .mockResolvedValueOnce({ rows: [{ count: "1" }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, action: "user.login", entity_type: "user" }] });
    const res = await request(app).get("/api/audit").set("x-user-id", "1");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("GET /api/audit filters by actorId/action/entityType", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ ...adminRow, role: "dev", is_dev: true }] })
      .mockResolvedValueOnce({ rows: [{ count: "0" }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get("/api/audit")
      .query({ actorId: 1, action: "user.login", entityType: "user" })
      .set("x-user-id", "1");
    expect(res.status).toBe(200);
  });

  it("GET /api/audit filters by entityType", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [devRow] })
      .mockResolvedValueOnce({ rows: [{ count: "1" }] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await request(app)
      .get("/api/audit?entityType=user")
      .set("x-user-id", "1");
    expect(res.status).toBe(200);
  });

  it("GET /api/audit filters by entityId", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [devRow] })
      .mockResolvedValueOnce({ rows: [{ count: "1" }] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await request(app)
      .get("/api/audit?entityId=42")
      .set("x-user-id", "1");
    expect(res.status).toBe(200);
  });

  it("DELETE /api/audit rejects non-dev", async () => {
    queryMock.mockResolvedValueOnce({ rows: [adminRow] });
    const res = await request(app).delete("/api/audit").set("x-user-id", "1");
    expect(res.status).toBe(403);
  });

  it("DELETE /api/audit requires before or all", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ ...adminRow, role: "dev", is_dev: true }] });
    const res = await request(app).delete("/api/audit").set("x-user-id", "1");
    expect(res.status).toBe(400);
  });

  it("DELETE /api/audit purges all", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ ...adminRow, role: "dev", is_dev: true }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .delete("/api/audit?all=true")
      .set("x-user-id", "1");
    expect(res.status).toBe(204);
  });

  it("DELETE /api/audit purges before date", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ ...adminRow, role: "dev", is_dev: true }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .delete("/api/audit?before=2024-01-01T00:00:00.000Z")
      .set("x-user-id", "1");
    expect(res.status).toBe(204);
  });

  it("GET /api/audit handles errors", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [devRow] })
      .mockRejectedValueOnce(new Error("db"));
    const res = await request(app).get("/api/audit").set("x-user-id", "1");
    expect(res.status).toBe(500);
  });

  it("DELETE /api/audit handles errors", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [devRow] })
      .mockRejectedValueOnce(new Error("db"));
    const res = await request(app).delete("/api/audit?all=true").set("x-user-id", "1");
    expect(res.status).toBe(500);
  });

  it("GET /api/admin/health requires admin", async () => {
    queryMock.mockResolvedValueOnce({ rows: [userRow] });
    const res = await request(app).get("/api/admin/health").set("x-user-id", "2");
    expect(res.status).toBe(403);
  });

  it("GET /api/admin/health returns expected structure", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockResolvedValueOnce({ rows: [{ size_bytes: "1024" }] })
      .mockResolvedValueOnce({ rows: [{ table: "users", bytes: "2048", rows: "5" }] })
      .mockResolvedValueOnce({ rows: [{ count: "2" }] })
      .mockResolvedValueOnce({ rows: [{ count: "2" }] })
      .mockResolvedValueOnce({ rows: [{ count: "1" }] })
      .mockResolvedValueOnce({ rows: [{ count: "100" }] })
      .mockResolvedValueOnce({ rows: [{ latest: "2024-01-01T00:00:00.000Z" }] })
      .mockResolvedValueOnce({
        rows: [
          {
            total: "5",
            admins: "1",
            devs: "1",
            invited: "2",
            must_change_password: "1",
          },
        ],
      });
    const res = await request(app).get("/api/admin/health").set("x-user-id", "1");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      requests: expect.objectContaining({
        total: expect.any(Number),
        byStatus: expect.any(Object),
        byRoute: expect.any(Object),
        since: expect.any(String),
      }),
      database: expect.objectContaining({
        sizeBytes: 1024,
        tableSizes: expect.any(Array),
      }),
      devices: expect.objectContaining({
        totalControllers: 2,
        distinctDevices: 2,
        activeDevicesLast24h: 1,
        totalReadings: 100,
      }),
      users: expect.objectContaining({
        total: 5,
        admins: 1,
        devs: 1,
        invited: 2,
        mustChangePassword: 1,
      }),
    });
  });

  it("GET /api/admin/health handles errors", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockRejectedValueOnce(new Error("db error"));
    const res = await request(app).get("/api/admin/health").set("x-user-id", "1");
    expect(res.status).toBe(500);
  });

  it("GET /api/controllers requires admin", async () => {
    queryMock.mockResolvedValueOnce({ rows: [userRow] });
    const res = await request(app).get("/api/controllers").set("x-user-id", "2");
    expect(res.status).toBe(403);
  });

  it("GET /api/controllers returns list", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockResolvedValueOnce({ rows: [{ id: 1, device_id: "dev1" }] });
    const res = await request(app).get("/api/controllers").set("x-user-id", "1");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("GET /api/controllers handles errors", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockRejectedValueOnce(new Error("db"));
    const res = await request(app).get("/api/controllers").set("x-user-id", "1");
    expect(res.status).toBe(500);
  });

  it("GET /api/controllers/available-devices rejects non-admin", async () => {
    queryMock.mockResolvedValueOnce({ rows: [userRow] });
    const res = await request(app)
      .get("/api/controllers/available-devices")
      .set("x-user-id", "2");
    expect(res.status).toBe(403);
  });

  it("GET /api/controllers/available-devices returns device ids", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockResolvedValueOnce({ rows: [{ device_id: "dev1" }, { device_id: "dev2" }] });
    const res = await request(app)
      .get("/api/controllers/available-devices")
      .set("x-user-id", "1");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(["dev1", "dev2"]);
  });

  it("GET /api/controllers/available-devices handles errors", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockRejectedValueOnce(new Error("db"));
    const res = await request(app)
      .get("/api/controllers/available-devices")
      .set("x-user-id", "1");
    expect(res.status).toBe(500);
  });

  it("POST /api/controllers rejects non-admin", async () => {
    queryMock.mockResolvedValueOnce({ rows: [userRow] });
    const res = await request(app)
      .post("/api/controllers")
      .set("x-user-id", "2")
      .send({ deviceId: "dev1" });
    expect(res.status).toBe(403);
  });

  it("POST /api/controllers requires deviceId", async () => {
    queryMock.mockResolvedValueOnce({ rows: [adminRow] });
    const res = await request(app)
      .post("/api/controllers")
      .set("x-user-id", "1")
      .send({});
    expect(res.status).toBe(400);
  });

  it("POST /api/controllers creates controller", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 1, device_id: "dev1", label: null, pairing_code: "12345" }] });
    const res = await request(app)
      .post("/api/controllers")
      .set("x-user-id", "1")
      .send({ deviceId: "dev1" });
    expect(res.status).toBe(201);
    expect(res.body.device_id).toBe("dev1");
  });

  it("POST /api/controllers handles errors", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockRejectedValueOnce(new Error("db"));
    const res = await request(app)
      .post("/api/controllers")
      .set("x-user-id", "1")
      .send({ deviceId: "dev1" });
    expect(res.status).toBe(500);
  });

  it("POST /api/controllers/claim rejects missing user", async () => {
    const res = await request(app).post("/api/controllers/claim").send({ code: "12345" });
    expect(res.status).toBe(401);
  });

  it("POST /api/controllers/claim requires code", async () => {
    queryMock.mockResolvedValueOnce({ rows: [userRow] });
    const res = await request(app)
      .post("/api/controllers/claim")
      .set("x-user-id", "2")
      .send({});
    expect(res.status).toBe(400);
  });

  it("POST /api/controllers/claim rejects invalid code format", async () => {
    queryMock.mockResolvedValueOnce({ rows: [userRow] });
    const res = await request(app)
      .post("/api/controllers/claim")
      .set("x-user-id", "2")
      .send({ code: "abc" });
    expect(res.status).toBe(400);
  });

  it("POST /api/controllers/claim rejects wrong code", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [userRow] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post("/api/controllers/claim")
      .set("x-user-id", "2")
      .send({ code: "12345" });
    expect(res.status).toBe(404);
  });

  it("POST /api/controllers/claim claims controller", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [userRow] })
      .mockResolvedValueOnce({ rows: [{ id: 1, device_id: "dev1", pairing_code: "12345" }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post("/api/controllers/claim")
      .set("x-user-id", "2")
      .send({ code: "12345" });
    expect(res.status).toBe(200);
    expect(res.body.controller.device_id).toBe("dev1");
  });

  it("POST /api/controllers/claim handles errors", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [userRow] })
      .mockRejectedValueOnce(new Error("db"));
    const res = await request(app)
      .post("/api/controllers/claim")
      .set("x-user-id", "2")
      .send({ code: "12345" });
    expect(res.status).toBe(500);
  });

  it("DELETE /api/controllers/:id deletes controller", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .delete("/api/controllers/5")
      .set("x-user-id", "1");
    expect(res.status).toBe(204);
  });

  it("DELETE /api/controllers/:id rejects non-admin", async () => {
    queryMock.mockResolvedValueOnce({ rows: [userRow] });
    const res = await request(app).delete("/api/controllers/1").set("x-user-id", "2");
    expect(res.status).toBe(403);
  });

  it("DELETE /api/controllers/:id rejects invalid id", async () => {
    queryMock.mockResolvedValueOnce({ rows: [adminRow] });
    const res = await request(app).delete("/api/controllers/abc").set("x-user-id", "1");
    expect(res.status).toBe(400);
  });

  it("DELETE /api/controllers/:id handles errors", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockRejectedValueOnce(new Error("db error"));
    const res = await request(app).delete("/api/controllers/1").set("x-user-id", "1");
    expect(res.status).toBe(500);
  });

  it("GET /api/users/:id/controllers enforces access", async () => {
    queryMock.mockResolvedValueOnce({ rows: [userRow] });
    const res = await request(app).get("/api/users/1/controllers").set("x-user-id", "2");
    expect(res.status).toBe(403);
  });

  it("GET /api/users/:id/controllers rejects invalid user id", async () => {
    queryMock.mockResolvedValueOnce({ rows: [adminRow] });
    const res = await request(app).get("/api/users/abc/controllers").set("x-user-id", "1");
    expect(res.status).toBe(400);
  });

  it("GET /api/users/:id/controllers handles errors", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockRejectedValueOnce(new Error("db error"));
    const res = await request(app).get("/api/users/2/controllers").set("x-user-id", "1");
    expect(res.status).toBe(500);
  });

  it("GET /api/users/:id/controllers returns assignments", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [userRow] })
      .mockResolvedValueOnce({ rows: [{ controller_id: 1, device_id: "dev1" }] });
    const res = await request(app).get("/api/users/2/controllers").set("x-user-id", "2");
    expect(res.status).toBe(200);
    expect(res.body[0].device_id).toBe("dev1");
  });

  it("POST /api/users/:id/controllers assigns controller", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockResolvedValueOnce({ rows: [{ user_id: 2, controller_id: 5 }] });
    const res = await request(app)
      .post("/api/users/2/controllers")
      .set("x-user-id", "1")
      .send({ controllerId: 5 });
    expect(res.status).toBe(201);
  });

  it("POST /api/users/:id/controllers rejects missing controllerId", async () => {
    queryMock.mockResolvedValueOnce({ rows: [adminRow] });
    const res = await request(app)
      .post("/api/users/2/controllers")
      .set("x-user-id", "1")
      .send({});
    expect(res.status).toBe(400);
  });

  it("POST /api/users/:id/controllers rejects non-admin", async () => {
    queryMock.mockResolvedValueOnce({ rows: [userRow] });
    const res = await request(app)
      .post("/api/users/2/controllers")
      .set("x-user-id", "2")
      .send({ controllerId: 1 });
    expect(res.status).toBe(403);
  });

  it("POST /api/users/:id/controllers handles errors", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockRejectedValueOnce(new Error("db error"));
    const res = await request(app)
      .post("/api/users/2/controllers")
      .set("x-user-id", "1")
      .send({ controllerId: 1 });
    expect(res.status).toBe(500);
  });

  it("PATCH /api/users/:id/controllers/:id updates label", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ user_id: 2, controller_id: 5, label: "Kitchen" }] });
    const res = await request(app)
      .patch("/api/users/2/controllers/5")
      .set("x-user-id", "1")
      .send({ label: "Kitchen" });
    expect(res.status).toBe(200);
    expect(res.body.label).toBe("Kitchen");
  });

  it("PATCH /api/users/:id/controllers/:id rejects invalid ids", async () => {
    queryMock.mockResolvedValueOnce({ rows: [adminRow] });
    const res = await request(app)
      .patch("/api/users/abc/controllers/xyz")
      .set("x-user-id", "1")
      .send({ label: "test" });
    expect(res.status).toBe(400);
  });

  it("PATCH /api/users/:id/controllers/:id rejects non-admin non-owner", async () => {
    queryMock.mockResolvedValueOnce({ rows: [userRow] });
    const res = await request(app)
      .patch("/api/users/3/controllers/1")
      .set("x-user-id", "2")
      .send({ label: "test" });
    expect(res.status).toBe(403);
  });

  it("PATCH /api/users/:id/controllers/:id returns 404 when missing", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await request(app)
      .patch("/api/users/2/controllers/5")
      .set("x-user-id", "1")
      .send({ label: "Kitchen" });
    expect(res.status).toBe(404);
  });

  it("PATCH /api/users/:id/controllers/:id handles errors", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockRejectedValueOnce(new Error("db error"));
    const res = await request(app)
      .patch("/api/users/2/controllers/5")
      .set("x-user-id", "1")
      .send({ label: "Kitchen" });
    expect(res.status).toBe(500);
  });

  it("DELETE /api/users/:id/controllers validates payload", async () => {
    queryMock.mockResolvedValueOnce({ rows: [adminRow] });
    const res = await request(app)
      .delete("/api/users/2/controllers")
      .set("x-user-id", "1")
      .send({});
    expect(res.status).toBe(400);
  });

  it("DELETE /api/users/:id/controllers enforces access", async () => {
    queryMock.mockResolvedValueOnce({ rows: [userRow] });
    const res = await request(app)
      .delete("/api/users/1/controllers")
      .set("x-user-id", "2")
      .send({ controllerId: 5 });
    expect(res.status).toBe(403);
  });

  it("DELETE /api/users/:id/controllers handles errors", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockRejectedValueOnce(new Error("db error"));
    const res = await request(app)
      .delete("/api/users/2/controllers")
      .set("x-user-id", "1")
      .send({ controllerId: 5 });
    expect(res.status).toBe(500);
  });

  it("DELETE /api/users/:id/controllers removes assignment", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .delete("/api/users/2/controllers")
      .set("x-user-id", "1")
      .send({ controllerId: 5 });
    expect(res.status).toBe(204);
  });

  it("GET /api/devices filters for user", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [userRow] })
      .mockResolvedValueOnce({ rows: [{ device_id: "dev1" }, { device_id: "dev2" }] });
    const res = await request(app).get("/api/devices").set("x-user-id", "2");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(["dev1", "dev2"]);
  });

  it("GET /api/devices returns all devices for admin", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockResolvedValueOnce({ rows: [{ device_id: "dev1" }, { device_id: "dev2" }] });
    const res = await request(app).get("/api/devices").set("x-user-id", "1");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(["dev1", "dev2"]);
  });

  it("GET /api/latest/:deviceId enforces access", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [userRow] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await request(app).get("/api/latest/dev1").set("x-user-id", "2");
    expect(res.status).toBe(403);
  });

  it("GET /api/latest/:deviceId returns latest reading", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockResolvedValueOnce({ rows: [{ id: 1, device_id: "dev1" }] });
    const res = await request(app).get("/api/latest/dev1").set("x-user-id", "1");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
  });

  it("GET /api/history/:deviceId returns history", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockResolvedValueOnce({ rows: [{ id: 1, device_id: "dev1" }] });
    const res = await request(app).get("/api/history/dev1").set("x-user-id", "1");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("GET /api/history/:deviceId denies non-admin without access", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [userRow] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await request(app).get("/api/history/dev1").set("x-user-id", "2");
    expect(res.status).toBe(403);
  });

  it("GET /api/readings supports search and pagination", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockImplementationOnce((sql: string) => {
        expect(sql).toContain("COUNT(*)");
        return Promise.resolve({ rows: [{ count: "2" }] });
      })
      .mockImplementationOnce((sql: string, params: unknown[]) => {
        expect(sql).toContain("ORDER BY ts DESC");
        const limit = params[params.length - 2] as number;
        const offset = params[params.length - 1] as number;
        expect(limit).toBe(20);
        expect(offset).toBe(0);
        return Promise.resolve({ rows: [{ id: 1 }, { id: 2 }] });
      });

    const res = await request(app)
      .get("/api/readings")
      .query({ search: "device:dev1" })
      .set("x-user-id", "1");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.total).toBe(2);
  });

  it("GET /api/readings denies non-admin access to other device", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [userRow] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await request(app)
      .get("/api/readings?device=other-device")
      .set("x-user-id", "2");
    expect(res.status).toBe(403);
  });

  it("GET /api/readings searches timestamp text", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockImplementationOnce((sql: string) => {
        expect(sql).toContain("ts::text ILIKE");
        return Promise.resolve({ rows: [{ count: "0" }] });
      })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get("/api/readings?search=ts:afternoon")
      .set("x-user-id", "1");
    expect(res.status).toBe(200);
  });

  it("GET /api/readings searches exact numeric value", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockImplementationOnce((sql: string) => {
        expect(sql).toContain("temperature_c =");
        return Promise.resolve({ rows: [{ count: "1" }] });
      })
      .mockResolvedValueOnce({ rows: [{ temperature_c: 25 }] });
    const res = await request(app)
      .get("/api/readings?search=t:25")
      .set("x-user-id", "1");
    expect(res.status).toBe(200);
  });

  it("GET /api/readings filters devices for non-admin", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [userRow] })
      .mockImplementationOnce((sql: string) => {
        expect(sql).toContain("device_id IN");
        return Promise.resolve({ rows: [{ count: "1" }] });
      })
      .mockImplementationOnce((sql: string) => {
        expect(sql).toContain("device_id IN");
        return Promise.resolve({ rows: [{ id: 1 }] });
      });
    const res = await request(app).get("/api/readings").set("x-user-id", "2");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("GET /api/readings supports specific device filter for non-admin", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [userRow] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockImplementationOnce((sql: string) => {
        expect(sql).toContain("device_id =");
        return Promise.resolve({ rows: [{ count: "1" }] });
      })
      .mockImplementationOnce((sql: string) => {
        expect(sql).toContain("device_id =");
        return Promise.resolve({ rows: [{ id: 2 }] });
      });
    const res = await request(app)
      .get("/api/readings")
      .query({ device: "dev1" })
      .set("x-user-id", "2");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("GET /api/readings supports timestamp search", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockImplementationOnce((sql: string) => {
        expect(sql).toContain("DATE(ts) =");
        return Promise.resolve({ rows: [{ count: "1" }] });
      })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await request(app)
      .get("/api/readings")
      .query({ search: "ts:2024-01-15" })
      .set("x-user-id", "1");
    expect(res.status).toBe(200);
  });

  it("GET /api/readings supports range search", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockImplementationOnce((sql: string) => {
        expect(sql).toContain("temperature_c >=");
        expect(sql).toContain("temperature_c <=");
        return Promise.resolve({ rows: [{ count: "1" }] });
      })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await request(app)
      .get("/api/readings")
      .query({ search: "t:20-30" })
      .set("x-user-id", "1");
    expect(res.status).toBe(200);
  });

  it("GET /api/readings supports operator search", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockImplementationOnce((sql: string) => {
        expect(sql).toContain("temperature_c >");
        return Promise.resolve({ rows: [{ count: "1" }] });
      })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await request(app)
      .get("/api/readings")
      .query({ search: "t:>25" })
      .set("x-user-id", "1");
    expect(res.status).toBe(200);
  });

  it("GET /api/readings supports default search", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockImplementationOnce((sql: string) => {
        expect(sql).toContain("device_id ILIKE");
        return Promise.resolve({ rows: [{ count: "1" }] });
      })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await request(app)
      .get("/api/readings")
      .query({ search: "dev1" })
      .set("x-user-id", "1");
    expect(res.status).toBe(200);
  });
});
