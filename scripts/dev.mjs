import { spawn } from "node:child_process";

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("npm_execpath is required to start the development services");
const commands = ["dev:web", "dev:api"];
const children = commands.map((script) => spawn(process.execPath, [npmCli, "run", script], { stdio: "inherit" }));

const stop = (signal) => {
  for (const child of children) child.kill(signal);
  process.exitCode = 0;
};

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
for (const child of children) child.on("exit", (code) => { if (code && code !== 0) stop("SIGTERM"); });
