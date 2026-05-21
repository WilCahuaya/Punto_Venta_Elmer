import { FormEvent, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { MoneyInput } from '../../components/ui/MoneyInput'
import { useCashStore } from '../../stores/cash.store'

interface OpenCashModalProps {
  open: boolean
  onClose: () => void
}

export function OpenCashModal({ open, onClose }: OpenCashModalProps): React.JSX.Element {
  const [amount, setAmount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const refresh = useCashStore((s) => s.refresh)

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const result = await window.api.cash.open({ openingAmount: amount })
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    useCashStore.getState().setCurrent(result.data)
    onClose()
    void refresh()
  }

  return (
    <Modal
      open={open}
      title="Abrir caja"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="open-cash-form" disabled={saving}>
            {saving ? 'Abriendo...' : 'Abrir caja'}
          </Button>
        </>
      }
    >
      <form id="open-cash-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <p className="text-sm text-[rgb(var(--text-muted))]">
          Ingrese el monto inicial en efectivo con el que inicia el turno.
        </p>
        <MoneyInput label="Monto de apertura" value={amount} onChange={setAmount} required />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>
    </Modal>
  )
}
