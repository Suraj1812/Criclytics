import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);
const python = fileURLToPath(new URL("../.venv/bin/python", import.meta.url));
const apiOnly = process.argv.includes("--api-only");

if (!existsSync(python) || spawnSync(python, ["-c", "import fastapi, uvicorn, httpx"], { stdio: "ignore" }).status !== 0) {
  console.error("Local Python dependencies are missing. Run npm run setup first.");
  process.exit(1);
}
if (!apiOnly && !existsSync("node_modules/vite/bin/vite.js")) {
  console.error("Frontend dependencies are missing. Run npm run setup first.");
  process.exit(1);
}

// Refuse occupied ports instead of stopping unrelated processes.
for (const port of apiOnly ? [8787] : [8787, 5173]) {
  await new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => server.close(resolve));
  }).catch((error) => {
    console.error(`Cannot use localhost:${port}: ${error.message}. Stop the service using that port and retry.`);
    process.exit(1);
  });
}

const children = new Set();
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill("SIGTERM");
  const timeout = setTimeout(() => {
    for (const child of children) child.kill("SIGKILL");
  }, 5000);
  timeout.unref();
}
function start(command, args) {
  const child = spawn(command, args, { stdio: "inherit", cwd: root });
  children.add(child);
  child.on("error", (error) => {
    children.delete(child);
    console.error(error.message);
    stop(1);
  });
  child.on("exit", (code, signal) => {
    children.delete(child);
    if (!stopping) stop(code ?? (signal ? 1 : 0));
  });
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

start(python, ["-m", "uvicorn", "server.app.main:app", "--reload", "--reload-dir", "server", "--host", "127.0.0.1", "--port", "8787"]);
if (!apiOnly) {
  start(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "5173", "--strictPort"]);
  console.log("\nCriclytics: http://localhost:5173\nAPI health: http://127.0.0.1:8787/health\nPress Ctrl+C to stop both services.\n");
}
