import { roundMoney } from '@shared/lib/currency';
import { getDatabase } from '../../database/connection';
import { fromMoneyDb, toMoneyDb } from '../../utils/money-db';
import { getCurrentUserId } from '../auth/auth.service';
import { sumCreditPaymentsInSession } from '../sales/sales-credit.repository';
import { closeSession, getOpenSession, getSessionById, insertMovement, insertSession, listMovements, listSessionHistory, sumMovements, sumReturnsInSession, sumSales, sumSalesGross, sumSalesProfit } from './cash.repository';
function mapSession(row) {
    return {
        id: row.id,
        openedAt: row.opened_at,
        closedAt: row.closed_at,
        openingAmount: fromMoneyDb(row.opening_amount),
        closingAmount: row.closing_amount != null ? fromMoneyDb(row.closing_amount) : null,
        expectedAmount: row.expected_amount != null ? fromMoneyDb(row.expected_amount) : null,
        difference: row.difference != null ? fromMoneyDb(row.difference) : null,
        status: row.status,
        openedByName: row.opened_by_name,
        closedByName: row.closed_by_name,
        notes: row.notes
    };
}
function mapMovement(row) {
    return {
        id: row.id,
        sessionId: row.session_id,
        type: row.type,
        amount: fromMoneyDb(row.amount),
        concept: row.concept,
        reference: row.reference,
        createdAt: row.created_at,
        createdByName: row.created_by_name
    };
}
function buildSummary(row) {
    const db = getDatabase();
    const opening = fromMoneyDb(row.opening_amount);
    const totalIncome = sumMovements(db, row.id, 'income');
    const totalExpense = sumMovements(db, row.id, 'expense');
    const totalSalesGross = sumSalesGross(db, row.id, 'cash');
    const totalYapeGross = sumSalesGross(db, row.id, 'yape');
    const totalReturns = sumReturnsInSession(db, row.id, 'cash');
    const totalYapeReturns = sumReturnsInSession(db, row.id, 'yape');
    const totalSalesNet = sumSales(db, row.id, 'cash');
    const totalYape = sumSales(db, row.id, 'yape');
    const creditCashCollected = sumCreditPaymentsInSession(db, row.id, 'cash');
    const creditYapeCollected = sumCreditPaymentsInSession(db, row.id, 'yape');
    const salesProfit = sumSalesProfit(db, row.id);
    const expectedInDrawer = roundMoney(opening + totalIncome - totalExpense + totalSalesNet + creditCashCollected);
    return {
        ...mapSession(row),
        totalIncome: roundMoney(totalIncome),
        totalExpense: roundMoney(totalExpense),
        totalSalesGross: roundMoney(totalSalesGross),
        totalYapeGross: roundMoney(totalYapeGross),
        totalReturns: roundMoney(totalReturns),
        totalYapeReturns: roundMoney(totalYapeReturns),
        totalSales: roundMoney(totalSalesNet),
        totalYape: roundMoney(totalYape),
        creditCashCollected: roundMoney(creditCashCollected),
        creditYapeCollected: roundMoney(creditYapeCollected),
        salesProfit: roundMoney(salesProfit),
        expectedInDrawer
    };
}
function requireUser() {
    const userId = getCurrentUserId();
    if (!userId)
        return { ok: false, error: 'Sesión de usuario no válida' };
    return { ok: true, data: userId };
}
export function getCurrentCashService() {
    const db = getDatabase();
    const open = getOpenSession(db);
    if (!open)
        return { ok: true, data: null };
    return { ok: true, data: buildSummary(open) };
}
export function getCashSessionService(id) {
    const db = getDatabase();
    const row = getSessionById(db, id);
    if (!row)
        return { ok: false, error: 'Sesión de caja no encontrada' };
    return { ok: true, data: buildSummary(row) };
}
export function openCashService(input) {
    const userResult = requireUser();
    if (!userResult.ok)
        return userResult;
    if (input.openingAmount < 0) {
        return { ok: false, error: 'El monto de apertura no puede ser negativo' };
    }
    const db = getDatabase();
    if (getOpenSession(db)) {
        return { ok: false, error: 'Ya hay una caja abierta' };
    }
    const id = insertSession(db, {
        openingAmount: toMoneyDb(input.openingAmount),
        openedBy: userResult.data
    });
    const row = getSessionById(db, id);
    return { ok: true, data: buildSummary(row) };
}
export function closeCashService(input) {
    const userResult = requireUser();
    if (!userResult.ok)
        return userResult;
    if (input.closingAmount < 0) {
        return { ok: false, error: 'El monto de cierre no puede ser negativo' };
    }
    const db = getDatabase();
    const open = getOpenSession(db);
    if (!open)
        return { ok: false, error: 'No hay caja abierta' };
    const summary = buildSummary(open);
    const expected = summary.expectedInDrawer;
    const closing = roundMoney(input.closingAmount);
    const difference = roundMoney(closing - expected);
    closeSession(db, open.id, {
        closingAmount: toMoneyDb(closing),
        expectedAmount: toMoneyDb(expected),
        difference: toMoneyDb(difference),
        notes: input.notes?.trim() || null,
        closedBy: userResult.data
    });
    const closed = getSessionById(db, open.id);
    return { ok: true, data: buildSummary(closed) };
}
export function addCashMovementService(input) {
    const userResult = requireUser();
    if (!userResult.ok)
        return userResult;
    if (!input.concept?.trim())
        return { ok: false, error: 'El concepto es obligatorio' };
    if (input.amount <= 0)
        return { ok: false, error: 'El monto debe ser mayor a cero' };
    const db = getDatabase();
    const open = getOpenSession(db);
    if (!open)
        return { ok: false, error: 'Debe abrir la caja antes de registrar movimientos' };
    const id = insertMovement(db, {
        sessionId: open.id,
        type: input.type,
        amount: toMoneyDb(input.amount),
        concept: input.concept.trim(),
        reference: input.reference?.trim() || null,
        createdBy: userResult.data
    });
    const rows = listMovements(db, open.id);
    const movement = rows.find((r) => r.id === id) ?? rows[0];
    return { ok: true, data: mapMovement(movement) };
}
export function listCashMovementsService(sessionId) {
    const db = getDatabase();
    let targetId = sessionId;
    if (!targetId) {
        const open = getOpenSession(db);
        if (!open)
            return { ok: true, data: [] };
        targetId = open.id;
    }
    return { ok: true, data: listMovements(db, targetId).map(mapMovement) };
}
export function listCashHistoryService(filters = {}) {
    const db = getDatabase();
    const rows = listSessionHistory(db, filters);
    return { ok: true, data: rows.map(buildSummary) };
}
