import Link from 'next/link'
import { ArrowLeft, Scale } from 'lucide-react'
import { legalIdentity, legalLinks, LEGAL_VERSION } from '@/lib/legal'

export function LegalPage({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#ffe5d0_0,transparent_30%),linear-gradient(145deg,#f8faf7,#e8f2ee)] px-4 py-8 sm:px-6 lg:py-14">
      <article className="mx-auto max-w-4xl overflow-hidden rounded-3xl border bg-white shadow-[0_30px_90px_rgb(16_44_40/0.12)]">
        <header className="relative overflow-hidden bg-[#102c28] px-6 py-10 text-white sm:px-10">
          <div className="absolute -right-20 -top-28 size-72 rounded-full border-[34px] border-white/5" />
          <Link href="/" className="relative inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"><ArrowLeft className="size-4" />Retour à IGS Nexus</Link>
          <div className="relative mt-8 flex size-12 items-center justify-center rounded-2xl bg-[#ef6c22]"><Scale className="size-6" /></div>
          <h1 className="relative mt-5 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="relative mt-3 max-w-2xl text-sm leading-6 text-white/70">{description}</p>
          <p className="relative mt-5 text-xs uppercase tracking-widest text-[#f8ad78]">Version du {new Date(`${LEGAL_VERSION}T00:00:00Z`).toLocaleDateString('fr-FR')}</p>
        </header>
        <div className="legal-content space-y-8 px-6 py-10 text-[15px] leading-7 text-slate-700 sm:px-10">{children}</div>
        <footer className="border-t bg-slate-50 px-6 py-6 sm:px-10">
          <nav aria-label="Documents juridiques" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {legalLinks.map((item) => <Link key={item.href} href={item.href} className="font-medium text-[#14554d] hover:underline">{item.label}</Link>)}
          </nav>
          <p className="mt-3 text-xs text-slate-500">{legalIdentity.publisherName} · {legalIdentity.address}</p>
        </footer>
      </article>
    </main>
  )
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="mb-3 text-xl font-bold text-slate-950">{title}</h2><div className="space-y-3">{children}</div></section>
}

export function LegalNotice({ children }: { children: React.ReactNode }) {
  return <aside className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{children}</aside>
}
