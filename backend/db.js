// import sqlite3 from "sqlite3";
// import path from "path";
// import { fileURLToPath } from "url";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// function resolveSqlitePath(sqlitePath) {
//   // Allow relative paths from backend/ root
//   if (!sqlitePath) return path.join(__dirname, "data", "app.db");
//   if (path.isAbsolute(sqlitePath)) return sqlitePath;
//   return path.join(__dirname, sqlitePath);
// }

// export function openDb({ sqlitePath }) {
//   const filename = resolveSqlitePath(sqlitePath);
//   const db = new sqlite3.Database(filename);

//   // Keep foreign keys on
//   db.serialize(() => {
//     db.run("PRAGMA foreign_keys = ON;");
//     db.run("PRAGMA journal_mode = WAL;");
//   });

//   return db;
// }

// export function all(db, sql, params = []) {
//   return new Promise((resolve, reject) => {
//     db.all(sql, params, (err, rows) => {
//       if (err) return reject(err);
//       resolve(rows);
//     });
//   });
// }

// export function get(db, sql, params = []) {
//   return new Promise((resolve, reject) => {
//     db.get(sql, params, (err, row) => {
//       if (err) return reject(err);
//       resolve(row);
//     });
//   });
// }

// export function run(db, sql, params = []) {
//   return new Promise((resolve, reject) => {
//     db.run(sql, params, function (err) {
//       if (err) return reject(err);
//       resolve({ changes: this.changes, lastID: this.lastID });
//     });
//   });
// }

// export function exec(db, sql) {
//   return new Promise((resolve, reject) => {
//     db.exec(sql, (err) => {
//       if (err) return reject(err);
//       resolve();
//     });
//   });
// }

import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveSqlitePath(sqlitePath) {
  if (!sqlitePath) return path.join(__dirname, "data", "app.db");
  if (path.isAbsolute(sqlitePath)) return sqlitePath;
  return path.join(__dirname, sqlitePath);
}

export function openDb({ sqlitePath }) {
  const filename = resolveSqlitePath(sqlitePath);

  const db = new Database(filename);

  // PRAGMA settings
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
  `);

  return db;
}

// 🔹 NO MORE PROMISES — synchronous now

export function all(db, sql, params = []) {
  return db.prepare(sql).all(params);
}

export function get(db, sql, params = []) {
  return db.prepare(sql).get(params);
}

export function run(db, sql, params = []) {
  const result = db.prepare(sql).run(params);
  return {
    changes: result.changes,
    lastID: result.lastInsertRowid,
  };
}

export function exec(db, sql) {
  return db.exec(sql);
}