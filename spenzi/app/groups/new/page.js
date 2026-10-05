'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Form, RadioGroup, Radio, Label, CheckboxGroup, Checkbox, SearchField, Input } from 'react-aria-components'
import { House, Users, Check, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { CURRENCIES } from '@/lib/currencies'
import { useSession } from '@/lib/useSession'
import PageHeader from '@/components/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'

const TYPES = [
  { id: 'family', title: 'Family', desc: 'Everyone logs household spending. No splitting.', Icon: House },
  { id: 'split', title: 'Split', desc: 'Share costs and settle up — trips, flatmates.', Icon: Users },
]

export default function NewWalletPage() {
  const router = useRouter()
  const { user } = useSession()
  const { show } = useToast()
  const [profiles, setProfiles] = useState([])
  const [type, setType] = useState('family')
  const [currency, setCurrency] = useState('INR')
  const [selected, setSelected] = useState([])
  const [query, setQuery] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!user) return
    createClient().from('profiles').select('id, name, avatar_color').neq('id', user.id).order('name')
      .then(({ data }) => setProfiles(data ?? []))
  }, [user])

  const visible = useMemo(() => profiles.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())), [profiles, query])

  async function onSubmit(e) {
    e.preventDefault()
    const name = String(new FormData(e.currentTarget).get('name')).trim()
    setPending(true)
    const { data, error } = await createClient().rpc('create_group', { p_name: name, p_currency: currency, p_type: type, p_members: selected })
    if (error) { show(error.message, { type: 'error' }); setPending(false); return }
    router.replace(`/groups/${data}`)
  }

  return (
    <div className="page">
      <PageHeader back="/groups" title="New wallet" />
      <Form onSubmit={onSubmit} className="flex flex-1 flex-col">
        <div className="flex flex-col gap-7 px-5 py-6">
          <RadioGroup value={type} onChange={setType} className="flex flex-col gap-2">
            <Label className="eyebrow">Type</Label>
            <div className="grid grid-cols-2 gap-3">
              {TYPES.map(({ id, title, desc, Icon }) => (
                <Radio key={id} value={id} className="card flex cursor-pointer flex-col gap-2 p-4 outline-none transition data-[selected]:border-gold data-[selected]:bg-gold/10 data-[focus-visible]:ring-2 data-[focus-visible]:ring-gold-soft">
                  <Icon aria-hidden size={22} strokeWidth={1.5} className="text-gold-soft" />
                  <span className="display text-xl font-semibold">{title}</span>
                  <span className="text-xs leading-snug text-muted">{desc}</span>
                </Radio>
              ))}
            </div>
          </RadioGroup>

          <TextField label="Name" name="name" isRequired maxLength={60} placeholder={type === 'family' ? 'e.g. Utreja Household' : 'e.g. Goa Trip'} />
          <Select label="Currency" items={CURRENCIES} selectedKey={currency} onSelectionChange={setCurrency} />

          <CheckboxGroup value={selected} onChange={setSelected} className="flex flex-col gap-3">
            <Label className="eyebrow">Add members · {selected.length} selected</Label>
            <SearchField value={query} onChange={setQuery} aria-label="Search people" className="relative">
              <Search aria-hidden size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
              <Input placeholder="Search people" className="h-11 w-full rounded-2xl border border-line bg-white/[0.04] pl-10 pr-4 text-sm text-ivory outline-none placeholder:text-faint data-[focused]:border-gold/70" />
            </SearchField>
            <div className="flex flex-col gap-2">
              {visible.length === 0 && <p className="py-4 text-center text-sm text-faint">No one to add yet. You can invite people by link after creating.</p>}
              {visible.map((p) => (
                <Checkbox key={p.id} value={p.id} className="card group flex min-h-14 cursor-pointer items-center gap-3 p-3 outline-none data-[selected]:border-gold/50 data-[selected]:bg-gold/5 data-[focus-visible]:ring-2 data-[focus-visible]:ring-gold-soft">
                  <Avatar name={p.name} color={p.avatar_color} />
                  <span className="flex-1 text-[15px]">{p.name}</span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line text-ink transition group-data-[selected]:border-gold group-data-[selected]:bg-gold">
                    <Check aria-hidden size={14} className="opacity-0 group-data-[selected]:opacity-100" />
                  </span>
                </Checkbox>
              ))}
            </div>
          </CheckboxGroup>
        </div>

        <div className="safe-bottom sticky bottom-0 mt-auto border-t border-line bg-shell/90 px-5 pt-4 backdrop-blur-xl">
          <Button type="submit" size="lg" isPending={pending}>Create wallet</Button>
        </div>
      </Form>
    </div>
  )
}
