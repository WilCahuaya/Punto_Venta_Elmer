import { protocol } from 'electron'
import { existsSync } from 'fs'
import { normalize } from 'path'

export function registerMediaScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'pos-media',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        bypassCSP: true,
        stream: true
      }
    }
  ])
}

export function setupMediaProtocolHandler(): void {
  protocol.registerFileProtocol('pos-media', (request, callback) => {
    try {
      const match = request.url.match(/^pos-media:\/\/img\/(.+)$/)
      if (!match) {
        callback({ error: -324 })
        return
      }
      const filePath = normalize(decodeURIComponent(match[1]))
      if (!existsSync(filePath)) {
        callback({ error: -6 })
        return
      }
      callback({ path: filePath })
    } catch {
      callback({ error: -324 })
    }
  })
}
