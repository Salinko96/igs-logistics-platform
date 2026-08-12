'use client'

import { useQuery } from '@tanstack/react-query'
import { formatMoney } from '@/lib/constants'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface CurrencyDisplayProps {
  amount: number
  currency?: string
  targetCurrency?: string
  className?: string
}

export function CurrencyDisplay({ amount, currency = 'GNF', targetCurrency = 'GNF', className }: CurrencyDisplayProps) {
  const shouldConvert = currency !== targetCurrency
  const { data } = useQuery<{ rates: Record<string, number> }>({
    queryKey: ['exchange-rates', targetCurrency],
    queryFn: async () => {
      const response = await fetch(`/api/exchange-rates?to=${encodeURIComponent(targetCurrency)}`)
      if (!response.ok) throw new Error('Taux indisponibles')
      return response.json()
    },
    enabled: shouldConvert,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const converted = shouldConvert && data?.rates?.[currency]
    ? formatMoney(amount * data.rates[currency], targetCurrency)
    : null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={className}>{formatMoney(amount, currency)}</span>
      </TooltipTrigger>
      {converted && (
        <TooltipContent>
          Équivalent : {converted}
        </TooltipContent>
      )}
    </Tooltip>
  )
}
