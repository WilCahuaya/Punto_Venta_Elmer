import type Database from 'better-sqlite3'

export function generateCandidateBarcode(db: Database.Database): string {
  for (let i = 0; i < 50; i++) {
    const ts = Date.now().toString().slice(-9)
    const rand = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')
    const candidate = `77${ts}${rand}`
    const exists = db.prepare('SELECT id FROM products WHERE barcode = ?').get(candidate)
    if (!exists) return candidate
  }
  return `77${Date.now()}`
}

export function generateProductCode(db: Database.Database): string {
  const row = db.prepare('SELECT COUNT(*) AS c FROM products').get() as { c: number }
  const seq = String(row.c + 1).padStart(5, '0')
  let code = `PROD-${seq}`
  let attempts = 0
  while (attempts < 100) {
    const exists = db.prepare('SELECT id FROM products WHERE product_code = ?').get(code)
    if (!exists) return code
    code = `PROD-${String(row.c + 2 + attempts).padStart(5, '0')}`
    attempts++
  }
  return `PROD-${Date.now().toString().slice(-8)}`
}
