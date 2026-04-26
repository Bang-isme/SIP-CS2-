/**
 * Jest Test Setup
 * Runs before each test file
 */
import { jest, afterAll, beforeEach } from "@jest/globals";
import mongoose from "mongoose";
import sequelize from "../mysqlDatabase.js";
import { resetAllRateLimiters } from "../middlewares/rateLimit.js";
import dashboardCache from "../utils/cache.js";

// Set test environment
process.env.NODE_ENV = "test";

// Increase timeout for database operations
jest.setTimeout(10000);

beforeEach(() => {
  resetAllRateLimiters();
});

// Cleanup after all tests to avoid open-handle warnings
afterAll(async () => {
  try {
    dashboardCache.stop?.();
  } catch {
    // Ignore cache teardown errors in test environment
  }

  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  } catch {
    // Ignore teardown errors in test environment
  }

  try {
    await sequelize.close();
  } catch {
    // Ignore teardown errors in test environment
  }
});
