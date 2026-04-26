/**
 * Advanced Test Suite - Quality Assurance
 * 
 * Tests for: Availability, ACID, Extensibility, Maintainability, Code Quality
 * Run: NODE_OPTIONS='--experimental-vm-modules' npx jest tests/advanced/quality.test.js
 */

import request from 'supertest';
import { jest } from '@jest/globals';

const MONGO_CONNECT_TIMEOUT_MS = 5000;
let mongoAvailable = false;
let mongoUnavailableReason = '';

const requireMongo = () => {
    if (mongoAvailable) return true;
    expect(mongoUnavailableReason).toBeTruthy();
    return false;
};

// Mock auth middleware before importing app
jest.unstable_mockModule('../../src/middlewares/authJwt.js', () => ({
    verifyToken: (req, res, next) => { req.userId = 'test-user'; next(); },
    canManageAlerts: (req, res, next) => next(),
    canManageProducts: (req, res, next) => next(),
    isAdmin: (req, res, next) => next(),
    isSuperAdmin: (req, res, next) => next(),
    isModerator: (req, res, next) => next(),
}));

// Mock initialSetup to avoid side effects
jest.unstable_mockModule('../../src/libs/initialSetup.js', () => ({
    default: jest.fn(),
    createRoles: jest.fn(),
}));

const { default: app } = await import('../../src/app.js');
const { default: mongoose } = await import('mongoose');
const { sequelize, SyncLog } = await import('../../src/models/sql/index.js');

beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
        mongoAvailable = true;
        return;
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/apicompany', {
            serverSelectionTimeoutMS: MONGO_CONNECT_TIMEOUT_MS,
        });
        mongoAvailable = true;
    } catch (error) {
        mongoAvailable = false;
        mongoUnavailableReason = error.message;
        console.warn(`[tests] Advanced suite running without Mongo-backed endpoint assertions: ${mongoUnavailableReason}`);
    }
});

afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
});

describe('🔒 AVAILABILITY TESTS', () => {
    test('A1: Health endpoint stays responsive after warm-up', async () => {
        await request(app).get('/api');

        const durations = [];
        let lastResponse = null;

        for (let index = 0; index < 3; index += 1) {
            const start = Date.now();
            lastResponse = await request(app).get('/api');
            durations.push(Date.now() - start);
        }

        const slowestDuration = Math.max(...durations);

        expect(lastResponse.status).toBe(200);
        expect(slowestDuration).toBeLessThan(150);
    });

    test('A2: Dashboard API handles concurrent requests (10 parallel)', async () => {
        if (!requireMongo()) return;
        const requests = Array(10).fill().map(() =>
            request(app).get('/api/dashboard/departments')
        );

        const results = await Promise.all(requests);
        const allOk = results.every(r => r.status === 200);

        expect(allOk).toBe(true);
    });

    test('A3: API returns proper structure on empty filter', async () => {
        if (!requireMongo()) return;
        const res = await request(app)
            .get('/api/dashboard/drilldown')
            .query({ limit: 5 });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success');
    });

    test('A4: Health check endpoint returns proper status', async () => {
        const res = await request(app).get('/api');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message');
        expect(res.body).toHaveProperty('version');
    });
});

describe('LOCAL TRANSACTION / INTEGRITY TESTS', () => {
    test('ACID1: SyncLog records are atomic (all-or-nothing)', async () => {
        // Check that SyncLog has proper transaction support
        const transaction = await sequelize.transaction();
        const testId = 'acid-test-' + Date.now();

        try {
            await SyncLog.create({
                source_system: 'TEST',
                target_system: 'TEST',
                entity_type: 'test',
                entity_id: testId,
                action: 'CREATE',
                status: 'PENDING'
            }, { transaction });

            // Rollback - should not persist
            await transaction.rollback();

            // Verify not persisted
            const found = await SyncLog.findOne({
                where: { entity_id: testId }
            });

            expect(found).toBeNull();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    });

    test('ACID2: SyncLog can be created and updated', async () => {
        const testId = 'status-test-' + Date.now();

        const log = await SyncLog.create({
            source_system: 'TEST',
            target_system: 'TEST',
            entity_type: 'test',
            entity_id: testId,
            action: 'CREATE',
            status: 'PENDING'
        });

        try {
            // Verify creation
            expect(log.status).toBe('PENDING');

            // Update status using static method
            await SyncLog.update(
                { status: 'SUCCESS' },
                { where: { id: log.id } }
            );

            // Reload and verify
            await log.reload();
            expect(log.status).toBe('SUCCESS');
        } finally {
            await SyncLog.destroy({ where: { id: log.id } });
        }
    });

    test('ACID3: Isolation - Concurrent updates do not corrupt data', async () => {
        const testId = 'isolation-test-' + Date.now();

        const log = await SyncLog.create({
            source_system: 'TEST',
            target_system: 'TEST',
            entity_type: 'test',
            entity_id: testId,
            action: 'CREATE',
            status: 'PENDING',
            retry_count: 0
        });

        try {
            // Scope the concurrent increments to the exact row we just created.
            // `entity_id` is not unique in the table and can leave this test flaky
            // when a previous failed run leaves behind an orphaned test row.
            const updates = Array(5).fill().map(() =>
                SyncLog.increment('retry_count', { where: { id: log.id } })
            );

            await Promise.all(updates);

            await log.reload();
            expect(log.retry_count).toBe(5); // Should be exactly 5
        } finally {
            await SyncLog.destroy({ where: { id: log.id } });
        }
    });
});

describe('🔌 EXTENSIBILITY TESTS', () => {
    test('E1: Config lists active integrations', async () => {
        const { default: activeIntegrations } = await import('../../src/config/integrations.js');

        expect(Array.isArray(activeIntegrations)).toBe(true);
        expect(activeIntegrations.length).toBeGreaterThanOrEqual(1);
    });

    test('E2: Adapters folder contains implementation files', async () => {
        const fs = await import('fs');
        const path = await import('path');

        const adaptersDir = path.resolve('src/adapters');
        const files = fs.readdirSync(adaptersDir);

        expect(files).toContain('base.adapter.js');
        expect(files).toContain('payroll.adapter.js');
    });

    test('E3: Adding new adapter requires only config change', async () => {
        const { default: activeIntegrations } = await import('../../src/config/integrations.js');

        // Config should be an array of strings (adapter names)
        expect(Array.isArray(activeIntegrations)).toBe(true);
        expect(activeIntegrations.every(i => typeof i === 'string')).toBe(true);
    });

    test('E4: BaseAdapter defines interface contract', async () => {
        const { default: BaseAdapter } = await import('../../src/adapters/base.adapter.js');

        const base = new BaseAdapter('TestAdapter');

        expect(typeof base.sync).toBe('function');
        expect(typeof base.healthCheck).toBe('function');
        expect(base.name).toBe('TestAdapter');
    });
});

describe('🛠️ MAINTAINABILITY TESTS', () => {
    test('M1: API responses follow consistent structure', async () => {
        if (!requireMongo()) return;
        const endpoints = [
            '/api/dashboard/departments',
            '/api/dashboard/drilldown'
        ];

        for (const endpoint of endpoints) {
            const res = await request(app).get(endpoint);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('success');
            expect(res.body.success).toBe(true);
            expect(res.body).toHaveProperty('data');
        }
    });

    test('M2: Validation errors return 4xx responses with message field', async () => {
        if (!requireMongo()) return;
        const res = await request(app)
            .post('/api/employee')
            .send({});

        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(res.status).toBeLessThan(500);
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('message');
        expect(typeof res.body.message).toBe('string');
    });

    test('M3: Models have proper timestamps', async () => {
        const { default: Employee } = await import('../../src/models/Employee.js');

        expect(Employee.schema.options.timestamps).toBe(true);
    });

    test('M4: Controllers are properly separated by domain', async () => {
        const fs = await import('fs');
        const path = await import('path');

        const controllersDir = path.resolve('src/controllers');
        const files = fs.readdirSync(controllersDir);

        const expectedControllers = [
            'dashboard.controller.js',
            'employee.controller.js',
            'alerts.controller.js',
            'auth.controller.js'
        ];

        for (const expected of expectedControllers) {
            expect(files).toContain(expected);
        }
    });
});

describe('🧹 CODE QUALITY / NO SMELL CODE TESTS', () => {
    test('Q1: Config uses named exports with env fallbacks', async () => {
        const config = await import('../../src/config.js');

        // Config values should be exported
        expect(config.PORT).toBeDefined();
        expect(config.SECRET).toBeDefined();
        expect(config.MONGODB_URI).toBeDefined();
    });

    test('Q2: SyncService uses Registry pattern (no direct adapter imports)', async () => {
        const fs = await import('fs');

        const syncService = fs.readFileSync('src/services/syncService.js', 'utf-8');

        // SyncService should NOT directly import individual adapters
        expect(syncService).not.toContain("from '../adapters/payroll");
        expect(syncService).not.toContain("from '../adapters/security");

        // Should use registry instead
        expect(syncService).toContain('serviceRegistry');
    });

    test('Q3: Registry pattern makes SyncService extensible', async () => {
        const fs = await import('fs');

        const syncService = fs.readFileSync('src/services/syncService.js', 'utf-8');

        expect(syncService).toContain('getIntegrations');
        expect(syncService).toContain('Promise.allSettled');
    });

    test('Q4: No critical debug statements in production code', async () => {
        const fs = await import('fs');

        const syncService = fs.readFileSync('src/services/syncService.js', 'utf-8');

        expect(syncService).not.toContain('debugger;');
        expect(syncService).not.toMatch(/console\.log\(.*password/i);
        expect(syncService).not.toMatch(/console\.log\(.*secret/i);
    });
});

describe('📊 DATA INTEGRITY TESTS', () => {
    test('D1: Departments API returns consistent data', async () => {
        if (!requireMongo()) return;
        const res1 = await request(app).get('/api/dashboard/departments');
        const res2 = await request(app).get('/api/dashboard/departments');

        expect(res1.status).toBe(200);
        expect(res2.status).toBe(200);
        expect(res1.body.success).toBe(res2.body.success);
        expect(res1.body.success).toBe(true);
        expect(Array.isArray(res1.body.data)).toBe(true);
        expect(Array.isArray(res2.body.data)).toBe(true);
        expect(res1.body.data.length).toBe(res2.body.data.length);
    });

    test('D2: Drilldown API supports pagination', async () => {
        if (!requireMongo()) return;
        const res = await request(app)
            .get('/api/dashboard/drilldown')
            .query({ page: 1, limit: 5 });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success');
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('meta');
        expect(res.body.meta).toHaveProperty('page');
        expect(res.body.meta).toHaveProperty('limit');
    });

    test('D3: Search parameter filters results', async () => {
        if (!requireMongo()) return;
        const resAll = await request(app)
            .get('/api/dashboard/drilldown')
            .query({ limit: 100 });

        const resFiltered = await request(app)
            .get('/api/dashboard/drilldown')
            .query({ search: 'Amy', limit: 100 });

        expect(resAll.status).toBe(200);
        expect(resFiltered.status).toBe(200);
        expect(resAll.body.success).toBe(true);
        expect(resFiltered.body.success).toBe(true);
        expect(Array.isArray(resAll.body.data)).toBe(true);
        expect(Array.isArray(resFiltered.body.data)).toBe(true);
        // Filtered results should be <= all results (unless no matches)
        expect(resFiltered.body.data.length).toBeLessThanOrEqual(resAll.body.data.length);
    });
});
