/**
 * Jest Test Setup
 * Runs before each test file
 */
import { jest, afterAll } from "@jest/globals";
import mongoose from "mongoose";
import sequelize from "../mysqlDatabase.js";

// Set test environment
process.env.NODE_ENV = "test";

// Increase timeout for database operations
jest.setTimeout(10000);

// Cleanup after all tests to avoid open-handle warnings
afterAll(async () => {
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
