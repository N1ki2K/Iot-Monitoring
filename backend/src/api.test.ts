import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

let queryMock: ReturnType<typeof vi.fn>;

vi.mock("pg", () => ({
  Pool: vi.fn(() => ({
    query: (...args: any[]) => queryMock(...args),
  })),
}));

const loadApi = async () => {
  process.env.NODE_ENV = "test";
  return await import("./api");
};

const adminRow = {
  id: 1,
  username: "Admin",
  email: "admin@example.com",
  is_admin: 1,
  created_at: "2024-01-01",
};

const userRow = {
  id: 2,
  username: "User",
  email: "user@example.com",
  is_admin: 0,
  created_at: "2024-01-02",
};

describe("api endpoints", () => {
  let app: any;
  let hashPassword: (password: string) => Promise<string>;
  let verifyPassword: (password: string, storedHash: string) => Promise<boolean>;
  let generatePairingCode: () => Promise<string>;
  let ensureAdmin: (user: { is_admin: number } | null) => boolean;
  let getRequester: (req: any) => Promise<any>;

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
    expect(ensureAdmin({ is_admin: 1 })).toBe(true);
    expect(ensureAdmin({ is_admin: 0 })).toBe(false);
    expect(ensureAdmin(null)).toBe(false);
  });

  it("getRequester returns null when header missing", async () => {
    const req = { header: () => undefined };
    expect(await getRequester(req)).toBeNull();
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("getRequester returns normalized user", async () => {
    queryMock.mockResolvedValueOnce({ rows: [adminRow] });
    const req = { header: (name: string) => (name === "x-user-id" ? "1" : undefined) };
    const user = await getRequester(req);
    expect(user).toMatchObject({
      id: 1,
      is_admin: 1,
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

  it("GET /api/controllers requires admin", async () => {
    queryMock.mockResolvedValueOnce({ rows: [userRow] });
    const res = await request(app).get("/api/controllers").set("x-user-id", "2");
    expect(res.status).toBe(403);
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

  it("DELETE /api/controllers/:id deletes controller", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .delete("/api/controllers/5")
      .set("x-user-id", "1");
    expect(res.status).toBe(204);
  });

  it("GET /api/users/:id/controllers enforces access", async () => {
    queryMock.mockResolvedValueOnce({ rows: [userRow] });
    const res = await request(app).get("/api/users/1/controllers").set("x-user-id", "2");
    expect(res.status).toBe(403);
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

  it("GET /api/latest/:deviceId enforces access", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [userRow] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await request(app).get("/api/latest/dev1").set("x-user-id", "2");
    expect(res.status).toBe(403);
  });

  it("GET /api/history/:deviceId returns history", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockResolvedValueOnce({ rows: [{ id: 1, device_id: "dev1" }] });
    const res = await request(app).get("/api/history/dev1").set("x-user-id", "1");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("GET /api/readings supports search and pagination", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [adminRow] })
      .mockImplementationOnce((sql: string) => {
        expect(sql).toContain("COUNT(*)");
        return Promise.resolve({ rows: [{ count: "2" }] });
      })
      .mockImplementationOnce((sql: string, params: any[]) => {
        expect(sql).toContain("ORDER BY ts DESC");
        expect(params[params.length - 2]).toBe(20);
        expect(params[params.length - 1]).toBe(0);
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
});
