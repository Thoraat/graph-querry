INSERT INTO customers (customer_code, name, email) VALUES
  ('CUST-1001', 'Acme Retail', 'ap@acmeretail.example'),
  ('CUST-1002', 'Northwind Traders', 'billing@northwind.example'),
  ('CUST-1003', 'Globex Manufacturing', 'finance@globex.example');

INSERT INTO products (sku, name, category) VALUES
  ('SKU-CHAIR-01', 'Ergo Chair', 'Office'),
  ('SKU-DESK-02', 'Standing Desk', 'Office'),
  ('SKU-MON-27', '27in Monitor', 'Electronics'),
  ('SKU-KBD-MECH', 'Mechanical Keyboard', 'Electronics');

INSERT INTO orders (order_no, customer_id, status, ordered_at) VALUES
  ('SO-50001', 1, 'fulfilled', '2026-03-01T10:00:00Z'),
  ('SO-50002', 2, 'open',      '2026-03-05T14:15:00Z'),
  ('SO-50003', 1, 'fulfilled', '2026-03-12T09:30:00Z'),
  ('SO-50004', 3, 'fulfilled', '2026-03-18T16:45:00Z');

INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents) VALUES
  (1, 1, 10, 19900),
  (1, 4, 10, 12900),
  (2, 2,  5, 39900),
  (2, 3,  5, 24900),
  (3, 3, 20, 23900),
  (3, 4, 20, 11900),
  (4, 1,  2, 20500),
  (4, 2,  2, 41000),
  (4, 3,  2, 25500);

INSERT INTO deliveries (delivery_no, order_id, status, shipped_at, delivered_at) VALUES
  ('DN-70001', 1, 'delivered', '2026-03-02T09:00:00Z', '2026-03-03T13:10:00Z'),
  ('DN-70002', 3, 'delivered', '2026-03-13T12:00:00Z', '2026-03-14T10:00:00Z'),
  ('DN-70003', 4, 'shipped',   '2026-03-19T08:30:00Z', NULL);

INSERT INTO invoices (invoice_no, delivery_id, billing_document_no, status, issued_at, total_cents) VALUES
  ('INV-90001', 1, '91150187', 'paid',  '2026-03-03T15:00:00Z', 328000),
  ('INV-90002', 2, '91150211', 'paid',  '2026-03-14T12:00:00Z', 716000),
  ('INV-90003', 3, '91150333', 'issued','2026-03-20T11:00:00Z', 174000);

INSERT INTO payments (payment_no, invoice_id, status, paid_at, amount_cents, method) VALUES
  ('PAY-30001', 1, 'settled', '2026-03-04T09:05:00Z', 328000, 'bank_transfer'),
  ('PAY-30002', 2, 'settled', '2026-03-15T10:20:00Z', 716000, 'card'),
  ('PAY-30003', 3, 'pending', NULL,                  174000, 'bank_transfer');

INSERT INTO journal_entries (entry_no, billing_document_no, accounting_document, reference_document, posted_at, account, debit_cents, credit_cents, memo) VALUES
  ('JE-10001', '91150187', '91150187', '91150187', '2026-03-03T16:00:00Z', 'Accounts Receivable', 328000, 0, 'Invoice issued'),
  ('JE-10002', '91150187', '91150187', '91150187', '2026-03-04T09:05:00Z', 'Cash',               328000, 0, 'Payment received'),
  ('JE-10003', '91150187', '91150187', '91150187', '2026-03-04T09:05:00Z', 'Accounts Receivable',0, 328000, 'AR cleared'),
  ('JE-10004', '91150211', '91150211', '91150211', '2026-03-14T12:00:00Z', 'Accounts Receivable',716000, 0, 'Invoice issued'),
  ('JE-10005', '91150211', '91150211', '91150211', '2026-03-15T10:20:00Z', 'Cash',               716000, 0, 'Payment received'),
  ('JE-10006', '91150211', '91150211', '91150211', '2026-03-15T10:20:00Z', 'Accounts Receivable',0, 716000, 'AR cleared'),
  ('JE-10007', '91150333', '91150333', '91150333', '2026-03-20T11:00:00Z', 'Accounts Receivable',174000, 0, 'Invoice issued (unpaid)');

