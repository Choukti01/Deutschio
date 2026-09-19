import serverless from "serverless-http";
import { app, initializeApp } from "../../apps/api/dist/server.js";

const expressHandler = serverless(app);
let initialization: Promise<void> | undefined;

function unavailableResponse() {
  return {
    statusCode: 503,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    body: JSON.stringify({
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "Deutschio is connecting to its secure learning service. Please try again shortly.",
      },
    }),
  };
}

// The same Express app powers local development and the serverless runtime.
// Database migrations run once per warm function instance before requests are
// handed to Express.
export const handler = async (...args: Parameters<typeof expressHandler>) => {
  try {
    initialization ??= initializeApp();
    await initialization;
    return expressHandler(...args);
  } catch (error) {
    // Never let an initialization rejection turn into Netlify's opaque 502.
    // The detailed cause is retained only in server logs; the client receives
    // a safe, retryable response without connection details or secrets.
    console.error("Deutschio API initialization failed", error);
    return unavailableResponse();
  }
};
