export async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  if (!text.trim()) {
    throw new Error(`Réponse vide du serveur (${response.status})`)
  }

  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Réponse invalide du serveur (${response.status})`)
  }
}
