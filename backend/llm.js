import "dotenv/config";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function getProvider() {
  return (process.env.LLM_PROVIDER || "groq").toLowerCase();
}

export function cleanSQL(sql) {
  if (sql == null) return "";
  // Normalize to a string and trim whitespace
  let s = String(sql).trim();

  // Remove markdown fences (```sql ... ```)
  s = s.replace(/```sql/gi, "");
  s = s.replace(/```/g, "");

  // Remove common prefixes
  s = s.replace(/^\s*(sql|query)\s*:\s*/i, "");
  s = s.trim();

  // Unescape unnecessary quoting
  s = s.replace(/\\\"/g, '"');
  s = s.replace(/\\'/g, "'");

  // Fix common LLM pattern: = "'123'" or = "\"'123'\""
  s = s.replace(/"\s*'\s*([^']*?)\s*'\s*"/g, "'$1'");

  // Remove wrapping quotes around the whole SQL (e.g. "'SELECT ...'")
  if (
    (s.startsWith("'") && s.endsWith("'")) ||
    (s.startsWith('"') && s.endsWith('"'))
  ) {
    s = s.slice(1, -1).trim();
  }

  // Final trim
  s = s.trim();
  return s;
}

function ensureJournalEntriesSelectColumns(sql) {
  const s = String(sql || "");
  if (!/from\s+journal_entries/i.test(s)) return s;

  // If model already selects entry_no, assume it's fine.
  if (/select[\s\S]*?\bentry_no\b/i.test(s)) return s;

  // Rewrite SELECT clause to include key fields for grounded answers.
  // Note: we keep the rest (WHERE, ORDER BY, etc.) intact.
  const rewritten = s.replace(
    /select[\s\S]*?\bfrom\s+journal_entries\b/i,
    "SELECT entry_no, account, debit_cents, credit_cents, memo FROM journal_entries"
  );

  return rewritten;
}

export async function llmText({ system, user }) {
  const provider = getProvider();
  const apiKey = requireEnv("LLM_API_KEY");
  const model = process.env.LLM_MODEL || "llama-3.1-70b-versatile";

  if (provider === "groq") {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ]
      })
    });
    if (!res.ok) throw new Error(`Groq error: ${res.status} ${await res.text()}`);
    const json = await res.json();
    return json?.choices?.[0]?.message?.content ?? "";
  }

  if (provider === "openrouter") {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ]
      })
    });
    if (!res.ok) throw new Error(`OpenRouter error: ${res.status} ${await res.text()}`);
    const json = await res.json();
    return json?.choices?.[0]?.message?.content ?? "";
  }

  if (provider === "gemini") {
    // Minimal Gemini 1.5+ generateContent style. Model env var should be like: gemini-1.5-flash
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${system}\n\n${user}` }]
          }
        ],
        generationConfig: { temperature: 0 }
      })
    });
    if (!res.ok) throw new Error(`Gemini error: ${res.status} ${await res.text()}`);
    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
    return text;
  }

  throw new Error(`Unsupported LLM_PROVIDER: ${provider}`);
}

export async function nlToSql({ question, schemaText }) {
  const system = `You are an expert SQLite query generator.

Rules:
* Return ONLY valid SQLite SQL
* Do NOT include markdown (no \`\`\`sql)
* Do NOT include explanations
* Do NOT escape quotes unnecessarily
* Use single quotes for string values
* Output must be directly executable SQL
* Do NOT wrap SQL in quotes

Database Schema:
${schemaText}

Examples:
Q: Find journal entry for billing document 91150187
SQL:
SELECT entry_no, account, debit_cents, credit_cents, memo
FROM journal_entries
WHERE billing_document_no = '91150187';

Q: Find all invoices for order SO-50001
SQL:
SELECT i.*
FROM orders o
JOIN deliveries d ON d.order_id = o.id
JOIN invoices i ON i.delivery_id = d.id
WHERE o.order_no = 'SO-50001';

Q: Find customers who have orders but no invoices
SQL:
SELECT c.*
FROM customers c
JOIN orders o ON c.id = o.customer_id
LEFT JOIN deliveries d ON d.order_id = o.id
LEFT JOIN invoices i ON i.delivery_id = d.id
WHERE i.id IS NULL;

Now generate SQL for the given question.`;

  const user = `Q: ${question}\nSQL:`;
  const rawResponse = await llmText({ system, user });
  const cleaned = cleanSQL(rawResponse);
  const sql = ensureJournalEntriesSelectColumns(cleaned);
  return { rawResponse, sql };
}

export async function resultsToAnswer({ question, rows }) {
  const system = `You are a data analyst.

Given SQL query results, generate an answer.

STRICT RULES:
* If data is present, NEVER say "no data found" or "no results found"
* ONLY use the provided data
* DO NOT hallucinate
* DO NOT contradict the data
* Start with count of results
* Then list key details
* Keep answer concise
* Do NOT output raw JSON
* Do NOT include explanations`;

  const user = `Data:
${JSON.stringify(rows, null, 2)}

Generate the answer in this style (line breaks + numbered list):
If the rows are journal entries, output:
There are X journal entries for billing document <value if present>.

1. Entry No: <entry_no>
   Account: <account>
   Debit: <debit_cents/100> | Credit: <credit_cents/100>
   Memo: <memo>

If multiple rows, continue the numbered blocks.

Use ONLY values present in the Data. Do NOT output JSON.`;  

  const raw = await llmText({ system, user });
  return String(raw || "").trim();
}

