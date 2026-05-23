function normalizeNameKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function hashKey(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Extrae iniciales de cada palabra (ej. "Ropa Hombre" → "RH", "Camisa Polo" → "CP"). */
export function extractInitials(
  text: string,
  maxWords = 3,
  charsPerWord = 2
): string {
  const words = text
    .trim()
    .split(/\s+/)
    .filter((w) => /[a-zA-Z0-9áéíóúñÁÉÍÓÚÑ]/.test(w))

  return words
    .slice(0, maxWords)
    .map((word) => {
      const clean = word.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ]/g, '')
      return clean.slice(0, charsPerWord).toUpperCase()
    })
    .join('')
}

/**
 * Código legible con iniciales de categoría y producto (ej. RH-CP-3847).
 */
export function deriveBarcodeFromCatalog(
  categoryName: string,
  productName: string
): string {
  const cat = extractInitials(categoryName, 2, 2)
  const prod = extractInitials(productName, 3, 2)
  if (!cat && !prod) return ''

  const prefix = [cat, prod].filter(Boolean).join('-')
  const key = `${normalizeNameKey(categoryName)}:${normalizeNameKey(productName)}`
  const seq = String(hashKey(key) % 10000).padStart(4, '0')
  return `${prefix}-${seq}`
}

export function resolveUniqueBarcode(
  base: string,
  isTaken: (code: string) => boolean
): string {
  if (!base) return base
  if (!isTaken(base)) return base

  for (let n = 1; n <= 99; n++) {
    const candidate = `${base}-${String(n).padStart(2, '0')}`
    if (!isTaken(candidate)) return candidate
  }

  return `${base}-${Date.now().toString().slice(-4)}`
}
