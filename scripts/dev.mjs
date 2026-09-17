import { spawn } from "node:child_process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const commands = ["dev:web", "dev:api"];
const children = commands.map((script) => spawn(npm, ["run", script], { stdio: "inherit" }));

const stop = (signal) => {
  for (const child of children) child.kill(signal);
  process.exitCode = 0;
};

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
for (const child of children) child.on("exit", (code) => { if (code && code !== 0) stop("SIGTERM"); });
