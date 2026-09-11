import { spawnSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { createRequire } from 'module'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const electronVersion = require(join(root, 'node_modules/electron/package.json')).version
const sqliteDir = join(root, 'node_modules/better-sqlite3')
const nodeFile = join(sqliteDir, 'build/Release/better_sqlite3.node')

function isWindowsPe(file) {
  if (!existsSync(file)) return false
  const buf = readFileSync(file)
  return buf.length >= 2 && buf[0] === 0x4d && buf[1] === 0x5a
}

if (process.platform !== 'win32') {
  process.exit(0)
}

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const result = spawnSync(
  npx,
  [
    '--yes',
    'prebuild-install',
    '--runtime',
    'electron',
    '--target',
    electronVersion,
    '--arch',
    process.arch,
    '--platform',
    'win32'
  ],
  { cwd: sqliteDir, stdio: 'inherit', shell: true }
)

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}

if (!isWindowsPe(nodeFile)) {
  console.error(
    'better-sqlite3: el archivo nativo no es un binario de Windows. Suele quedar un .node de Linux en node_modules.'
  )
  process.exit(1)
}

console.log('better-sqlite3: binario Windows para Electron', electronVersion)
