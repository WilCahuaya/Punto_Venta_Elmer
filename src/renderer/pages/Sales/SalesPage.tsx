import { Navigate, useLocation } from 'react-router-dom'

/** Redirige a Caja → Tickets (Ventas integrado en Caja, opción A). */
export function SalesPage(): React.JSX.Element {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  params.set('tab', 'tickets')
  return <Navigate to={`/cash?${params.toString()}`} replace />
}
