import { FormEvent, useState } from 'react'
import type { CashMovementType } from '@shared/types/cash'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { MoneyInput } from '../../components/ui/MoneyInput'
import { useCashStore } from '../../stores/cash.store'

interface MovementModalProps {
  open: boolean
  type: CashMovementType
  onClose: () => void
  onSaved: () => void
}

export function MovementModal({
  open,
  type,
  onClose,
  onSaved
}: MovementModalProps): React.JSX.Element {
  const [amount, setAmount] = useState(0)
  const [concept, setConcept] = useState('')
  const [reference, setReference] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const refresh = useCashStore((s) => s.refresh)

  const title = type === 'income' ? 'Registrar ingreso' : 'Registrar egreso'

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const result = await window.api.cash.addMovement({
      type,
      amount,
      concept,
      reference: reference || null
    })
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    await refresh()
    onSaved()
    onClose()
    setConcept('')
    setReference('')
    setAmount(0)
  }

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="movement-form" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </>
      }
    >
      <form id="movement-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <MoneyInput label="Monto" value={amount} onChange={setAmount} required />
        <Input
          label="Concepto"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          required
          autoFocus
        />
        <Input
          label="Referencia (opcional)"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>
    </Modal>
  )
}
