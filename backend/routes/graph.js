import express from "express";
import { all } from "../db.js";

export const graphRouter = express.Router();

function node(id, label, type, data = {}) {
  return { id: String(id), type, label, data };
}

function edge(id, source, target, label, type = "rel") {
  return { id: String(id), source: String(source), target: String(target), label, type };
}

graphRouter.get("/", async (req, res) => {
  const db = req.app.locals.db;

  const [customers, products, orders, deliveries, invoices, payments, journalEntries, orderItems] =
    await Promise.all([
      all(db, "SELECT * FROM customers"),
      all(db, "SELECT * FROM products"),
      all(db, "SELECT * FROM orders"),
      all(db, "SELECT * FROM deliveries"),
      all(db, "SELECT * FROM invoices"),
      all(db, "SELECT * FROM payments"),
      all(db, "SELECT * FROM journal_entries"),
      all(db, "SELECT * FROM order_items")
    ]);

  const nodes = [];
  const edges = [];

  for (const c of customers) {
    nodes.push(node(`customer:${c.id}`, c.name, "customer", c));
  }
  for (const p of products) {
    nodes.push(node(`product:${p.id}`, p.name, "product", p));
  }
  for (const o of orders) {
    nodes.push(node(`order:${o.id}`, o.order_no, "order", o));
    edges.push(edge(`e:order_customer:${o.id}`, `order:${o.id}`, `customer:${o.customer_id}`, "ORDERED_BY"));
  }
  for (const oi of orderItems) {
    edges.push(
      edge(
        `e:order_product:${oi.order_id}:${oi.product_id}`,
        `order:${oi.order_id}`,
        `product:${oi.product_id}`,
        `CONTAINS`
      )
    );
  }
  for (const d of deliveries) {
    nodes.push(node(`delivery:${d.id}`, d.delivery_no, "delivery", d));
    edges.push(edge(`e:order_delivery:${d.id}`, `order:${d.order_id}`, `delivery:${d.id}`, "FULFILLED_BY"));
  }
  for (const inv of invoices) {
    nodes.push(node(`invoice:${inv.id}`, inv.invoice_no, "invoice", inv));
    edges.push(
      edge(
        `e:delivery_invoice:${inv.id}`,
        `delivery:${inv.delivery_id}`,
        `invoice:${inv.id}`,
        "BILLED_AS"
      )
    );
  }
  for (const pay of payments) {
    nodes.push(node(`payment:${pay.id}`, pay.payment_no, "payment", pay));
    edges.push(edge(`e:invoice_payment:${pay.id}`, `invoice:${pay.invoice_id}`, `payment:${pay.id}`, "PAID_BY"));
  }
  for (const je of journalEntries) {
    nodes.push(node(`journal:${je.id}`, je.entry_no, "journal_entry", je));
    if (je.billing_document_no) {
      // Link journal entry to invoice by billing_document_no (best-effort)
      const invoice = invoices.find((i) => i.billing_document_no === je.billing_document_no);
      if (invoice) {
        edges.push(
          edge(
            `e:invoice_journal:${invoice.id}:${je.id}`,
            `invoice:${invoice.id}`,
            `journal:${je.id}`,
            "POSTED_TO"
          )
        );
      }
    }
  }

  res.json({ nodes, edges });
});

