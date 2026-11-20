import { spawn } from "node:child_process";
import net from "node:net";
import { env } from "../lib/env.mjs";

const configuredPort = Number(env("PORT")) || 4740;
const maxPortAttempts = 20;

function portIsAvailable(port) {
  const probe = net.createServer();
  return new Promise((resolve, reject) => {
    probe.once("error", (error) => {
      if (error.code === "EADDRINUSE") resolve(false);
      else reject(error);
    });
    probe.listen(port, "127.0.0.1", () => {
      probe.close((error) => error ? reject(error) : resolve(true));
    });
  });
}

let port = configuredPort;
while (port < configuredPort + maxPortAttempts && !(await portIsAvailable(port))) port += 1;
if (port >= configuredPort + maxPortAttempts) {
  throw new Error(`No available local port found between ${configuredPort} and ${configuredPort + maxPortAttempts - 1}.`);
}
if (port !== configuredPort) console.warn(`Port ${configuredPort} is already in use; using ${port}.`);

const server = spawn(process.execPath, ["app/server.mjs"], {
  stdio: "inherit",
  env: { ...process.env, PORT: String(port) },
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal));
}
server.on("error", (error) => {
  console.error(`Could not start the CrucibleFish server: ${error.message}`);
  process.exitCode = 1;
});
server.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
