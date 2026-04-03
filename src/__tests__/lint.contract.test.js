import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("backend lint contract", () => {
  test("package.json exposes syntax and static lint stages", () => {
    const packagePath = path.resolve(__dirname, "..", "..", "package.json");
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf-8"));

    expect(pkg.scripts).toHaveProperty("lint");
    expect(pkg.scripts).toHaveProperty("lint:syntax");
    expect(pkg.scripts).toHaveProperty("lint:static");
    expect(pkg.scripts).toHaveProperty("verify:backend");
    expect(pkg.scripts).toHaveProperty("verify:frontend");
    expect(pkg.scripts).toHaveProperty("verify:all");
    expect(pkg.scripts.lint).toContain("lint:syntax");
    expect(pkg.scripts.lint).toContain("lint:static");
    expect(pkg.scripts["lint:static"]).toContain("eslint");
    expect(pkg.scripts["verify:backend"]).toContain("doctor:local");
    expect(pkg.scripts["verify:backend"]).toContain("npm audit --omit=dev");
    expect(pkg.scripts["verify:frontend"]).toContain("dashboard");
    expect(pkg.scripts["verify:all"]).toContain("verify:backend");
    expect(pkg.scripts["verify:all"]).toContain("verify:frontend");
  });

  test("eslint config targets backend sources and enforces core runtime safety rules", () => {
    const configPath = path.resolve(__dirname, "..", "..", "eslint.config.js");
    const source = fs.readFileSync(configPath, "utf-8");

    expect(source).toContain("src/**/*.js");
    expect(source).toContain("scripts/**/*.js");
    expect(source).toContain("tests/**/*.js");
    expect(source).toContain("\"no-undef\": \"error\"");
    expect(source).toContain("\"no-unreachable\": \"error\"");
    expect(source).toContain("\"no-dupe-keys\": \"error\"");
    expect(source).toContain("\"no-unused-vars\"");
    expect(source).toContain("\"no-empty\": \"error\"");
    expect(source).toContain("eqeqeq");
    expect(source).toContain("\"no-useless-catch\": \"error\"");
  });

  test("dashboard package exposes one-command frontend verification", () => {
    const packagePath = path.resolve(__dirname, "..", "..", "dashboard", "package.json");
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf-8"));

    expect(pkg.scripts).toHaveProperty("verify:frontend");
    expect(pkg.scripts["verify:frontend"]).toContain("npm run lint");
    expect(pkg.scripts["verify:frontend"]).toContain("npm run test");
    expect(pkg.scripts["verify:frontend"]).toContain("npm run build");
    expect(pkg.scripts["verify:frontend"]).toContain("npm audit --omit=dev");
  });
});
