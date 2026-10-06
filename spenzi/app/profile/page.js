'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Form, RadioGroup, Radio, Label } from 'react-aria-components'
import { LogOut, Lock, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { createPinStore } from '@/lib/pin'
import { AVATAR_COLORS } from '@/lib/utils'
import { useSession } from '@/lib/useSession'
import BottomNav from '@/components/BottomNav'
import PageHeader from '@/components/PageHeader'
import Keypad from '@/components/Keypad'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Sheet, ConfirmSheet } from '@/components/ui/Sheet'
import { Skeleton } from '@/components/ui/Skeleton'
import { Switch } from '@/components/ui/Switch'
import { TextField } from '@/components/ui/TextField'
import { useToast } from '@/components/ui/Toast'

function PinSetup({ store, isOpen, onOpenChange, onDone }) {
  const { show } = useToast()
  const [first, setFirst] = useState('')
  const [digits, setDigits] = useState('')
  const [step, setStep] = useState('create')

  useEffect(() => { if (isOpen) { setFirst(''); setDigits(''); setStep('create') } }, [isOpen])

  async function press(k) {
    if (k === 'back') return setDigits((d) => d.slice(0, -1))
    const next = (digits + k).slice(0, 6)
    setDigits(next)
  }
  async function advance() {
    if (step === 'create') { setFirst(digits); setDigits(''); setStep('confirm'); return }
    if (digits !== first) { show('PINs didn’t match — start again', { type: 'error' }); setFirst(''); setDigits(''); setStep('create'); return }
    await store.set(digits)
    onDone()
    onOpenChange(false)
    show('App lock turned on', { type: 'success' })
  }

  return (
    <Sheet isOpen={isOpen} onOpenChange={onOpenChange} title={step === 'create' ? 'Create a PIN' : 'Confirm your PIN'}
      footer={<Button size="lg" isDisabled={digits.length < 4} onPress={advance}>{step === 'create' ? 'Continue' : 'Turn on lock'}</Button>}>
      <div className="flex flex-col items-center gap-4 pb-4">
        <p className="text-sm text-muted">4–6 digits. Asked when you open the app or return after 30 seconds.</p>
        <div className="flex h-4 gap-3" role="img" aria-label={`${digits.length} digits entered`}>
          {Array.from({ length: Math.max(4, digits.length) }, (_, i) => <span key={i} className={`h-3 w-3 rounded-full border border-gold/60 ${i < digits.length ? 'bg-gold' : ''}`} />)}
        </div>
        <Keypad decimal={false} onKey={press} className="w-72" />
      </div>
    </Sheet>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useSession()
  const { show } = useToast()
  const store = useMemo(() => createPinStore(), [])
  const [profile, setProfile] = useState(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState(AVATAR_COLORS[0])
  const [pending, setPending] = useState(false)
  const [lockOn, setLockOn] = useState(false)
  const [setup, setSetup] = useState(false)
  const [confirmOff, setConfirmOff] = useState(false)
  const taps = useRef({ n: 0, t: 0 })

  useEffect(() => { setLockOn(store.isEnabled()) }, [store])
  useEffect(() => {
    if (!user) return
    createClient().from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
      if (data) { setProfile(data); setName(data.name ?? ''); setColor(AVATAR_COLORS.includes(data.avatar_color) ? data.avatar_color : data.avatar_color ?? AVATAR_COLORS[0]) }
    })
  }, [user])

  async function save() {
    setPending(true)
    const { error } = await createClient().from('profiles').update({ name: name.trim(), avatar_color: color }).eq('id', user.id)
    setPending(false)
    if (error) show(error.message, { type: 'error' }); else show('Profile saved', { type: 'success' })
  }
  // Hidden: tap the footer 5 times to toggle the viewport debug panel (for diagnosing device layout).
  function footerTap() {
    const now = Date.now()
    taps.current = { n: now - taps.current.t < 1500 ? taps.current.n + 1 : 1, t: now }
    if (taps.current.n < 5) return
    taps.current.n = 0
    try {
      const on = localStorage.getItem('fw:debug') === '1'
      localStorage.setItem('fw:debug', on ? '0' : '1')
      window.dispatchEvent(new Event('fw:debug-toggle'))
      show(on ? 'Debug panel off' : 'Debug panel on', { type: 'info' })
    } catch { /* private mode */ }
  }

  async function signOut() {
    await createClient().auth.signOut()
    router.replace('/login')
  }

  const colors = AVATAR_COLORS.includes(color) ? AVATAR_COLORS : [color, ...AVATAR_COLORS]

  return (
    <div className="page pb-32">
      <PageHeader eyebrow="Account" title="Profile" />
      <main className="flex flex-col gap-8 px-5 py-6">
        {!profile ? <Skeleton className="h-64" /> : (
          <Form onSubmit={(e) => { e.preventDefault(); save() }} className="flex flex-col gap-6">
            <div className="flex flex-col items-center gap-3">
              <Avatar name={name || user?.email} color={color} size={84} />
              <p className="text-sm text-muted">{user?.email}</p>
            </div>
            <TextField label="Display name" value={name} onChange={setName} isRequired maxLength={40} autoComplete="name" />
            <RadioGroup value={color} onChange={setColor} className="flex flex-col gap-3">
              <Label className="eyebrow">Avatar colour</Label>
              <div className="flex flex-wrap gap-3">
                {colors.map((c) => (
                  <Radio key={c} value={c} aria-label={c} className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full outline-none ring-offset-2 ring-offset-shell transition data-[selected]:ring-2 data-[selected]:ring-gold-soft data-[focus-visible]:ring-2 data-[focus-visible]:ring-ivory" style={{ background: c }}>
                    {({ isSelected }) => isSelected && <Check aria-hidden size={18} className="text-ink" />}
                  </Radio>
                ))}
              </div>
            </RadioGroup>
            <Button type="submit" size="lg" isPending={pending}>Save changes</Button>
          </Form>
        )}

        <section className="card flex flex-col gap-3">
          <div className="flex items-center gap-2 text-gold-soft"><Lock aria-hidden size={16} /><h2 className="eyebrow !text-gold-soft">Privacy</h2></div>
          <Switch isSelected={lockOn} onChange={(on) => (on ? setSetup(true) : setConfirmOff(true))}>App lock (PIN)</Switch>
          <p className="text-xs leading-relaxed text-faint">Hides the app on this device. It’s a privacy screen, not encryption — sign out on shared devices.</p>
        </section>

        <Button variant="danger" size="lg" onPress={signOut}><LogOut aria-hidden size={16} /> Sign out</Button>
        <button type="button" onClick={footerTap} className="mx-auto text-center text-xs text-faint outline-none">FamilyWallet</button>
      </main>

      <PinSetup store={store} isOpen={setup} onOpenChange={setSetup} onDone={() => setLockOn(true)} />
      <ConfirmSheet isOpen={confirmOff} onOpenChange={setConfirmOff} title="Turn off app lock?" message="Anyone who opens the app on this device will see your wallets." confirmLabel="Turn off" danger onConfirm={() => { store.clear(); setLockOn(false) }} />
      <BottomNav />
    </div>
  )
}
