import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { formatDateTime } from '../../lib/datetime';
function formatSize(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
export function BackupsPage() {
    const [backups, setBackups] = useState([]);
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    const [retentionDays, setRetentionDays] = useState('30');
    const [autoEnabled, setAutoEnabled] = useState(true);
    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        const [listRes, statusRes] = await Promise.all([
            window.api.backup.list(),
            window.api.backup.status()
        ]);
        if (listRes.ok)
            setBackups(listRes.data);
        else
            setError(listRes.error);
        if (statusRes.ok) {
            setStatus(statusRes.data);
            setRetentionDays(String(statusRes.data.retentionDays));
            setAutoEnabled(statusRes.data.autoEnabled);
        }
        setLoading(false);
    }, []);
    useEffect(() => {
        void load();
    }, [load]);
    async function handleCreate() {
        setWorking(true);
        setError(null);
        const result = await window.api.backup.create();
        setWorking(false);
        if (!result.ok)
            setError(result.error);
        else {
            setMessage(`Backup creado: ${result.data.fileName}`);
            void load();
        }
    }
    async function handleRestore(entry) {
        const ok = confirm(`¿Restaurar el backup "${entry.fileName}"?\n\n` +
            'Se reemplazará la base de datos actual. La aplicación se reiniciará.\n' +
            'Se perderán los cambios posteriores a este backup.');
        if (!ok)
            return;
        setWorking(true);
        const result = await window.api.backup.restore(entry.id);
        setWorking(false);
        if (!result.ok)
            setError(result.error);
    }
    async function handleExport(entry) {
        setWorking(true);
        const result = await window.api.backup.export(entry.id);
        setWorking(false);
        if (!result.ok)
            setError(result.error);
        else
            setMessage(`Exportado a: ${result.data}`);
    }
    async function handleImport() {
        setWorking(true);
        const result = await window.api.backup.import();
        setWorking(false);
        if (!result.ok)
            setError(result.error);
        else {
            setMessage(`Backup importado: ${result.data.fileName}`);
            void load();
        }
    }
    async function handleDelete(entry) {
        if (!confirm(`¿Eliminar backup "${entry.fileName}"?`))
            return;
        const result = await window.api.backup.delete(entry.id);
        if (!result.ok)
            setError(result.error);
        else {
            setMessage('Backup eliminado');
            void load();
        }
    }
    async function saveBackupSettings() {
        await window.api.settings.set('backup_auto_enabled', autoEnabled ? 'true' : 'false');
        await window.api.settings.set('backup_retention_days', retentionDays);
        setMessage('Configuración de backups guardada');
        void load();
    }
    return (_jsxs("div", { children: [_jsxs("header", { className: "mb-6 flex flex-wrap items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-semibold", children: "Backups" }), _jsx("p", { className: "text-sm text-[rgb(var(--text-muted))]", children: "Copias de seguridad de la base de datos SQLite" })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => void handleImport(), disabled: working, children: "Importar archivo .db" }), _jsx(Button, { onClick: () => void handleCreate(), disabled: working, children: working ? 'Procesando...' : 'Crear backup ahora' })] })] }), message && (_jsx("p", { className: "mb-4 rounded-lg bg-brand/10 px-4 py-2 text-sm text-brand", children: message })), error && (_jsx("p", { className: "mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-600", children: error })), status && (_jsxs("section", { className: "mb-6 grid gap-4 rounded-xl border border-surface-border bg-surface-elevated p-5 lg:grid-cols-2", children: [_jsxs("div", { children: [_jsx("h3", { className: "mb-2 font-medium", children: "Estado" }), _jsxs("ul", { className: "space-y-1 text-sm text-[rgb(var(--text-muted))]", children: [_jsxs("li", { children: ["Carpeta: ", _jsx("code", { className: "text-xs", children: status.backupsDir })] }), _jsxs("li", { children: ["Total backups: ", status.totalCount] }), _jsxs("li", { children: ["\u00DAltimo autom\u00E1tico:", ' ', status.lastAutoBackup
                                                ? formatDateTime(status.lastAutoBackup.createdAt)
                                                : 'Ninguno hoy'] })] })] }), _jsxs("div", { className: "space-y-3", children: [_jsx("h3", { className: "font-medium", children: "Configuraci\u00F3n autom\u00E1tica" }), _jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: autoEnabled, onChange: (e) => setAutoEnabled(e.target.checked) }), "Backup autom\u00E1tico diario al iniciar la app"] }), _jsx(Input, { label: "Retener backups autom\u00E1ticos (d\u00EDas)", type: "number", min: 1, max: 365, value: retentionDays, onChange: (e) => setRetentionDays(e.target.value) }), _jsx(Button, { variant: "secondary", type: "button", onClick: () => void saveBackupSettings(), children: "Guardar configuraci\u00F3n" })] })] })), _jsxs("section", { className: "overflow-hidden rounded-xl border border-surface-border", children: [_jsx("div", { className: "border-b border-surface-border bg-surface-elevated px-4 py-3", children: _jsx("h3", { className: "font-medium", children: "Historial de backups" }) }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full min-w-[720px] text-left text-sm", children: [_jsx("thead", { className: "border-b border-surface-border bg-surface/50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 font-medium", children: "Archivo" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Fecha" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Tipo" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Tama\u00F1o" }), _jsx("th", { className: "px-4 py-3 font-medium text-right", children: "Acciones" })] }) }), _jsx("tbody", { children: loading ? (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "px-4 py-8 text-center text-[rgb(var(--text-muted))]", children: "Cargando..." }) })) : backups.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "px-4 py-8 text-center text-[rgb(var(--text-muted))]", children: "Sin backups. Cree uno manual o espere el autom\u00E1tico diario." }) })) : (backups.map((b) => (_jsxs("tr", { className: "border-b border-surface-border/50 hover:bg-surface-elevated/40", children: [_jsx("td", { className: "px-4 py-3 font-mono text-xs", children: b.fileName }), _jsx("td", { className: "px-4 py-3 text-[rgb(var(--text-muted))]", children: formatDateTime(b.createdAt) }), _jsx("td", { className: "px-4 py-3", children: _jsx(Badge, { variant: b.type === 'auto' ? 'muted' : 'default', children: b.type === 'auto' ? 'Automático' : 'Manual' }) }), _jsx("td", { className: "px-4 py-3 tabular-nums", children: formatSize(b.sizeBytes) }), _jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "flex justify-end gap-1", children: [_jsx(Button, { variant: "ghost", type: "button", onClick: () => void handleExport(b), disabled: working, children: "Exportar" }), _jsx(Button, { variant: "secondary", type: "button", onClick: () => void handleRestore(b), disabled: working, children: "Restaurar" }), _jsx(Button, { variant: "ghost", type: "button", onClick: () => void handleDelete(b), disabled: working, children: "Eliminar" })] }) })] }, b.id)))) })] }) })] }), _jsx("p", { className: "mt-6 text-xs text-[rgb(var(--text-muted))]", children: "La restauraci\u00F3n reinicia la aplicaci\u00F3n. Exporte backups peri\u00F3dicamente a un disco externo o la nube para mayor seguridad." })] }));
}
