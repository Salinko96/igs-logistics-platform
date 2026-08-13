import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendTransactionalEmail } from '@/lib/saas/email'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const generic = { message: 'Si cette adresse existe, un lien de réinitialisation va être envoyé.' }
  if (!email) return NextResponse.json(generic)

  try {
    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery', email,
      options: { redirectTo: `${request.nextUrl.origin}/reset-password` },
    })
    if (error || !data.properties?.action_link) return NextResponse.json(generic)
    await sendTransactionalEmail({
      to: email,
      subject: 'Réinitialiser votre mot de passe IGS Nexus',
      html: `<div style="font-family:Arial,sans-serif;color:#17211f"><h1>Réinitialisation du mot de passe</h1><p>Vous avez demandé à modifier votre mot de passe IGS Nexus.</p><p><a href="${data.properties.action_link}" style="display:inline-block;background:#ef6c22;color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none">Créer un nouveau mot de passe</a></p><p>Ce lien est personnel. Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.</p></div>`,
    })
  } catch (error) {
    console.error('Password recovery email failed:', error)
  }
  return NextResponse.json(generic)
}
