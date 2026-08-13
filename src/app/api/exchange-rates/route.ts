import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'
import { CURRENCIES } from '@/lib/constants'
import { clearExchangeRateCache, DEFAULT_RATES, getExchangeRate } from '@/lib/currency'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await getSessionProfile()
    if (!user || !profile) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const target = request.nextUrl.searchParams.get('to') || 'GNF'
    if (!CURRENCIES.some((currency) => currency.code === target)) {
      return NextResponse.json({ error: 'Devise cible non prise en charge' }, { status: 400 })
    }

    const rates = Object.fromEntries(
      await Promise.all(CURRENCIES.map(async (currency) => [
        currency.code,
        await getExchangeRate(profile.organizationId, currency.code, target),
      ])),
    )
    return NextResponse.json({ base: target, rates, defaults: DEFAULT_RATES })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur interne du serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getSessionProfile()
    if (!user || !profile) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if (profile.role !== 'ADMIN') return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })

    const body = await request.json().catch(() => ({}))
    const fromCurrency = typeof body.fromCurrency === 'string' ? body.fromCurrency : ''
    const toCurrency = typeof body.toCurrency === 'string' ? body.toCurrency : ''
    const rate = Number(body.rate)
    if (!CURRENCIES.some((currency) => currency.code === fromCurrency) || !CURRENCIES.some((currency) => currency.code === toCurrency) || fromCurrency === toCurrency || !Number.isFinite(rate) || rate <= 0) {
      return NextResponse.json({ error: 'Paire ou taux invalide' }, { status: 400 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const saved = await db.exchangeRate.upsert({
      where: { organizationId_fromCurrency_toCurrency_date: { organizationId: profile.organizationId, fromCurrency, toCurrency, date: today } },
      create: { organizationId: profile.organizationId, fromCurrency, toCurrency, rate, date: today },
      update: { rate },
    })
    clearExchangeRateCache(profile.organizationId)
    return NextResponse.json(saved)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur interne du serveur' }, { status: 500 })
  }
}
