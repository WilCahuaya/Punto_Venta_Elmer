import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { MoneyDisplay } from '../../components/ui/MoneyDisplay';
import { ReturnSaleModal } from '../../features/reports/ReturnSaleModal';
import { VoidSaleModal } from '../../features/reports/VoidSaleModal';
import { SaleDetailModal } from '../../features/sales/SaleDetailModal';
import { formatDateTime, localDateIso, startOfMonth, startOfWeekMonday } from '../../lib/datetime';
import { useCashStore } from '../../stores/cash.store';
import { salePaymentLabel } from '@shared/lib/payment';
function saleStatusLabel(status) {
    return status === 'voided' ? 'ANULADA' : 'COMPLETADA';
}
export function DashboardPage() {
    const refreshCash = useCashStore((s) => s.refresh);
    const [stats, setStats] = useState(null);
    const [dateFrom, setDateFrom] = useState(() => localDateIso());
    const [dateTo, setDateTo] = useState(() => localDateIso());
    const [ticketQuery, setTicketQuery] = useState('');
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    const [printingId, setPrintingId] = useState(null);
    const [detailSaleId, setDetailSaleId] = useState(null);
    const [voidTarget, setVoidTarget] = useState(null);
    const [returnTarget, setReturnTarget] = useState(null);
    const range = { dateFrom, dateTo };
    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        await refreshCash();
        const [dashRes, reportRes] = await Promise.all([
            window.api.dashboard.getStats(),
            window.api.reports.getSummary(range)
        ]);
        if (dashRes.ok)
            setStats(dashRes.data);
        if (reportRes.ok)
            setReport(reportRes.data);
        else
            setError(reportRes.error);
        setLoading(false);
    }, [refreshCash, dateFrom, dateTo]);
    useEffect(() => {
        void load();
    }, [load]);
    const filteredSales = useMemo(() => {
        const rows = report?.allSales ?? [];
        const q = ticketQuery.trim().toLowerCase();
        if (!q)
            return rows;
        return rows.filter((s) => s.ticketNumber.toLowerCase().includes(q));
    }, [report?.allSales, ticketQuery]);
    function setRangeToday() {
        const today = localDateIso();
        setDateFrom(today);
        setDateTo(today);
    }
    function setRangeThisWeek() {
        const today = new Date();
        setDateFrom(localDateIso(startOfWeekMonday(today)));
        setDateTo(localDateIso(today));
    }
    function setRangeThisMonth() {
        const today = new Date();
        setDateFrom(localDateIso(startOfMonth(today)));
        setDateTo(localDateIso(today));
    }
    async function handleReprint(sale) {
        setPrintingId(sale.id);
        setMessage(null);
        setError(null);
        const res = await window.api.sales.printTicket(sale.id);
        setPrintingId(null);
        if (res.ok)
            setMessage(`Ticket ${sale.ticketNumber} enviado a impresora`);
        else
            setError(res.error);
    }
    async function handleExportPdf() {
        setExporting('pdf');
        setError(null);
        setMessage(null);
        try {
            const result = await window.api.reports.exportPdf(range);
            if (!result.ok)
                setError(result.error);
            else
                setMessage(`PDF guardado: ${result.data}`);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Error al exportar PDF');
        }
        finally {
            setExporting(null);
        }
    }
    async function handleExportExcel() {
        setExporting('excel');
        setError(null);
        setMessage(null);
        try {
            const result = await window.api.reports.exportExcel(range);
            if (!result.ok)
                setError(result.error);
            else
                setMessage(`Excel guardado: ${result.data}`);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Error al exportar Excel');
        }
        finally {
            setExporting(null);
        }
    }
    async function handleVoidConfirm(reason) {
        if (!voidTarget)
            return;
        const result = await window.api.sales.void({ saleId: voidTarget.id, reason });
        if (!result.ok) {
            setError(result.error);
            return;
        }
        setVoidTarget(null);
        setMessage(`Venta ${result.data.ticketNumber} anulada`);
        void load();
    }
    if (loading && !stats && !report) {
        return (_jsx("div", { className: "flex h-64 items-center justify-center text-[rgb(var(--text-muted))]", children: "Cargando..." }));
    }
    const session = stats?.currentSession;
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("header", { className: "flex flex-wrap items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-semibold", children: "Inicio" }), _jsx("p", { className: "text-sm text-[rgb(var(--text-muted))]", children: "Resumen, buscar tickets y reimprimir" })] }), _jsx(Button, { variant: "secondary", onClick: () => void load(), disabled: loading, children: "Actualizar" })] }), message && (_jsx("p", { className: "rounded-lg bg-brand/10 px-4 py-2 text-sm text-brand", children: message })), error && (_jsx("p", { className: "rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-600", children: error })), stats && (_jsxs("section", { className: "rounded-xl border border-brand/20 bg-brand/5 p-5", children: [_jsxs("div", { className: "mb-4 flex flex-wrap items-center justify-between gap-2", children: [_jsx("h3", { className: "font-medium", children: "Caja" }), _jsx(Badge, { variant: stats.cashOpen ? 'success' : 'warning', children: stats.cashOpen ? 'Abierta' : 'Cerrada' })] }), stats.cashOpen && session ? (_jsxs("div", { className: "flex flex-wrap items-end justify-between gap-6", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-[rgb(var(--text-muted))]", children: "Efectivo esperado ahora" }), _jsx(MoneyDisplay, { amount: session.expectedInDrawer, size: "lg", className: "mt-1 font-semibold" }), _jsxs("p", { className: "mt-2 text-xs text-[rgb(var(--text-muted))]", children: ["Turno #", session.id, " \u00B7 Abierto ", formatDateTime(session.openedAt)] })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Link, { to: "/cash", children: _jsx(Button, { children: "Ir a Caja" }) }), _jsx(Link, { to: "/cash?tab=tickets", children: _jsx(Button, { variant: "secondary", type: "button", children: "Tickets del turno" }) })] })] })) : (_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [_jsx("p", { className: "text-sm text-[rgb(var(--text-muted))]", children: "Abra la caja para vender desde el POS." }), _jsx(Link, { to: "/cash", children: _jsx(Button, { children: "Abrir caja" }) })] }))] })), report && (_jsxs("section", { children: [_jsx("h3", { className: "mb-3 text-sm font-medium text-[rgb(var(--text-muted))]", children: "Resumen del per\u00EDodo" }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7", children: [_jsx(KpiCard, { title: "Ventas", value: report.completedCount, suffix: "tickets" }), _jsx(KpiCard, { title: "Ingresos netos", children: _jsx(MoneyDisplay, { amount: report.netCompletedTotal, size: "lg" }) }), _jsx(KpiCard, { title: "Efectivo", children: _jsx(MoneyDisplay, { amount: report.cashNetTotal, size: "lg" }) }), _jsx(KpiCard, { title: "Yape", children: _jsx(MoneyDisplay, { amount: report.yapeNetTotal, size: "lg" }) }), _jsx(KpiCard, { title: "Devoluciones", children: _jsx(MoneyDisplay, { amount: report.returnsTotal, size: "lg", className: report.returnsTotal > 0 ? 'text-amber-600' : '' }) }), _jsx(KpiCard, { title: "Ganancia", children: _jsx(MoneyDisplay, { amount: report.profit, size: "lg", className: "text-emerald-600" }) }), _jsx(KpiCard, { title: "Anulaciones", value: report.voidedCount, suffix: "tickets", highlight: true })] })] })), _jsxs("section", { className: "overflow-hidden rounded-xl border-2 border-brand/30 bg-surface-elevated shadow-sm", children: [_jsxs("div", { className: "border-b border-brand/15 bg-brand/5 px-4 py-3 sm:px-5", children: [_jsx("h3", { className: "text-lg font-semibold", children: "Buscar ticket" }), _jsx("p", { className: "text-sm text-[rgb(var(--text-muted))]", children: "Filtre por fecha y c\u00F3digo para reimprimir" })] }), _jsxs("div", { className: "flex flex-wrap items-end gap-3 px-4 py-4 sm:px-5", children: [_jsx(Input, { label: "Desde", type: "date", value: dateFrom, onChange: (e) => setDateFrom(e.target.value) }), _jsx(Input, { label: "Hasta", type: "date", value: dateTo, onChange: (e) => setDateTo(e.target.value) }), _jsx("div", { className: "min-w-[220px] flex-1", children: _jsx(Input, { label: "C\u00F3digo de ticket", placeholder: "Ej. 0009 o 20240804-0009", value: ticketQuery, onChange: (e) => setTicketQuery(e.target.value) }) }), _jsxs("div", { className: "flex flex-wrap gap-2 pb-0.5", children: [_jsx(Button, { variant: "ghost", type: "button", onClick: setRangeToday, children: "Hoy" }), _jsx(Button, { variant: "ghost", type: "button", onClick: setRangeThisWeek, children: "Semana" }), _jsx(Button, { variant: "ghost", type: "button", onClick: setRangeThisMonth, children: "Mes" }), ticketQuery && (_jsx(Button, { variant: "ghost", type: "button", onClick: () => setTicketQuery(''), children: "Limpiar" }))] })] }), _jsx("div", { className: "max-h-[420px] overflow-y-auto border-t border-surface-border", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "sticky top-0 z-10 bg-surface-elevated", children: _jsxs("tr", { className: "border-b border-surface-border text-left", children: [_jsx("th", { className: "px-4 py-2.5 font-medium", children: "Ticket" }), _jsx("th", { className: "px-4 py-2.5 font-medium", children: "Fecha" }), _jsx("th", { className: "px-4 py-2.5 font-medium", children: "Pago" }), _jsx("th", { className: "px-4 py-2.5 font-medium", children: "Estado" }), _jsx("th", { className: "px-4 py-2.5 text-right font-medium", children: "Total" }), _jsx("th", { className: "px-4 py-2.5 text-right font-medium", children: "Acciones" })] }) }), _jsx("tbody", { children: loading && !report ? (_jsx("tr", { children: _jsx("td", { colSpan: 6, className: "px-4 py-10 text-center text-[rgb(var(--text-muted))]", children: "Cargando tickets..." }) })) : filteredSales.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 6, className: "px-4 py-10 text-center text-[rgb(var(--text-muted))]", children: ticketQuery
                                                ? `Ningún ticket coincide con «${ticketQuery}»`
                                                : 'Sin ventas en estas fechas' }) })) : (filteredSales.map((s) => (_jsxs("tr", { className: [
                                            'border-b border-surface-border/50',
                                            s.status === 'voided'
                                                ? 'bg-red-500/5'
                                                : 'hover:bg-surface/60'
                                        ].join(' '), children: [_jsx("td", { className: "px-4 py-3 font-mono font-medium", children: s.ticketNumber }), _jsxs("td", { className: "px-4 py-3", children: [_jsx("div", { children: formatDateTime(s.createdAt) }), s.status === 'completed' && s.returnedTotal > 0 && (_jsxs("div", { className: "text-xs text-amber-600", children: ["Devuelto:", ' ', _jsx(MoneyDisplay, { amount: s.returnedTotal, size: "sm", className: "inline" })] }))] }), _jsx("td", { className: "px-4 py-3", children: _jsx(Badge, { variant: s.isCredit ? 'warning' : s.paymentMethod === 'yape' ? 'default' : 'muted', children: salePaymentLabel(s) }) }), _jsx("td", { className: "px-4 py-3", children: _jsx(Badge, { variant: s.status === 'voided' ? 'warning' : 'success', children: saleStatusLabel(s.status) }) }), _jsx("td", { className: "px-4 py-3 text-right", children: _jsx(MoneyDisplay, { amount: s.status === 'voided' ? s.total : s.netTotal, size: "sm" }) }), _jsx("td", { className: "px-4 py-3 text-right", children: _jsxs("div", { className: "flex flex-wrap justify-end gap-1", children: [_jsx(Button, { type: "button", disabled: printingId === s.id, onClick: () => void handleReprint(s), children: printingId === s.id ? 'Imprimiendo...' : 'Reimprimir' }), _jsx(Button, { variant: "secondary", type: "button", onClick: () => setDetailSaleId(s.id), children: "Ver" }), s.status === 'completed' && (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "ghost", type: "button", onClick: () => setReturnTarget(s), children: "Devolver" }), _jsx(Button, { variant: "danger", type: "button", onClick: () => setVoidTarget(s), children: "Anular" })] }))] }) })] }, s.id)))) })] }) }), report && (_jsxs("p", { className: "border-t border-surface-border px-4 py-2 text-xs text-[rgb(var(--text-muted))]", children: ["Mostrando ", filteredSales.length, " de ", report.allSales.length, " ticket(s)"] }))] }), stats && stats.lowStockProducts.length > 0 && (_jsx("section", { className: "rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3", children: _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [_jsxs("p", { className: "text-sm", children: [_jsx("span", { className: "font-medium text-amber-800 dark:text-amber-300", children: "Stock bajo:" }), ' ', stats.lowStockProducts.length, " producto(s)"] }), _jsx(Link, { to: "/products", className: "text-sm text-brand hover:underline", children: "Ver productos" })] }) })), _jsxs("section", { className: "rounded-xl border border-surface-border", children: [_jsxs("button", { type: "button", className: "flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-elevated/50", onClick: () => setShowAdvanced((v) => !v), children: [_jsxs("div", { children: [_jsx("h3", { className: "font-medium", children: "M\u00E1s reportes" }), _jsx("p", { className: "text-xs text-[rgb(var(--text-muted))]", children: "Exportar PDF/Excel, top productos y anulaciones" })] }), _jsx("span", { className: "text-sm text-[rgb(var(--text-muted))]", children: showAdvanced ? 'Ocultar ▲' : 'Mostrar ▼' })] }), showAdvanced && report && (_jsxs("div", { className: "space-y-4 border-t border-surface-border p-4", children: [_jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Button, { variant: "secondary", disabled: !!exporting, onClick: () => void handleExportPdf(), children: exporting === 'pdf' ? 'Exportando...' : 'Exportar PDF' }), _jsx(Button, { variant: "secondary", disabled: !!exporting, onClick: () => void handleExportExcel(), children: exporting === 'excel' ? 'Exportando...' : 'Exportar Excel' })] }), _jsxs("div", { className: "grid gap-4 lg:grid-cols-2", children: [_jsx(ReportTable, { title: "Productos m\u00E1s vendidos", empty: "Sin ventas en el per\u00EDodo", headers: ['Producto', 'Cant.', 'Total'], rows: report.topProducts.map((p) => [
                                            p.productName,
                                            String(p.quantitySold),
                                            _jsx(MoneyDisplay, { amount: p.revenue, size: "sm" }, "t")
                                        ]) }), _jsx(ReportTable, { title: `Anulaciones (${report.voidedCount})`, empty: "Sin anulaciones", headers: ['Ticket', 'Fecha', 'Motivo', 'Total'], rows: report.voidedSales.map((s) => [
                                            s.ticketNumber,
                                            s.voidedAt ? formatDateTime(s.voidedAt) : '—',
                                            s.voidReason ?? '—',
                                            _jsx(MoneyDisplay, { amount: s.total, size: "sm" }, "t")
                                        ]) })] }), stats && stats.lowStockProducts.length > 0 && (_jsxs("div", { className: "overflow-hidden rounded-xl border border-amber-500/30", children: [_jsx("div", { className: "border-b border-amber-500/20 bg-amber-500/5 px-4 py-3", children: _jsxs("h3", { className: "text-sm font-medium", children: ["Stock bajo (", stats.lowStockProducts.length, ")"] }) }), _jsx("ul", { className: "max-h-40 divide-y divide-surface-border/60 overflow-y-auto", children: stats.lowStockProducts.map((p) => (_jsxs("li", { className: "flex items-center justify-between gap-2 px-4 py-2 text-sm", children: [_jsx("span", { children: p.name }), _jsxs(Badge, { variant: "warning", children: [p.stock, " / ", p.stockMin] })] }, p.id))) })] }))] }))] }), _jsx(SaleDetailModal, { open: detailSaleId != null, saleId: detailSaleId, onClose: () => setDetailSaleId(null), onVoid: (id) => {
                    const row = report?.allSales.find((s) => s.id === id) ?? null;
                    setDetailSaleId(null);
                    if (row)
                        setVoidTarget(row);
                }, onReturn: (id) => {
                    const row = report?.allSales.find((s) => s.id === id) ?? null;
                    setDetailSaleId(null);
                    if (row)
                        setReturnTarget(row);
                } }), _jsx(VoidSaleModal, { open: !!voidTarget, sale: voidTarget, onClose: () => setVoidTarget(null), onConfirm: handleVoidConfirm }), _jsx(ReturnSaleModal, { open: !!returnTarget, sale: returnTarget, onClose: () => setReturnTarget(null), onSaved: () => {
                    setReturnTarget(null);
                    setMessage('Devolución registrada');
                    void load();
                } })] }));
}
function KpiCard({ title, value, suffix, children, highlight }) {
    return (_jsxs("div", { className: [
            'rounded-xl border border-surface-border bg-surface-elevated p-4',
            highlight ? 'ring-2 ring-amber-500/20' : ''
        ].join(' '), children: [_jsx("p", { className: "text-sm text-[rgb(var(--text-muted))]", children: title }), _jsx("div", { className: "mt-2", children: children ?? (_jsxs("span", { className: "text-2xl font-semibold tabular-nums", children: [value, suffix ? (_jsx("span", { className: "ml-1 text-sm font-normal text-[rgb(var(--text-muted))]", children: suffix })) : null] })) })] }));
}
function ReportTable({ title, headers, rows, empty }) {
    return (_jsxs("section", { className: "overflow-hidden rounded-xl border border-surface-border", children: [_jsx("div", { className: "border-b border-surface-border bg-surface/50 px-4 py-3", children: _jsx("h3", { className: "font-medium", children: title }) }), rows.length === 0 ? (_jsx("p", { className: "px-4 py-8 text-center text-sm text-[rgb(var(--text-muted))]", children: empty })) : (_jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsx("tr", { className: "border-b border-surface-border bg-surface/50 text-left", children: headers.map((h) => (_jsx("th", { className: "px-4 py-2 font-medium", children: h }, h))) }) }), _jsx("tbody", { children: rows.map((row, i) => (_jsx("tr", { className: "border-b border-surface-border/50", children: row.map((cell, j) => (_jsx("td", { className: "px-4 py-2.5", children: cell }, j))) }, i))) })] }))] }));
}
