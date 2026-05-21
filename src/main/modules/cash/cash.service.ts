import type { ApiResult } from '@shared/types/api'
import type {
  CashHistoryFilters,
  CashMovement,
  CashMovementInput,
  CashSession,
  CashSessionSummary,
  CloseCashInput,
  OpenCashInput
} from '@shared/types/cash'
import { roundMoney } from '@shared/lib/currency'
import { getDatabase } from '../../database/connection'
import { fromMoneyDb, toMoneyDb } from '../../utils/money-db'
import { getCurrentUserId } from '../auth/auth.service'
import {
  closeSession,
  getOpenSession,
  getSessionById,
  insertMovement,
  insertSession,
  listMovements,
  listSessionHistory,
  sumMovements,
  sumSales,
  sumSalesProfit,
  type CashMovementRow,
  type CashSessionRow
} from './cash.repository'

function mapSession(row: CashSessionRow): CashSession {
  return {
    id: row.id,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    openingAmount: fromMoneyDb(row.opening_amount),
    closingAmount: row.closing_amount != null ? fromMoneyDb(row.closing_amount) : null,
    expectedAmount: row.expected_amount != null ? fromMoneyDb(row.expected_amount) : null,
    difference: row.difference != null ? fromMoneyDb(row.difference) : null,
    status: row.status as CashSession['status'],
    openedByName: row.opened_by_name,
    closedByName: row.closed_by_name,
    notes: row.notes
  }
}

function mapMovement(row: CashMovementRow): CashMovement {
  return {
    id: row.id,
    sessionId: row.session_id,
    type: row.type as CashMovement['type'],
    amount: fromMoneyDb(row.amount),
    concept: row.concept,
    reference: row.reference,
    createdAt: row.created_at,
    createdByName: row.created_by_name
  }
}

function buildSummary(row: CashSessionRow): CashSessionSummary {
  const db = getDatabase()
  const opening = fromMoneyDb(row.opening_amount)
  const totalIncome = sumMovements(db, row.id, 'income')
  const totalExpense = sumMovements(db, row.id, 'expense')
  const totalSales = sumSales(db, row.id)
  const salesProfit = sumSalesProfit(db, row.id)
  const expectedInDrawer = roundMoney(opening + totalIncome - totalExpense + totalSales)

  return {
    ...mapSession(row),
    totalIncome: roundMoney(totalIncome),
    totalExpense: roundMoney(totalExpense),
    totalSales: roundMoney(totalSales),
    salesProfit: roundMoney(salesProfit),
    expectedInDrawer
  }
}

function requireUser(): ApiResult<number> {
  const userId = getCurrentUserId()
  if (!userId) return { ok: false, error: 'Sesión de usuario no válida' }
  return { ok: true, data: userId }
}

export function getCurrentCashService(): ApiResult<CashSessionSummary | null> {
  const db = getDatabase()
  const open = getOpenSession(db)
  if (!open) return { ok: true, data: null }
  return { ok: true, data: buildSummary(open) }
}

export function getCashSessionService(id: number): ApiResult<CashSessionSummary> {
  const db = getDatabase()
  const row = getSessionById(db, id)
  if (!row) return { ok: false, error: 'Sesión de caja no encontrada' }
  return { ok: true, data: buildSummary(row) }
}

export function openCashService(input: OpenCashInput): ApiResult<CashSessionSummary> {
  const userResult = requireUser()
  if (!userResult.ok) return userResult

  if (input.openingAmount < 0) {
    return { ok: false, error: 'El monto de apertura no puede ser negativo' }
  }

  const db = getDatabase()
  if (getOpenSession(db)) {
    return { ok: false, error: 'Ya hay una caja abierta' }
  }

  const id = insertSession(db, {
    openingAmount: toMoneyDb(input.openingAmount),
    openedBy: userResult.data
  })

  const row = getSessionById(db, id)!
  return { ok: true, data: buildSummary(row) }
}

export function closeCashService(input: CloseCashInput): ApiResult<CashSessionSummary> {
  const userResult = requireUser()
  if (!userResult.ok) return userResult

  if (input.closingAmount < 0) {
    return { ok: false, error: 'El monto de cierre no puede ser negativo' }
  }

  const db = getDatabase()
  const open = getOpenSession(db)
  if (!open) return { ok: false, error: 'No hay caja abierta' }

  const summary = buildSummary(open)
  const expected = summary.expectedInDrawer
  const closing = roundMoney(input.closingAmount)
  const difference = roundMoney(closing - expected)

  closeSession(db, open.id, {
    closingAmount: toMoneyDb(closing),
    expectedAmount: toMoneyDb(expected),
    difference: toMoneyDb(difference),
    notes: input.notes?.trim() || null,
    closedBy: userResult.data
  })

  const closed = getSessionById(db, open.id)!
  return { ok: true, data: buildSummary(closed) }
}

export function addCashMovementService(input: CashMovementInput): ApiResult<CashMovement> {
  const userResult = requireUser()
  if (!userResult.ok) return userResult

  if (!input.concept?.trim()) return { ok: false, error: 'El concepto es obligatorio' }
  if (input.amount <= 0) return { ok: false, error: 'El monto debe ser mayor a cero' }

  const db = getDatabase()
  const open = getOpenSession(db)
  if (!open) return { ok: false, error: 'Debe abrir la caja antes de registrar movimientos' }

  const id = insertMovement(db, {
    sessionId: open.id,
    type: input.type,
    amount: toMoneyDb(input.amount),
    concept: input.concept.trim(),
    reference: input.reference?.trim() || null,
    createdBy: userResult.data
  })

  const rows = listMovements(db, open.id)
  const movement = rows.find((r) => r.id === id) ?? rows[0]
  return { ok: true, data: mapMovement(movement) }
}

export function listCashMovementsService(sessionId?: number): ApiResult<CashMovement[]> {
  const db = getDatabase()
  let targetId = sessionId

  if (!targetId) {
    const open = getOpenSession(db)
    if (!open) return { ok: true, data: [] }
    targetId = open.id
  }

  return { ok: true, data: listMovements(db, targetId).map(mapMovement) }
}

export function listCashHistoryService(filters: CashHistoryFilters = {}): ApiResult<CashSessionSummary[]> {
  const db = getDatabase()
  const rows = listSessionHistory(db, filters)
  return { ok: true, data: rows.map(buildSummary) }
}
