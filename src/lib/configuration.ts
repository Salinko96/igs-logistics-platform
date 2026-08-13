type Environment = Record<string, string | undefined>

const present = (value: string | undefined) => Boolean(value?.trim())

function complete(env: Environment, names: string[]) {
  return names.every((name) => present(env[name]))
}

function validUrl(value: string | undefined) {
  if (!present(value)) return false
  try {
    const url = new URL(value!)
    return url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))
  } catch {
    return false
  }
}

export function configurationStatus(env: Environment = process.env) {
  const supabase = validUrl(env.NEXT_PUBLIC_SUPABASE_URL) && complete(env, [
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ])
  const database = complete(env, ['DATABASE_URL', 'DIRECT_URL'])
  const shipsGo = present(env.SHIPSGO_AUTH_CODE) || present(env.SHIPSGO_API_KEY)
  const trackingFallback = validUrl(env.TRACKING_API_URL) && present(env.TRACKING_API_KEY)

  return {
    coreReady: database && supabase,
    core: { database, supabase },
    integrations: {
      shipsGo,
      aisStream: present(env.AISSTREAM_API_KEY),
      trackingFallback,
      paymentWebhook: present(env.PAYMENT_WEBHOOK_SECRET),
      transactionalEmail: complete(env, ['RESEND_API_KEY', 'EMAIL_FROM']),
      stripe: complete(env, ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']),
      orangeMoney: present(env.ORANGE_MONEY_MERCHANT_KEY),
      sentry: present(env.SENTRY_DSN) || present(env.NEXT_PUBLIC_SENTRY_DSN),
    },
  }
}
