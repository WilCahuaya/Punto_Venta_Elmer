import type Database from 'better-sqlite3'

export function barcodeExists(db: Database.Database, barcode: string): boolean {
  const row = db.prepare('SELECT id FROM products WHERE barcode = ?').get(barcode) as
    | { id: number }
    | undefined
  return !!row
}

export function generateCandidateBarcode(): string {
  const ts = Date.now().toString().slice(-9)
  const rand = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')
  return `77${ts}${rand}`
}
