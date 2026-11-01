import "dotenv/config";
import { execSync } from "node:child_process";

// Every run starts from the same demo data.
export default function globalSetup() {
  execSync("npx tsx src/db/seed.ts", { stdio: "inherit" });
}
