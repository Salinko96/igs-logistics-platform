import Link from 'next/link'
import { Compass, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#062f36] px-6 text-white">
      <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border-[48px] border-white/5" />
      <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full border-[64px] border-amber-400/10" />
      <section className="relative max-w-xl text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400 text-slate-950 shadow-xl shadow-black/20">
          <Compass className="h-8 w-8" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[.3em] text-cyan-200">Erreur 404</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Cette route n’existe pas</h1>
        <p className="mx-auto mt-4 max-w-md text-cyan-50/75">Le contenu a peut-être été déplacé ou l’adresse saisie est incorrecte.</p>
        <Button asChild className="mt-8 bg-amber-400 text-slate-950 hover:bg-amber-300">
          <Link href="/dashboard"><Home className="mr-2 h-4 w-4" />Retour au tableau de bord</Link>
        </Button>
      </section>
    </main>
  )
}
