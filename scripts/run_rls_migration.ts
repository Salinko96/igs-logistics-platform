import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
  const sqlPath = path.join(__dirname, '../supabase/migrations/20260808193500_supabase_rls_policies.sql')
  console.log(`Reading SQL RLS policies from: ${sqlPath}`)
  
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Migration SQL file not found at ${sqlPath}`)
  }
  
  const content = fs.readFileSync(sqlPath, 'utf8')
  
  // Split by semicolon, but be careful not to execute empty statements
  const statements = content
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0)
    
  console.log(`Running ${statements.length} SQL statements one by one on database...`)
  
  for (let i = 0; i < statements.length; i++) {
    console.log(`Executing RLS statement ${i + 1}/${statements.length}...`)
    try {
      await prisma.$executeRawUnsafe(statements[i])
    } catch (err) {
      console.error(`❌ Statement ${i + 1} failed:`)
      console.error(statements[i])
      console.error(err)
      process.exit(1)
    }
  }
  
  console.log('✅ RLS Policies Migration completed!')
}

main()
  .catch((err) => {
    console.error('❌ Migration execution failed:')
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
