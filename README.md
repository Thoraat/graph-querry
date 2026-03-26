# Graph + LLM Query System

This system converts business data into a graph and allows users to query relationships using natural language powered by an LLM.

The frontend visualizes the dataset as a graph (React Flow) and provides a chat UI for asking questions. The backend turns the question into a safe SQL `SELECT` query, runs it against a SQLite database, and formats the results into a readable answer.

## Project Overview

At a high level:

1. Load business entities (customers, orders, deliveries, invoices, payments, journal entries, etc.) from SQLite.
2. Expose them as an in-memory graph (nodes + edges).
3. Accept natural language questions and convert them to SQL using an LLM (Groq / LLaMA 3.3).
4. Validate and execute the SQL (`SELECT` only).
5. Return a clean, formatted answer to the UI.

## Architecture

Backend (Node.js + Express)

- `GET /graph` returns an in-memory representation of the dataset as `{ nodes, edges }`.
- `POST /query` accepts `{ question }`, converts it to SQL via an LLM, validates the SQL with guardrails, executes it, and returns `{ question, sql, rows, answer }`.

Database (SQLite)

- SQLite is used for simplicity and speed for a demo environment.
- The dataset is stored in `backend/data/app.db` (seed scripts are provided).

Graph Layer (in-memory)

- The backend builds nodes and edges in memory on request.
- Graph nodes represent business entities (e.g., `customer`, `order`, `invoice`).
- Graph edges represent relationships (e.g., `ORDERED_BY`, `CONTAINS`, `BILLED_AS`).

LLM (Groq / LLaMA 3.3)

- The LLM generates SQLite SQL from natural language.
- The system uses strict prompting to reduce hallucinations and keep output machine-executable.

Frontend (React + React Flow)

- React Flow renders the graph.
- A chat panel calls the query endpoint and displays formatted answers.

## Data Flow

User → LLM → SQL → Database → Result → Answer

More detail:

1. The user submits a question in the chat UI.
2. The backend requests the LLM to output a SQLite SQL `SELECT`.
3. Guardrails validate the SQL (read-only, safety keywords blocked).
4. The SQL is executed against SQLite.
5. Results are formatted into a readable, line-broken answer for the chat UI.

## LLM Prompting Strategy

The system uses a two-step prompting approach:

### Natural language → SQL conversion

- The prompt instructs the model to return ONLY valid SQLite SQL.
- It forbids markdown fences and explanations (the output must be directly executable).
- It also specifies output formatting expectations (e.g., single quotes for string values).

### Output cleaning

- The backend cleans the LLM response to remove fences/prefixes and normalize quoting.
- It enforces `SELECT`/`WITH`-only queries at runtime.
- For journal entries, the backend ensures key columns are included to keep answers grounded.

## Guardrails

The backend implements several layers of safety:

1. Reject unrelated queries
   - The backend checks that the question includes dataset-relevant keywords.
   - Certain disallowed intents (e.g., generic “write a poem”) are blocked.

2. SQL validation (only `SELECT`)
   - The backend rejects any SQL that does not start with `select` (or `with`).

3. Unsafe SQL detection
   - It blocks dangerous SQL keywords (e.g., `insert`, `update`, `delete`, `drop`, `attach`, `pragma`, etc.).
   - It enforces a basic single-statement rule by disallowing multiple semicolons.

4. Hallucination checks
   - When the system uses the LLM for answer generation, it performs heuristic checks:
     - contradiction phrases (e.g., “not found”) are rejected when rows exist,
     - entry/journal tokens are verified against the returned rows,
     - if the answer claims counts, they must match actual row counts,
     - for journal answers, required labeled blocks must be present.

5. Fallback to deterministic formatter
   - If the LLM answer fails the checks (or errors), the backend falls back to a deterministic formatter based on the actual SQL rows.

## Tradeoffs

1. SQLite instead of a graph database (e.g., Neo4j)
   - For a demo, SQLite is simpler to run and fast to query.
   - The “graph” view is produced from relational data and relationships rather than using a dedicated graph store.

2. In-memory graph layer (not a persistent graph DB)
   - Keeps the system lightweight.
   - The graph is derived from SQLite tables and exposed via `/graph`.

3. Focus on correctness over UI complexity
   - The UI is intentionally minimal: it emphasizes clarity and correct integration with the backend.

## How to Run

### Backend

From the `backend/` directory:

1. `npm install`
2. `node server.js`

The backend listens on `http://localhost:4000`.

Environment variables (important):

- `LLM_API_KEY` (required if `USE_LLM_FOR_ANSWER=true` or for SQL generation)
- `LLM_PROVIDER` (defaults to `groq`)
- `LLM_MODEL` (defaults to `llama-3.1-70b-versatile`)
- `SQLITE_PATH` (path to the SQLite DB; if omitted, the backend uses its default configuration)
- `PORT` (defaults to `4000`)
- `CORS_ORIGIN` (defaults to `http://localhost:5173`)
- `USE_LLM_FOR_ANSWER` (optional; default `false` means deterministic formatting)

### Frontend

From the `frontend/` directory:

1. `npm install`
2. `npm run dev`

The frontend runs on `http://localhost:5173`.

Optional:

- `VITE_API_BASE` (default: `http://localhost:4000`)

## Example Queries

Try these in the chat UI:

- Find journal entry for billing document `91150187`
- Trace full flow of a billing document
- Find incomplete flows

## Screenshots

Add screenshots to:

- `docs/` (e.g., `docs/screenshot-graph.png`, `docs/screenshot-chat.png`)

