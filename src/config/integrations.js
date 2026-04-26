/**
 * Integration Configuration
 * Case Study 4: Extensibility & Scalability
 *
 * The demo profile now defaults to a single visible downstream system:
 * Payroll. Optional adapters such as securityMock can still be enabled at
 * runtime via ACTIVE_INTEGRATIONS=payroll,securityMock.
 */

import { ACTIVE_INTEGRATIONS } from "../config.js";

export const activeIntegrations = ACTIVE_INTEGRATIONS;

export default activeIntegrations;
