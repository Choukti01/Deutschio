import serverless from "serverless-http";

let initialization: Promise<void> | undefined;
type FunctionHandler = (...args: unknown[]) => unknown;
let expressHandler: FunctionHandler | undefined;

async function initializeFunction() {
  // Loading the app lazily puts configuration parsing, database startup and
  // catalog sync inside the guarded path below. Netlify therefore receives a
  // valid JSON response instead of crashing the function during module load.
  const { app, initializeApp } = await import("../../apps/api/dist/server.js");
  await initializeApp();
  expressHandler = serverless(app) as unknown as FunctionHandler;
}

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
export const handler = async (...args: unknown[]) => {
  try {
    initialization ??= initializeFunction();
    await initialization;
    return expressHandler!(...args);
  } catch (error) {
    // Never let an initialization rejection turn into Netlify's opaque 502.
    // The detailed cause is retained only in server logs; the client receives
    // a safe, retryable response without connection details or secrets.
    console.error("Deutschio API initialization failed", error);
    return unavailableResponse();
  }
};
