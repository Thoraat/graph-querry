PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS journal_entries;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS deliveries;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS customers;

CREATE TABLE customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT UNIQUE NOT NULL,
  customer_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open','fulfilled','cancelled')),
  ordered_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  delivery_no TEXT UNIQUE NOT NULL,
  order_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','shipped','delivered')),
  shipped_at TEXT,
  delivered_at TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_no TEXT UNIQUE NOT NULL,
  delivery_id INTEGER NOT NULL,
  billing_document_no TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('draft','issued','paid','void')),
  issued_at TEXT,
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  FOREIGN KEY (delivery_id) REFERENCES deliveries(id)
);

CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_no TEXT UNIQUE NOT NULL,
  invoice_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','settled','failed')),
  paid_at TEXT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  method TEXT NOT NULL,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

CREATE TABLE journal_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_no TEXT UNIQUE NOT NULL,
  billing_document_no TEXT NOT NULL,
  -- Some business users refer to these as accounting/reference document numbers.
  accounting_document TEXT NOT NULL,
  reference_document TEXT NOT NULL,
  posted_at TEXT NOT NULL,
  account TEXT NOT NULL,
  debit_cents INTEGER NOT NULL DEFAULT 0,
  credit_cents INTEGER NOT NULL DEFAULT 0,
  memo TEXT
);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_deliveries_order_id ON deliveries(order_id);
CREATE INDEX idx_invoices_delivery_id ON invoices(delivery_id);
CREATE INDEX idx_invoices_billing_document_no ON invoices(billing_document_no);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_journal_entries_billing_document_no ON journal_entries(billing_document_no);
CREATE INDEX idx_journal_entries_reference_document ON journal_entries(reference_document);

