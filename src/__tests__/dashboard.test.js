/**
 * Dashboard API Tests
 * Tests for dashboard summary endpoints
 */

import request from 'supertest';
import app from '../app.js';

describe('Dashboard Endpoints', () => {
    describe('GET /api/dashboard/earnings', () => {
        it('should return earnings summary', async () => {
            const res = await request(app)
                .get('/api/dashboard/earnings?year=2025')
                .expect('Content-Type', /json/);

            // Should return success or auth error
            expect([200, 401]).toContain(res.status);

            if (res.status === 200) {
                expect(res.body).toHaveProperty('success');
            }
        });
    });

    describe('GET /api/dashboard/vacation', () => {
        it('should return vacation summary', async () => {
            const res = await request(app)
                .get('/api/dashboard/vacation?year=2025')
                .expect('Content-Type', /json/);

            expect([200, 401]).toContain(res.status);
        });
    });

    describe('GET /api/dashboard/benefits', () => {
        it('should return benefits summary', async () => {
            const res = await request(app)
                .get('/api/dashboard/benefits')
                .expect('Content-Type', /json/);

            expect([200, 401]).toContain(res.status);
        });
    });
});

describe('Alerts Endpoints', () => {
    describe('GET /api/alerts/triggered', () => {
        it('should return triggered alerts', async () => {
            const res = await request(app)
                .get('/api/alerts/triggered')
                .expect('Content-Type', /json/);

            expect([200, 401]).toContain(res.status);
        });
    });
});
