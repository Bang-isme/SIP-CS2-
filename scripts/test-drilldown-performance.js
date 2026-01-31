/**
 * Drilldown API Performance Test Suite (Detailed Version)
 * Tests all filter combinations and contexts with full filter display
 * 
 * Usage: node scripts/test-drilldown-performance.js
 */

const API_BASE = 'http://localhost:4000/api';

// Test cases configuration
const TEST_CASES = [
    // ===== NO FILTER (Pre-aggregated path) =====
    { name: 'No Filter - Earnings', params: { context: 'earnings' }, expected: '<2s' },
    { name: 'No Filter - Vacation', params: { context: 'vacation' }, expected: '<2s' },
    { name: 'No Filter - Benefits', params: { context: 'benefits' }, expected: '<2s' },

    // ===== SINGLE FILTER (Pre-aggregated path) =====
    { name: 'Gender=Male - Earnings', params: { gender: 'Male', context: 'earnings' }, expected: '<2s' },
    { name: 'Gender=Female - Vacation', params: { gender: 'Female', context: 'vacation' }, expected: '<2s' },
    { name: 'Gender=Male - Benefits', params: { gender: 'Male', context: 'benefits' }, expected: '<15s' },

    // ===== MULTI FILTER (Real-time calculation) =====
    { name: 'Male + Part-time - Earnings', params: { gender: 'Male', employmentType: 'Part-time', context: 'earnings' }, expected: '<15s' },
    { name: 'Female + Hispanic - Vacation', params: { gender: 'Female', ethnicity: 'Hispanic', context: 'vacation' }, expected: '<15s' },
    { name: 'Female + Part-time + NonSH', params: { gender: 'Female', employmentType: 'Part-time', isShareholder: 'false', context: 'vacation' }, expected: '<15s' },

    // ===== LARGE DATASET STRESS TEST =====
    { name: 'Male Only (250k) - Earnings', params: { gender: 'Male', context: 'earnings' }, expected: '<5s', stress: true },
    { name: 'Female Only (250k) - Vacation', params: { gender: 'Female', context: 'vacation' }, expected: '<15s', stress: true },

    // ===== SHAREHOLDER FILTER =====
    { name: 'Shareholders Only - Earnings', params: { isShareholder: 'true', context: 'earnings' }, expected: '<5s' },
    { name: 'Non-Shareholders - Vacation', params: { isShareholder: 'false', context: 'vacation' }, expected: '<15s' },

    // ===== DEPARTMENT FILTER =====
    { name: 'Sales Dept - Earnings', params: { department: 'Sales', context: 'earnings' }, expected: '<5s' },
    { name: 'IT Support - Vacation', params: { department: 'IT Support', context: 'vacation' }, expected: '<5s' },

    // ===== MIN EARNINGS FILTER (Forces real-time) =====
    { name: 'Min $100k - Earnings', params: { minEarnings: '100000', context: 'earnings' }, expected: '<30s' },
    { name: 'Min $50k + Male', params: { minEarnings: '50000', gender: 'Male', context: 'earnings' }, expected: '<30s' },
];

// Build URL with query params
function buildUrl(params) {
    const searchParams = new URLSearchParams({
        page: 1,
        limit: 20,
        search: '',
        ...params
    });
    return `${API_BASE}/dashboard/drilldown?${searchParams.toString()}`;
}

// Format filter params for display
function formatFilters(params) {
    const filters = [];
    if (params.gender) filters.push(`gender=${params.gender}`);
    if (params.department) filters.push(`dept=${params.department}`);
    if (params.employmentType) filters.push(`type=${params.employmentType}`);
    if (params.ethnicity) filters.push(`eth=${params.ethnicity}`);
    if (params.isShareholder) filters.push(`sh=${params.isShareholder}`);
    if (params.minEarnings) filters.push(`min$=${params.minEarnings}`);
    if (params.context) filters.push(`ctx=${params.context}`);
    return filters.join(', ') || 'none';
}

// Execute single test
async function runTest(testCase) {
    const url = buildUrl(testCase.params);
    const startTime = Date.now();

    try {
        const response = await fetch(url);
        const endTime = Date.now();
        const duration = endTime - startTime;
        const data = await response.json();

        // Determine pass/fail based on expected threshold
        const expectedMs = parseInt(testCase.expected.replace(/[<>s]/g, '')) * 1000;
        const passed = duration <= expectedMs;

        return {
            name: testCase.name,
            filters: formatFilters(testCase.params),
            duration: duration,
            durationStr: `${(duration / 1000).toFixed(2)}s`,
            expected: testCase.expected,
            passed: passed,
            count: data.summary?.count || data.meta?.total || 0,
            source: data.summary?.source || 'unknown',
            earnings: data.summary?.totalEarnings || 0,
            benefits: data.summary?.totalBenefits || 0,
            vacation: data.summary?.totalVacation || 0,
            error: null
        };
    } catch (error) {
        return {
            name: testCase.name,
            filters: formatFilters(testCase.params),
            duration: -1,
            durationStr: 'ERROR',
            expected: testCase.expected,
            passed: false,
            count: 0,
            source: 'error',
            earnings: 0,
            benefits: 0,
            vacation: 0,
            error: error.message
        };
    }
}

// Main runner
async function main() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                    DRILLDOWN API PERFORMANCE TEST SUITE                                                                        ║');
    console.log('╠════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣');

    const results = [];

    for (let i = 0; i < TEST_CASES.length; i++) {
        const testCase = TEST_CASES[i];
        console.log(`║  ⏳ Running Test #${(i + 1).toString().padStart(2, '0')}: ${testCase.name.padEnd(40)} ...                                                                                                   ║`);

        const result = await runTest(testCase);
        results.push(result);

        // Print detailed result
        const status = result.passed ? '✅ PASS' : '❌ FAIL';
        console.log(`╠════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣`);
        console.log(`║  Test #${(i + 1).toString().padStart(2, '0')}: ${result.name.padEnd(45)} ${status}`.padEnd(165) + '║');
        console.log(`║  └─ Filters: ${result.filters.padEnd(60)} Time: ${result.durationStr.padStart(8)} (target: ${result.expected})`.padEnd(165) + '║');
        console.log(`║  └─ Count: ${result.count.toLocaleString().padStart(10)}   Source: ${result.source.padEnd(20)} Earnings: $${result.earnings.toLocaleString().padStart(15)} Benefits: $${result.benefits.toLocaleString().padStart(12)} Vacation: ${result.vacation.toLocaleString().padStart(6)} days`.padEnd(165) + '║');
        console.log(`╠════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣`);
    }

    // Summary
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const avgTime = results.reduce((sum, r) => sum + (r.duration > 0 ? r.duration : 0), 0) / results.length;
    const slowest = results.reduce((max, r) => r.duration > max.duration ? r : max, results[0]);
    const fastest = results.reduce((min, r) => (r.duration > 0 && r.duration < min.duration) ? r : min, results[0]);

    console.log(`║  📊 SUMMARY`.padEnd(165) + '║');
    console.log(`║  ├─ Total: ${results.length} tests | ✅ Passed: ${passed} | ❌ Failed: ${failed}`.padEnd(165) + '║');
    console.log(`║  ├─ Average Response Time: ${(avgTime / 1000).toFixed(2)}s`.padEnd(165) + '║');
    console.log(`║  ├─ 🐢 Slowest: ${slowest.name} (${slowest.durationStr})`.padEnd(165) + '║');
    console.log(`║  └─ 🚀 Fastest: ${fastest.name} (${fastest.durationStr})`.padEnd(165) + '║');
    console.log('╚════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝');

    // Detailed failures
    if (failed > 0) {
        console.log('\n⚠️  FAILED TESTS DETAILS:');
        results.filter(r => !r.passed).forEach((r, i) => {
            console.log(`   ${i + 1}. ${r.name}`);
            console.log(`      Filters: ${r.filters}`);
            console.log(`      Time: ${r.durationStr} (expected: ${r.expected})`);
            if (r.error) console.log(`      Error: ${r.error}`);
        });
    }

    console.log('\n');

    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
