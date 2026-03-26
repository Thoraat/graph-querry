import { all } from "../db.js";

export async function getSchemaText(db) {
  const tables = await all(
    db,
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;`
  );

  const chunks = [];
  for (const t of tables) {
    const cols = await all(db, `PRAGMA table_info(${t.name});`);
    const fks = await all(db, `PRAGMA foreign_key_list(${t.name});`);
    chunks.push(`TABLE ${t.name}`);
    for (const c of cols) {
      chunks.push(
        `  - ${c.name} ${c.type}${c.notnull ? " NOT NULL" : ""}${c.pk ? " PRIMARY KEY" : ""}`
      );
    }
    if (fks.length) {
      chunks.push("  FOREIGN KEYS:");
      for (const fk of fks) {
        chunks.push(`    - (${fk.from}) REFERENCES ${fk.table}(${fk.to})`);
      }
    }
    chunks.push("");
  }
  return chunks.join("\n").trim();
}

