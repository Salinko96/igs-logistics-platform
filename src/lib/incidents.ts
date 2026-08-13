const severityRank: Record<string, number> = { critique: 0, eleve: 1, moyen: 2, faible: 3 }

type IncidentPriority = { severity: string; status: string; createdAt: string | Date }

export function incidentProgress(status: string) {
  if (['resolu', 'cloture', 'clôturé'].includes(status)) return 100
  if (status === 'en_cours') return 50
  if (status === 'ouvert') return 10
  return 0
}

export function incidentNeedsAttention(incident: IncidentPriority, now = new Date(), delayDays = 3) {
  const ageMs = now.getTime() - new Date(incident.createdAt).getTime()
  return incidentProgress(incident.status) < 20 && ageMs > delayDays * 86_400_000
}

export function compareIncidentPriority(a: IncidentPriority, b: IncidentPriority) {
  const aResolved = ['resolu', 'cloture', 'clôturé'].includes(a.status)
  const bResolved = ['resolu', 'cloture', 'clôturé'].includes(b.status)
  if (aResolved !== bResolved) return aResolved ? 1 : -1
  const severityDifference = (severityRank[a.severity] ?? 4) - (severityRank[b.severity] ?? 4)
  if (severityDifference) return severityDifference
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
}
