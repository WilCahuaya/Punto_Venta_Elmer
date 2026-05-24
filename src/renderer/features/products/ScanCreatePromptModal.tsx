import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'

interface ScanCreatePromptModalProps {
  open: boolean
  barcode: string
  onClose: () => void
  onCreate: () => void
}

export function ScanCreatePromptModal({
  open,
  barcode,
  onClose,
  onCreate
}: ScanCreatePromptModalProps): React.JSX.Element {
  return (
    <Modal
      open={open}
      title="Código no registrado"
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={onCreate}>
            Crear producto
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-2xl">
          📦
        </div>
        <div>
          <p className="text-sm text-[rgb(var(--text-muted))]">
            No hay ningún producto con este código de barras.
          </p>
          <p className="mt-3 rounded-lg border border-surface-border bg-surface/60 px-3 py-2 font-mono text-sm font-semibold">
            {barcode}
          </p>
        </div>
        <p className="text-sm text-[rgb(var(--text-muted))]">
          ¿Desea crear un producto nuevo con este código? Usted completará el nombre, precios y
          demás datos.
        </p>
      </div>
    </Modal>
  )
}
