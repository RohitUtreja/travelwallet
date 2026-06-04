'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatCurrency, getInitial, avatarBg } from '@/lib/utils'
import Toast, { useToast } from '@/components/Toast'

export default function SettlePage() {
  const router = useRouter()
  const { id: groupId } = useParams()
  const searchParams = useSearchParams()
  const { toasts, showToast } = useToast()

  const fromUserId = searchParams.get('from')
  const toUserId = searchParams.get('to')
  const amountParam = parseFloat(searchParams.get('amount') ?? '0')

  const [currentUser, setCurrentUser] = useState(null)
  const [group, setGroup] = useState(null)
  const [fromProfile, setFromProfile] = useState(null)
  const [toProfile, setToProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [initing, setIniting] = useState(true)

  const init = useCallback(async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }
    setCurrentUser(session.user)

    const [
      { data: groupData },
      { data: fromProf },
      { data: toProf },
    ] = await Promise.all([
      supabase.from('groups').select('*').eq('id', groupId).single(),
      supabase.from('profiles').select('id, name, avatar_color').eq('id', fromUserId).single(),
      supabase.from('profiles').select('id, name, avatar_color').eq('id', toUserId).single(),
    ])

    if (!groupData) { router.replace('/groups'); return }
    setGroup(groupData)
    setFromProfile(fromProf)
    setToProfile(toProf)
    setIniting(false)
  }, [groupId, fromUserId, toUserId, router])

  useEffect(() => {
    init()
  }, [init])

  async function handleSettle() {
    if (!amountParam || amountParam <= 0) {
      showToast('Invalid settlement amount', 'error')
      return
    }
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.from('settlements').insert({
      group_id: groupId,
      from_user: fromUserId,
      to_user: toUserId,
      amount: amountParam,
    })

    if (error) {
      showToast(error.message, 'error')
      setLoading(false)
      return
    }

    showToast('Settlement recorded!', 'success')
    setTimeout(() => router.push(`/groups/${groupId}`), 800)
  }

  const isMyDebt = currentUser?.id === fromUserId
  const isMyCredit = currentUser?.id === toUserId

  if (initing) {
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="page-container">
      <Toast toasts={toasts} />

      {/* Header */}
      <header className="flex items-center gap-3 px-5 pt-6 pb-4 safe-area-top border-b border-border/50 sticky top-0 z-30 bg-bg">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-surface2 border border-border flex items-center justify-center flex-shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8F0FE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 className="text-lg font-bold text-textprimary">Settle Up</h1>
      </header>

      <main className="flex-1 flex flex-col items-center px-5 py-10">
        {/* Settlement visualization */}
        <div className="w-full max-w-sm bg-surface2 rounded-2xl border border-border p-6 flex flex-col items-center gap-6 animate-fade-in">
          <p className="text-muted text-sm text-center">You are recording the following settlement:</p>

          {/* From → To */}
          <div className="flex items-center gap-4 w-full justify-center">
            {/* From */}
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-2"
                style={{
                  backgroundColor: fromProfile?.avatar_color ?? avatarBg(fromProfile?.name ?? ''),
                  borderColor: isMyDebt ? '#FF6B6B' : 'transparent',
                }}
              >
                {getInitial(fromProfile?.name ?? '?')}
              </div>
              <p className={`text-xs font-semibold ${isMyDebt ? 'text-danger' : 'text-textprimary'}`}>
                {isMyDebt ? 'You' : fromProfile?.name}
              </p>
            </div>

            {/* Arrow + amount */}
            <div className="flex flex-col items-center gap-1 flex-1">
              <p className="text-2xl font-extrabold text-textprimary">
                {formatCurrency(amountParam, group?.currency ?? 'EUR')}
              </p>
              <div className="flex items-center gap-1">
                <div className="h-0.5 w-10 bg-accent/40 rounded-full" />
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#00D4AA">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
              <p className="text-muted text-xs">pays</p>
            </div>

            {/* To */}
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-2"
                style={{
                  backgroundColor: toProfile?.avatar_color ?? avatarBg(toProfile?.name ?? ''),
                  borderColor: isMyCredit ? '#00D4AA' : 'transparent',
                }}
              >
                {getInitial(toProfile?.name ?? '?')}
              </div>
              <p className={`text-xs font-semibold ${isMyCredit ? 'text-accent' : 'text-textprimary'}`}>
                {isMyCredit ? 'You' : toProfile?.name}
              </p>
            </div>
          </div>

          {/* Context note */}
          <div className="w-full bg-surface rounded-xl border border-border/50 p-3 text-center">
            <p className="text-muted text-xs">
              {isMyDebt
                ? `You are confirming that you have paid ${toProfile?.name} ${formatCurrency(amountParam, group?.currency ?? 'EUR')}.`
                : isMyCredit
                ? `You are confirming that ${fromProfile?.name} has paid you ${formatCurrency(amountParam, group?.currency ?? 'EUR')}.`
                : `Recording that ${fromProfile?.name} paid ${toProfile?.name} ${formatCurrency(amountParam, group?.currency ?? 'EUR')}.`}
            </p>
          </div>
        </div>

        <div className="w-full max-w-sm mt-8 flex flex-col gap-3">
          <button
            onClick={handleSettle}
            disabled={loading}
            className="btn-primary flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
            ) : (
              'Confirm Settlement'
            )}
          </button>
          <button
            onClick={() => router.back()}
            className="btn-ghost"
          >
            Cancel
          </button>
        </div>
      </main>
    </div>
  )
}
