export type TrackingResult = {
  provider: string
  reference: string
  status: string
  events: Array<{ code?: string; description?: string; location?: string; occurredAt?: string }>
  raw?: unknown
}

function trackingConfig() {
  const baseUrl = process.env.TRACKING_API_URL
  const apiKey = process.env.TRACKING_API_KEY
  if (!baseUrl || !apiKey) return null
  try {
    return { url: new URL(baseUrl), apiKey }
  } catch {
    return null
  }
}

export async function trackReference(
  reference: string,
  type: 'container' | 'bl' | 'vessel',
  options?: { shippingLine?: string | null },
) {
  if ((type === 'container' || type === 'bl') && (process.env.SHIPSGO_AUTH_CODE || process.env.SHIPSGO_API_KEY)) {
    const createPayload = type === 'bl'
      ? await trackByBl(reference, options?.shippingLine || 'OTHERS')
      : await trackContainer(reference, options?.shippingLine || 'OTHERS')
    const requestId = getRequestId(createPayload)
    if (!requestId) return { configured: true as const, result: createPayload }
    const result = await getVoyageData(requestId, { mapPoint: true, co2: true, containerType: true })
    return { configured: true as const, result }
  }

  if (type === 'vessel' && process.env.AISSTREAM_API_KEY) {
    const WebSocketCtor = globalThis.WebSocket
    if (!WebSocketCtor) throw new Error('WebSocket serveur indisponible')
    const result = await new Promise<TrackingResult>((resolve, reject) => {
      const socket = new WebSocketCtor('wss://stream.aisstream.io/v0/stream')
      const timeout = setTimeout(() => {
        socket.close()
        reject(new Error('AISStream n’a pas répondu à temps'))
      }, 8000)
      socket.onopen = () => {
        socket.send(JSON.stringify({
          APIKey: process.env.AISSTREAM_API_KEY,
          BoundingBoxes: [[[9, -15], [10, -13]]],
          ...(/^\d{9}$/.test(reference) ? { FiltersShipMMSI: [reference] } : {}),
          FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
        }))
      }
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(String(event.data))
          if (message.error) throw new Error(message.error)
          const metadata = message.Metadata ?? message.MetaData ?? {}
          clearTimeout(timeout)
          socket.close()
          resolve({
            provider: 'aisstream',
            reference,
            status: message.MessageType ?? 'PositionReport',
            events: [{
              code: message.MessageType,
              description: metadata.ShipName ?? 'Position AIS reçue',
              location: `${metadata.latitude ?? metadata.Latitude ?? ''}, ${metadata.longitude ?? metadata.Longitude ?? ''}`,
              occurredAt: metadata.time_utc,
            }],
            raw: message,
          })
        } catch (error) {
          clearTimeout(timeout)
          socket.close()
          reject(error)
        }
      }
      socket.onerror = () => {
        clearTimeout(timeout)
        reject(new Error('Connexion AISStream impossible'))
      }
    })
    return { configured: true as const, result }
  }

  const config = trackingConfig()
  if (!config) return { configured: false as const, result: null }
  const response = await fetch(config.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference, type }),
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Service tracking indisponible (${response.status})`)
  const payload = await response.json()
  return { configured: true as const, result: payload as TrackingResult }
}
import { getRequestId, getVoyageData, trackByBl, trackContainer } from './shipsgo-client'
