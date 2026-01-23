/**
 * Health Routes Tests
 * Basic API tests for health check endpoints
 */

import request from 'supertest';
import app from '../app.js';

describe('Health Endpoints', () => {
    describe('GET /api/health/live', () => {
        it('should return alive status', async () => {
            const res = await request(app)
                .get('/api/health/live')
                .expect(200);

            expect(res.body).toHaveProperty('alive', true);
            expect(res.body).toHaveProperty('uptime');
        });
    });

    describe('GET /api/health', () => {
        it('should return health status with services', async () => {
            const res = await request(app)
                .get('/api/health')
                .expect('Content-Type', /json/);

            expect(res.body).toHaveProperty('status');
            expect(res.body).toHaveProperty('timestamp');
            expect(res.body).toHaveProperty('services');
        });
    });
});

describe('API Base', () => {
    describe('GET /api', () => {
        it('should return welcome message', async () => {
            const res = await request(app)
                .get('/api')
                .expect(200);

            expect(res.body).toBeDefined();
        });
    });
});
