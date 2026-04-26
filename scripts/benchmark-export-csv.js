import { spawnSync } from "node:child_process";

const API_BASE = process.env.BENCHMARK_API_BASE || "http://127.0.0.1:4000/api";
const BENCHMARK_YEAR = Number.parseInt(process.env.BENCHMARK_YEAR || "2026", 10);
const SAMPLE_INTERVAL_MS = Number.parseInt(process.env.BENCHMARK_SAMPLE_INTERVAL_MS || "250", 10);
const AUTH_IDENTIFIER = process.env.BENCHMARK_IDENTIFIER || "admin@localhost";
const AUTH_PASSWORD = process.env.BENCHMARK_PASSWORD || "admin_dev";

const EXPORT_SCENARIOS = [
    {
        name: "earnings-full-snapshot",
        description: "Unfiltered earnings export for the reporting year",
        query: {
            year: BENCHMARK_YEAR,
            context: "earnings",
        },
    },
    {
        name: "earnings-min-100k",
        description: "Earnings export with minEarnings forcing SQL earnings lookup",
        query: {
            year: BENCHMARK_YEAR,
            context: "earnings",
            minEarnings: 100000,
        },
    },
    {
        name: "benefits-full-snapshot",
        description: "Benefits export without earnings lookup",
        query: {
            year: BENCHMARK_YEAR,
            context: "benefits",
        },
    },
];

const toMegabytes = (bytes) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buildUrl = (base, path, query) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query || {})) {
        if (value === undefined || value === null || value === "") continue;
        params.set(key, String(value));
    }
    return `${base}${path}?${params.toString()}`;
};

const getBackendPid = () => {
    const command = [
        "$listener = Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue |",
        "  Where-Object { $_.State -eq 'Listen' } |",
        "  Select-Object -First 1 -ExpandProperty OwningProcess;",
        "if ($listener) { Write-Output $listener }",
    ].join(" ");
    const result = spawnSync("powershell", ["-NoProfile", "-Command", command], {
        encoding: "utf-8",
    });

    if (result.status !== 0) {
        throw new Error(result.stderr.trim() || "Failed to resolve backend PID.");
    }

    const pid = Number.parseInt(result.stdout.trim(), 10);
    if (!Number.isFinite(pid)) {
        throw new Error("Backend is not listening on port 4000.");
    }

    return pid;
};

const getProcessSample = (pid) => {
    const command = [
        `$process = Get-Process -Id ${pid} -ErrorAction Stop;`,
        '$payload = [PSCustomObject]@{',
        "  Cpu = $process.CPU;",
        "  WorkingSet64 = $process.WorkingSet64;",
        "  PM = $process.PM;",
        "};",
        "$payload | ConvertTo-Json -Compress",
    ].join(" ");
    const result = spawnSync("powershell", ["-NoProfile", "-Command", command], {
        encoding: "utf-8",
    });

    if (result.status !== 0) {
        throw new Error(result.stderr.trim() || `Failed to sample process ${pid}.`);
    }

    const parsed = JSON.parse(result.stdout.trim());
    return {
        cpuSeconds: Number(parsed.Cpu) || 0,
        workingSetBytes: Number(parsed.WorkingSet64) || 0,
        privateBytes: Number(parsed.PM) || 0,
    };
};

const signin = async () => {
    const response = await fetch(`${API_BASE}/auth/signin`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            identifier: AUTH_IDENTIFIER,
            password: AUTH_PASSWORD,
        }),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Signin failed (${response.status}): ${body}`);
    }

    const body = await response.json();
    if (!body?.token) {
        throw new Error("Signin succeeded but response token is missing.");
    }

    return body.token;
};

const benchmarkScenario = async ({ scenario, token, pid }) => {
    const url = buildUrl(API_BASE, "/dashboard/drilldown/export", scenario.query);
    const baseline = getProcessSample(pid);
    let peakWorkingSetBytes = baseline.workingSetBytes;
    let peakPrivateBytes = baseline.privateBytes;

    let samplerRunning = true;
    const sampler = (async () => {
        while (samplerRunning) {
            await sleep(SAMPLE_INTERVAL_MS);
            try {
                const sample = getProcessSample(pid);
                peakWorkingSetBytes = Math.max(peakWorkingSetBytes, sample.workingSetBytes);
                peakPrivateBytes = Math.max(peakPrivateBytes, sample.privateBytes);
            } catch {
                samplerRunning = false;
            }
        }
    })();

    const start = performance.now();
    const response = await fetch(url, {
        method: "GET",
        headers: {
            "x-access-token": token,
        },
    });

    if (!response.ok) {
        samplerRunning = false;
        await sampler;
        const body = await response.text();
        throw new Error(`Export failed (${response.status}): ${body}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
        samplerRunning = false;
        await sampler;
        throw new Error("Response body is not stream-readable.");
    }

    let totalBytes = 0;
    let totalRows = 0;
    let trailingChunk = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        totalBytes += value.byteLength;
        const text = trailingChunk + new TextDecoder().decode(value, { stream: true });
        const lines = text.split("\n");
        trailingChunk = lines.pop() || "";
        totalRows += lines.length;
    }

    if (trailingChunk.length > 0) {
        totalRows += 1;
    }

    const end = performance.now();
    samplerRunning = false;
    await sampler;

    const finalSample = getProcessSample(pid);
    const dataRows = Math.max(totalRows - 1, 0);

    return {
        name: scenario.name,
        description: scenario.description,
        url,
        durationMs: Math.round(end - start),
        totalBytes,
        totalRows,
        dataRows,
        baselineWorkingSetBytes: baseline.workingSetBytes,
        peakWorkingSetBytes,
        finalWorkingSetBytes: finalSample.workingSetBytes,
        peakPrivateBytes,
        finalPrivateBytes: finalSample.privateBytes,
        cpuSecondsDelta: Math.max(0, finalSample.cpuSeconds - baseline.cpuSeconds),
    };
};

const printResult = (result) => {
    console.log("");
    console.log(`Scenario: ${result.name}`);
    console.log(`Description: ${result.description}`);
    console.log(`URL: ${result.url}`);
    console.log(`Duration: ${(result.durationMs / 1000).toFixed(2)}s`);
    console.log(`CSV size: ${toMegabytes(result.totalBytes)} (${result.totalBytes.toLocaleString()} bytes)`);
    console.log(`Rows: ${result.dataRows.toLocaleString()} data rows + 1 header`);
    console.log(
        `Working set: baseline ${toMegabytes(result.baselineWorkingSetBytes)} -> peak ${toMegabytes(result.peakWorkingSetBytes)} (delta ${toMegabytes(result.peakWorkingSetBytes - result.baselineWorkingSetBytes)})`,
    );
    console.log(
        `Private memory: peak ${toMegabytes(result.peakPrivateBytes)} | final ${toMegabytes(result.finalPrivateBytes)}`,
    );
    console.log(`Approx CPU time consumed by backend process: ${result.cpuSecondsDelta.toFixed(2)}s`);
};

const main = async () => {
    const pid = getBackendPid();
    const token = await signin();

    console.log("CSV export benchmark");
    console.log(`API base: ${API_BASE}`);
    console.log(`Backend PID: ${pid}`);
    console.log(`Benchmark year: ${BENCHMARK_YEAR}`);
    console.log(`Sample interval: ${SAMPLE_INTERVAL_MS}ms`);

    const results = [];
    for (const scenario of EXPORT_SCENARIOS) {
        const result = await benchmarkScenario({ scenario, token, pid });
        results.push(result);
        printResult(result);
    }

    console.log("");
    console.log("Summary");
    for (const result of results) {
        console.log(
            [
                `- ${result.name}`,
                `${(result.durationMs / 1000).toFixed(2)}s`,
                `${result.dataRows.toLocaleString()} rows`,
                `${toMegabytes(result.totalBytes)}`,
                `peak RSS +${toMegabytes(result.peakWorkingSetBytes - result.baselineWorkingSetBytes)}`,
                `CPU +${result.cpuSecondsDelta.toFixed(2)}s`,
            ].join(" | "),
        );
    }
};

main().catch((error) => {
    console.error("CSV export benchmark failed");
    console.error(error.message);
    process.exit(1);
});
