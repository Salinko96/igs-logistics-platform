'use client'
import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Radio, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const TABLES = ['Client', 'Case', 'Document', 'CustomsDeclaration', 'Incident', 'ExpenseRequest', 'Invoice', 'Payment', 'Notification']

export function WorkflowRealtime() {
  const queryClient = useQueryClient(); const [updates, setUpdates] = useState(0); const [connected, setConnected] = useState(false); const version = useRef<string | null>(null)
  useEffect(() => {
    const refresh = () => { setUpdates((count) => count + 1); void queryClient.invalidateQueries() }
    const supabase = createClient(); let channel = supabase.channel('igs-shared-workflow')
    TABLES.forEach((table) => { channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, refresh) })
    channel.subscribe((status) => setConnected(status === 'SUBSCRIBED'))
    const interval = window.setInterval(async () => {
      try {
        const response = await fetch('/api/workflow/version', { cache: 'no-store' }); if (!response.ok) return
        const payload = await response.json() as { version: string | null }
        if (version.current && payload.version && payload.version !== version.current) refresh()
        version.current = payload.version
      } catch { setConnected(false) }
    }, 5000)
    return () => { window.clearInterval(interval); void supabase.removeChannel(channel) }
  }, [queryClient])
  if (!updates && connected) return null
  return <button type="button" onClick={() => { setUpdates(0); void queryClient.invalidateQueries() }} className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-xs font-semibold shadow-xl" title="Actualiser les données partagées">{connected ? <Radio className="h-4 w-4 text-emerald-600" /> : <RefreshCw className="h-4 w-4 animate-spin text-amber-600" />}{updates ? `${updates} nouvelle${updates > 1 ? 's' : ''} activité${updates > 1 ? 's' : ''}` : 'Synchronisation 5 s'}</button>
}
