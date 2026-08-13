const BASE_URL = 'https://shipsgo.com/api/v1.1/ContainerService'
const MAX_RETRIES = 2

export type ShipsGoOptions = {
  emailAddress?: string | null
  referenceNo?: string | null
  tags?: string | null
  mapPoint?: boolean
  co2?: boolean
  containerType?: boolean
  signal?: AbortSignal
}

export type ShipsGoRequest = {
  requestId?: number | string
  RequestId?: number | string
  [key: string]: unknown
}

export type ShipsGoResponse = ShipsGoRequest | Record<string, unknown> | string

export class ShipsGoError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ShipsGoError'
  }
}

function getAuthCode() {
  // SHIPSGO_API_KEY remains a compatibility fallback for existing deployments.
  const authCode = process.env.SHIPSGO_AUTH_CODE?.trim() || process.env.SHIPSGO_API_KEY?.trim()
  if (!authCode) throw new ShipsGoError('SHIPSGO_AUTH_CODE est manquant dans la configuration serveur.')
  return authCode
}

function addOptional(form: URLSearchParams, name: string, value?: string | null) {
  if (value?.trim()) form.set(name, value.trim())
}

async function readPayload(response: Response): Promise<ShipsGoResponse> {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text) as ShipsGoResponse
  } catch {
    return text
  }
}

function errorMessage(status: number, payload: ShipsGoResponse) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload)
  if (status === 401 || /invalid authentication code/i.test(text)) {
    return 'Le code d’authentification ShipsGo est invalide ou révoqué.'
  }
  if (status === 429) return 'ShipsGo a temporairement limité les requêtes. Réessayez plus tard.'
  if (status >= 500) return 'ShipsGo est temporairement indisponible.'
  return `ShipsGo a refusé la requête (${status}).`
}

async function request(path: string, init: RequestInit) {
  let lastError: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(`${BASE_URL}${path}`, {
        ...init,
        headers: { Accept: 'application/json, application/xml, text/plain', ...init.headers },
        cache: 'no-store',
      })
      const payload = await readPayload(response)
      if (!response.ok) throw new ShipsGoError(errorMessage(response.status, payload), response.status, payload)
      return payload
    } catch (error) {
      lastError = error
      if (error instanceof ShipsGoError || attempt === MAX_RETRIES) throw error
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt))
    }
  }
  throw lastError instanceof Error ? lastError : new ShipsGoError('Requête ShipsGo impossible.')
}

function formWithAuth(fields: Record<string, string | null | undefined>) {
  const form = new URLSearchParams({ authCode: getAuthCode() })
  for (const [name, value] of Object.entries(fields)) addOptional(form, name, value)
  return form
}

export async function trackContainer(
  containerNumber: string,
  shippingLine: string,
  options: ShipsGoOptions = {},
) {
  const hasCustomNotifications = Boolean(options.emailAddress?.trim() || options.referenceNo?.trim() || options.tags?.trim())
  const endpoint = hasCustomNotifications ? '/PostCustomContainerForm' : '/PostContainerInfo'
  const form = formWithAuth({
    containerNumber,
    shippingLine: shippingLine?.trim() || 'OTHERS',
    emailAddress: options.emailAddress,
    referenceNo: options.referenceNo,
    tags: options.tags,
  })
  return request(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form, signal: options.signal })
}

export async function trackByBl(
  blNumber: string,
  shippingLine: string,
  options: ShipsGoOptions = {},
) {
  const hasCustomNotifications = Boolean(options.emailAddress?.trim() || options.referenceNo?.trim() || options.tags?.trim())
  const endpoint = hasCustomNotifications ? '/PostCustomContainerFormWithBl' : '/PostContainerInfoWithBl'
  const form = formWithAuth({
    containerNumber: null,
    shippingLine: shippingLine?.trim() || 'OTHERS',
    emailAddress: options.emailAddress,
    referenceNo: options.referenceNo,
    blContainersRef: blNumber,
    tags: options.tags,
  })
  return request(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form, signal: options.signal })
}

export async function getVoyageData(requestId: number | string, options: Pick<ShipsGoOptions, 'mapPoint' | 'co2' | 'containerType'> = {}) {
  const params = new URLSearchParams({ authCode: getAuthCode(), requestId: String(requestId) })
  if (options.mapPoint) params.set('mapPoint', 'true')
  if (options.co2) params.set('co2', 'true')
  if (options.containerType) params.set('containerType', 'true')
  return request(`/GetContainerInfo?${params.toString()}`, { method: 'GET' })
}

export async function getShippingLines() {
  return request(`/GetShippingLineList?authCode=${encodeURIComponent(getAuthCode())}`, { method: 'GET' })
}

export function getRequestId(payload: ShipsGoResponse) {
  if (!payload || typeof payload !== 'object') return null
  const value = payload.requestId ?? payload.RequestId
  return value === undefined || value === null ? null : String(value)
}
