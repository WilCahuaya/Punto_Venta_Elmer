-- Categorías con subcategorías (parent_id)
PRAGMA foreign_keys = OFF;

CREATE TABLE categories_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

INSERT INTO categories_new (id, parent_id, name, description, is_active, sort_order, created_at, updated_at)
SELECT id, NULL, name, description, is_active, sort_order, created_at, updated_at FROM categories;

DROP TABLE categories;
ALTER TABLE categories_new RENAME TO categories;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_parent_name
  ON categories (COALESCE(parent_id, 0), name);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

-- Campos adicionales en productos
ALTER TABLE products ADD COLUMN product_code TEXT;
ALTER TABLE products ADD COLUMN brand TEXT;
ALTER TABLE products ADD COLUMN description TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_code ON products(product_code);

PRAGMA foreign_keys = ON;
