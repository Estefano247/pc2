const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = path.resolve(__dirname, "frontend", "dist");

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

const SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-XSS-Protection": "0",
    "Content-Security-Policy": "default-src 'self' https:; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co",
};

function isSafePath(requestedPath) {
    const resolved = path.resolve(requestedPath);
    return resolved.startsWith(ROOT);
}

const server = http.createServer((req, res) => {
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

server.listen(PORT, () => {
    console.log(`Servidor producción en http://localhost:${PORT}`);
});
