import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ error: 'Le seed HTTP est désactivé. Utilisez la commande locale protégée npm run db:seed.' }, { status: 410 })
}
