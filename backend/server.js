import "dotenv/config";
import express from "express";
import cors from "cors";
import { openDb } from "./db.js";
import { graphRouter } from "./routes/graph.js";
import { queryRouter } from "./routes/query.js";

const PORT = Number(process.env.PORT || 4000);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

const db = openDb({ sqlitePath: process.env.SQLITE_PATH });
app.locals.db = db;

app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/graph", graphRouter);
app.use("/query", queryRouter);

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
  console.log(`CORS origin: ${CORS_ORIGIN}`);
});

