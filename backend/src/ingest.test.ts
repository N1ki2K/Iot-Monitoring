import { beforeEach, describe, expect, it, vi } from "vitest";

type MessageHandler = (topic: string, payload: Buffer) => void | Promise<void>;
type ConnectHandler = () => void;

const { queryMock, mqttClientMock, handlers } = vi.hoisted(() => {
  const queryMock = vi.fn();
  const handlers: { connect?: ConnectHandler; message?: MessageHandler } = {};
  const mqttClientMock = {
    on: vi.fn((event: string, handler: ConnectHandler | MessageHandler) => {
      if (event === "connect") handlers.connect = handler as ConnectHandler;
      if (event === "message") handlers.message = handler as MessageHandler;
    }),
    subscribe: vi.fn((topic: string, cb: (err?: Error | null) => void) => cb(null)),
  };

  return { queryMock, mqttClientMock, handlers };
});

vi.mock("dotenv", () => ({
  default: {
    config: vi.fn(),
  },
}));

vi.mock("pg", () => ({
  Pool: vi.fn(() => ({
    query: (...args: unknown[]) => queryMock(...args),
  })),
}));

vi.mock("mqtt", () => ({
  default: {
    connect: vi.fn(() => mqttClientMock),
  },
}));

describe("ingest service", () => {
  beforeEach(async () => {
    queryMock.mockReset();
    mqttClientMock.on.mockClear();
    mqttClientMock.subscribe.mockClear();
    handlers.connect = undefined;
    handlers.message = undefined;
    vi.resetModules();
    process.env.MQTT_URL = "mqtt://localhost:1883";
    process.env.MQTT_TOPIC = "iot/device/telemetry";
    process.env.PGHOST = "localhost";
    process.env.PGPORT = "5432";
    process.env.PGUSER = "iot";
    process.env.PGPASSWORD = "test_password_placeholder";
    process.env.PGDATABASE = "iot";
    await import("./ingest.js");
  });

  it("subscribes on connect", () => {
    expect(handlers.connect).toBeTypeOf("function");
    handlers.connect?.();
    expect(mqttClientMock.subscribe).toHaveBeenCalledWith(
      "iot/device/telemetry",
      expect.any(Function)
    );
  });

  it("inserts parsed telemetry", async () => {
    queryMock.mockResolvedValueOnce({});
    await handlers.message?.(
      "iot/my-device/telemetry",
      Buffer.from(JSON.stringify({ t: 21.5, h: 40, lux: 123, sound: 9, sound_dbfs: -27.4, sound_est_spl: 56.6, aq: 450, air_baseline_pct: 98.5 }))
    );

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO readings"),
      ["my-device", 21.5, 40, 123, 9, -27.4, 56.6, 450, 98.5]
    );
  });

  it("stores nulls for missing fields", async () => {
    queryMock.mockResolvedValueOnce({});
    await handlers.message?.("iot/my-device/telemetry", Buffer.from(JSON.stringify({})));
    expect(queryMock).toHaveBeenCalledWith(
      expect.any(String),
      ["my-device", null, null, null, null, null, null, null, null]
    );
  });

  it("ignores invalid json payloads", async () => {
    await handlers.message?.("iot/my-device/telemetry", Buffer.from("not-json"));
    expect(queryMock).not.toHaveBeenCalled();
  });
});
