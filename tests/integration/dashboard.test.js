import request from 'supertest';
import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import { MONGODB_URI } from '../../src/config.js';

const MONGO_CONNECT_TIMEOUT_MS = 5000;
let mongoAvailable = false;
let mongoUnavailableReason = '';

const runIfMongoAvailable = async (callback) => {
    if (!mongoAvailable) {
        expect(mongoUnavailableReason).toBeTruthy();
        return;
    }
    await callback();
};

// Mock Auth to bypass login
jest.unstable_mockModule('../../src/middlewares/authJwt.js', () => ({
    verifyToken: (req, res, next) => next(),
    canManageAlerts: (req, res, next) => next(),
    canManageProducts: (req, res, next) => next(),
    isAdmin: (req, res, next) => next(),
    isSuperAdmin: (req, res, next) => next(),
    isModerator: (req, res, next) => next()
}));

// Mock initialSetup to prevent side effects
jest.unstable_mockModule('../../src/libs/initialSetup.js', () => ({
    createRoles: jest.fn()
}));

// Import app AFTER mocking
const { default: app } = await import('../../src/app.js');

describe('Dashboard Integration Tests', () => {
    beforeAll(async () => {
        if (mongoose.connection.readyState !== 0) {
            mongoAvailable = true;
            return;
        }

        try {
            await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: MONGO_CONNECT_TIMEOUT_MS });
            mongoAvailable = true;
        } catch (error) {
            mongoAvailable = false;
            mongoUnavailableReason = error.message;
            console.warn(`[tests] Skipping dashboard integration assertions: ${mongoUnavailableReason}`);
        }
    });

    afterAll(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    });

    describe('GET /api/dashboard/departments', () => {
        it('should return a list of departments', async () => {
            await runIfMongoAvailable(async () => {
                const res = await request(app).get('/api/dashboard/departments');
                expect(res.statusCode).toBe(200);
                expect(res.body.success).toBe(true);
                expect(Array.isArray(res.body.data)).toBe(true);
                if (res.body.data.length > 0) {
                    expect(typeof res.body.data[0]).toBe('string');
                }
            });
        });

        it('should not return Unassigned in department filter options', async () => {
            await runIfMongoAvailable(async () => {
                const res = await request(app).get('/api/dashboard/departments');
                expect(res.statusCode).toBe(200);
                expect(res.body.success).toBe(true);
                expect(res.body.data).not.toContain('Unassigned');
            });
        });
    });

    describe('GET /api/dashboard/drilldown', () => {
        it('should support server-side search by name', async () => {
            await runIfMongoAvailable(async () => {
                const baseline = await request(app).get('/api/dashboard/drilldown?page=1&limit=1');
                expect(baseline.statusCode).toBe(200);
                expect(Array.isArray(baseline.body.data)).toBe(true);

                if (baseline.body.data.length === 0) {
                    return;
                }

                const sample = baseline.body.data[0];
                const searchTerm = sample.firstName || sample.employeeId;
                const res = await request(app).get(`/api/dashboard/drilldown?search=${encodeURIComponent(searchTerm)}`);
                expect(res.statusCode).toBe(200);
                expect(res.body.data.length).toBeGreaterThan(0);

                const hasMatch = res.body.data.some((emp) => {
                    const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim().toLowerCase();
                    const employeeId = String(emp.employeeId || '').toLowerCase();
                    const target = String(searchTerm).toLowerCase();
                    return fullName.includes(target) || employeeId.includes(target);
                });
                expect(hasMatch).toBe(true);
            });
        });

        it('should return empty list for non-existent search', async () => {
            await runIfMongoAvailable(async () => {
                const res = await request(app).get('/api/dashboard/drilldown?search=NonExistentUserXYZ');
                expect(res.statusCode).toBe(200);
                expect(res.body.data.length).toBe(0);
            });
        });

        it('should support minEarnings filter using SQL aggregation source', async () => {
            await runIfMongoAvailable(async () => {
                const threshold = 100000;
                const res = await request(app)
                    .get(`/api/dashboard/drilldown?year=2026&minEarnings=${threshold}&page=1&limit=50`);

                expect(res.statusCode).toBe(200);
                expect(res.body.success).toBe(true);
                expect(Array.isArray(res.body.data)).toBe(true);

                if (res.body.data.length > 0) {
                    const allMatched = res.body.data.every((emp) => Number(emp.totalEarnings || 0) >= threshold);
                    expect(allMatched).toBe(true);
                }
            });
        });
    });
});
