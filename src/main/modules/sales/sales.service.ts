import type { ApiResult } from '@shared/types/api'
import type { CreateSaleInput, PriceMode, Sale, SaleItem } from '@shared/types/sales'
import { roundMoney } from '@shared/lib/currency'
import { getDatabase } from '../../database/connection'
import { getOpenSession } from '../cash/cash.repository'
import { getCurrentUserId } from '../auth/auth.service'
import { getProductById, getProductByBarcodeRow } from '../products/products.repository'
import { mapProductRow } from '../products/products.mapper'
import { fromMoneyDb, toMoneyDb } from '../../utils/money-db'
import {
  decrementStock,
  generateTicketNumber,
  getSaleById,
  getSaleItems,
  insertSale,
  insertSaleItem,
  restoreStock,
  voidSaleRecord,
  type SaleItemRow,
  type SaleRowFull
} from './sales.repository'

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

function mapSale(row: SaleRowFull, items: SaleItemRow[]): Sale {
  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    sessionId: row.session_id,
    subtotal: fromMoneyDb(row.subtotal),
    discount: fromMoneyDb(row.discount),
    total: fromMoneyDb(row.total),
    amountPaid: fromMoneyDb(row.amount_paid),
    changeAmount: fromMoneyDb(row.change_amount),
    priceMode: row.price_mode as PriceMode,
    items: items.map(mapSaleItem),
    createdAt: row.created_at
  }
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
  }[] = []

  for (const item of input.items) {
    if (item.quantity <= 0) return { ok: false, error: 'Cantidad inválida' }
    const product = getProductById(db, item.productId)
    if (!product || product.is_active !== 1) {
      return { ok: false, error: `Producto #${item.productId} no disponible` }
    }
    if (product.stock < item.quantity) {
      return { ok: false, error: `Stock insuficiente: ${product.name}` }
    }
    const unitPrice = roundMoney(item.unitPrice)
    const lineTotal = roundMoney(unitPrice * item.quantity)
    subtotal += lineTotal
    lineData.push({
      productId: product.id,
      productName: product.name,
      barcode: product.barcode,
      quantity: item.quantity,
      unitPrice,
      lineTotal,
      costPrice: fromMoneyDb(product.cost_price)
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
        priceMode: input.priceMode,
        createdBy: userId
      })

      for (const line of lineData) {
        const ok = decrementStock(db, line.productId, line.quantity)
        if (!ok) throw new Error(`Stock insuficiente: ${line.productName}`)
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
  return { ok: true, data: mapSale(row, items) }
}

export function voidSaleService(saleId: number, reason: string): ApiResult<Sale> {
  if (!reason?.trim()) return { ok: false, error: 'El motivo de anulación es obligatorio' }

  const db = getDatabase()
  const sale = getSaleById(db, saleId)
  if (!sale) return { ok: false, error: 'Venta no encontrada' }
  if (sale.status !== 'completed') {
    return { ok: false, error: 'Solo se pueden anular ventas completadas' }
  }

  try {
    db.transaction(() => {
      const items = getSaleItems(db, saleId)
      for (const item of items) {
        restoreStock(db, item.product_id, item.quantity)
      }
      voidSaleRecord(db, saleId, reason.trim())
      const after = getSaleById(db, saleId)
      if (!after || after.status !== 'voided') throw new Error('No se pudo anular la venta')
    })()
    return getSaleService(saleId)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error al anular venta' }
  }
}

export function lookupBarcodeForPos(barcode: string, priceMode: PriceMode): ApiResult<ReturnType<typeof mapProductRow>> {
  const code = barcode.trim()
  if (!code) return { ok: false, error: 'Código vacío' }
  const db = getDatabase()
  const row = getProductByBarcodeRow(db, code)
  if (!row) return { ok: false, error: 'Producto no encontrado' }
  return { ok: true, data: mapProductRow(row) }
}
