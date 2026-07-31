import type Database from 'better-sqlite3'

export function barcodeExists(db: Database.Database, barcode: string): boolean {
  const row = db.prepare('SELECT id FROM products WHERE barcode = ?').get(barcode) as
    | { id: number }
    | undefined
  return !!row
}
