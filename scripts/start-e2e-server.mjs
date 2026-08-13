import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawn } from 'node:child_process'

function findServer(directory) {
  if (!existsSync(directory)) return null
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue
    const path = join(directory, entry.name)
    if (entry.isFile() && entry.name === 'server.js') return path
    if (entry.isDirectory()) {
      const nested = findServer(path)
      if (nested) return nested
    }
  }
  return null
}

const server = findServer(join(process.cwd(), '.next', 'standalone'))
if (!server) throw new Error('Serveur Next standalone introuvable. Exécutez npm run build avant les tests E2E.')

const serverRoot = dirname(server)
const staticSource = join(process.cwd(), '.next', 'static')
const staticTarget = join(serverRoot, '.next', 'static')
mkdirSync(dirname(staticTarget), { recursive: true })
cpSync(staticSource, staticTarget, { recursive: true, force: true })
cpSync(join(process.cwd(), 'public'), join(serverRoot, 'public'), { recursive: true, force: true })

const child = spawn(process.execPath, [server], {
  stdio: 'inherit',
  env: { ...process.env, PORT: process.env.PORT || '3100', HOSTNAME: process.env.HOSTNAME || '127.0.0.1' },
})

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 1)
})
