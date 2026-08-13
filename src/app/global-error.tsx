'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="fr">
      <body className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <main className="max-w-lg text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">Incident technique</p>
          <h1 className="mt-4 text-3xl font-bold">La plateforme a rencontré une erreur.</h1>
          <p className="mt-3 text-slate-300">L’incident a été enregistré. Réessayez sans perdre votre session.</p>
          <button type="button" onClick={reset} className="mt-8 rounded-lg bg-amber-400 px-5 py-3 font-semibold text-slate-950">
            Réessayer
          </button>
        </main>
      </body>
    </html>
  )
}
