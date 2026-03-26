import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exec, openDb, run } from "../db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

async function main() {
  const sqlitePath = process.env.SQLITE_PATH || "./data/app.db";

  // Ensure the directory for the sqlite file exists before opening the DB
  const sqliteAbs = path.isAbsolute(sqlitePath)
    ? sqlitePath
    : path.join(path.dirname(__dirname), sqlitePath);
  ensureDir(path.dirname(sqliteAbs));

  const db = openDb({ sqlitePath });

  const schemaSql = fs.readFileSync(path.join(path.dirname(__dirname), "schema.sql"), "utf8");
  const seedSql = fs.readFileSync(path.join(path.dirname(__dirname), "seed.sql"), "utf8");

  // Recreate from scratch for demo
  await run(db, "PRAGMA foreign_keys = OFF;");
  await run(db, "BEGIN;");
  await exec(db, schemaSql);
  await exec(db, seedSql);
  await run(db, "COMMIT;");
  await run(db, "PRAGMA foreign_keys = ON;");

  db.close();
  console.log("Seeded DB at", sqlitePath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

