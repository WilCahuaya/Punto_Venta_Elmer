import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

const sharedAlias = { '@shared': resolve('src/shared') }
/** Preferir fuentes TS: tsc emite .js al lado y Vite resolvía esos archivos viejos. */
const sourceFirstExtensions = ['.tsx', '.ts', '.mts', '.jsx', '.mjs', '.js', '.json']

export default defineConfig({
  main: {
    resolve: { alias: sharedAlias, extensions: sourceFirstExtensions },
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts')
        }
      }
    }
  },
  preload: {
    resolve: { alias: sharedAlias, extensions: sourceFirstExtensions },
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer'),
        '@shared': resolve('src/shared')
      },
      extensions: sourceFirstExtensions
    },
    plugins: [react()]
  }
})
