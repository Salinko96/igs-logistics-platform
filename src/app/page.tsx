import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Building2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12">
      <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
      <div className="absolute -left-32 top-24 size-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -right-32 bottom-16 size-96 rounded-full bg-amber-400/10 blur-3xl" />

      <section className="relative w-full max-w-3xl rounded-3xl border border-border/80 bg-card/95 p-7 text-center shadow-[0_30px_100px_rgb(36_34_41/0.12)] backdrop-blur sm:p-12">
        <div className="mx-auto mb-8 flex w-fit items-center justify-center rounded-2xl border border-border bg-white px-6 py-4 shadow-sm">
          <Image
            src="/igs-logo-full.png"
            alt="Ibrahima Gold Service"
            width={300}
            height={96}
            priority
            className="h-auto w-[240px] sm:w-[300px]"
          />
        </div>

        <div className="mx-auto max-w-2xl space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            IGS Nexus
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            Pilotez vos opérations logistiques en toute sécurité
          </h1>
          <p className="text-base leading-7 text-muted-foreground sm:text-lg">
            Dossiers, douane, documents, suivi maritime et facturation réunis dans un espace professionnel conçu pour la Guinée.
          </p>
        </div>

        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-12 px-6">
            <Link href="/login">
              <ShieldCheck className="mr-2 size-5" />
              Se connecter
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 px-6">
            <Link href="/inscription">
              <Building2 className="mr-2 size-5" />
              Créer un espace entreprise
            </Link>
          </Button>
        </div>

        <div className="mt-8 border-t border-border pt-6">
          <Link
            href="/portail"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            Accéder au portail client
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </main>
  )
}
