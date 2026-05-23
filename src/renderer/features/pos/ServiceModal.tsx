import { FormEvent, useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { MoneyInput } from '../../components/ui/MoneyInput'

interface ServiceModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (description: string, amount: number) => void
}

export function ServiceModal({
  open,
  onClose,
  onConfirm
}: ServiceModalProps): React.JSX.Element {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setDescription('')
      setAmount(0)
      setError(null)
      setTimeout(() => nameRef.current?.focus(), 50)
    }
  }, [open])

  function handleSubmit(e: FormEvent): void {
    e.preventDefault()
    const name = description.trim()
    if (!name) {
      setError('Indique el nombre o descripción del servicio')
      return
    }
    if (amount <= 0) {
      setError('El monto debe ser mayor a cero')
      return
    }
    onConfirm(name, amount)
    onClose()
  }

  return (
    <Modal
      open={open}
      title="Servicio libre"
      onClose={onClose}
      size="md"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="service-form">
            Agregar al carrito
          </Button>
        </>
      }
    >
      <form id="service-form" onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-[rgb(var(--text-muted))]">
          Escriba qué está cobrando y el monto. Aparecerá así en el ticket y en reportes.
        </p>
        <Input
          ref={nameRef}
          label="Descripción del servicio"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej. Recarga Claro, Copias, Plastificado..."
          required
        />
        <MoneyInput
          label="Monto a cobrar"
          value={amount}
          onChange={setAmount}
          required
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>
    </Modal>
  )
}
