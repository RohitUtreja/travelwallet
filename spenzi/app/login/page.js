'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Form } from 'react-aria-components'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { safeNext } from '@/lib/utils'
import { Button, IconButton } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'

function LoginForm() {
  const router = useRouter()
  const next = safeNext(useSearchParams().get('next'))
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [show, setShow] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setPending(true)
    setError('')
    const { error } = await createClient().auth.signInWithPassword({
      email: String(f.get('email')).trim().toLowerCase(),
      password: String(f.get('password')),
    })
    if (error) {
      setError(error.message === 'Invalid login credentials' ? 'Incorrect email or password' : error.message)
      setPending(false)
      return
    }
    router.replace(next)
  }

  return (
    <Form onSubmit={onSubmit} className="flex w-full flex-col gap-5">
      <TextField label="Email" name="email" type="email" autoComplete="email" inputMode="email" isRequired />
      <div className="relative">
        <TextField label="Password" name="password" type={show ? 'text' : 'password'} autoComplete="current-password" isRequired inputClassName="pr-14" />
        <IconButton label={show ? 'Hide password' : 'Show password'} variant="quiet" onPress={() => setShow((s) => !s)} className="absolute bottom-0.5 right-1">
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </IconButton>
      </div>
      {error && <p role="alert" className="text-sm text-coral">{error}</p>}
      <Button type="submit" size="lg" isPending={pending}>Sign in</Button>
    </Form>
  )
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-6 safe-top">
      <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-gold/40 bg-gold/10">
        <span className="display text-4xl font-semibold text-gold-soft">F</span>
      </div>
      <h1 className="display text-5xl font-semibold tracking-tight">FamilyWallet</h1>
      <div className="hairline my-4 w-24" />
      <p className="mb-10 text-center text-sm text-muted">Your household’s spending, together.</p>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
      <p className="mt-8 text-center text-xs text-faint">Accounts are created by your family admin.</p>
    </main>
  )
}
