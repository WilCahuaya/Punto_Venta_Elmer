import { roundMoney } from '@shared/lib/currency';
import { stockUnitsForCommercialQty } from '@shared/lib/product-packs';
import { normalizePaymentMethod } from '@shared/lib/payment';
import { getDatabase } from '../../database/connection';
import { getOpenSession } from '../cash/cash.repository';
import { getCurrentUserId } from '../auth/auth.service';
import { getProductById } from '../products/products.repository';
import { isSystemServiceProductId } from '../products/system-product';
import { fromMoneyDb, toMoneyDb } from '../../utils/money-db';
import { decrementStock, generateTicketNumber, getSaleById, getSaleItems, listSalesForSession, insertSale, insertSaleItem, restoreStock, voidSaleRecord } from './sales.repository';
import { addReturnedQuantity, getReturnedTotalForSale, getSaleItemsWithReturns, insertSaleReturn, insertSaleReturnItem } from './sales-returns.repository';
import { getCreditPaidByMethod, getCreditPaidTotal, insertCreditPayment, listCreditPayments, listCreditPaymentsForSession, listCreditSaleItems, listCreditSales, getCreditSaleRow, updateSaleAmountPaid } from './sales-credit.repository';
function mapSaleItem(row) {
    return {
        id: row.id,
        productId: row.product_id,
        productName: row.product_name,
        barcode: row.barcode,
        quantity: row.quantity,
        unitPrice: fromMoneyDb(row.unit_price),
        lineTotal: fromMoneyDb(row.line_total)
    };
}
function mapSaleItemDetail(row) {
    const returnedQuantity = Number(row.returned_quantity) || 0;
    const quantity = row.quantity;
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
    };
}
function mapSale(row, items, returnedTotal = 0) {
    const total = fromMoneyDb(row.total);
    const netTotal = roundMoney(Math.max(0, total - returnedTotal));
    const isCredit = Number(row.is_credit) === 1;
    const paidTotal = isCredit
        ? roundMoney(fromMoneyDb(row.amount_paid))
        : fromMoneyDb(row.amount_paid);
    return {
        id: row.id,
        ticketNumber: row.ticket_number,
        sessionId: row.session_id,
        subtotal: fromMoneyDb(row.subtotal),
        discount: fromMoneyDb(row.discount),
        total,
        amountPaid: fromMoneyDb(row.amount_paid),
        changeAmount: fromMoneyDb(row.change_amount),
        paymentMethod: normalizePaymentMethod(row.payment_method),
        isCredit,
        creditTo: row.credit_to,
        paidTotal,
        remaining: isCredit ? roundMoney(Math.max(0, netTotal - paidTotal)) : 0,
        priceMode: row.price_mode,
        status: row.status,
        items: items.map(mapSaleItem),
        createdAt: row.created_at,
        voidedAt: row.voided_at,
        voidReason: row.void_reason,
        voidedByName: row.voided_by_name,
        returnedTotal: roundMoney(returnedTotal),
        netTotal
    };
}
function mapSaleListRow(row) {
    const total = fromMoneyDb(row.total);
    const returnedTotal = fromMoneyDb(row.returned_total);
    const netTotal = roundMoney(row.status === 'voided' ? 0 : Math.max(0, total - returnedTotal));
    const isCredit = Number(row.is_credit) === 1;
    const paidTotal = fromMoneyDb(row.amount_paid);
    return {
        id: row.id,
        ticketNumber: row.ticket_number,
        sessionId: row.session_id,
        createdAt: row.created_at,
        subtotal: fromMoneyDb(row.subtotal),
        discount: fromMoneyDb(row.discount),
        total,
        returnedTotal,
        netTotal,
        amountPaid: paidTotal,
        changeAmount: fromMoneyDb(row.change_amount),
        paymentMethod: normalizePaymentMethod(row.payment_method),
        isCredit,
        creditTo: row.credit_to,
        paidTotal,
        remaining: isCredit && row.status === 'completed' ? roundMoney(Math.max(0, netTotal - paidTotal)) : 0,
        status: row.status,
        voidReason: row.void_reason,
        voidedAt: row.voided_at,
        voidedByName: row.voided_by_name,
        itemCount: row.item_count
    };
}
export function listSalesForSessionService(sessionId) {
    const db = getDatabase();
    const session = db.prepare('SELECT id FROM cash_sessions WHERE id = ?').get(sessionId);
    if (!session)
        return { ok: false, error: 'Sesión de caja no encontrada' };
    const rows = listSalesForSession(db, sessionId);
    return { ok: true, data: rows.map(mapSaleListRow) };
}
export function createSaleService(input) {
    const userId = getCurrentUserId();
    if (!userId)
        return { ok: false, error: 'Sesión de usuario no válida' };
    if (!input.items?.length)
        return { ok: false, error: 'El carrito está vacío' };
    const db = getDatabase();
    const cashSession = getOpenSession(db);
    if (!cashSession)
        return { ok: false, error: 'Debe abrir la caja antes de vender' };
    const discount = roundMoney(input.discount ?? 0);
    if (discount < 0)
        return { ok: false, error: 'El descuento no puede ser negativo' };
    let subtotal = 0;
    const lineData = [];
    for (const item of input.items) {
        if (item.quantity <= 0)
            return { ok: false, error: 'Cantidad inválida' };
        const product = getProductById(db, item.productId);
        if (!product) {
            return { ok: false, error: `Producto #${item.productId} no disponible` };
        }
        const isService = item.isFreeService === true && isSystemServiceProductId(db, item.productId);
        if (!isService && product.is_active !== 1) {
            return { ok: false, error: `Producto #${item.productId} no disponible` };
        }
        const stockQuantity = item.stockQuantity != null && item.stockQuantity > 0
            ? item.stockQuantity
            : item.quantity;
        if (stockQuantity <= 0)
            return { ok: false, error: 'Cantidad inválida' };
        if (!isService && product.stock < stockQuantity) {
            return { ok: false, error: `Stock insuficiente: ${product.name}` };
        }
        const displayName = item.displayName?.trim();
        if (isService && !displayName) {
            return { ok: false, error: 'El nombre del servicio es obligatorio' };
        }
        const unitPrice = roundMoney(item.unitPrice);
        if (unitPrice <= 0) {
            return {
                ok: false,
                error: isService
                    ? 'El monto del servicio debe ser mayor a cero'
                    : 'El precio de venta debe ser mayor a cero'
            };
        }
        const lineTotal = roundMoney(unitPrice * item.quantity);
        subtotal += lineTotal;
        lineData.push({
            productId: product.id,
            productName: isService
                ? displayName
                : item.priceLabel && item.priceLabel !== 'Menor'
                    ? `${product.name} · ${item.priceLabel}`
                    : product.name,
            barcode: isService ? null : product.barcode,
            quantity: item.quantity,
            unitPrice,
            lineTotal,
            costPrice: isService ? 0 : fromMoneyDb(product.cost_price),
            stockQuantity,
            skipStock: isService
        });
    }
    subtotal = roundMoney(subtotal);
    const total = roundMoney(Math.max(0, subtotal - discount));
    const paymentMethod = normalizePaymentMethod(input.paymentMethod);
    const isCredit = input.isCredit === true;
    const creditTo = input.creditTo?.trim() || '';
    let amountPaid;
    let changeAmount;
    if (isCredit) {
        if (!creditTo) {
            return { ok: false, error: 'Indique a quién se fía (nombre y lo que desee anotar)' };
        }
        if (creditTo.length > 500) {
            return { ok: false, error: 'El texto de a quién se fió es demasiado largo' };
        }
        amountPaid = roundMoney(input.amountPaid);
        if (amountPaid < 0) {
            return { ok: false, error: 'El adelanto no puede ser negativo' };
        }
        if (amountPaid >= total) {
            return {
                ok: false,
                error: 'Si cubre el total, cobre con Efectivo o Yape. El fiado es solo para lo que queda debiendo.'
            };
        }
        changeAmount = 0;
    }
    else {
        amountPaid = paymentMethod === 'yape' ? total : roundMoney(input.amountPaid);
        if (amountPaid < total) {
            return { ok: false, error: 'El monto recibido es menor al total' };
        }
        changeAmount = paymentMethod === 'yape' ? 0 : roundMoney(amountPaid - total);
    }
    try {
        const sale = db.transaction(() => {
            const ticketNumber = generateTicketNumber(db);
            const saleId = insertSale(db, {
                ticketNumber,
                sessionId: cashSession.id,
                subtotal: toMoneyDb(subtotal),
                discount: toMoneyDb(discount),
                total: toMoneyDb(total),
                amountPaid: toMoneyDb(amountPaid),
                changeAmount: toMoneyDb(changeAmount),
                paymentMethod,
                isCredit,
                creditTo: isCredit ? creditTo : null,
                priceMode: input.priceMode ?? 'retail',
                createdBy: userId
            });
            for (const line of lineData) {
                if (!line.skipStock) {
                    const ok = decrementStock(db, line.productId, line.stockQuantity);
                    if (!ok)
                        throw new Error(`Stock insuficiente: ${line.productName}`);
                }
                insertSaleItem(db, {
                    saleId,
                    productId: line.productId,
                    productName: line.productName,
                    barcode: line.barcode,
                    quantity: line.quantity,
                    unitPrice: toMoneyDb(line.unitPrice),
                    lineTotal: toMoneyDb(line.lineTotal),
                    costPrice: toMoneyDb(line.costPrice),
                    stockQuantity: line.stockQuantity
                });
            }
            if (isCredit && amountPaid > 0) {
                insertCreditPayment(db, {
                    saleId,
                    sessionId: cashSession.id,
                    amount: toMoneyDb(amountPaid),
                    paymentMethod,
                    kind: 'payment',
                    createdBy: userId
                });
            }
            const row = getSaleById(db, saleId);
            const items = getSaleItems(db, saleId);
            return mapSale(row, items);
        })();
        return { ok: true, data: sale };
    }
    catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Error al registrar venta' };
    }
}
export function getSaleService(id) {
    const db = getDatabase();
    const row = getSaleById(db, id);
    if (!row)
        return { ok: false, error: 'Venta no encontrada' };
    const items = getSaleItems(db, id);
    const returnedTotal = fromMoneyDb(getReturnedTotalForSale(db, id));
    return { ok: true, data: mapSale(row, items, returnedTotal) };
}
export function getSaleDetailService(id) {
    const db = getDatabase();
    const row = getSaleById(db, id);
    if (!row)
        return { ok: false, error: 'Venta no encontrada' };
    const itemsWithReturns = getSaleItemsWithReturns(db, id);
    const items = getSaleItems(db, id);
    const returnedTotal = fromMoneyDb(getReturnedTotalForSale(db, id));
    return {
        ok: true,
        data: {
            ...mapSale(row, items, returnedTotal),
            items: itemsWithReturns.map(mapSaleItemDetail)
        }
    };
}
export function voidSaleService(saleId, reason) {
    if (!reason?.trim())
        return { ok: false, error: 'El motivo de anulación es obligatorio' };
    const userId = getCurrentUserId();
    const db = getDatabase();
    const sale = getSaleById(db, saleId);
    if (!sale)
        return { ok: false, error: 'Venta no encontrada' };
    if (sale.status !== 'completed') {
        return { ok: false, error: 'Solo se pueden anular ventas completadas' };
    }
    if (Number(sale.is_credit) === 1 && getCreditPaidTotal(db, saleId) > 0.004) {
        return {
            ok: false,
            error: 'Este fiado tiene cobros. No se puede anular. Devuelva productos o cobre el saldo.'
        };
    }
    try {
        db.transaction(() => {
            const items = getSaleItemsWithReturns(db, saleId);
            for (const item of items) {
                if (isSystemServiceProductId(db, item.product_id))
                    continue;
                const remaining = item.quantity - (Number(item.returned_quantity) || 0);
                if (remaining > 0) {
                    const stockTotal = Number(item.stock_quantity) || item.quantity;
                    restoreStock(db, item.product_id, stockUnitsForCommercialQty(remaining, item.quantity, stockTotal));
                }
            }
            voidSaleRecord(db, saleId, reason.trim(), userId);
            const after = getSaleById(db, saleId);
            if (!after || after.status !== 'voided')
                throw new Error('No se pudo anular la venta');
        })();
        return getSaleService(saleId);
    }
    catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Error al anular venta' };
    }
}
export function partialReturnService(input) {
    const reason = input.reason?.trim();
    if (!reason)
        return { ok: false, error: 'El motivo de la devolución es obligatorio' };
    const lines = input.items?.filter((l) => l.quantity > 0) ?? [];
    if (lines.length === 0) {
        return { ok: false, error: 'Indique al menos un producto a devolver' };
    }
    const userId = getCurrentUserId();
    const db = getDatabase();
    const sale = getSaleById(db, input.saleId);
    if (!sale)
        return { ok: false, error: 'Venta no encontrada' };
    if (sale.status !== 'completed') {
        return { ok: false, error: 'Solo se pueden devolver productos de ventas completadas' };
    }
    const saleItems = getSaleItemsWithReturns(db, input.saleId);
    const itemMap = new Map(saleItems.map((i) => [i.id, i]));
    const returnLines = [];
    for (const line of lines) {
        const item = itemMap.get(line.saleItemId);
        if (!item)
            return { ok: false, error: 'Ítem de venta no válido' };
        const returned = Number(item.returned_quantity) || 0;
        const returnable = item.quantity - returned;
        const qty = line.quantity;
        if (qty <= 0)
            continue;
        if (qty > returnable + 1e-9) {
            return {
                ok: false,
                error: `Cantidad a devolver mayor a la vendida en "${item.product_name}" (máx. ${returnable})`
            };
        }
        const unitPrice = fromMoneyDb(item.unit_price);
        returnLines.push({
            saleItemId: item.id,
            productId: item.product_id,
            quantity: qty,
            unitPrice,
            lineTotal: roundMoney(unitPrice * qty)
        });
    }
    if (returnLines.length === 0) {
        return { ok: false, error: 'Indique al menos un producto a devolver' };
    }
    try {
        db.transaction(() => {
            const returnId = insertSaleReturn(db, {
                saleId: input.saleId,
                reason,
                createdBy: userId
            });
            for (const line of returnLines) {
                insertSaleReturnItem(db, {
                    returnId,
                    saleItemId: line.saleItemId,
                    productId: line.productId,
                    quantity: line.quantity,
                    unitPrice: toMoneyDb(line.unitPrice),
                    lineTotal: toMoneyDb(line.lineTotal)
                });
                addReturnedQuantity(db, line.saleItemId, line.quantity);
                if (!isSystemServiceProductId(db, line.productId)) {
                    const item = itemMap.get(line.saleItemId);
                    const stockTotal = Number(item.stock_quantity) || item.quantity;
                    restoreStock(db, line.productId, stockUnitsForCommercialQty(line.quantity, item.quantity, stockTotal));
                }
            }
            if (Number(sale.is_credit) === 1) {
                const paid = roundMoney(getCreditPaidTotal(db, input.saleId));
                const newReturned = fromMoneyDb(getReturnedTotalForSale(db, input.saleId));
                const newNet = roundMoney(Math.max(0, fromMoneyDb(sale.total) - newReturned));
                const excess = roundMoney(paid - newNet);
                if (excess > 0.004) {
                    const open = getOpenSession(db);
                    if (!open) {
                        throw new Error('Abra la caja: hay que devolver el adelanto de este fiado.');
                    }
                    const cashPaid = roundMoney(getCreditPaidByMethod(db, input.saleId, 'cash'));
                    const cashRefund = roundMoney(Math.min(excess, Math.max(0, cashPaid)));
                    const yapeRefund = roundMoney(Math.max(0, excess - cashRefund));
                    if (cashRefund > 0) {
                        insertCreditPayment(db, {
                            saleId: input.saleId,
                            sessionId: open.id,
                            amount: toMoneyDb(cashRefund),
                            paymentMethod: 'cash',
                            kind: 'refund',
                            createdBy: userId
                        });
                    }
                    if (yapeRefund > 0) {
                        insertCreditPayment(db, {
                            saleId: input.saleId,
                            sessionId: open.id,
                            amount: toMoneyDb(yapeRefund),
                            paymentMethod: 'yape',
                            kind: 'refund',
                            createdBy: userId
                        });
                    }
                    updateSaleAmountPaid(db, input.saleId, toMoneyDb(roundMoney(getCreditPaidTotal(db, input.saleId))));
                }
            }
        })();
        return getSaleDetailService(input.saleId);
    }
    catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Error al registrar devolución' };
    }
}
function mapCreditPayment(row) {
    return {
        id: row.id,
        saleId: row.sale_id,
        sessionId: row.session_id,
        amount: fromMoneyDb(row.amount),
        paymentMethod: normalizePaymentMethod(row.payment_method),
        kind: row.kind === 'refund' ? 'refund' : 'payment',
        createdAt: row.created_at,
        createdByName: row.created_by_name,
        ticketNumber: row.ticket_number ?? undefined,
        creditTo: row.credit_to ?? undefined
    };
}
function mapCreditSaleEntry(db, row) {
    const total = fromMoneyDb(row.total);
    const returnedTotal = fromMoneyDb(row.returned_total);
    const paidTotal = fromMoneyDb(row.paid_total);
    const netTotal = roundMoney(Math.max(0, total - returnedTotal));
    return {
        id: row.id,
        ticketNumber: row.ticket_number,
        creditTo: row.credit_to,
        createdAt: row.created_at,
        total,
        returnedTotal,
        netTotal,
        paidTotal,
        remaining: roundMoney(Math.max(0, netTotal - paidTotal)),
        items: listCreditSaleItems(db, row.id).map((item) => ({
            productName: item.product_name,
            quantity: item.quantity,
            returnedQuantity: Number(item.returned_quantity) || 0,
            unitPrice: fromMoneyDb(item.unit_price),
            lineTotal: fromMoneyDb(item.line_total)
        })),
        payments: listCreditPayments(db, row.id).map(mapCreditPayment)
    };
}
export function listCreditSalesService(filters = {}) {
    const db = getDatabase();
    return { ok: true, data: listCreditSales(db, filters).map((row) => mapCreditSaleEntry(db, row)) };
}
export function addCreditPaymentService(input) {
    const userId = getCurrentUserId();
    if (!userId)
        return { ok: false, error: 'Sesión de usuario no válida' };
    const amount = roundMoney(input.amount);
    if (amount <= 0)
        return { ok: false, error: 'El monto del abono debe ser mayor a cero' };
    const paymentMethod = normalizePaymentMethod(input.paymentMethod);
    const db = getDatabase();
    const cashSession = getOpenSession(db);
    if (!cashSession) {
        return { ok: false, error: 'Debe abrir la caja para registrar un abono' };
    }
    const sale = getSaleById(db, input.saleId);
    if (!sale)
        return { ok: false, error: 'Venta no encontrada' };
    if (sale.status !== 'completed') {
        return { ok: false, error: 'Solo se puede cobrar un fiado de una venta completada' };
    }
    if (Number(sale.is_credit) !== 1) {
        return { ok: false, error: 'Esta venta no es un fiado' };
    }
    const returnedTotal = fromMoneyDb(getReturnedTotalForSale(db, sale.id));
    const netTotal = roundMoney(Math.max(0, fromMoneyDb(sale.total) - returnedTotal));
    const paid = roundMoney(getCreditPaidTotal(db, sale.id));
    const remaining = roundMoney(Math.max(0, netTotal - paid));
    if (remaining <= 0.004) {
        return { ok: false, error: 'Este fiado ya está saldado' };
    }
    if (amount > remaining + 0.004) {
        return { ok: false, error: `El abono no puede ser mayor al saldo (${remaining.toFixed(2)})` };
    }
    try {
        db.transaction(() => {
            insertCreditPayment(db, {
                saleId: sale.id,
                sessionId: cashSession.id,
                amount: toMoneyDb(amount),
                paymentMethod,
                kind: 'payment',
                createdBy: userId
            });
            updateSaleAmountPaid(db, sale.id, toMoneyDb(roundMoney(getCreditPaidTotal(db, sale.id))));
        })();
    }
    catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Error al registrar el abono' };
    }
    const row = getCreditSaleRow(db, sale.id);
    if (!row)
        return { ok: false, error: 'Abono registrado, pero no se pudo recargar el fiado' };
    return { ok: true, data: mapCreditSaleEntry(db, row) };
}
export function listCreditPaymentsForSessionService(sessionId) {
    const db = getDatabase();
    const session = db.prepare('SELECT id FROM cash_sessions WHERE id = ?').get(sessionId);
    if (!session)
        return { ok: false, error: 'Sesión de caja no encontrada' };
    return {
        ok: true,
        data: listCreditPaymentsForSession(db, sessionId).map(mapCreditPayment)
    };
}
