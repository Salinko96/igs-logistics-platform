import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const organizationId = process.env.RESET_ORGANIZATION_ID?.trim()
  if (!organizationId || process.env.RESET_TENANT_CONFIRM !== 'DELETE_ALL_BUSINESS_DATA') {
    throw new Error('Définissez RESET_ORGANIZATION_ID et RESET_TENANT_CONFIRM=DELETE_ALL_BUSINESS_DATA')
  }
  const organization = await db.organization.findUnique({ where: { id: organizationId }, select: { name: true } })
  if (!organization) throw new Error('Organisation introuvable')

  await db.$transaction(async (tx) => {
    const caseWhere = { case: { organizationId } }
    await tx.auditLog.deleteMany({ where: { organizationId } })
    await tx.notification.deleteMany({ where: { organizationId } })
    await tx.comment.deleteMany({ where: caseWhere })
    await tx.customsEvent.deleteMany({ where: { declaration: caseWhere } })
    await tx.customsDeclaration.deleteMany({ where: caseWhere })
    await tx.payment.deleteMany({ where: { organizationId } })
    await tx.invoice.deleteMany({ where: { organizationId } })
    await tx.cashTransaction.deleteMany({ where: { organizationId } })
    await tx.expenseApproval.deleteMany({ where: { expense: { organizationId } } })
    await tx.expenseRequest.deleteMany({ where: { organizationId } })
    await tx.transportMission.deleteMany({ where: caseWhere })
    await tx.flight.deleteMany({ where: caseWhere })
    await tx.container.deleteMany({ where: { shipment: caseWhere } })
    await tx.shipment.deleteMany({ where: caseWhere })
    await tx.document.deleteMany({ where: { organizationId } })
    await tx.caseChecklist.deleteMany({ where: caseWhere })
    await tx.caseMilestone.deleteMany({ where: caseWhere })
    await tx.caseAssignee.deleteMany({ where: caseWhere })
    await tx.caseStatusHistory.deleteMany({ where: caseWhere })
    await tx.incident.deleteMany({ where: { organizationId } })
    await tx.case.deleteMany({ where: { organizationId } })
    await tx.opportunity.deleteMany({ where: { organizationId } })
    await tx.clientContact.deleteMany({ where: { client: { organizationId } } })
    await tx.client.deleteMany({ where: { organizationId } })
    await tx.exchangeRate.deleteMany({ where: { organizationId } })
    await tx.serviceCatalog.deleteMany({ where: { organizationId } })
  }, { timeout: 60_000 })
  console.log(`Instance ${organization.name} remise à vide. Organisation et utilisateurs conservés.`)
}

main().finally(() => db.$disconnect())
