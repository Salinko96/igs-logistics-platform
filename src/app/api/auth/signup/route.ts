import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createAdminClient } from '@/lib/supabase/server'
import { PASSWORD_POLICY_MESSAGE, validatePassword } from '@/lib/security/password'

const REQUESTED_ROLES = ['COMMERCIAL', 'EXPLOITANT', 'COMPTABLE'] as const

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const phone = typeof body.phone === 'string' ? body.phone.replace(/[\s-]/g, '') : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const requestedRole = typeof body.requestedRole === 'string' ? body.requestedRole.toUpperCase() : ''
  if (!firstName || !lastName || !email || !/^\+224\d{9}$/.test(phone)) return NextResponse.json({ error: 'Nom, email et téléphone guinéen +224 valides requis' }, { status: 400 })
  if (!validatePassword(password)) return NextResponse.json({ error: PASSWORD_POLICY_MESSAGE }, { status: 400 })
  if (!REQUESTED_ROLES.includes(requestedRole as (typeof REQUESTED_ROLES)[number])) return NextResponse.json({ error: 'Poste demandé invalide' }, { status: 400 })
  if (await db.profile.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true } })) return NextResponse.json({ error: 'Un compte existe déjà avec cet email' }, { status: 409 })

  const organization = process.env.IGS_ORGANIZATION_ID
    ? await db.organization.findFirst({ where: { id: process.env.IGS_ORGANIZATION_ID, isActive: true } })
    : await db.organization.findFirst({ where: { isActive: true, OR: [{ slug: process.env.IGS_ORGANIZATION_SLUG || 'ibrahima-gold-service' }, { name: { contains: 'Ibrahima Gold Service', mode: 'insensitive' } }] }, orderBy: { createdAt: 'asc' } })
  if (!organization) return NextResponse.json({ error: 'Organisation IGS indisponible. Contactez l’administrateur.' }, { status: 503 })

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: false, user_metadata: { role: 'PENDING', requested_role: requestedRole, organization_id: organization.id, first_name: firstName, last_name: lastName } })
  if (error || !data.user) return NextResponse.json({ error: error?.message || 'Création du compte impossible' }, { status: 400 })
  try {
    await db.profile.upsert({ where: { userId: data.user.id }, update: { organizationId: organization.id, firstName, lastName, email, phone, role: 'EXPLOITANT', requestedRole, approvalStatus: 'pending', isActive: true }, create: { organizationId: organization.id, userId: data.user.id, firstName, lastName, email, phone, role: 'EXPLOITANT', requestedRole, approvalStatus: 'pending', isActive: true } })
  } catch (error) {
    await admin.auth.admin.deleteUser(data.user.id)
    throw error
  }
  return NextResponse.json({ message: 'Inscription reçue. Un administrateur doit approuver votre compte avant l’accès aux modules.' }, { status: 201 })
}
