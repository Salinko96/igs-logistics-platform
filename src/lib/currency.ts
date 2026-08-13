import { db } from '@/lib/db'
import { CURRENCIES, type CurrencyCode } from '@/lib/constants'

export const DEFAULT_RATES: Record<CurrencyCode, number> = {
  GNF: 1,
  USD: 8600,
  EUR: 9300,
  XOF: 14,
}

const rateCache = new Map<string, { rate: number; expiresAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000

function isCurrency(value: string): value is CurrencyCode {
  return CURRENCIES.some((currency) => currency.code === value)
}

export async function getExchangeRate(
  organizationId: string,
  fromCurrency: string,
  toCurrency: string,
) {
  if (!isCurrency(fromCurrency) || !isCurrency(toCurrency)) {
    throw new Error('Devise non prise en charge')
  }
  if (fromCurrency === toCurrency) return 1

  const cacheKey = `${organizationId}:${fromCurrency}:${toCurrency}`
  const cached = rateCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.rate

  const direct = await db.exchangeRate.findFirst({
    where: { organizationId, fromCurrency, toCurrency },
    orderBy: { date: 'desc' },
    select: { rate: true },
  })
  if (direct) {
    rateCache.set(cacheKey, { rate: direct.rate, expiresAt: Date.now() + CACHE_TTL_MS })
    return direct.rate
  }

  const inverse = await db.exchangeRate.findFirst({
    where: { organizationId, fromCurrency: toCurrency, toCurrency: fromCurrency },
    orderBy: { date: 'desc' },
    select: { rate: true },
  })
  if (inverse && inverse.rate > 0) {
    const rate = 1 / inverse.rate
    rateCache.set(cacheKey, { rate, expiresAt: Date.now() + CACHE_TTL_MS })
    return rate
  }

  const rate = DEFAULT_RATES[fromCurrency] / DEFAULT_RATES[toCurrency]
  rateCache.set(cacheKey, { rate, expiresAt: Date.now() + CACHE_TTL_MS })
  return rate
}

export async function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  organizationId: string,
) {
  const rate = await getExchangeRate(organizationId, fromCurrency, toCurrency)
  return { amount: amount * rate, rate }
}

export function clearExchangeRateCache(organizationId?: string) {
  if (!organizationId) return rateCache.clear()
  for (const key of rateCache.keys()) {
    if (key.startsWith(`${organizationId}:`)) rateCache.delete(key)
  }
}
