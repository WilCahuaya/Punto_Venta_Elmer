import { useEffect, useState } from 'react'

export function useLogoImage(relativePath: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load(): Promise<void> {
      if (!relativePath) {
        setUrl(null)
        return
      }
      const result = await window.api.settings.logoUrl(relativePath)
      if (!cancelled && result.ok) setUrl(result.data)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [relativePath])

  return url
}
