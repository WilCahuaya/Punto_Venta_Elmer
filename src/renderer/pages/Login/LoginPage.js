import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../stores/auth.store';
export function LoginPage() {
    const navigate = useNavigate();
    const login = useAuthStore((s) => s.login);
    const error = useAuthStore((s) => s.error);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitting(true);
        const ok = await login(username, password);
        setSubmitting(false);
        if (ok)
            navigate('/dashboard');
    }
    return (_jsxs("div", { className: "w-full max-w-md rounded-2xl border border-surface-border bg-surface-elevated p-8 shadow-sm", children: [_jsxs("div", { className: "mb-8 text-center", children: [_jsx("h2", { className: "text-2xl font-semibold", children: "Iniciar sesi\u00F3n" }), _jsx("p", { className: "mt-2 text-sm text-[rgb(var(--text-muted))]", children: "Sistema POS offline" })] }), _jsxs("form", { onSubmit: (e) => void handleSubmit(e), className: "space-y-4", children: [_jsx(Input, { label: "Usuario", value: username, onChange: (e) => setUsername(e.target.value), autoComplete: "username", autoFocus: true }), _jsx(Input, { label: "Contrase\u00F1a", type: "password", value: password, onChange: (e) => setPassword(e.target.value), autoComplete: "current-password", error: error ?? undefined }), _jsx(Button, { type: "submit", fullWidth: true, disabled: submitting, children: submitting ? 'Entrando...' : 'Entrar' })] }), import.meta.env.DEV ? (_jsxs("p", { className: "mt-6 text-center text-xs text-[rgb(var(--text-muted))]", children: ["Desarrollo: usuario ", _jsx("strong", { children: "admin" }), " / ", _jsx("strong", { children: "admin123" })] })) : null] }));
}
