import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const TARGET_DIRS = ["src", "scripts", "tests"];
const IGNORE_DIRS = new Set(["node_modules", ".git", ".codex", "dashboard", "Memory", "docs", "requests"]);

const collectJsFiles = (dirPath, result = []) => {
  for (const entry of readdirSync(dirPath)) {
    const fullPath = join(dirPath, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      if (IGNORE_DIRS.has(entry)) continue;
      collectJsFiles(fullPath, result);
      continue;
    }
    if (extname(entry) === ".js") {
      result.push(fullPath);
    }
  }
  return result;
};

const runSyntaxCheck = (filePath) => {
  return spawnSync(process.execPath, ["--check", filePath], {
    encoding: "utf8",
  });
};

const main = () => {
  const files = TARGET_DIRS.flatMap((dir) => collectJsFiles(dir));
  const failures = [];

  for (const file of files) {
    const check = runSyntaxCheck(file);
    if (check.status !== 0) {
      failures.push({
        file,
        stderr: (check.stderr || "").trim(),
      });
    }
  }

  if (failures.length > 0) {
    console.error(`Backend lint failed. ${failures.length} file(s) with syntax errors:`);
    for (const failure of failures) {
      console.error(`\n- ${failure.file}`);
      if (failure.stderr) {
        console.error(failure.stderr);
      }
    }
    process.exit(1);
  }

  console.log(`Backend lint passed. Checked ${files.length} JavaScript files.`);
};

main();
