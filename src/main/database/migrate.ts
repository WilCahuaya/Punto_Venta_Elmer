import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import type Database from 'better-sqlite3'
import { getMigrationsDir } from '../utils/paths'

interface ColumnInfo {
  name: string
}

function tableExists(database: Database.Database, table: string): boolean {
  const row = database
    .prepare(`SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(table) as { ok: number } | undefined
  return Boolean(row)
}

function columnNames(database: Database.Database, table: string): Set<string> {
  if (!tableExists(database, table)) return new Set()
  const rows = database.prepare(`PRAGMA table_info(${table})`).all() as ColumnInfo[]
  return new Set(rows.map((row) => row.name))
}

function addColumnIfMissing(database: Database.Database, table: string, definition: string): void {
  const column = definition.trim().split(/\s+/)[0]
  if (!column || columnNames(database, table).has(column)) return
  database.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`)
}

function migrateCategoriesAndProductFields(database: Database.Database): void {
  database.exec('DROP TABLE IF EXISTS categories_new')
  database.exec(`
    CREATE TABLE categories_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER REFERENCES categories_new(id),
      name TEXT NOT NULL,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT
    )
  `)

  const cols = columnNames(database, 'categories')
  const parentExpr = cols.has('parent_id') ? 'parent_id' : 'NULL'
  const createdExpr = cols.has('created_at') ? 'created_at' : `datetime('now')`
  const updatedExpr = cols.has('updated_at') ? 'updated_at' : 'NULL'

  database.exec(`
    INSERT INTO categories_new (id, parent_id, name, description, is_active, sort_order, created_at, updated_at)
    SELECT id, ${parentExpr}, name, description, is_active, sort_order, ${createdExpr}, ${updatedExpr}
    FROM categories
  `)

  database.exec('DROP TABLE categories')
  database.exec('ALTER TABLE categories_new RENAME TO categories')
  database.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_parent_name
     ON categories (COALESCE(parent_id, 0), name)`
  )
  database.exec('CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)')

  addColumnIfMissing(database, 'products', 'product_code TEXT')
  addColumnIfMissing(database, 'products', 'brand TEXT')
  addColumnIfMissing(database, 'products', 'description TEXT')
  database.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_products_code ON products(product_code)')
}

function migrateReturnsAndVoidAudit(database: Database.Database): void {
  addColumnIfMissing(database, 'sales', 'voided_by INTEGER REFERENCES users(id)')
  addColumnIfMissing(database, 'sale_items', 'returned_quantity REAL NOT NULL DEFAULT 0')
  database.exec(`
    CREATE TABLE IF NOT EXISTS sale_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id),
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by INTEGER REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS sale_return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id INTEGER NOT NULL REFERENCES sale_returns(id) ON DELETE CASCADE,
      sale_item_id INTEGER NOT NULL REFERENCES sale_items(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity REAL NOT NULL,
      unit_price DECIMAL(12, 2) NOT NULL,
      line_total DECIMAL(12, 2) NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sale_returns_sale ON sale_returns(sale_id);
    CREATE INDEX IF NOT EXISTS idx_sale_return_items_return ON sale_return_items(return_id);
  `)
}

function migrateLabelPrintHistory(database: Database.Database, sql: string): void {
  const jobsCols = columnNames(database, 'label_print_jobs')
  const isLegacyJobs =
    tableExists(database, 'label_print_jobs') &&
    jobsCols.has('created_at') &&
    !jobsCols.has('printed_at')

  if (isLegacyJobs) {
    database.exec('ALTER TABLE label_print_jobs RENAME TO label_print_jobs_legacy')
  }

  database.exec(sql)

  if (isLegacyJobs) {
    database.exec(`
      INSERT INTO label_print_jobs (id, printed_at, mode, label_count, item_count)
      SELECT
        id,
        created_at,
        CASE WHEN mode = 'thermal' THEN 'roll' ELSE mode END,
        copies_total,
        0
      FROM label_print_jobs_legacy
    `)
    database.exec('DROP TABLE label_print_jobs_legacy')
  }
}

function migrateLabelItemSize(database: Database.Database): void {
  if (!tableExists(database, 'label_print_job_items')) return
  addColumnIfMissing(database, 'label_print_job_items', 'preset_id TEXT')
  addColumnIfMissing(database, 'label_print_job_items', 'width_mm REAL')
  addColumnIfMissing(database, 'label_print_job_items', 'height_mm REAL')
}

function migratePaymentMethod(database: Database.Database): void {
  addColumnIfMissing(database, 'sales', `payment_method TEXT NOT NULL DEFAULT 'cash'`)
  database.exec(`UPDATE sales SET payment_method = 'cash' WHERE payment_method IS NULL OR payment_method = ''`)
  database.exec('CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(payment_method)')
}

function migrateCreditSales(database: Database.Database): void {
  addColumnIfMissing(database, 'sales', 'is_credit INTEGER NOT NULL DEFAULT 0')
  addColumnIfMissing(database, 'sales', 'credit_to TEXT')
  database.exec(`
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
  `)
}

function migrateProductPackPrices(database: Database.Database): void {
  addColumnIfMissing(database, 'products', 'price_dozen DECIMAL(12, 2) NOT NULL DEFAULT 0')
  addColumnIfMissing(database, 'products', 'plancha_qty REAL NOT NULL DEFAULT 0')
  addColumnIfMissing(database, 'products', 'price_plancha DECIMAL(12, 2) NOT NULL DEFAULT 0')
  addColumnIfMissing(database, 'products', 'cajon_qty REAL NOT NULL DEFAULT 0')
  addColumnIfMissing(database, 'products', 'price_cajon DECIMAL(12, 2) NOT NULL DEFAULT 0')
  addColumnIfMissing(database, 'sale_items', 'stock_quantity REAL')
  if (tableExists(database, 'sale_items')) {
    database.exec(`UPDATE sale_items SET stock_quantity = quantity WHERE stock_quantity IS NULL`)
  }
}

export function runMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  const applied = new Set(
    database
      .prepare('SELECT version FROM schema_migrations')
      .all()
      .map((row) => (row as { version: string }).version)
  )

  const dir = getMigrationsDir()
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const version = file.replace('.sql', '')
    if (applied.has(version)) continue
    const sql = readFileSync(join(dir, file), 'utf-8')

    const fkWasOn = database.pragma('foreign_keys', { simple: true }) === 1
    if (fkWasOn) database.pragma('foreign_keys = OFF')

    try {
      database.exec('BEGIN')
      if (version === '002_product_fields_subcategories') {
        migrateCategoriesAndProductFields(database)
      } else if (version === '003_returns_and_void_audit') {
        migrateReturnsAndVoidAudit(database)
      } else if (version === '004_label_print_history') {
        migrateLabelPrintHistory(database, sql)
      } else if (version === '005_label_item_size') {
        migrateLabelItemSize(database)
      } else if (version === '006_product_pack_prices') {
        migrateProductPackPrices(database)
      } else if (version === '007_payment_method') {
        migratePaymentMethod(database)
      } else if (version === '008_credit_sales') {
        migrateCreditSales(database)
      } else {
        database.exec(sql)
      }
      database.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(version)
      database.exec('COMMIT')
    } catch (error) {
      try {
        database.exec('ROLLBACK')
      } catch {
        /* ignore */
      }
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Migración ${version} falló: ${message}`)
    } finally {
      if (fkWasOn) database.pragma('foreign_keys = ON')
    }
  }
}
