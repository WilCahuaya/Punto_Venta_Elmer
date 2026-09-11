-- Historial de impresiones de etiquetas (lotes + ítems)

CREATE TABLE IF NOT EXISTS label_print_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  printed_at TEXT NOT NULL DEFAULT (datetime('now')),
  mode TEXT NOT NULL CHECK (mode IN ('roll', 'a4')),
  label_count INTEGER NOT NULL,
  item_count INTEGER NOT NULL,
  sheets INTEGER,
  a4_preset_id TEXT,
  a4_width_mm REAL,
  a4_height_mm REAL,
  a4_printer_name TEXT
);

CREATE TABLE IF NOT EXISTS label_print_job_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL REFERENCES label_print_jobs(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  barcode TEXT NOT NULL,
  price DECIMAL(12, 2),
  copies INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_label_print_jobs_printed ON label_print_jobs(printed_at DESC);
CREATE INDEX IF NOT EXISTS idx_label_print_job_items_job ON label_print_job_items(job_id);
