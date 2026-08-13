export function rollingTwelveMonthRange(anchor: Date) {
  const to = new Date(anchor)
  const from = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() - 11, 1))

  return { from, to }
}

export function latestDate(values: Array<Date | null | undefined>, fallback = new Date()) {
  const timestamps = values
    .filter((value): value is Date => value instanceof Date && !Number.isNaN(value.getTime()))
    .map((value) => value.getTime())

  return new Date(timestamps.length ? Math.max(...timestamps) : fallback.getTime())
}
