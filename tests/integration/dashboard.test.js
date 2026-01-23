import request from 'supertest';
import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import { MONGODB_URI } from '../../src/config.js';

// Mock Auth to bypass login
jest.unstable_mockModule('../../src/middlewares/authJwt.js', () => ({
    verifyToken: (req, res, next) => next(),
    isAdmin: (req, res, next) => next(),
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
        // Connect to the same DB as Dev (or test DB if configured)
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(MONGODB_URI);
        }
    });

    afterAll(async () => {
        await mongoose.disconnect();
    });

    describe('GET /api/dashboard/departments', () => {
        it('should return a list of departments', async () => {
            const res = await request(app).get('/api/dashboard/departments');
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            // Verify our recently fixed data exists
            expect(res.body.data).toContain('Human Resources');
        });
    });

    describe('GET /api/dashboard/drilldown', () => {
        it('should support server-side search by name', async () => {
            // Assuming "Amy" exists from previous user screenshots
            const res = await request(app).get('/api/dashboard/drilldown?search=Amy');
            expect(res.statusCode).toBe(200);
            expect(res.body.data.length).toBeGreaterThan(0);

            const firstResult = res.body.data[0];
            const fullName = `${firstResult.firstName} ${firstResult.lastName}`;
            expect(fullName).toMatch(/Amy/i);
        });

        it('should return empty list for non-existent search', async () => {
            const res = await request(app).get('/api/dashboard/drilldown?search=NonExistentUserXYZ');
            expect(res.statusCode).toBe(200);
            expect(res.body.data.length).toBe(0);
        });
    });
});
