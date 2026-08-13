type EmailInput = {
  to: string
  subject: string
  html: string
}

export async function sendTransactionalEmail(input: EmailInput) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!apiKey || !from) return { sent: false, reason: 'not_configured' as const }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, ...input }),
  })
  if (!response.ok) throw new Error(`Envoi email refusé (${response.status})`)
  return { sent: true }
}

export function welcomeEmail(firstName: string, organizationName: string) {
  return {
    subject: 'Bienvenue sur IGS Nexus',
    html: `<div style="font-family:Arial,sans-serif;color:#17211f"><h1>Bienvenue ${firstName}</h1><p>L'espace sécurisé de <strong>${organizationName}</strong> est prêt.</p><p>Votre essai Starter de 14 jours est activé. Après confirmation de votre adresse email, connectez-vous et configurez la double authentification administrateur.</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://igs-logistics-platform.vercel.app'}/login">Accéder à IGS Nexus</a></p></div>`,
  }
}

export function subscriptionEmail(planName: string, status: string) {
  return {
    subject: `Abonnement IGS Nexus : ${planName}`,
    html: `<div style="font-family:Arial,sans-serif;color:#17211f"><h1>Abonnement ${planName}</h1><p>Le statut de votre abonnement plateforme est maintenant <strong>${status}</strong>.</p><p>Vous pouvez consulter vos limites et paiements depuis la page Abonnement plateforme.</p></div>`,
  }
}
