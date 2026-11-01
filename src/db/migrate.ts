import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

// Applies pending migrations from ./drizzle. Safe to run on every deploy.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
migrate(drizzle(pool), { migrationsFolder: "./drizzle" })
  .then(() => console.log("Migrations applied"))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
