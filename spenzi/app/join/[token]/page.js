'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Users } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useSession } from '@/lib/useSession'
import { Button, LinkButton, Spinner } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

export default function JoinPage() {
  const { token } = useParams()
  const router = useRouter()
  const { show } = useToast()
  const { user } = useSession()
  const [preview, setPreview] = useState(undefined) // undefined = loading, null = invalid
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!user) return
    createClient().rpc('invite_preview', { p_token: token }).then(({ data }) => setPreview(data ?? null))
  }, [user, token])

  async function join() {
    setPending(true)
    const { data, error } = await createClient().rpc('join_group', { p_token: token })
    if (error) { show(error.message, { type: 'error' }); setPending(false); return }
    router.replace(`/groups/${data}`)
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-6 px-6 text-center">
      {preview === undefined ? (
        <Spinner className="h-7 w-7 text-gold" />
      ) : preview === null ? (
        <>
          <h1 className="display text-4xl font-semibold">Invite unavailable</h1>
          <p className="text-muted">This link has expired or was revoked. Ask the wallet’s admin for a new one.</p>
          <LinkButton href="/groups" variant="ghost">Go to my wallets</LinkButton>
        </>
      ) : (
        <>
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold-soft"><Users aria-hidden size={28} strokeWidth={1.4} /></span>
          <div>
            <p className="eyebrow mb-2">You’re invited to</p>
            <h1 className="display text-5xl font-semibold leading-tight">{preview.name}</h1>
            <p className="mt-3 text-sm text-muted">{preview.role === 'viewer' ? 'You’ll be able to view spending.' : 'You’ll be able to add and edit your own expenses.'}</p>
          </div>
          <Button size="lg" isPending={pending} onPress={join}>Join wallet</Button>
        </>
      )}
    </main>
  )
}
