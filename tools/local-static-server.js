const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "www");
const port = Number(process.env.PORT || 8093);

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

const server = http.createServer((req, res) => {
  const requestPath = decodeURIComponent(new URL(req.url, `http://localhost:${port}`).pathname);
  const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
  let filePath = path.join(root, safePath);

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (!path.extname(filePath)) {
    filePath = path.join(filePath, "index.html");
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      fs.readFile(path.join(root, "index.html"), (fallbackError, fallbackContent) => {
        if (fallbackError) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        res.writeHead(200, { "Content-Type": types[".html"] });
        res.end(fallbackContent);
      });
      return;
    }

    res.writeHead(200, {
      "Content-Type": types[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(content);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Datacora local: http://127.0.0.1:${port}`);
});
