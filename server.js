const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = path.resolve(__dirname, "frontend", "dist");
const SUPABASE_URL = process.env.SUPABASE_URL || "https://*.supabase.co";

const MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".webp": "image/webp",
    ".woff2": "font/woff2",
};

function buildCSP() {
    const connectSrc = `'self' ${SUPABASE_URL}`;
    return [
        "default-src 'self' https:",
        `connect-src ${connectSrc}`,
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
    ].join("; ");
}

const SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-XSS-Protection": "0",
    "Content-Security-Policy": buildCSP(),
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

function isSafePath(requestedPath) {
    const resolved = path.resolve(requestedPath);
    return resolved.startsWith(ROOT);
}

const server = http.createServer((req, res) => {
    // Health check endpoint
    if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
        return;
    }
    let filePath = path.join(ROOT, req.url === "/" ? "index.html" : req.url.split("?")[0]);

    if (!isSafePath(filePath)) {
        res.writeHead(403, { "Content-Type": "text/plain" });
        res.end("Forbidden");
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            fs.readFile(path.join(ROOT, "index.html"), (err2, data2) => {
                if (err2) {
                    res.writeHead(404, { "Content-Type": "text/plain", ...SECURITY_HEADERS });
                    res.end("Not found");
                    return;
                }
                const ext = path.extname(filePath);
                res.writeHead(200, {
                    "Content-Type": MIME[ext] || "text/html; charset=utf-8",
                    ...SECURITY_HEADERS,
                });
                res.end(data2);
            });
            return;
        }
        const ext = path.extname(filePath);
        res.writeHead(200, {
            "Content-Type": MIME[ext] || "text/plain",
            ...SECURITY_HEADERS,
        });
        res.end(data);
    });
});

function start(cb) {
    server.listen(PORT, cb);
}

function stop(cb) {
    server.close(cb);
}

if (require.main === module) {
    start(() => {
        console.log(`Servidor producción en http://localhost:${PORT}`);
    });
}

module.exports = { start, stop, server };
