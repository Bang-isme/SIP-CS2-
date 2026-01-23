import { config } from "dotenv";
config();

// ===========================================
// Environment Validation
// ===========================================
const requiredInProduction = ['SECRET', 'ADMIN_PASSWORD', 'MYSQL_PASSWORD'];
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  const missing = requiredInProduction.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// ===========================================
// MongoDB Configuration
// ===========================================
export const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/apicompany";

// ===========================================
// Server Configuration
// ===========================================
export const PORT = process.env.PORT || 4000;
export const NODE_ENV = process.env.NODE_ENV || "development";

// ===========================================
// Security Configuration
// WARNING: Fallbacks only work in development!
// ===========================================
export const SECRET = process.env.SECRET || (isProduction ? undefined : "dev_secret_change_me");

// ===========================================
// Admin Account (Initial Setup)
// ===========================================
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@localhost";
export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (isProduction ? undefined : "admin_dev");

// ===========================================
// MySQL Configuration (Payroll Database)
// ===========================================
export const MYSQL_HOST = process.env.MYSQL_HOST || "localhost";
export const MYSQL_PORT = process.env.MYSQL_PORT || 3306;
export const MYSQL_USER = process.env.MYSQL_USER || "root";
export const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || "";
export const MYSQL_DATABASE = process.env.MYSQL_DATABASE || "payroll_db";