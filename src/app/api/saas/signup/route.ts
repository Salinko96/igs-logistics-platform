import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { validatePassword, PASSWORD_POLICY_MESSAGE } from '@/lib/security/password'
import { sendTransactionalEmail, welcomeEmail } from '@/lib/saas/email'

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 45)
}

export async function POST(request: NextRequest) {
  let authUserId: string | null = null
  try {
    const body = await request.json()
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
    const organizationName = typeof body.organizationName === 'string' ? body.organizationName.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!firstName || !lastName || !organizationName || !email) return NextResponse.json({ error: 'Tous les champs sont obligatoires.' }, { status: 400 })
    if (!validatePassword(password)) return NextResponse.json({ error: PASSWORD_POLICY_MESSAGE }, { status: 400 })
    if (await db.profile.findFirst({ where: { email }, select: { id: true } })) return NextResponse.json({ error: 'Cette adresse email est déjà utilisée.' }, { status: 409 })

    const supabase = await createClient()
    const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${origin}/login?confirmed=1`, data: { first_name: firstName, last_name: lastName } } })
    if (error || !data.user) throw new Error(error?.message || 'Création du compte impossible')
    if (data.user.identities?.length === 0) return NextResponse.json({ error: 'Cette adresse email est déjà utilisée.' }, { status: 409 })
    authUserId = data.user.id

    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    const baseSlug = slugify(organizationName) || 'organisation'
    await db.$transaction(async (tx) => {
      const organization = await tx.organization.create({ data: { name: organizationName, slug: `${baseSlug}-${authUserId!.slice(0, 6)}`, email } })
      await tx.organizationSettings.create({ data: { organizationId: organization.id } })
      await tx.profile.create({ data: { organizationId: organization.id, userId: authUserId!, firstName, lastName, email, role: 'ADMIN' } })
      const plan = await tx.saaSPlan.findUnique({ where: { code: 'starter' } })
      if (!plan) throw new Error('Plan Starter non configuré')
      await tx.saaSSubscription.create({ data: { organizationId: organization.id, planId: plan.id, status: 'trialing', billingCycle: 'monthly', provider: 'manual', currentPeriodStart: new Date(), currentPeriodEnd: trialEndsAt, trialEndsAt } })
    })
    const admin = createAdminClient()
    const organization = await db.profile.findUnique({ where: { userId: authUserId }, include: { organization: true } })
    await admin.auth.admin.updateUserById(authUserId, { user_metadata: { role: 'ADMIN', organization_id: organization?.organizationId, first_name: firstName, last_name: lastName } })
    sendTransactionalEmail({ to: email, ...welcomeEmail(firstName, organizationName) }).catch(console.error)
    return NextResponse.json({ message: 'Compte créé. Consultez votre email pour confirmer votre adresse.', requiresEmailConfirmation: !data.session }, { status: 201 })
  } catch (error) {
    if (authUserId) await createAdminClient().auth.admin.deleteUser(authUserId).catch(() => undefined)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Inscription impossible' }, { status: 500 })
  }
}
