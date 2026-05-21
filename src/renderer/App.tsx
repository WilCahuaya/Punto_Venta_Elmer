import { useEffect } from 'react'
import { HashRouter } from 'react-router-dom'
import { AppRoutes } from './routes'
import { useAuthStore } from './stores/auth.store'
import { useCashStore } from './stores/cash.store'
import { useSettingsStore } from './stores/settings.store'

export default function App(): React.JSX.Element {
  const hydrateAuth = useAuthStore((s) => s.hydrate)
  const hydrateCash = useCashStore((s) => s.hydrate)
  const hydrateSettings = useSettingsStore((s) => s.hydrate)

  useEffect(() => {
    void hydrateSettings()
    void hydrateAuth().then(() => hydrateCash())
  }, [hydrateAuth, hydrateCash, hydrateSettings])

  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  )
}
