import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useAuthStore } from '../../stores/auth.store'

export function LoginPage(): React.JSX.Element {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const error = useAuthStore((s) => s.error)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setSubmitting(true)
    const ok = await login(username, password)
    setSubmitting(false)
    if (ok) navigate('/dashboard')
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-elevated p-8 shadow-sm">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-semibold">Iniciar sesión</h2>
        <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">
          Sistema POS offline
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <Input
          label="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus
        />
        <Input
          label="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          error={error ?? undefined}
        />
        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>

      {import.meta.env.DEV ? (
        <p className="mt-6 text-center text-xs text-[rgb(var(--text-muted))]">
          Desarrollo: usuario <strong>admin</strong> / <strong>admin123</strong>
        </p>
      ) : null}
    </div>
  )
}
