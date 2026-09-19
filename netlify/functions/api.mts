import serverless from "serverless-http";
import { app, initializeApp } from "../../apps/api/dist/server.js";

const expressHandler = serverless(app);
let initialization: Promise<void> | undefined;

// The same Express app powers local development and the serverless runtime.
// Database migrations run once per warm function instance before requests are
// handed to Express.
export const handler = async (...args: Parameters<typeof expressHandler>) => {
  initialization ??= initializeApp();
  await initialization;
  return expressHandler(...args);
};
