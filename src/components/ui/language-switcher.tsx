'use client'

import { Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()
  return <Button type="button" variant="ghost" size="sm" onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')} aria-label={t('common.language')} className="gap-1.5 px-2"><Languages className="size-4" /><span className="text-xs font-semibold uppercase">{locale}</span></Button>
}
