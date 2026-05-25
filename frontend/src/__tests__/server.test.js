import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import net from "net";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "..", "frontend", "dist");
const require = createRequire(import.meta.url);

const TEST_PORT = 3790;
let serverModule;

describe("Server.js", () => {
  beforeAll(async () => {
    if (!fs.existsSync(ROOT)) {
      fs.mkdirSync(ROOT, { recursive: true });
    }
    fs.writeFileSync(path.join(ROOT, "index.html"), "<html><body>Test</body></html>");
    fs.writeFileSync(path.join(ROOT, "test.txt"), "hello");

    process.env.PORT = String(TEST_PORT);
    process.env.SUPABASE_URL = "https://testproject.supabase.co";

    const serverPath = path.resolve(__dirname, "..", "..", "..", "server.js");
    delete require.cache[serverPath];
    serverModule = require(serverPath);

    await new Promise((resolve) => serverModule.start(resolve));
  });

  afterAll(() => {
    ["index.html", "test.txt"].forEach((f) => {
      const p = path.join(ROOT, f);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });
    serverModule.stop();
  });

  it("returns 200 for index.html", async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Test");
  });

  it("returns 200 for existing asset", async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/test.txt`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe("hello");
  });

  it("returns SPA fallback for unknown routes", async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/some/route`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Test");
  });

  it("includes security headers", async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/`);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(res.headers.get("content-security-policy")).toBeTruthy();
    expect(res.headers.get("strict-transport-security")).toBe("max-age=31536000; includeSubDomains");
  });

  it("CSP contains the configured Supabase URL", async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/`);
    const csp = res.headers.get("content-security-policy");
    expect(csp).toContain("https://testproject.supabase.co");
  });

  it("prevents path traversal", async () => {
    const rawResponse = await new Promise((resolve, reject) => {
      const client = new net.Socket();
      client.connect(TEST_PORT, "127.0.0.1", () => {
        client.write("GET /../../../etc/passwd HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n");
      });
      let data = "";
      client.on("data", (chunk) => { data += chunk.toString(); });
      client.on("end", () => resolve(data));
      client.on("error", reject);
    });
    expect(rawResponse).toContain("403");
  });

  it("health endpoint returns ok", async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });
});
