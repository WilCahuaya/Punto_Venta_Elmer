import { dialog, shell } from 'electron';
import { roundMoney } from '@shared/lib/currency';
import { normalizePaymentMethod } from '@shared/lib/payment';
import { localDateIso } from '@shared/lib/local-date';
import { getDatabase } from '../../database/connection';
import { fromMoneyDb } from '../../utils/money-db';
import { writeReportExcel } from '../../services/export-excel.service';
import { writeReportPdf } from '../../services/export-pdf.service';
import { getReportSummary, getTopProductsInRange, listAllSalesInRange, listSalesInRange, sumCreditPaymentsInRange } from './reports.repository';
function getSetting(key, fallback = '') {
    const db = getDatabase();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row?.value ?? fallback;
}
function mapSaleRow(row) {
    const total = fromMoneyDb(row.total);
    const returnedTotal = fromMoneyDb(row.returned_total);
    return {
        id: row.id,
        ticketNumber: row.ticket_number,
        createdAt: row.created_at,
        subtotal: fromMoneyDb(row.subtotal),
        discount: fromMoneyDb(row.discount),
        total,
        returnedTotal,
        netTotal: roundMoney(row.status === 'voided' ? 0 : Math.max(0, total - returnedTotal)),
        paymentMethod: normalizePaymentMethod(row.payment_method),
        isCredit: Number(row.is_credit) === 1,
        creditTo: row.credit_to,
        status: row.status,
        voidReason: row.void_reason,
        voidedAt: row.voided_at,
        voidedByName: row.voided_by_name,
        itemCount: row.item_count
    };
}
function mapTop(row) {
    return {
        productId: row.product_id,
        productName: row.product_name,
        quantitySold: Number(row.qty),
        revenue: fromMoneyDb(row.revenue)
    };
}
function normalizeRange(range) {
    const from = range.dateFrom?.trim() || localDateIso();
    const to = range.dateTo?.trim() || from;
    if (from > to)
        return { dateFrom: to, dateTo: from };
    return { dateFrom: from, dateTo: to };
}
export function getReportSummaryService(range) {
    const db = getDatabase();
    const r = normalizeRange(range);
    const summary = getReportSummary(db, r);
    const completedTotal = fromMoneyDb(summary.completed_total);
    const returnsTotal = fromMoneyDb(summary.returns_total);
    const cashNetTotal = roundMoney(Math.max(0, fromMoneyDb(summary.cash_total) - fromMoneyDb(summary.cash_returns)) +
        sumCreditPaymentsInRange(db, r, 'cash'));
    const yapeNetTotal = roundMoney(Math.max(0, fromMoneyDb(summary.yape_total) - fromMoneyDb(summary.yape_returns)) +
        sumCreditPaymentsInRange(db, r, 'yape'));
    return {
        ok: true,
        data: {
            dateFrom: r.dateFrom,
            dateTo: r.dateTo,
            completedCount: summary.completed_count,
            completedTotal,
            returnsTotal,
            netCompletedTotal: roundMoney(Math.max(0, completedTotal - returnsTotal)),
            cashNetTotal,
            yapeNetTotal,
            profit: roundMoney(Number(summary.profit)),
            voidedCount: summary.voided_count,
            voidedTotal: fromMoneyDb(summary.voided_total),
            topProducts: getTopProductsInRange(db, r).map(mapTop),
            allSales: listAllSalesInRange(db, r).map(mapSaleRow),
            sales: listSalesInRange(db, r, 'completed').map(mapSaleRow),
            voidedSales: listSalesInRange(db, r, 'voided').map(mapSaleRow)
        }
    };
}
async function pickSavePath(defaultName, ext) {
    const result = await dialog.showSaveDialog({
        defaultPath: defaultName,
        filters: [
            ext === 'pdf'
                ? { name: 'PDF', extensions: ['pdf'] }
                : { name: 'Excel', extensions: ['xlsx'] }
        ]
    });
    if (result.canceled || !result.filePath)
        return null;
    const path = result.filePath;
    const suffix = `.${ext}`;
    return path.toLowerCase().endsWith(suffix) ? path : `${path}${suffix}`;
}
export async function exportReportPdfService(range) {
    const reportResult = getReportSummaryService(range);
    if (!reportResult.ok)
        return reportResult;
    const filePath = await pickSavePath(`reporte-${reportResult.data.dateFrom}-${reportResult.data.dateTo}.pdf`, 'pdf');
    if (!filePath)
        return { ok: false, error: 'Exportación cancelada' };
    try {
        await writeReportPdf(filePath, reportResult.data, getSetting('company_name', 'Punto de Venta'), getSetting('currency_symbol', 'S/'));
        await shell.openPath(filePath);
        return { ok: true, data: filePath };
    }
    catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Error al exportar PDF' };
    }
}
export async function exportReportExcelService(range) {
    const reportResult = getReportSummaryService(range);
    if (!reportResult.ok)
        return reportResult;
    const filePath = await pickSavePath(`reporte-${reportResult.data.dateFrom}-${reportResult.data.dateTo}.xlsx`, 'xlsx');
    if (!filePath)
        return { ok: false, error: 'Exportación cancelada' };
    try {
        await writeReportExcel(filePath, reportResult.data, getSetting('company_name', 'Punto de Venta'), getSetting('currency_symbol', 'S/'));
        await shell.openPath(filePath);
        return { ok: true, data: filePath };
    }
    catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Error al exportar Excel' };
    }
}
