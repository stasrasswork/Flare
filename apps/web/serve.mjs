import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "dist");
const port = Number(process.env.PORT ?? 5173);
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

createServer((request, response) => {
  const requestPath = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
  const candidate = path.resolve(root, `.${requestPath}`);
  const filePath = candidate.startsWith(root) && existsSync(candidate) && statSync(candidate).isFile()
    ? candidate
    : path.join(root, "index.html");
  const extension = path.extname(filePath);

  response.setHeader("content-type", contentTypes[extension] ?? "application/octet-stream");
  createReadStream(filePath).on("error", () => {
    response.statusCode = 500;
    response.end("Internal server error");
  }).pipe(response);
}).listen(port, "0.0.0.0", () => {
  console.log(`Web listening on http://0.0.0.0:${port}`);
});
