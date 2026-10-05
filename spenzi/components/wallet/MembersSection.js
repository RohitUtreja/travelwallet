'use client'
import { useEffect, useState } from 'react'
import { CheckboxGroup, Checkbox, Label } from 'react-aria-components'
import { UserPlus, UserMinus, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Avatar } from '../ui/Avatar'
import { Button, IconButton } from '../ui/Button'
import { ConfirmSheet, Sheet } from '../ui/Sheet'
import { Select } from '../ui/Select'
import { useToast } from '../ui/Toast'

const ROLES = [
  { id: 'admin', label: 'Admin' },
  { id: 'member', label: 'Member' },
  { id: 'viewer', label: 'View only' },
]

export default function MembersSection({ group, members, user, isAdmin, reload }) {
  const { show } = useToast()
  const [removing, setRemoving] = useState(null)
  const [adding, setAdding] = useState(false)
  const [candidates, setCandidates] = useState([])
  const [picked, setPicked] = useState([])

  useEffect(() => {
    if (!adding) return
    const have = new Set(members.map((m) => m.user_id))
    createClient().from('profiles').select('id, name, avatar_color').order('name')
      .then(({ data }) => setCandidates((data ?? []).filter((p) => !have.has(p.id))))
    setPicked([])
  }, [adding, members])

  async function changeRole(userId, role) {
    const { error } = await createClient().from('group_members').update({ role }).eq('group_id', group.id).eq('user_id', userId)
    if (error) show(error.message, { type: 'error' }); else show('Role updated', { type: 'success' })
    reload()
  }

  async function remove() {
    const { error } = await createClient().from('group_members').delete().eq('group_id', group.id).eq('user_id', removing.user_id)
    if (error) show(error.message, { type: 'error' }); else show(`${removing.profiles?.name} removed`, { type: 'success' })
    reload()
  }

  async function add(close) {
    const { error } = await createClient().from('group_members').insert(picked.map((id) => ({ group_id: group.id, user_id: id, role: 'member' })))
    if (error) return show(error.message, { type: 'error' })
    show(`Added ${picked.length} ${picked.length === 1 ? 'person' : 'people'}`, { type: 'success' })
    close()
    reload()
  }

  return (
    <section aria-labelledby="members" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 id="members" className="eyebrow">Members · {members.length}</h2>
        {isAdmin && <Button variant="quiet" size="sm" onPress={() => setAdding(true)}><UserPlus aria-hidden size={15} /> Add</Button>}
      </div>
      <ul className="flex flex-col gap-2">
        {members.map((m) => {
          const name = m.profiles?.name ?? 'Unknown'
          const self = m.user_id === user.id
          return (
            <li key={m.user_id} className="card flex items-center gap-3 p-3.5">
              <Avatar name={name} color={m.profiles?.avatar_color} />
              <span className="min-w-0 flex-1 truncate text-[15px]">{name}{self && <span className="text-faint"> (you)</span>}</span>
              {isAdmin ? (
                <Select aria-label={`Role for ${name}`} items={ROLES} selectedKey={m.role} onSelectionChange={(r) => r !== m.role && changeRole(m.user_id, r)} compact className="w-32" />
              ) : (
                <span className="rounded-full border border-line px-2.5 py-1 text-[11px] uppercase tracking-wider text-muted">{ROLES.find((r) => r.id === m.role)?.label}</span>
              )}
              {isAdmin && !self && (
                <IconButton label={`Remove ${name}`} variant="quiet" onPress={() => setRemoving(m)}><UserMinus size={18} /></IconButton>
              )}
            </li>
          )
        })}
      </ul>

      <ConfirmSheet
        isOpen={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Remove ${removing?.profiles?.name ?? ''}?`}
        message="They’ll lose access to this wallet. Expenses they added stay."
        confirmLabel="Remove"
        danger
        onConfirm={remove}
      />

      <Sheet
        isOpen={adding}
        onOpenChange={setAdding}
        title="Add people"
        footer={({ close }) => <Button size="lg" isDisabled={!picked.length} onPress={() => add(close)}>Add {picked.length || ''}</Button>}
      >
        <CheckboxGroup value={picked} onChange={setPicked} className="flex flex-col gap-2 pb-4">
          <Label className="sr-only">People to add</Label>
          {candidates.length === 0 && <p className="py-6 text-center text-sm text-muted">Everyone with an account is already here. Use an invite link for anyone else.</p>}
          {candidates.map((p) => (
            <Checkbox key={p.id} value={p.id} className="group card flex min-h-14 cursor-pointer items-center gap-3 p-3 outline-none data-[selected]:border-gold/50 data-[focus-visible]:ring-2 data-[focus-visible]:ring-gold-soft">
              <Avatar name={p.name} color={p.avatar_color} size={32} />
              <span className="flex-1 text-[15px]">{p.name}</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line group-data-[selected]:border-gold group-data-[selected]:bg-gold"><Check aria-hidden size={14} className="text-ink opacity-0 group-data-[selected]:opacity-100" /></span>
            </Checkbox>
          ))}
        </CheckboxGroup>
      </Sheet>
    </section>
  )
}
