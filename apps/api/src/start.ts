import { env } from "./config.js";
import { pool } from "./db.js";
import { app, initializeApp } from "./server.js";

initializeApp()
  .then(() => app.listen(env.PORT, () => console.log(`Deutschio API listening on ${env.PORT}`)))
  .catch(async (error) => { console.error("Failed to start Deutschio API", error); await pool.end(); process.exit(1); });
