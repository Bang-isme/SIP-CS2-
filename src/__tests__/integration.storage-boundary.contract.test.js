import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("integration storage boundary contracts", () => {
  test("sql model index exposes only active payroll and reporting models", () => {
    const source = fs.readFileSync(path.resolve(__dirname, "..", "models", "sql", "index.js"), "utf-8");

    expect(source).not.toContain('import IntegrationEvent from "./IntegrationEvent.js"');
    expect(source).not.toContain('import IntegrationEventAudit from "./IntegrationEventAudit.js"');
    expect(source).not.toContain("IntegrationEvent,");
    expect(source).not.toContain("IntegrationEventAudit,");
    expect(source).toContain("SyncLog");
  });

  test("demo and DR scripts target Mongo outbox collections instead of retired SQL models", () => {
    const demoSource = fs.readFileSync(
      path.resolve(__dirname, "..", "..", "scripts", "demo-integration-events.js"),
      "utf-8",
    );
    const queueSource = fs.readFileSync(
      path.resolve(__dirname, "..", "..", "scripts", "demo-integration-queue-scenario.js"),
      "utf-8",
    );
    const drSource = fs.readFileSync(
      path.resolve(__dirname, "..", "..", "scripts", "dr-rehearsal-safe.js"),
      "utf-8",
    );

    expect(demoSource).toContain('from "../src/models/IntegrationEvent.js"');
    expect(demoSource).toContain("IntegrationEventStore.bulkCreate");
    expect(demoSource).not.toContain('from "../src/models/sql/index.js"');

    expect(queueSource).toContain('from "../src/models/IntegrationEvent.js"');
    expect(queueSource).toContain("IntegrationEvent.aggregate");
    expect(queueSource).not.toContain('from "../src/models/sql/index.js"');

    expect(drSource).toContain("integration_events: await IntegrationEvent.countDocuments()");
    expect(drSource).not.toContain("integration_events: await IntegrationEvent.count()");
  });

  test("active MySQL sync path avoids direct repair of retired SQL outbox tables", () => {
    const source = fs.readFileSync(path.resolve(__dirname, "..", "mysqlDatabase.js"), "utf-8");

    expect(source).toContain("await ensureSyncLogCorrelationTraceSupport();");
    expect(source).not.toContain("await ensureIntegrationEventOperatorAuditSupport();");
    expect(source).not.toContain("await ensureIntegrationEventAuditHistorySupport();");
  });
});
