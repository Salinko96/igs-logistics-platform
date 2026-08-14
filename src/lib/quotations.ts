import { roundMoney } from '@/lib/invoicing'

export type QuotationLineInput = { description: string; quantity: number; unitPrice: number }

export function calculateQuotation(lines: QuotationLineInput[], taxRate = 18) {
  const items = lines.map((line) => ({
    description: line.description.trim(), quantity: line.quantity, unitPrice: line.unitPrice,
    total: roundMoney(line.quantity * line.unitPrice),
  }))
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.total, 0))
  const taxAmount = roundMoney(subtotal * taxRate / 100)
  return { items, subtotal, taxRate, taxAmount, totalAmount: roundMoney(subtotal + taxAmount) }
}
