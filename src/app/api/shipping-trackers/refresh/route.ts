import { NextRequest, NextResponse } from 'next/server'
import { getSessionProfile } from '@/lib/auth'
import { trackReference } from '@/lib/integrations/vessel-tracking'

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getSessionProfile()
    if (!user || !profile) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const body = await request.json().catch(() => ({}))
    const reference = typeof body.reference === 'string' ? body.reference.trim() : ''
    const type = body.type === 'vessel' || body.type === 'bl' ? body.type : 'container'
    const shippingLine = typeof body.shippingLine === 'string' ? body.shippingLine.trim() : null
    if (!reference || reference.length > 80) return NextResponse.json({ error: 'Référence invalide' }, { status: 400 })
    const payload = await trackReference(reference, type, { shippingLine })
    if (!payload.configured) return NextResponse.json({ error: 'Tracking externe non configuré', configured: false }, { status: 503 })
    return NextResponse.json(payload)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur interne du serveur' }, { status: 502 })
  }
}
