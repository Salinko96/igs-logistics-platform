import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const prisma = new PrismaClient()

async function main() {
  // 1. Get the first active organization from db
  const org = await prisma.organization.findFirst({
    where: { isActive: true },
  })

  if (!org) {
    console.error('❌ No active organization found in the database. Please run the main seed script first (npm run db:seed).')
    process.exit(1)
  }

  const email = 'admin@igsgf.com'
  const password = 'AdminPassword2026!'

  console.log(`Checking if admin user ${email} already exists...`)

  // 2. Fetch users to see if already exists
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) {
    throw listError
  }

  const existingUser = users.find((u) => u.email === email)

  if (existingUser) {
    console.log(`✅ Admin user ${email} already exists in Supabase.`)
    console.log(`User ID: ${existingUser.id}`)
  } else {
    console.log(`Creating admin user ${email} in Supabase...`)
    
    // 3. Create the user
    const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'ADMIN',
        first_name: 'Admin',
        last_name: 'IGS',
        organization_id: org.id,
      },
    })

    if (createError) {
      throw createError
    }

    if (!user) {
      throw new Error('User creation returned empty data')
    }

    console.log(`✅ Admin user created successfully!`)
    console.log(`User ID: ${user.id}`)
  }

  // 4. Verify in the Profile table that the profile has been created via trigger
  console.log('Verifying profile table entries...')
  const profile = await prisma.profile.findFirst({
    where: { email },
  })

  if (profile) {
    console.log(`✅ Public profile created for ${email}.`)
    console.log(`Profile ID: ${profile.id}, Role: ${profile.role}`)
  } else {
    console.warn(`⚠️ Profile not found for ${email}. The trigger might have failed or not completed yet.`)
  }
}

main()
  .catch((err) => {
    console.error('❌ Seeding admin failed:')
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
