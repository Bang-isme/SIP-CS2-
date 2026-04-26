/**
 * Payroll Adapter
 * Sends employee sync requests to the dedicated Payroll service over HTTP.
 */

import BaseAdapter from "./base.adapter.js";
import {
  INTERNAL_SERVICE_SECRET,
  PAYROLL_INTERNAL_API_BASE_URL,
} from "../config.js";
import logger from "../utils/logger.js";
import {
  INTERNAL_SERVICE_NAME_HEADER,
  INTERNAL_SERVICE_SECRET_HEADER,
} from "../middlewares/internalServiceAuth.js";

const PAYROLL_SERVICE_NAME = "sa-service";

const buildInternalHeaders = () => ({
  "Content-Type": "application/json",
  [INTERNAL_SERVICE_SECRET_HEADER]: INTERNAL_SERVICE_SECRET,
  [INTERNAL_SERVICE_NAME_HEADER]: PAYROLL_SERVICE_NAME,
});

const parseJsonResponse = async (response) => {
  const rawText = await response.text();
  if (!rawText) {
    return null;
  }

  try {
    return JSON.parse(rawText);
  } catch {
    return { raw: rawText };
  }
};

const buildFetchOptions = (method, body) => {
  const options = {
    method,
    headers: buildInternalHeaders(),
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const timeoutSignal = globalThis.AbortSignal?.timeout?.(5000);
  if (timeoutSignal) {
    options.signal = timeoutSignal;
  }

  return options;
};

const getResponseMessage = (responseBody, response) =>
  responseBody?.message
  || responseBody?.error
  || responseBody?.raw
  || response.statusText
  || "Payroll service request failed";

export class PayrollAdapter extends BaseAdapter {
  constructor() {
    super("PayrollAdapter");
  }

  async sync(employeeData, action, syncContext = {}) {
    try {
      const response = await globalThis.fetch(
        `${PAYROLL_INTERNAL_API_BASE_URL}/sync`,
        buildFetchOptions("POST", {
          action,
          employeeData,
          syncContext,
        }),
      );
      const responseBody = await parseJsonResponse(response);

      if (!response.ok || !responseBody?.success) {
        const message = getResponseMessage(responseBody, response);
        logger.warn(this.name, "Payroll sync failed", {
          employeeId: employeeData.employeeId || employeeData._id?.toString(),
          action,
          correlationId: syncContext.correlationId || null,
          source: syncContext.source || null,
          integrationEventId: syncContext.integrationEventId || null,
          errorMessage: message,
        });
        return { success: false, message };
      }

      logger.info(this.name, "Employee synced to payroll", {
        employeeId: employeeData.employeeId || employeeData._id?.toString(),
        action,
        correlationId: syncContext.correlationId || null,
        source: syncContext.source || null,
        integrationEventId: syncContext.integrationEventId || null,
      });

      return {
        success: true,
        message: responseBody?.message || "Synced to Payroll",
      };
    } catch (error) {
      logger.warn(this.name, "Payroll sync failed", {
        employeeId: employeeData.employeeId || employeeData._id?.toString(),
        action,
        correlationId: syncContext.correlationId || null,
        source: syncContext.source || null,
        integrationEventId: syncContext.integrationEventId || null,
        errorMessage: error.message,
      });
      return { success: false, message: error.message };
    }
  }

  async healthCheck() {
    try {
      const response = await globalThis.fetch(
        `${PAYROLL_INTERNAL_API_BASE_URL}/health`,
        buildFetchOptions("GET"),
      );
      const responseBody = await parseJsonResponse(response);
      if (!response.ok || responseBody?.success === false) {
        return {
          healthy: false,
          message: getResponseMessage(responseBody, response),
        };
      }

      return {
        healthy: true,
        message: "Payroll internal API reachable",
      };
    } catch (error) {
      return { healthy: false, message: error.message };
    }
  }
}

export default PayrollAdapter;
