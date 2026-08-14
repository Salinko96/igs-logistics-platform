import { readFile } from 'node:fs/promises'
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' }); dotenv.config({ path: '.env' })

function splitSql(sql: string) {
  const statements: string[] = []; let current = ''; let single = false; let double = false; let dollar = ''; let lineComment = false; let blockComment = false
  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index]; const next = sql[index + 1] || ''
    if (lineComment) { current += char; if (char === '\n') lineComment = false; continue }
    if (blockComment) { current += char; if (char === '*' && next === '/') { current += next; index += 1; blockComment = false } continue }
    if (!single && !double && !dollar && char === '-' && next === '-') { lineComment = true; current += char + next; index += 1; continue }
    if (!single && !double && !dollar && char === '/' && next === '*') { blockComment = true; current += char + next; index += 1; continue }
    if (!single && !double && char === '$') {
      const match = sql.slice(index).match(/^\$[A-Za-z0-9_]*\$/)
      if (match && (!dollar || match[0] === dollar)) { current += match[0]; index += match[0].length - 1; dollar = dollar ? '' : match[0]; continue }
    }
    if (!double && !dollar && char === "'" && sql[index - 1] !== '\\') single = !single
    if (!single && !dollar && char === '"' && sql[index - 1] !== '\\') double = !double
    if (char === ';' && !single && !double && !dollar) { if (current.trim()) statements.push(current.trim()); current = ''; continue }
    current += char
  }
  if (current.trim()) statements.push(current.trim())
  return statements
}

async function main() {
  const files = process.argv.slice(2); if (!files.length) throw new Error('Indiquez au moins un fichier SQL')
  const db = new PrismaClient()
  try {
    for (const file of files) {
      const statements = splitSql(await readFile(file, 'utf8'))
      console.log(`${file}: ${statements.length} instructions`)
      for (let index = 0; index < statements.length; index += 1) await db.$executeRawUnsafe(statements[index])
      console.log(`${file}: appliqué`)
    }
  } finally { await db.$disconnect() }
}
main().catch((error) => { console.error(error); process.exit(1) })
