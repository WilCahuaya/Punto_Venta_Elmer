import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { MoneyDisplay } from '../../components/ui/MoneyDisplay';
import { CashExpectedBreakdown } from '../../features/cash/CashExpectedBreakdown';
import { CashTicketsPanel } from '../../features/cash/CashTicketsPanel';
import { CASH_TABS, parseCashTab } from '../../features/cash/CashPageTabs';
import { CloseCashModal } from '../../features/cash/CloseCashModal';
import { MovementModal } from '../../features/cash/MovementModal';
import { OpenCashModal } from '../../features/cash/OpenCashModal';
import { SessionDetailModal } from '../../features/cash/SessionDetailModal';
import { formatDateTime } from '../../lib/datetime';
import { useCashStore } from '../../stores/cash.store';
export function CashPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = parseCashTab(searchParams.get('tab'));
    const sessionParam = searchParams.get('session');
    const initialSessionId = sessionParam ? Number(sessionParam) : null;
    const current = useCashStore((s) => s.current);
    const isOpen = useCashStore((s) => s.isOpen);
    const refresh = useCashStore((s) => s.refresh);
    const [movements, setMovements] = useState([]);
    const [sessionSales, setSessionSales] = useState([]);
    const [creditPayments, setCreditPayments] = useState([]);
    const [history, setHistory] = useState([]);
    const [openModal, setOpenModal] = useState(false);
    const [closeModal, setCloseModal] = useState(false);
    const [movementType, setMovementType] = useState(null);
    const [detailId, setDetailId] = useState(null);
    function setTab(next) {
        const params = new URLSearchParams(searchParams);
        params.set('tab', next);
        if (next !== 'tickets')
            params.delete('session');
        setSearchParams(params, { replace: true });
    }
    const loadHistory = useCallback(async () => {
        const hRes = await window.api.cash.history({ limit: 30 });
        if (hRes.ok)
            setHistory(hRes.data);
    }, []);
    const loadTurnLedger = useCallback(async (sessionId) => {
        const [mRes, sRes, cRes] = await Promise.all([
            window.api.cash.listMovements(sessionId),
            window.api.sales.listBySession(sessionId),
            window.api.sales.listCreditPaymentsBySession(sessionId)
        ]);
        if (mRes.ok)
            setMovements(mRes.data);
        else
            setMovements([]);
        if (sRes.ok)
            setSessionSales(sRes.data);
        else
            setSessionSales([]);
        if (cRes.ok)
            setCreditPayments(cRes.data);
        else
            setCreditPayments([]);
    }, []);
    const load = useCallback(async () => {
        await refresh();
        await loadHistory();
    }, [refresh, loadHistory]);
    const refreshTurn = useCallback(() => {
        void load();
        if (current?.id)
            void loadTurnLedger(current.id);
    }, [load, loadTurnLedger, current?.id]);
    useEffect(() => {
        void load();
    }, [load]);
    useEffect(() => {
        if (isOpen && current?.id) {
            void loadTurnLedger(current.id);
        }
        else {
            setMovements([]);
            setSessionSales([]);
            setCreditPayments([]);
        }
    }, [isOpen, current?.id, loadTurnLedger]);
    return (_jsxs("div", { children: [_jsxs("header", { className: "mb-6 flex flex-wrap items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-semibold", children: "Caja" }), _jsx("p", { className: "text-sm text-[rgb(var(--text-muted))]", children: "Turno, efectivo esperado y tickets" })] }), _jsx(Badge, { variant: isOpen ? 'success' : 'muted', children: isOpen ? 'Caja abierta' : 'Caja cerrada' })] }), _jsx("div", { className: "mb-6 flex flex-wrap gap-1 rounded-lg border border-surface-border bg-surface-elevated p-1", children: CASH_TABS.map((t) => (_jsx("button", { type: "button", onClick: () => setTab(t.id), className: [
                        'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                        tab === t.id
                            ? 'bg-brand/10 text-brand'
                            : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]'
                    ].join(' '), children: t.label }, t.id))) }), tab === 'turno' && (_jsxs(_Fragment, { children: [isOpen && current ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mb-6 grid gap-4 lg:grid-cols-2", children: [_jsx(CashExpectedBreakdown, { session: current }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [_jsx(SummaryCard, { title: "Ventas efectivo", amount: current.totalSalesGross }), _jsx(SummaryCard, { title: "Ventas Yape", amount: current.totalYapeGross }), _jsx(SummaryCard, { title: "Devoluciones efectivo", amount: current.totalReturns, negative: current.totalReturns > 0 }), _jsx(SummaryCard, { title: "Ganancia", amount: current.salesProfit, positive: true })] })] }), _jsxs("div", { className: "mb-6 flex flex-wrap gap-2", children: [_jsx(Button, { onClick: () => setMovementType('income'), children: "+ Ingreso" }), _jsx(Button, { variant: "secondary", onClick: () => setMovementType('expense'), children: "\u2212 Egreso" }), _jsx(Button, { variant: "secondary", type: "button", onClick: () => setTab('tickets'), children: "Ver tickets" }), _jsx(Button, { variant: "secondary", onClick: () => setCloseModal(true), children: "Cerrar caja" })] }), _jsxs("section", { className: "mb-8", children: [_jsx("h3", { className: "mb-1 font-medium", children: "Movimientos del turno" }), _jsx("p", { className: "mb-3 text-xs text-[rgb(var(--text-muted))]", children: "Ventas, ingresos y egresos en orden cronol\u00F3gico" }), _jsx(TurnLedgerTable, { movements: movements, sales: sessionSales, creditPayments: creditPayments })] }), _jsx(CloseCashModal, { open: closeModal, summary: current, onClose: () => {
                                    setCloseModal(false);
                                    refreshTurn();
                                } })] })) : (_jsxs("div", { className: "mb-8 rounded-xl border border-dashed border-surface-border p-8 text-center", children: [_jsx("p", { className: "mb-4 text-[rgb(var(--text-muted))]", children: "La caja est\u00E1 cerrada. Abra un turno para vender y registrar movimientos." }), _jsx(Button, { onClick: () => setOpenModal(true), children: "Abrir caja" })] })), _jsx(OpenCashModal, { open: openModal, onClose: () => {
                            setOpenModal(false);
                            refreshTurn();
                        } }), movementType && (_jsx(MovementModal, { open: !!movementType, type: movementType, onClose: () => setMovementType(null), onSaved: refreshTurn }))] })), tab === 'tickets' && (_jsx(CashTicketsPanel, { initialSessionId: Number.isFinite(initialSessionId) ? initialSessionId : null, onUpdated: refreshTurn })), tab === 'cierres' && (_jsxs("section", { children: [_jsx("p", { className: "mb-4 text-sm text-[rgb(var(--text-muted))]", children: "Turnos cerrados. Use Ver para el detalle o Tickets para la lista de ventas." }), _jsx("div", { className: "overflow-hidden rounded-xl border border-surface-border", children: _jsxs("table", { className: "w-full text-left text-sm", children: [_jsx("thead", { className: "border-b border-surface-border bg-surface-elevated", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 font-medium", children: "Cierre" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Apertura" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Efectivo neto" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Yape" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Esperado" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Contado" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Diferencia" }), _jsx("th", { className: "px-4 py-3 font-medium text-right", children: "Acciones" })] }) }), _jsx("tbody", { children: history.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 8, className: "px-4 py-6 text-center text-[rgb(var(--text-muted))]", children: "Sin historial" }) })) : (history.map((s) => (_jsxs("tr", { className: "border-b border-surface-border/60 hover:bg-surface-elevated/40", children: [_jsx("td", { className: "px-4 py-3", children: s.closedAt ? formatDateTime(s.closedAt) : '—' }), _jsx("td", { className: "px-4 py-3", children: _jsx(MoneyDisplay, { amount: s.openingAmount, size: "sm" }) }), _jsx("td", { className: "px-4 py-3", children: _jsx(MoneyDisplay, { amount: s.totalSales, size: "sm" }) }), _jsx("td", { className: "px-4 py-3", children: _jsx(MoneyDisplay, { amount: s.totalYape, size: "sm" }) }), _jsx("td", { className: "px-4 py-3", children: _jsx(MoneyDisplay, { amount: s.expectedAmount ?? 0, size: "sm" }) }), _jsx("td", { className: "px-4 py-3", children: _jsx(MoneyDisplay, { amount: s.closingAmount ?? 0, size: "sm" }) }), _jsx("td", { className: "px-4 py-3", children: _jsx("span", { className: Math.abs(s.difference ?? 0) < 0.01 ? '' : 'text-amber-600 font-medium', children: _jsx(MoneyDisplay, { amount: s.difference ?? 0, size: "sm" }) }) }), _jsx("td", { className: "px-4 py-3 text-right", children: _jsxs("div", { className: "flex justify-end gap-1", children: [_jsx(Button, { variant: "ghost", type: "button", onClick: () => {
                                                                const params = new URLSearchParams();
                                                                params.set('tab', 'tickets');
                                                                params.set('session', String(s.id));
                                                                setSearchParams(params);
                                                            }, children: "Tickets" }), _jsx(Button, { variant: "ghost", type: "button", onClick: () => setDetailId(s.id), children: "Ver" })] }) })] }, s.id)))) })] }) })] })), _jsx(SessionDetailModal, { open: detailId != null, sessionId: detailId, onClose: () => setDetailId(null), onOpenTickets: (sessionId) => {
                    setDetailId(null);
                    const params = new URLSearchParams();
                    params.set('tab', 'tickets');
                    params.set('session', String(sessionId));
                    setSearchParams(params);
                } })] }));
}
function SummaryCard({ title, amount, positive, negative }) {
    return (_jsxs("div", { className: [
            'rounded-xl border border-surface-border bg-surface-elevated p-4',
            negative ? 'border-amber-500/30' : ''
        ].join(' '), children: [_jsx("p", { className: "text-xs text-[rgb(var(--text-muted))]", children: title }), _jsx(MoneyDisplay, { amount: amount, size: "lg", className: positive ? 'text-emerald-600' : negative ? 'text-amber-600' : '' })] }));
}
function buildTurnLedger(movements, sales, creditPayments) {
    const rows = [];
    for (const m of movements) {
        rows.push({
            key: `m-${m.id}`,
            createdAt: m.createdAt,
            typeLabel: m.type === 'income' ? 'Ingreso' : 'Egreso',
            badgeVariant: m.type === 'income' ? 'success' : 'warning',
            concept: m.reference ? `${m.concept} (${m.reference})` : m.concept,
            amount: m.amount
        });
    }
    for (const s of sales) {
        const isYape = s.paymentMethod === 'yape';
        rows.push({
            key: `s-${s.id}`,
            createdAt: s.createdAt,
            typeLabel: s.status === 'voided'
                ? 'Venta anulada'
                : s.isCredit
                    ? 'Fiado'
                    : isYape
                        ? 'Yape'
                        : 'Efectivo',
            badgeVariant: s.status === 'voided' ? 'muted' : s.isCredit ? 'warning' : isYape ? 'default' : 'success',
            concept: s.isCredit && s.creditTo ? `${s.ticketNumber} · ${s.creditTo}` : s.ticketNumber,
            amount: s.status === 'voided' ? s.total : s.netTotal
        });
    }
    for (const p of creditPayments) {
        const who = p.creditTo ? ` · ${p.creditTo}` : '';
        rows.push({
            key: `cp-${p.id}`,
            createdAt: p.createdAt,
            typeLabel: p.kind === 'refund' ? 'Devol. fiado' : 'Abono fiado',
            badgeVariant: p.kind === 'refund' ? 'warning' : p.paymentMethod === 'yape' ? 'default' : 'success',
            concept: `${p.ticketNumber ?? 'Ticket'}${who} · ${p.paymentMethod === 'yape' ? 'Yape' : 'Efectivo'}`,
            amount: p.kind === 'refund' ? -p.amount : p.amount
        });
    }
    return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
function TurnLedgerTable({ movements, sales, creditPayments }) {
    const rows = buildTurnLedger(movements, sales, creditPayments);
    return (_jsx("div", { className: "overflow-hidden rounded-xl border border-surface-border", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "border-b border-surface-border bg-surface-elevated", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left font-medium", children: "Fecha" }), _jsx("th", { className: "px-4 py-3 text-left font-medium", children: "Tipo" }), _jsx("th", { className: "px-4 py-3 text-left font-medium", children: "Concepto" }), _jsx("th", { className: "px-4 py-3 text-right font-medium", children: "Monto" })] }) }), _jsx("tbody", { children: rows.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 4, className: "px-4 py-6 text-center text-[rgb(var(--text-muted))]", children: "Sin movimientos en este turno" }) })) : (rows.map((row) => (_jsxs("tr", { className: "border-b border-surface-border/60", children: [_jsx("td", { className: "px-4 py-3 text-[rgb(var(--text-muted))]", children: formatDateTime(row.createdAt) }), _jsx("td", { className: "px-4 py-3", children: _jsx(Badge, { variant: row.badgeVariant, children: row.typeLabel }) }), _jsx("td", { className: "px-4 py-3 font-mono text-xs sm:text-sm", children: row.concept }), _jsx("td", { className: "px-4 py-3 text-right", children: _jsx(MoneyDisplay, { amount: row.amount, size: "sm" }) })] }, row.key)))) })] }) }));
}
