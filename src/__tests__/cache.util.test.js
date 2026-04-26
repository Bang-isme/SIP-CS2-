import { DashboardCache } from "../utils/cache.js";

describe("dashboard cache util", () => {
  let cache;
  let now;

  beforeEach(() => {
    cache = null;
    now = 1_000;
  });

  afterEach(() => {
    cache?.stop();
  });

  test("expires entries by TTL and removes them on read", () => {
    cache = new DashboardCache({
      ttl: 100,
      maxEntries: 3,
      sweepIntervalMs: 1000,
      now: () => now,
      autoStart: false,
    });

    cache.set("earnings", { year: 2026 }, { total: 1 });
    expect(cache.get("earnings", { year: 2026 })).toEqual({ total: 1 });

    now += 101;

    expect(cache.get("earnings", { year: 2026 })).toBeNull();
    expect(cache.stats().size).toBe(0);
  });

  test("evicts the oldest entry once max size is exceeded while preserving recently used keys", () => {
    cache = new DashboardCache({
      ttl: 1000,
      maxEntries: 2,
      sweepIntervalMs: 1000,
      now: () => now,
      autoStart: false,
    });

    cache.set("earnings", { year: 2026 }, { total: 1 });
    cache.set("vacation", { year: 2026 }, { total: 2 });
    expect(cache.get("earnings", { year: 2026 })).toEqual({ total: 1 });

    cache.set("alerts", { year: 2026 }, { total: 3 });

    expect(cache.get("earnings", { year: 2026 })).toEqual({ total: 1 });
    expect(cache.get("vacation", { year: 2026 })).toBeNull();
    expect(cache.get("alerts", { year: 2026 })).toEqual({ total: 3 });
    expect(cache.stats().size).toBe(2);
  });

  test("background sweep prunes expired entries without requiring another cache read", async () => {
    cache = new DashboardCache({
      ttl: 100,
      maxEntries: 5,
      sweepIntervalMs: 10,
      now: () => now,
    });

    cache.set("executive-brief", { year: 2026 }, { ok: true });
    expect(cache.stats().size).toBe(1);

    now += 160;
    await new Promise((resolve) => setTimeout(resolve, 25));

    expect(cache.stats().size).toBe(0);
  });
});
