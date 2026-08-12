import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const organization = await db.organization.findFirst({
      where: { isActive: true },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Aucune organisation active trouvée' },
        { status: 404 },
      )
    }

    const email = request.nextUrl.searchParams.get('email')?.trim().toLowerCase()
    const code = request.nextUrl.searchParams.get('code')?.trim()

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email et code client requis' },
        { status: 400 },
      )
    }

    const client = await db.client.findFirst({
      where: {
        organizationId: organization.id,
        isActive: true,
        email: { equals: email, mode: 'insensitive' },
        taxId: { equals: code, mode: 'insensitive' },
      },
      select: {
        id: true,
        name: true,
        sector: true,
        segment: true,
        city: true,
        phone: true,
        email: true,
        cases: {
          where: { status: { not: 'annule' } },
          select: {
            id: true,
            reference: true,
            type: true,
            direction: true,
            status: true,
            priority: true,
            merchandise: true,
            eta: true,
            updatedAt: true,
            documents: {
              where: { sharedWithClient: true },
              select: {
                id: true,
                name: true,
                category: true,
                status: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { updatedAt: 'desc' },
        },
        invoices: {
          where: { status: { not: 'annulee' } },
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            issuedAt: true,
            dueDate: true,
            totalAmount: true,
            paidAmount: true,
            currency: true,
            case: { select: { reference: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Identifiants client invalides' },
        { status: 401 },
      )
    }

    return NextResponse.json({ client })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
