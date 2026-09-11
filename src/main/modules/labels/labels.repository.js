import { fromMoneyDb, toMoneyDb } from '../../utils/money-db';
export function barcodeExists(db, barcode) {
    const row = db.prepare('SELECT id FROM products WHERE barcode = ?').get(barcode);
    return !!row;
}
export function insertLabelPrintJob(db, job) {
    const insertJob = db.prepare(`INSERT INTO label_print_jobs (
      mode, label_count, item_count, sheets,
      a4_preset_id, a4_width_mm, a4_height_mm, a4_printer_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    const insertItem = db.prepare(`INSERT INTO label_print_job_items (
      job_id, sort_order, name, barcode, price, copies,
      preset_id, width_mm, height_mm
    )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const run = db.transaction(() => {
        const result = insertJob.run(job.mode, job.labelCount, job.itemCount, job.sheets ?? null, job.a4PresetId ?? null, job.a4WidthMm ?? null, job.a4HeightMm ?? null, job.a4PrinterName ?? null);
        const jobId = Number(result.lastInsertRowid);
        job.items.forEach((item, index) => {
            insertItem.run(jobId, index, item.name, item.barcode, item.price != null && item.price > 0 ? toMoneyDb(item.price) : null, Math.max(1, Math.floor(item.copies)), item.presetId ?? null, item.widthMm ?? null, item.heightMm ?? null);
        });
        return jobId;
    });
    return run();
}
export function listLabelPrintJobs(db, limit = 200) {
    return db
        .prepare(`SELECT * FROM label_print_jobs
       ORDER BY printed_at DESC, id DESC
       LIMIT ?`)
        .all(limit);
}
export function listPreviewNamesForJobs(db, jobIds) {
    const map = new Map();
    if (jobIds.length === 0)
        return map;
    const placeholders = jobIds.map(() => '?').join(',');
    const rows = db
        .prepare(`SELECT job_id, name, sort_order
       FROM label_print_job_items
       WHERE job_id IN (${placeholders})
       ORDER BY job_id, sort_order, id`)
        .all(...jobIds);
    for (const row of rows) {
        const list = map.get(row.job_id) ?? [];
        if (list.length < 3)
            list.push(row.name);
        map.set(row.job_id, list);
    }
    return map;
}
export function listItemSizeSummaryForJobs(db, jobIds) {
    const map = new Map();
    if (jobIds.length === 0)
        return map;
    const placeholders = jobIds.map(() => '?').join(',');
    const rows = db
        .prepare(`SELECT job_id, width_mm, height_mm
       FROM label_print_job_items
       WHERE job_id IN (${placeholders})`)
        .all(...jobIds);
    const keys = new Map();
    for (const row of rows) {
        const set = keys.get(row.job_id) ?? new Set();
        if (row.width_mm != null && row.height_mm != null) {
            set.add(`${Math.round(row.width_mm)}x${Math.round(row.height_mm)}`);
        }
        keys.set(row.job_id, set);
    }
    for (const [jobId, set] of keys) {
        map.set(jobId, { mixed: set.size > 1 });
    }
    return map;
}
export function getLabelPrintJob(db, id) {
    const job = db.prepare('SELECT * FROM label_print_jobs WHERE id = ?').get(id);
    if (!job)
        return null;
    const items = db
        .prepare(`SELECT id, name, barcode, price, copies, preset_id, width_mm, height_mm
       FROM label_print_job_items
       WHERE job_id = ?
       ORDER BY sort_order, id`)
        .all(id);
    return { job, items };
}
export function deleteLabelPrintJob(db, id) {
    const result = db.prepare('DELETE FROM label_print_jobs WHERE id = ?').run(id);
    return result.changes > 0;
}
export function clearLabelPrintHistory(db) {
    const result = db.prepare('DELETE FROM label_print_jobs').run();
    return result.changes;
}
export function mapJobItemPrice(price) {
    if (price == null || price === '')
        return null;
    const n = fromMoneyDb(price);
    return n > 0 ? n : null;
}
