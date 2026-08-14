import Link from 'next/link'
import { Clock3 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function PendingApprovalPage() {
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4"><Card className="max-w-lg"><CardContent className="p-8 text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700"><Clock3 /></div><h1 className="text-2xl font-bold">Compte en attente d’approbation</h1><p className="mt-3 text-sm text-muted-foreground">Votre demande a bien été enregistrée. Un administrateur IGS doit vérifier votre poste et activer votre accès personnel.</p><Button asChild className="mt-6" variant="outline"><Link href="/login">Retour à la connexion</Link></Button></CardContent></Card></main>
}
