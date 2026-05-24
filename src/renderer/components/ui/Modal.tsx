import { useEffect } from 'react'
import { Button } from './Button'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl'
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  size = 'lg'
}: ModalProps): React.JSX.Element | null {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        role="dialog"
        className={[
          'relative z-10 flex max-h-[90vh] w-full flex-col rounded-2xl border border-surface-border bg-surface-elevated shadow-xl',
          sizes[size]
        ].join(' ')}
      >
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button variant="ghost" type="button" onClick={onClose} aria-label="Cerrar">
            ✕
          </Button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-surface-border px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
