import { FormEvent, useCallback, useEffect, useState } from 'react'
import type { PrinterInfo } from '@shared/types/settings'
import type { ThemeMode } from '@shared/types/api'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { useLogoImage } from '../../hooks/useLogoImage'
import { playScanSound, playSuccessSound } from '../../lib/sounds'
import { useSettingsStore } from '../../stores/settings.store'

export function SettingsPage(): React.JSX.Element {
  const store = useSettingsStore()
  const logoUrl = useLogoImage(store.companyLogoPath)

  const [theme, setTheme] = useState<ThemeMode>(store.theme)
  const [currencySymbol, setCurrencySymbol] = useState(store.currencySymbol)
  const [soundsEnabled, setSoundsEnabled] = useState(store.soundsEnabled)
  const [companyName, setCompanyName] = useState(store.companyName)
  const [companyAddress, setCompanyAddress] = useState(store.companyAddress)
  const [printerTicket, setPrinterTicket] = useState(store.printerTicket)
  const [printerLabels, setPrinterLabels] = useState(store.printerLabels)

  const [printers, setPrinters] = useState<PrinterInfo[]>([])
  const [detecting, setDetecting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const syncForm = useCallback(() => {
    setTheme(store.theme)
    setCurrencySymbol(store.currencySymbol)
    setSoundsEnabled(store.soundsEnabled)
    setCompanyName(store.companyName)
    setCompanyAddress(store.companyAddress)
    setPrinterTicket(store.printerTicket)
    setPrinterLabels(store.printerLabels)
  }, [store])

  useEffect(() => {
    if (store.hydrated) syncForm()
  }, [store.hydrated, syncForm])

  async function detectPrinters(): Promise<void> {
    setDetecting(true)
    setError(null)
    const result = await window.api.settings.listPrinters()
    setDetecting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setPrinters(result.data)
    setMessage(`${result.data.length} impresora(s) detectada(s)`)
  }

  useEffect(() => {
    void detectPrinters()
  }, [])

  const printerOptions = [
    { value: '', label: 'Predeterminada del sistema' },
    ...printers.map((p) => ({
      value: p.name,
      label: `${p.displayName}${p.isDefault ? ' (default)' : ''}`
    }))
  ]

  async function handlePickLogo(): Promise<void> {
    setError(null)
    const result = await window.api.settings.pickLogo()
    if (!result.ok) {
      setError(result.error)
      return
    }
    store.applyFromServer(result.data)
    syncForm()
    setMessage('Logo actualizado')
  }

  async function handleRemoveLogo(): Promise<void> {
    const result = await window.api.settings.removeLogo()
    if (result.ok) {
      store.applyFromServer(result.data)
      syncForm()
      setMessage('Logo eliminado')
    }
  }

  async function handleTestPrint(): Promise<void> {
    setError(null)
    const saveFirst = await store.save({
      printerTicket,
      companyName,
      companyAddress,
      currencySymbol
    })
    if (!saveFirst.ok) {
      setError(saveFirst.error)
      return
    }
    const result = await window.api.settings.testPrint()
    if (!result.ok) setError(result.error)
    else setMessage('Ticket de prueba enviado a la impresora')
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const result = await store.save({
      theme,
      currencySymbol,
      soundsEnabled,
      companyName,
      companyAddress,
      printerTicket,
      printerLabels
    })
    setSaving(false)
    if (!result.ok) {
      setError(result.error ?? 'Error al guardar')
      return
    }
    if (soundsEnabled) playSuccessSound()
    setMessage('Configuración guardada')
  }

  function handleTestSound(): void {
    if (soundsEnabled) playScanSound()
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h2 className="text-2xl font-semibold">Configuración</h2>
        <p className="text-sm text-[rgb(var(--text-muted))]">
          Empresa, impresoras, sonidos y apariencia
        </p>
      </header>

      {message && (
        <p className="mb-4 rounded-lg bg-brand/10 px-4 py-2 text-sm text-brand">{message}</p>
      )}
      {error && (
        <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-600">{error}</p>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-8">
        <section className="rounded-xl border border-surface-border bg-surface-elevated p-5">
          <h3 className="mb-4 font-medium">Empresa</h3>
          <div className="space-y-4">
            <Input
              label="Nombre comercial"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
            <Input
              label="Dirección"
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              placeholder="Opcional — aparece en el ticket"
            />
            <div>
              <p className="mb-2 text-sm font-medium">Logo (ticket)</p>
              <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-surface-border bg-surface/50">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-xs text-[rgb(var(--text-muted))]">Sin logo</span>
                )}
              </div>
              <div className="mt-2 flex gap-2">
                <Button type="button" variant="secondary" onClick={() => void handlePickLogo()}>
                  Elegir logo
                </Button>
                {store.companyLogoPath && (
                  <Button type="button" variant="ghost" onClick={() => void handleRemoveLogo()}>
                    Quitar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-surface-border bg-surface-elevated p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-medium">Impresoras</h3>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void detectPrinters()}
              disabled={detecting}
            >
              {detecting ? 'Detectando...' : 'Detectar impresoras'}
            </Button>
          </div>
          <div className="space-y-4">
            <Select
              label="Impresora de tickets (POS)"
              value={printerTicket}
              onChange={setPrinterTicket}
              options={printerOptions}
            />
            <Select
              label="Impresora de etiquetas"
              value={printerLabels}
              onChange={setPrinterLabels}
              options={printerOptions}
            />
            <p className="text-xs text-[rgb(var(--text-muted))]">
              Las etiquetas se configurarán en la Fase 6. Deje vacío para usar la impresora
              predeterminada de Windows.
            </p>
            <Button type="button" variant="secondary" onClick={() => void handleTestPrint()}>
              Imprimir ticket de prueba
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-surface-border bg-surface-elevated p-5">
          <h3 className="mb-4 font-medium">Sonidos</h3>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={soundsEnabled}
              onChange={(e) => setSoundsEnabled(e.target.checked)}
              className="rounded border-surface-border"
            />
            Sonidos al escanear y al cobrar
          </label>
          <Button type="button" variant="ghost" className="mt-2" onClick={handleTestSound}>
            Probar sonido
          </Button>
        </section>

        <section className="rounded-xl border border-surface-border bg-surface-elevated p-5">
          <h3 className="mb-4 font-medium">Apariencia y moneda</h3>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">Tema</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={theme === 'light' ? 'primary' : 'secondary'}
                  onClick={() => setTheme('light')}
                >
                  Claro
                </Button>
                <Button
                  type="button"
                  variant={theme === 'dark' ? 'primary' : 'secondary'}
                  onClick={() => setTheme('dark')}
                >
                  Oscuro
                </Button>
              </div>
            </div>
            <Input
              label="Símbolo de moneda"
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
              placeholder="S/"
              maxLength={6}
            />
          </div>
        </section>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar configuración'}
          </Button>
          {printers.length > 0 && (
            <Badge variant="muted">{printers.length} impresoras</Badge>
          )}
        </div>
      </form>
    </div>
  )
}
