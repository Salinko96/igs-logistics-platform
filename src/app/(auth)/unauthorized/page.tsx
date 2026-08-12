'use client'

import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
      <div className="absolute inset-x-0 top-0 h-1 bg-destructive" />
      <div className="flex w-full max-w-[460px] flex-col items-center gap-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-destructive dark:bg-red-900/30 dark:text-red-400">
          <ShieldAlert size={36} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Accès Refusé
          </h1>
          <p className="text-sm text-muted-foreground">
            Vous ne disposez pas des autorisations nécessaires pour accéder à cette page.
          </p>
        </div>
        <div className="flex gap-4">
          <Button asChild variant="outline">
            <Link href="/login">Connexion</Link>
          </Button>
          <Button asChild>
            <Link href="/">Accueil</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
