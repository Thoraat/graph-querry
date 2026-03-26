import express from "express";
import { all } from "../db.js";
import { getSchemaText } from "../utils/schema.js";
import { isDatasetRelated, isSafeSql } from "../utils/guardrails.js";
import { nlToSql, resultsToAnswer } from "../llm.js";

export const queryRouter = express.Router();

queryRouter.post("/", async (req, res) => {
  const db = req.app.locals.db;
  const { question } = req.body || {};

  if (!isDatasetRelated(question)) {
    return res.status(400).json({
      error: "This system only supports queries related to the dataset."
    });
  }

  try {
    const schemaText = await getSchemaText(db);
    const { rawResponse, sql } = await nlToSql({ question, schemaText });
    console.log("RAW LLM OUTPUT:", rawResponse);
    console.log("CLEAN SQL:", sql);

    if (!sql.toLowerCase().startsWith("select")) {
      throw new Error("Only SELECT queries are allowed");
    }

    const safety = isSafeSql(sql);
    if (!safety.ok) return res.status(400).json({ error: "Rejected unsafe SQL from LLM.", details: safety.reason, sql });

    const rows = await all(db, sql);

    const useLlmForAnswer = String(process.env.USE_LLM_FOR_ANSWER || "false").toLowerCase() === "true";
    let answer = null;

    if (!useLlmForAnswer) {
      answer = formatAnswer(rows, question);
    } else if (rows.length === 0) {
      // Strict guard: never call LLM when results are empty.
      answer = "No results found.";
    } else {
      try {
        const llmAnswer = await resultsToAnswer({ question, rows });
        const shouldReplace = shouldFallbackAnswer(llmAnswer, rows);
        answer = shouldReplace ? formatAnswer(rows, question) : llmAnswer.trim();
      } catch (e) {
        answer = formatAnswer(rows, question);
      }
    }

    if (answer == null) answer = formatAnswer(rows, question);

    res.json({ question, sql, rows, answer, rawResponse });
  } catch (err) {
    res.status(500).json({ error: "Query failed.", details: String(err?.message || err) });
  }
});

function shouldFallbackAnswer(text, rows) {
  if (!text) return true;
  if (typeof text !== "string") return true;
  const t = text.trim();

  // If the model talks about missing/non-provided info, it's probably not grounded.
  // Also explicitly block "no data/not found" style contradictions when rows exist.
  const contradictionPhrases = [
    "no data",
    "no results",
    "not found",
    "couldn't find",
    "could not find",
    "no journal entry",
    "not provided",
    "not available",
    "missing data",
    "does not include",
    "not specified",
    "no journal entries"
  ];
  const lower = t.toLowerCase();
  if (contradictionPhrases.some((p) => lower.includes(p))) return true;

  // Basic quality: must be short+structured and include some grounding token when rows have entry_no.
  if (t.length < 20) return true;
  if (/```/.test(t)) return true;
  if (/\bjson\b/i.test(t)) return true;

  if (rows && rows.length > 0 && rows[0].entry_no) {
    const entryNos = rows.map((r) => r.entry_no).filter(Boolean).map(String);
    if (entryNos.length && !entryNos.some((no) => t.includes(no))) return true;

    const known = new Set(entryNos);
    // If the model mentions any JE-xxxx tokens that aren't in the returned rows, it's a contradiction.
    const mentionedTokens = t.match(/\b[A-Z]{2,6}-\d+\b/g) || [];
    if (mentionedTokens.length > 0 && mentionedTokens.some((tok) => !known.has(tok))) return true;

    // If the model states a count, ensure it matches the actual number of rows.
    const countMatch = t.match(/\bthere\s+(?:are|is)\s+(\d+)\b/i);
    if (countMatch) {
      const stated = Number(countMatch[1]);
      if (Number.isFinite(stated) && stated !== rows.length) return true;
    }

    // Demo-friendly structure enforcement for journal entries.
    // If the LLM doesn't output the expected labeled blocks, use the deterministic formatter.
    if (!/Entry No:/i.test(t)) return true;
    if (!/Account:/i.test(t)) return true;
    if (!/Debit:/i.test(t)) return true;
  }

  return false;
}

function extractBillingDocFromQuestion(question) {
  const q = String(question || "");
  // Example billing docs: 91150187 (starts with 911)
  const m = q.match(/\b(911\d{5,})\b/);
  return m ? m[1] : null;
}

function formatCents(val) {
  return typeof val === "number" ? (val / 100).toFixed(2) : "—";
}

function formatAnswer(rows, question) {
  if (!rows || rows.length === 0) return "No results found.";

  const count = rows.length;
  const first = rows[0] || {};
  const isJournal = typeof first.entry_no !== "undefined";
  const reference = extractBillingDocFromQuestion(question) || first.reference_document || first.billing_document_no || null;

  const header = isJournal
    ? reference
      ? `There are ${count} journal entries for billing document ${reference}.`
      : `There are ${count} journal entries.`
    : `Found ${count} results.`;

  if (!isJournal) {
    // Generic readable list (still avoids raw JSON).
    const blocks = rows.map((r, idx) => {
      const entries = Object.entries(r)
        .slice(0, 10)
        .map(([k, v]) => `   ${k}: ${v}`)
        .join("\n");
      return `${idx + 1}. ${entries}`;
    });
    return `${header}\n\n${blocks.join("\n\n")}`.trim();
  }

  const blocks = rows.map((r, idx) => {
    const entryNo = r.entry_no ? String(r.entry_no) : "—";
    const account = r.account ? String(r.account) : "—";
    const memo = r.memo ? String(r.memo) : "—";

    return (
      `${idx + 1}. Entry No: ${entryNo}\n` +
      `   Account: ${account}\n` +
      `   Debit: ${formatCents(r.debit_cents)} | Credit: ${formatCents(r.credit_cents)}\n` +
      `   Memo: ${memo}`
    );
  });

  return `${header}\n\n${blocks.join("\n\n")}`.trim();
}

