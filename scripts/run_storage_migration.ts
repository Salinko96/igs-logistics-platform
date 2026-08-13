import { db } from '../src/lib/db'
import { createAdminClient } from '../src/lib/supabase/server'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config()
dotenv.config({ path: '.env.local' })

export async function runStorageMigration() {
  console.log('--- Starting Supabase Storage Migration for transit-documents ---')

  const bucketName = 'transit-documents'
  const maxSizeBytes = 10485760 // 10MB
  const allowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']

  let sqlExecutedSuccessfully = false

  // 1. Try executing SQL migration via Prisma raw query
  try {
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260808200000_storage_transit_documents.sql')
    if (fs.existsSync(migrationPath)) {
      const sql = fs.readFileSync(migrationPath, 'utf8')
      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

      for (const statement of statements) {
        await db.$executeRawUnsafe(statement)
      }
      console.log('SQL Migration applied successfully via Prisma.')
      sqlExecutedSuccessfully = true
    }
  } catch (sqlError) {
    console.warn('Prisma raw SQL execution warning (falling back to Storage API):', (sqlError as Error).message)
  }

  // 2. Storage API verification and creation fallback via Supabase Admin Client
  try {
    const supabase = createAdminClient()
    const { data: bucket, error: getError } = await supabase.storage.getBucket(bucketName)

    if (getError || !bucket) {
      console.log(`Bucket '${bucketName}' does not exist via Storage API. Creating...`)
      const { data: newBucket, error: createError } = await supabase.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: maxSizeBytes,
        allowedMimeTypes,
      })

      if (createError) {
        throw new Error(`Failed to create bucket via Storage API: ${createError.message}`)
      }
      console.log(`Successfully created bucket '${bucketName}' via Storage API:`, newBucket)
    } else {
      console.log(`Bucket '${bucketName}' already exists. Updating configuration...`)
      const { error: updateError } = await supabase.storage.updateBucket(bucketName, {
        public: false,
        fileSizeLimit: maxSizeBytes,
        allowedMimeTypes,
      })

      if (updateError) {
        console.warn(`Bucket update notice: ${updateError.message}`)
      } else {
        console.log(`Updated bucket '${bucketName}' configuration successfully.`)
      }
    }
  } catch (apiError) {
    console.error('Storage API creation error:', (apiError as Error).message)
    if (!sqlExecutedSuccessfully) {
      throw apiError
    }
  }

  console.log(`--- Migration complete for bucket '${bucketName}' ---`)
}

if (require.main === module) {
  runStorageMigration()
    .then(() => {
      console.log('Migration script finished successfully.')
      process.exit(0)
    })
    .catch((err) => {
      console.error('Migration script failed:', err)
      process.exit(1)
    })
}
