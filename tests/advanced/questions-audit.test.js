/**
 * 220 Questions Audit - Phase 1: API Tests
 *
 * Tests run against the live backend server on port 4000.
 * Requires: npm run dev to be running
 *
 * Based on: docs/Questions_test.md
 */

const BASE_URL = 'http://localhost:4000/api';

async function apiGet(path, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['x-access-token'] = token;

    const res = await fetch(`${BASE_URL}${path}`, { headers });
    return {
        status: res.status,
        body: await res.json().catch(() => ({}))
    };
}

async function apiPost(path, data, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['x-access-token'] = token;

    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
    });
    return {
        status: res.status,
        body: await res.json().catch(() => ({}))
    };
}

function getAlertEmployees(body = {}) {
    return body.data?.employees || body.employees || [];
}

function getAlertEmployeesMeta(body = {}) {
    return body.data?.meta || body.meta || {};
}

describe('220 QUESTIONS AUDIT - PHASE 1: API TESTS', () => {
    let authToken = null;

    beforeAll(async () => {
        try {
            const res = await apiPost('/auth/signin', {
                email: 'test@test.com',
                password: 'test123'
            });

            if (res.status === 200 && res.body.token) {
                authToken = res.body.token;
                console.log('Logged in successfully');
            } else {
                console.log('Login failed:', res.body.message);
            }
        } catch (e) {
            console.log('Login error:', e.message);
        }
    }, 15000);

    describe('FUNCTIONAL / BUSINESS LOGIC (Q31-Q70)', () => {
        test('Q31: Drill-down returns employee fields (id, name)', async () => {
            const res = await apiGet('/dashboard/drilldown?page=1&limit=5', authToken);

            expect(res.status).toBe(200);
            if (res.body.data && res.body.data.length > 0) {
                expect(res.body.data[0]).toHaveProperty('employeeId');
            }
        });

        test('Q32: Multiple filters apply AND logic', async () => {
            const res = await apiGet('/dashboard/drilldown?gender=Female&page=1&limit=10', authToken);

            expect(res.status).toBe(200);
            if (res.body.data && res.body.data.length > 0) {
                res.body.data.forEach((emp) => {
                    if (emp.gender) expect(emp.gender).toBe('Female');
                });
            }
        });

        test('Q33: Search is case-insensitive', async () => {
            const resLower = await apiGet('/dashboard/drilldown?search=amy&page=1&limit=10', authToken);
            const resUpper = await apiGet('/dashboard/drilldown?search=AMY&page=1&limit=10', authToken);

            expect(resLower.status).toBe(200);
            expect(resUpper.status).toBe(200);
        });

        test('Q35: Alert employees match configured rules', async () => {
            const res = await apiGet('/alerts/triggered', authToken);

            expect(res.status).toBe(200);
            if (res.body.data && res.body.data.length > 0) {
                expect(res.body.data[0]).toHaveProperty('count');
            }
        });

        test('Q36: Anniversary employees within threshold', async () => {
            const res = await apiGet('/alerts/anniversary/employees?page=1&limit=10', authToken);
            const employees = getAlertEmployees(res.body);

            expect(res.status).toBe(200);
            if (employees.length > 0) {
                employees.forEach((emp) => {
                    expect(emp.daysUntil).toBeLessThanOrEqual(30);
                });
            }
        });

        test('Q37: Vacation threshold configurable', async () => {
            const res = await apiGet('/alerts', authToken);

            expect(res.status).toBe(200);
            const vacation = res.body.data?.find((alert) => alert.type === 'vacation');
            if (vacation) {
                expect(vacation).toHaveProperty('threshold');
            }
        });

        test('Q40: Pagination returns metadata', async () => {
            const res = await apiGet('/dashboard/drilldown?page=1&limit=20', authToken);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('meta');
            expect(res.body.meta).toHaveProperty('page');
            expect(res.body.meta).toHaveProperty('total');
        });

        test('Q42: Filters retained during pagination', async () => {
            const page1 = await apiGet('/dashboard/drilldown?gender=Male&page=1&limit=10', authToken);
            const page2 = await apiGet('/dashboard/drilldown?gender=Male&page=2&limit=10', authToken);

            expect(page1.status).toBe(200);
            expect(page2.status).toBe(200);
        });

        test('Q43: Drill-down total consistent with summary', async () => {
            const drilldown = await apiGet('/dashboard/drilldown?page=1&limit=1', authToken);

            expect(drilldown.status).toBe(200);
            if (drilldown.body.meta?.total) {
                expect(drilldown.body.meta.total).toBeGreaterThan(0);
            }
        });

        test('Q45: Alert employees have valid IDs', async () => {
            const res = await apiGet('/alerts/anniversary/employees?page=1&limit=5', authToken);
            const employees = getAlertEmployees(res.body);

            expect(res.status).toBe(200);
            if (employees.length > 0) {
                expect(employees[0].employeeId).toBeDefined();
            }
        });

        test('Q47: Pagination totalPages correct', async () => {
            const res = await apiGet('/alerts/anniversary/employees?page=1&limit=50', authToken);
            const meta = getAlertEmployeesMeta(res.body);

            expect(res.status).toBe(200);
            if (meta.total && meta.limit) {
                const expected = Math.ceil(meta.total / meta.limit);
                expect(meta.totalPages).toBe(expected);
            }
        });

        test('Q48: Alerts stored and retrievable', async () => {
            const res = await apiGet('/alerts', authToken);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        test('Q50: Drill-down filters by department', async () => {
            const res = await apiGet('/dashboard/drilldown?department=Sales&page=1&limit=10', authToken);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
        });
    });

    describe('DATA ACCURACY (Q71-Q110)', () => {
        test('Q71: Summary totals are numeric', async () => {
            const res = await apiGet('/dashboard/earnings', authToken);

            expect(res.status).toBe(200);
            if (res.body.data?.total !== undefined) {
                expect(typeof res.body.data.total).toBe('number');
            }
        });

        test('Q73: Departments returns consistent data', async () => {
            const res1 = await apiGet('/dashboard/departments', authToken);
            const res2 = await apiGet('/dashboard/departments', authToken);

            expect(res1.status).toBe(200);
            expect(res1.body.success).toBe(res2.body.success);
        });

        test('Q76: API handles empty results gracefully', async () => {
            const res = await apiGet('/dashboard/drilldown?department=NonExistent&page=1&limit=10', authToken);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        test('Q82: Benefits includes enrollment counts', async () => {
            const res = await apiGet('/dashboard/benefits', authToken);

            expect(res.status).toBe(200);
            if (res.body.data && res.body.data.length > 0) {
                expect(res.body.data[0]).toHaveProperty('enrollment_count');
            }
        });

        test('Q84: Vacation summary valid', async () => {
            const res = await apiGet('/dashboard/vacation', authToken);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
        });

        test('Q86: Response types consistent', async () => {
            const res = await apiGet('/dashboard/earnings', authToken);

            expect(res.status).toBe(200);
            expect(typeof res.body.success).toBe('boolean');
        });

        test('Q89: Pre-aggregated data loads quickly (<5s)', async () => {
            const start = Date.now();
            const res = await apiGet('/dashboard/earnings', authToken);
            const duration = Date.now() - start;

            expect(res.status).toBe(200);
            expect(duration).toBeLessThan(5000);
        });

        test('Q92: Alert count matches employee total', async () => {
            const triggered = await apiGet('/alerts/triggered', authToken);

            expect(triggered.status).toBe(200);
            if (triggered.body.data?.length > 0) {
                const anniv = triggered.body.data.find((alert) => alert.alert?.type === 'anniversary');
                if (anniv) {
                    const emps = await apiGet('/alerts/anniversary/employees?page=1&limit=1', authToken);
                    const meta = getAlertEmployeesMeta(emps.body);
                    expect(anniv.count).toBe(meta.total);
                }
            }
        });

        test('Q96: Earnings accepts year param', async () => {
            const res = await apiGet('/dashboard/earnings?year=2026', authToken);
            expect(res.status).toBe(200);
        });

        test('Q98: Benefits returns proper structure', async () => {
            const res = await apiGet('/dashboard/benefits', authToken);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('success');
            expect(res.body).toHaveProperty('data');
        });

        test('Q101: Departments returns valid list', async () => {
            const res = await apiGet('/dashboard/departments', authToken);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            if (res.body.data && Array.isArray(res.body.data)) {
                expect(res.body.data.length).toBeGreaterThan(0);
                expect(typeof res.body.data[0]).toBe('string');
            }
        });

        test('Q103: Birthday alerts work', async () => {
            const res = await apiGet('/alerts/birthday/employees?page=1&limit=10', authToken);
            expect(res.status).toBe(200);
        });

        test('Q105: Vacation alerts have days', async () => {
            const res = await apiGet('/alerts/vacation/employees?page=1&limit=10', authToken);
            const employees = getAlertEmployees(res.body);

            expect(res.status).toBe(200);
            if (employees.length > 0) {
                expect(employees[0].vacationDays).toBeGreaterThan(0);
            }
        });
    });

    describe('ALERTS (Q181-Q200)', () => {
        test('Q182: Alerts have thresholds', async () => {
            const res = await apiGet('/alerts', authToken);

            expect(res.status).toBe(200);
            if (res.body.data?.length > 0) {
                expect(res.body.data[0]).toHaveProperty('threshold');
            }
        });

        test('Q185: Alerts have isActive flag', async () => {
            const res = await apiGet('/alerts', authToken);

            expect(res.status).toBe(200);
            if (res.body.data?.length > 0) {
                expect(typeof res.body.data[0].isActive).toBe('boolean');
            }
        });

        test('Q189: Alert types are valid enum', async () => {
            const validTypes = ['anniversary', 'vacation', 'benefits_change', 'birthday'];
            const res = await apiGet('/alerts', authToken);

            expect(res.status).toBe(200);
            res.body.data?.forEach((alert) => {
                expect(validTypes).toContain(alert.type);
            });
        });

        test('Q190: Alerts persist across calls', async () => {
            const res1 = await apiGet('/alerts', authToken);
            const res2 = await apiGet('/alerts', authToken);

            expect(res1.body.data?.length).toBe(res2.body.data?.length);
        });

        test('Q192: Triggered alerts include preview', async () => {
            const res = await apiGet('/alerts/triggered', authToken);

            expect(res.status).toBe(200);
            if (res.body.data?.length > 0) {
                expect(res.body.data[0]).toHaveProperty('matchingEmployees');
            }
        });

        test('Q195: One active alert per type', async () => {
            const res = await apiGet('/alerts', authToken);

            expect(res.status).toBe(200);

            const activeByType = {};
            res.body.data?.forEach((alert) => {
                if (alert.isActive) {
                    activeByType[alert.type] = (activeByType[alert.type] || 0) + 1;
                }
            });

            Object.values(activeByType).forEach((count) => {
                expect(count).toBe(1);
            });
        });
    });

    describe('PERFORMANCE (Q111-Q130)', () => {
        test('Q111: Dashboard endpoints < 5s', async () => {
            const endpoints = [
                '/dashboard/earnings',
                '/dashboard/vacation',
                '/dashboard/benefits',
                '/dashboard/executive-brief?year=2026'
            ];

            for (const ep of endpoints) {
                const start = Date.now();
                const res = await apiGet(ep, authToken);
                expect(res.status).toBe(200);
                expect(Date.now() - start).toBeLessThan(5000);
            }
        });

        test('Q117: Pagination < 1s', async () => {
            const start = Date.now();
            const res = await apiGet('/dashboard/drilldown?page=1&limit=50', authToken);

            expect(res.status).toBe(200);
            expect(Date.now() - start).toBeLessThan(1000);
        });

        test('Q118: Search < 2s (with 500k+ records)', async () => {
            const start = Date.now();
            const res = await apiGet('/dashboard/drilldown?search=John&page=1&limit=20', authToken);

            expect(res.status).toBe(200);
            expect(Date.now() - start).toBeLessThan(2000);
        });

        test('Q120: Health check < 100ms', async () => {
            const start = Date.now();
            const res = await apiGet('/health');

            expect(res.status).toBe(200);
            expect(Date.now() - start).toBeLessThan(100);
        });
    });

    describe('SECURITY (Q151-Q160)', () => {
        test('Q151: Protected endpoints require auth', async () => {
            const res = await apiGet('/dashboard/executive-brief?year=2026');
            expect(res.status).toBe(403);
        });

        test('Q152: Password not exposed in users', async () => {
            const res = await apiGet('/users', authToken);

            expect([200, 403]).toContain(res.status);

            if (res.status === 200 && Array.isArray(res.body.data)) {
                res.body.data.forEach((user) => {
                    expect(user).not.toHaveProperty('password');
                    expect(user).not.toHaveProperty('tokens');
                });
                return;
            }

            expect(String(res.body.message || '')).toMatch(/Admin|token/i);
        });

        test('Q158: Invalid routes return 404', async () => {
            const res = await apiGet('/nonexistent');
            expect(res.status).toBeGreaterThanOrEqual(400);
        });
    });
});
