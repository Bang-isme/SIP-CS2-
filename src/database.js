import mongoose from "mongoose";
import { MONGODB_URI } from "./config.js";

let mongoConnectionPromise = null;
let reconnectTimer = null;
let mongoListenersRegistered = false;
const MONGO_RECONNECT_DELAY_MS = 2000;

const clearReconnectTimer = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
};

const scheduleMongoReconnect = () => {
  if (reconnectTimer || mongoConnectionPromise || mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void connectMongo({ background: true });
  }, MONGO_RECONNECT_DELAY_MS);
  reconnectTimer.unref?.();
};

const ensureMongoEventHandlers = () => {
  if (mongoListenersRegistered) {
    return;
  }

  mongoListenersRegistered = true;
  mongoose.connection.on("connected", () => {
    clearReconnectTimer();
  });
  mongoose.connection.on("error", () => {
    scheduleMongoReconnect();
  });
  mongoose.connection.on("disconnected", () => {
    scheduleMongoReconnect();
  });
};

export const connectMongo = async ({ background = false } = {}) => {
  ensureMongoEventHandlers();

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!mongoConnectionPromise) {
    mongoConnectionPromise = mongoose.connect(MONGODB_URI)
      .then((db) => {
        clearReconnectTimer();
        console.log("Database is connected to", db.connection.name);
        return db.connection;
      })
      .catch((error) => {
        scheduleMongoReconnect();
        throw new Error(`MongoDB connection failed: ${error.message}`, { cause: error });
      });
  }

  try {
    return await mongoConnectionPromise;
  } finally {
    mongoConnectionPromise = null;
    if (background && mongoose.connection.readyState !== 1) {
      scheduleMongoReconnect();
    }
  }
};

export default connectMongo;
