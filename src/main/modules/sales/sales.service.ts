import type { ApiResult } from '@shared/types/api'
import type {
  CreateSaleInput,
  PartialReturnInput,
  PriceMode,
  Sale,
  SaleDetail,
  SaleItem,
  SaleItemDetail,
  SaleListEntry
} from '@shared/types/sales'
import { roundMoney } from '@shared/lib/currency'
import { getDatabase } from '../../database/connection'
import { getOpenSession } from '../cash/cash.repository'
import { getCurrentUserId } from '../auth/auth.service'
import { getProductById } from '../products/products.repository'
import { isSystemServiceProductId } from '../products/system-product'
import { fromMoneyDb, toMoneyDb } from '../../utils/money-db'
import {
  decrementStock,
  generateTicketNumber,
  getSaleById,
  getSaleItems,
  listSalesForSession,
  insertSale,
  type SaleListRow,
  insertSaleItem,
  restoreStock,
  voidSaleRecord,
  type SaleItemRow,
  type SaleRowFull
} from './sales.repository'
import {
  addReturnedQuantity,
  getReturnedTotalForSale,
  getSaleItemsWithReturns,
  insertSaleReturn,
  insertSaleReturnItem,
  type SaleItemWithReturnsRow
} from './sales-returns.repository'

function mapSaleItem(row: SaleItemRow): SaleItem {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    barcode: row.barcode,
    quantity: row.quantity,
    unitPrice: fromMoneyDb(row.unit_price),
    lineTotal: fromMoneyDb(row.line_total)
  }
}

function mapSaleItemDetail(row: SaleItemWithReturnsRow): SaleItemDetail {
  const returnedQuantity = Number(row.returned_quantity) || 0
  const quantity = row.quantity
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    barcode: row.barcode,
    quantity,
    unitPrice: fromMoneyDb(row.unit_price),
    lineTotal: fromMoneyDb(row.line_total),
    returnedQuantity,
    returnableQuantity: Math.max(0, quantity - returnedQuantity)
  }
}

function mapSale(row: SaleRowFull, items: SaleItemRow[], returnedTotal = 0): Sale {
  const total = fromMoneyDb(row.total)
  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    sessionId: row.session_id,
    subtotal: fromMoneyDb(row.subtotal),
    discount: fromMoneyDb(row.discount),
    total,
    amountPaid: fromMoneyDb(row.amount_paid),
    changeAmount: fromMoneyDb(row.change_amount),
    priceMode: row.price_mode as PriceMode,
    status: row.status as Sale['status'],
    items: items.map(mapSaleItem),
    createdAt: row.created_at,
    voidedAt: row.voided_at,
    voidReason: row.void_reason,
    voidedByName: row.voided_by_name,
    returnedTotal: roundMoney(returnedTotal),
    netTotal: roundMoney(Math.max(0, total - returnedTotal))
  }
}

function mapSaleListRow(row: SaleListRow): SaleListEntry {
  const total = fromMoneyDb(row.total)
  const returnedTotal = fromMoneyDb(row.returned_total)
  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    sessionId: row.session_id,
    createdAt: row.created_at,
    subtotal: fromMoneyDb(row.subtotal),
    discount: fromMoneyDb(row.discount),
    total,
    returnedTotal,
    netTotal: roundMoney(row.status === 'voided' ? 0 : Math.max(0, total - returnedTotal)),
    amountPaid: fromMoneyDb(row.amount_paid),
    changeAmount: fromMoneyDb(row.change_amount),
    status: row.status as SaleListEntry['status'],
    voidReason: row.void_reason,
    voidedAt: row.voided_at,
    voidedByName: row.voided_by_name,
    itemCount: row.item_count
  }
}

export function listSalesForSessionService(sessionId: number): ApiResult<SaleListEntry[]> {
  const db = getDatabase()
  const session = db.prepare('SELECT id FROM cash_sessions WHERE id = ?').get(sessionId)
  if (!session) return { ok: false, error: 'Sesión de caja no encontrada' }
  const rows = listSalesForSession(db, sessionId)
  return { ok: true, data: rows.map(mapSaleListRow) }
}

export function createSaleService(input: CreateSaleInput): ApiResult<Sale> {
  const userId = getCurrentUserId()
  if (!userId) return { ok: false, error: 'Sesión de usuario no válida' }

  if (!input.items?.length) return { ok: false, error: 'El carrito está vacío' }

  const db = getDatabase()
  const cashSession = getOpenSession(db)
  if (!cashSession) return { ok: false, error: 'Debe abrir la caja antes de vender' }

  const discount = roundMoney(input.discount ?? 0)
  if (discount < 0) return { ok: false, error: 'El descuento no puede ser negativo' }

  let subtotal = 0
  const lineData: {
    productId: number
    productName: string
    barcode: string | null
    quantity: number
    unitPrice: number
    lineTotal: number
    costPrice: number
    skipStock: boolean
  }[] = []

  for (const item of input.items) {
    if (item.quantity <= 0) return { ok: false, error: 'Cantidad inválida' }
    const product = getProductById(db, item.productId)
    if (!product) {
      return { ok: false, error: `Producto #${item.productId} no disponible` }
    }

    const isService =
      item.isFreeService === true && isSystemServiceProductId(db, item.productId)
    if (!isService && product.is_active !== 1) {
      return { ok: false, error: `Producto #${item.productId} no disponible` }
    }
    if (!isService && product.stock < item.quantity) {
      return { ok: false, error: `Stock insuficiente: ${product.name}` }
    }

    const displayName = item.displayName?.trim()
    if (isService && !displayName) {
      return { ok: false, error: 'El nombre del servicio es obligatorio' }
    }

    const unitPrice = roundMoney(item.unitPrice)
    if (unitPrice <= 0) {
      return {
        ok: false,
        error: isService
          ? 'El monto del servicio debe ser mayor a cero'
          : 'El precio de venta debe ser mayor a cero'
      }
    }

    const lineTotal = roundMoney(unitPrice * item.quantity)
    subtotal += lineTotal
    lineData.push({
      productId: product.id,
      productName: isService ? displayName! : product.name,
      barcode: isService ? null : product.barcode,
      quantity: item.quantity,
      unitPrice,
      lineTotal,
      costPrice: isService ? 0 : fromMoneyDb(product.cost_price),
      skipStock: isService
    })
  }

  subtotal = roundMoney(subtotal)
  const total = roundMoney(Math.max(0, subtotal - discount))
  const amountPaid = roundMoney(input.amountPaid)

  if (amountPaid < total) {
    return { ok: false, error: 'El monto recibido es menor al total' }
  }

  const changeAmount = roundMoney(amountPaid - total)

  try {
    const sale = db.transaction(() => {
      const ticketNumber = generateTicketNumber(db)
      const saleId = insertSale(db, {
        ticketNumber,
        sessionId: cashSession.id,
        subtotal: toMoneyDb(subtotal),
        discount: toMoneyDb(discount),
        total: toMoneyDb(total),
        amountPaid: toMoneyDb(amountPaid),
        changeAmount: toMoneyDb(changeAmount),
        priceMode: input.priceMode ?? 'retail',
        createdBy: userId
      })

      for (const line of lineData) {
        if (!line.skipStock) {
          const ok = decrementStock(db, line.productId, line.quantity)
          if (!ok) throw new Error(`Stock insuficiente: ${line.productName}`)
        }
        insertSaleItem(db, {
          saleId,
          productId: line.productId,
          productName: line.productName,
          barcode: line.barcode,
          quantity: line.quantity,
          unitPrice: toMoneyDb(line.unitPrice),
          lineTotal: toMoneyDb(line.lineTotal),
          costPrice: toMoneyDb(line.costPrice)
        })
      }

      const row = getSaleById(db, saleId)!
      const items = getSaleItems(db, saleId)
      return mapSale(row, items)
    })()

    return { ok: true, data: sale }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error al registrar venta' }
  }
}

export function getSaleService(id: number): ApiResult<Sale> {
  const db = getDatabase()
  const row = getSaleById(db, id)
  if (!row) return { ok: false, error: 'Venta no encontrada' }
  const items = getSaleItems(db, id)
  const returnedTotal = fromMoneyDb(getReturnedTotalForSale(db, id))
  return { ok: true, data: mapSale(row, items, returnedTotal) }
}

export function getSaleDetailService(id: number): ApiResult<SaleDetail> {
  const db = getDatabase()
  const row = getSaleById(db, id)
  if (!row) return { ok: false, error: 'Venta no encontrada' }
  const itemsWithReturns = getSaleItemsWithReturns(db, id)
  const items = getSaleItems(db, id)
  const returnedTotal = fromMoneyDb(getReturnedTotalForSale(db, id))
  return {
    ok: true,
    data: {
      ...mapSale(row, items, returnedTotal),
      items: itemsWithReturns.map(mapSaleItemDetail)
    }
  }
}

export function voidSaleService(saleId: number, reason: string): ApiResult<Sale> {
  if (!reason?.trim()) return { ok: false, error: 'El motivo de anulación es obligatorio' }

  const userId = getCurrentUserId()
  const db = getDatabase()
  const sale = getSaleById(db, saleId)
  if (!sale) return { ok: false, error: 'Venta no encontrada' }
  if (sale.status !== 'completed') {
    return { ok: false, error: 'Solo se pueden anular ventas completadas' }
  }

  try {
    db.transaction(() => {
      const items = getSaleItemsWithReturns(db, saleId)
      for (const item of items) {
        if (isSystemServiceProductId(db, item.product_id)) continue
        const remaining = item.quantity - (Number(item.returned_quantity) || 0)
        if (remaining > 0) {
          restoreStock(db, item.product_id, remaining)
        }
      }
      voidSaleRecord(db, saleId, reason.trim(), userId)
      const after = getSaleById(db, saleId)
      if (!after || after.status !== 'voided') throw new Error('No se pudo anular la venta')
    })()
    return getSaleService(saleId)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error al anular venta' }
  }
}

export function partialReturnService(input: PartialReturnInput): ApiResult<SaleDetail> {
  const reason = input.reason?.trim()
  if (!reason) return { ok: false, error: 'El motivo de la devolución es obligatorio' }

  const lines = input.items?.filter((l) => l.quantity > 0) ?? []
  if (lines.length === 0) {
    return { ok: false, error: 'Indique al menos un producto a devolver' }
  }

  const userId = getCurrentUserId()
  const db = getDatabase()
  const sale = getSaleById(db, input.saleId)
  if (!sale) return { ok: false, error: 'Venta no encontrada' }
  if (sale.status !== 'completed') {
    return { ok: false, error: 'Solo se pueden devolver productos de ventas completadas' }
  }

  const saleItems = getSaleItemsWithReturns(db, input.saleId)
  const itemMap = new Map(saleItems.map((i) => [i.id, i]))

  const returnLines: {
    saleItemId: number
    productId: number
    quantity: number
    unitPrice: number
    lineTotal: number
  }[] = []

  for (const line of lines) {
    const item = itemMap.get(line.saleItemId)
    if (!item) return { ok: false, error: 'Ítem de venta no válido' }

    const returned = Number(item.returned_quantity) || 0
    const returnable = item.quantity - returned
    const qty = line.quantity

    if (qty <= 0) continue
    if (qty > returnable + 1e-9) {
      return {
        ok: false,
        error: `Cantidad a devolver mayor a la vendida en "${item.product_name}" (máx. ${returnable})`
      }
    }

    const unitPrice = fromMoneyDb(item.unit_price)
    returnLines.push({
      saleItemId: item.id,
      productId: item.product_id,
      quantity: qty,
      unitPrice,
      lineTotal: roundMoney(unitPrice * qty)
    })
  }

  if (returnLines.length === 0) {
    return { ok: false, error: 'Indique al menos un producto a devolver' }
  }

  try {
    db.transaction(() => {
      const returnId = insertSaleReturn(db, {
        saleId: input.saleId,
        reason,
        createdBy: userId
      })

      for (const line of returnLines) {
        insertSaleReturnItem(db, {
          returnId,
          saleItemId: line.saleItemId,
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: toMoneyDb(line.unitPrice),
          lineTotal: toMoneyDb(line.lineTotal)
        })
        addReturnedQuantity(db, line.saleItemId, line.quantity)
        if (!isSystemServiceProductId(db, line.productId)) {
          restoreStock(db, line.productId, line.quantity)
        }
      }
    })()

    return getSaleDetailService(input.saleId)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error al registrar devolución' }
  }
}
