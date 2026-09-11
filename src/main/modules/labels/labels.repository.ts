import type Database from 'better-sqlite3'
import type { LabelPrintItem, LabelPrintMode } from '@shared/types/labels'
import { fromMoneyDb, toMoneyDb } from '../../utils/money-db'

export function barcodeExists(db: Database.Database, barcode: string): boolean {
  const row = db.prepare('SELECT id FROM products WHERE barcode = ?').get(barcode) as
    | { id: number }
    | undefined
  return !!row
}

export interface LabelJobInsert {
  mode: LabelPrintMode
  labelCount: number
  itemCount: number
  sheets?: number | null
  a4PresetId?: string | null
  a4WidthMm?: number | null
  a4HeightMm?: number | null
  a4PrinterName?: string | null
  items: LabelPrintItem[]
}

export function insertLabelPrintJob(db: Database.Database, job: LabelJobInsert): number {
  const insertJob = db.prepare(
    `INSERT INTO label_print_jobs (
      mode, label_count, item_count, sheets,
      a4_preset_id, a4_width_mm, a4_height_mm, a4_printer_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
  const insertItem = db.prepare(
    `INSERT INTO label_print_job_items (job_id, sort_order, name, barcode, price, copies)
     VALUES (?, ?, ?, ?, ?, ?)`
  )

  const run = db.transaction(() => {
    const result = insertJob.run(
      job.mode,
      job.labelCount,
      job.itemCount,
      job.sheets ?? null,
      job.a4PresetId ?? null,
      job.a4WidthMm ?? null,
      job.a4HeightMm ?? null,
      job.a4PrinterName ?? null
    )
    const jobId = Number(result.lastInsertRowid)
    job.items.forEach((item, index) => {
      insertItem.run(
        jobId,
        index,
        item.name,
        item.barcode,
        item.price != null && item.price > 0 ? toMoneyDb(item.price) : null,
        Math.max(1, Math.floor(item.copies))
      )
    })
    return jobId
  })

  return run()
}

interface JobRow {
  id: number
  printed_at: string
  mode: LabelPrintMode
  label_count: number
  item_count: number
  sheets: number | null
  a4_preset_id: string | null
  a4_width_mm: number | null
  a4_height_mm: number | null
  a4_printer_name: string | null
}

interface ItemRow {
  id: number
  name: string
  barcode: string
  price: string | number | null
  copies: number
}

export function listLabelPrintJobs(db: Database.Database, limit = 200): JobRow[] {
  return db
    .prepare(
      `SELECT * FROM label_print_jobs
       ORDER BY printed_at DESC, id DESC
       LIMIT ?`
    )
    .all(limit) as JobRow[]
}

export function listPreviewNamesForJobs(
  db: Database.Database,
  jobIds: number[]
): Map<number, string[]> {
  const map = new Map<number, string[]>()
  if (jobIds.length === 0) return map
  const placeholders = jobIds.map(() => '?').join(',')
  const rows = db
    .prepare(
      `SELECT job_id, name, sort_order
       FROM label_print_job_items
       WHERE job_id IN (${placeholders})
       ORDER BY job_id, sort_order, id`
    )
    .all(...jobIds) as Array<{ job_id: number; name: string; sort_order: number }>

  for (const row of rows) {
    const list = map.get(row.job_id) ?? []
    if (list.length < 3) list.push(row.name)
    map.set(row.job_id, list)
  }
  return map
}

export function getLabelPrintJob(
  db: Database.Database,
  id: number
): { job: JobRow; items: ItemRow[] } | null {
  const job = db.prepare('SELECT * FROM label_print_jobs WHERE id = ?').get(id) as
    | JobRow
    | undefined
  if (!job) return null
  const items = db
    .prepare(
      `SELECT id, name, barcode, price, copies
       FROM label_print_job_items
       WHERE job_id = ?
       ORDER BY sort_order, id`
    )
    .all(id) as ItemRow[]
  return { job, items }
}

export function deleteLabelPrintJob(db: Database.Database, id: number): boolean {
  const result = db.prepare('DELETE FROM label_print_jobs WHERE id = ?').run(id)
  return result.changes > 0
}

export function clearLabelPrintHistory(db: Database.Database): number {
  const result = db.prepare('DELETE FROM label_print_jobs').run()
  return result.changes
}

export function mapJobItemPrice(price: string | number | null): number | null {
  if (price == null || price === '') return null
  const n = fromMoneyDb(price)
  return n > 0 ? n : null
}
