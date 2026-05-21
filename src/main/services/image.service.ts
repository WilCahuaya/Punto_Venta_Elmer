import { copyFileSync, existsSync, mkdirSync, unlinkSync } from 'fs'
import { extname, join } from 'path'
import { dialog } from 'electron'
import { getImagesDir, resolveImagePath } from '../utils/paths'

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])

export function ensureImagesDir(): void {
  const dir = getImagesDir()
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

export async function pickImageFile(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    title: 'Seleccionar imagen',
    properties: ['openFile'],
    filters: [{ name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }]
  })
  if (result.canceled || !result.filePaths[0]) return null
  return result.filePaths[0]
}

export function storeProductImage(sourcePath: string, productId: number): string {
  ensureImagesDir()
  const ext = extname(sourcePath).toLowerCase()
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error('Formato de imagen no permitido')
  }
  const relative = join('images', `product-${productId}${ext}`)
  const dest = resolveImagePath(relative)
  copyFileSync(sourcePath, dest)
  return relative.replace(/\\/g, '/')
}

export function deleteImageIfExists(relativePath: string | null | undefined): void {
  if (!relativePath) return
  const full = resolveImagePath(relativePath)
  if (existsSync(full)) unlinkSync(full)
}

export function getImageMediaUrl(relativePath: string | null): string | null {
  if (!relativePath) return null
  const full = resolveImagePath(relativePath)
  if (!existsSync(full)) return null
  return `pos-media://img/${encodeURIComponent(full)}`
}
