const DATASET_KEYWORDS = [
  "order",
  "orders",
  "delivery",
  "deliveries",
  "invoice",
  "invoices",
  "payment",
  "payments",
  "customer",
  "customers",
  "product",
  "products",
  "journal",
  "journal entry",
  "billing document",
  "flow",
  "sales",
  "sku",
  "so-",
  "dn-",
  "inv-",
  "pay-",
  "je-",
  "911"
];

const BANNED_INTENTS = [
  "write a poem",
  "poem",
  "story",
  "lyrics",
  "joke",
  "recipe",
  "general knowledge",
  "who is",
  "what is the capital",
  "physics",
  "chemistry",
  "math proof",
  "fantasy",
  "make up",
  "imagine"
];

export function isDatasetRelated(question) {
  const q = String(question || "").toLowerCase();
  if (!q.trim()) return false;
  if (BANNED_INTENTS.some((b) => q.includes(b))) return false;
  return DATASET_KEYWORDS.some((k) => q.includes(k));
}

export function isSafeSql(sql) {
  const s = String(sql || "").trim().toLowerCase();
  if (!s) return { ok: false, reason: "Empty SQL" };

  // Only allow read-only queries
  if (!(s.startsWith("select") || s.startsWith("with"))) {
    return { ok: false, reason: "Only SELECT/WITH queries are allowed" };
  }

  // Disallow common dangerous keywords even inside WITH
  const banned = [
    "insert",
    "update",
    "delete",
    "drop",
    "alter",
    "create",
    "attach",
    "detach",
    "pragma",
    "vacuum",
    "reindex",
    "replace"
  ];
  for (const b of banned) {
    const re = new RegExp(`\\b${b}\\b`, "i");
    if (re.test(s)) return { ok: false, reason: `Disallowed keyword: ${b}` };
  }

  // Single statement only (very basic)
  const semicolons = (s.match(/;/g) || []).length;
  if (semicolons > 1) return { ok: false, reason: "Multiple statements are not allowed" };

  return { ok: true };
}

