import { jest } from "@jest/globals";

describe("logger", () => {
  const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    LOG_LEVEL: process.env.LOG_LEVEL,
  };

  afterEach(() => {
    process.env.NODE_ENV = originalEnv.NODE_ENV;
    if (originalEnv.LOG_LEVEL === undefined) {
      delete process.env.LOG_LEVEL;
    } else {
      process.env.LOG_LEVEL = originalEnv.LOG_LEVEL;
    }
    jest.restoreAllMocks();
  });

  test("defaults to silent mode in test environment", async () => {
    process.env.NODE_ENV = "test";
    delete process.env.LOG_LEVEL;

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const { default: logger } = await import("../utils/logger.js");

    logger.warn("LoggerTest", "warn noise should stay hidden");
    logger.error("LoggerTest", "error noise should stay hidden", new Error("synthetic"));

    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test("explicit LOG_LEVEL still enables logs in test environment", async () => {
    process.env.NODE_ENV = "test";
    process.env.LOG_LEVEL = "WARN";

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const { default: logger } = await import("../utils/logger.js");

    logger.info("LoggerTest", "info should stay suppressed");
    logger.warn("LoggerTest", "warn should be emitted");
    logger.error("LoggerTest", "error should be emitted", new Error("synthetic"));

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});
