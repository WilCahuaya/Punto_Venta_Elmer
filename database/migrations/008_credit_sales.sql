-- Ventas fiadas: texto libre (a quién), abonos parciales y cobro en la caja vigente.

ALTER TABLE sales ADD COLUMN is_credit INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN credit_to TEXT;

CREATE TABLE IF NOT EXISTS sale_credit_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL REFERENCES sales(id),
  session_id INTEGER NOT NULL REFERENCES cash_sessions(id),
  amount DECIMAL(12, 2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'yape')),
  kind TEXT NOT NULL DEFAULT 'payment' CHECK (kind IN ('payment', 'refund')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_sales_is_credit ON sales(is_credit);
CREATE INDEX IF NOT EXISTS idx_sale_credit_payments_sale ON sale_credit_payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_credit_payments_session ON sale_credit_payments(session_id);
