export const VAT_REGIMES = ['standard', 'zero_export', 'exonere'] as const
export type VatRegime = (typeof VAT_REGIMES)[number]

export type InvoiceLineInput = {
  description: string
  quantity: number
  unit?: string
  unitPrice: number
  discountRate?: number
  taxRate?: number
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function calculateInvoice(
  rawItems: InvoiceLineInput[],
  options: {
    vatRegime: VatRegime
    vatWithholdingRate?: number
    withholdingTaxRate?: number
  },
) {
  const items = rawItems.map((item) => {
    const gross = roundMoney(item.quantity * item.unitPrice)
    const discountAmount = roundMoney(gross * ((item.discountRate ?? 0) / 100))
    const total = roundMoney(gross - discountAmount)
    const taxRate = options.vatRegime === 'standard' ? (item.taxRate ?? 18) : 0
    const taxAmount = roundMoney(total * (taxRate / 100))
    return { ...item, unit: item.unit || 'unité', discountRate: item.discountRate ?? 0, taxRate, taxAmount, total, discountAmount }
  })

  const totalAmount = roundMoney(items.reduce((sum, item) => sum + item.total, 0))
  const discountAmount = roundMoney(items.reduce((sum, item) => sum + item.discountAmount, 0))
  const taxAmount = roundMoney(items.reduce((sum, item) => sum + item.taxAmount, 0))
  const netAmount = roundMoney(totalAmount + taxAmount)
  const vatWithholdingAmount = roundMoney(taxAmount * ((options.vatWithholdingRate ?? 0) / 100))
  const withholdingTaxAmount = roundMoney(totalAmount * ((options.withholdingTaxRate ?? 0) / 100))
  const amountPayable = roundMoney(Math.max(0, netAmount - vatWithholdingAmount - withholdingTaxAmount))

  return { items, totalAmount, discountAmount, taxAmount, netAmount, vatWithholdingAmount, withholdingTaxAmount, amountPayable }
}
