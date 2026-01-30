import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve, join } from "path";
import { readdir, readFile } from "fs/promises";
import { Pool } from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env") });

const migrationsDir = resolve(__dirname, "../sql");

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

const runMigrations = async () => {
  const files = await readdir(migrationsDir);
  const sqlFiles = files
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  if (sqlFiles.length === 0) {
    console.log("No SQL migrations found.");
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const file of sqlFiles) {
      const path = join(migrationsDir, file);
      const sql = await readFile(path, "utf8");
      console.log(`Applying ${file}...`);
      await client.query(sql);
    }
    await client.query("COMMIT");
    console.log("Migrations complete.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", error);
    process.exitCode = 1;
  } finally {
    client.release();
  }
};

runMigrations()
  .catch((error) => {
    console.error("Migration runner error:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
