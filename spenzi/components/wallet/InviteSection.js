'use client'
import { useCallback, useEffect, useState } from 'react'
import { Copy, Share2, Link2, Trash2, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Button, IconButton } from '../ui/Button'
import { Select } from '../ui/Select'
import { useToast } from '../ui/Toast'

const ROLES = [{ id: 'member', label: 'Can add expenses' }, { id: 'viewer', label: 'View only' }]
const linkFor = (t) => `${window.location.origin}/join/${t}`

export default function InviteSection({ group }) {
  const { show } = useToast()
  const [role, setRole] = useState('member')
  const [invites, setInvites] = useState([])
  const [pending, setPending] = useState(false)

  const load = useCallback(async () => {
    const { data } = await createClient().from('group_invites').select('token, role, expires_at')
      .eq('group_id', group.id).is('revoked_at', null).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false })
    setInvites(data ?? [])
  }, [group.id])
  useEffect(() => { load() }, [load])

  async function create() {
    setPending(true)
    const { error } = await createClient().from('group_invites').insert({ group_id: group.id, role })
    setPending(false)
    if (error) return show(error.message, { type: 'error' })
    load()
  }
  async function revoke(token) {
    const { error } = await createClient().from('group_invites').update({ revoked_at: new Date().toISOString() }).eq('token', token)
    if (error) show(error.message, { type: 'error' }); else show('Link revoked', { type: 'success' })
    load()
  }
  async function copy(token) {
    try { await navigator.clipboard.writeText(linkFor(token)); show('Link copied', { type: 'success' }) }
    catch { show('Couldn’t copy — long-press the link instead', { type: 'error' }) }
  }
  async function share(token) {
    const url = linkFor(token)
    const text = `Join “${group.name}” on FamilyWallet`
    if (navigator.share) { try { await navigator.share({ title: 'FamilyWallet', text, url }) } catch { /* cancelled */ } }
    else window.open(`https://wa.me/?text=${encodeURIComponent(`${text}: ${url}`)}`, '_blank', 'noopener')
  }

  return (
    <section aria-labelledby="invites" className="flex flex-col gap-3">
      <h2 id="invites" className="eyebrow">Invite by link</h2>
      <div className="card flex flex-col gap-4">
        <p className="text-sm text-muted">Anyone with an account can join through a link. Links expire after 7 days.</p>
        <div className="flex items-end gap-3">
          <Select label="Access" items={ROLES} selectedKey={role} onSelectionChange={setRole} className="flex-1" compact />
          <Button isPending={pending} onPress={create} size="sm" className="h-10"><Link2 aria-hidden size={15} /> Create link</Button>
        </div>
        {invites.length > 0 && (
          <ul className="flex flex-col gap-2 border-t border-line pt-4">
            {invites.map((i) => (
              <li key={i.token} className="flex items-center gap-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-xs text-muted">…/join/{i.token.slice(0, 10)}…</span>
                  <span className="text-[11px] text-faint">{ROLES.find((r) => r.id === i.role)?.label} · expires {new Date(i.expires_at).toLocaleDateString()}</span>
                </span>
                <IconButton label="Copy invite link" variant="quiet" onPress={() => copy(i.token)}><Copy size={16} /></IconButton>
                <IconButton label="Share invite link" variant="quiet" onPress={() => share(i.token)}>{navigator?.share ? <Share2 size={16} /> : <MessageCircle size={16} />}</IconButton>
                <IconButton label="Revoke invite link" variant="quiet" onPress={() => revoke(i.token)}><Trash2 size={16} /></IconButton>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
