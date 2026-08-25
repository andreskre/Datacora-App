const http = require("http");
const fs = require("fs");
const path = require("path");

const port = Number(process.argv[2] || 8094);
const root = process.cwd();
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".ico": "image/x-icon"
};

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(String(req.url || "/").split("?")[0]);
  if (urlPath === "/" || urlPath === "") urlPath = "/index.html";

  const filePath = path.normalize(path.join(root, urlPath));
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": types[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(data);
  });
}).listen(port, "127.0.0.1", () => {
  console.log(`Datacora app local http://127.0.0.1:${port}`);
});
