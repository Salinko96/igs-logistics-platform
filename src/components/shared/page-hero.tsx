import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function PageHero({ eyebrow, title, description, actions, className }: {
  eyebrow: string
  title: ReactNode
  description: string
  actions?: ReactNode
  className?: string
}) {
  return (
    <section className={cn('page-hero', className)}>
      <div className="page-hero-orbit" aria-hidden="true" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="page-hero-eyebrow">{eyebrow}</p>
          <h1 className="page-hero-title">{title}</h1>
          <p className="page-hero-description">{description}</p>
        </div>
        {actions ? <div className="page-hero-actions">{actions}</div> : null}
      </div>
    </section>
  )
}
