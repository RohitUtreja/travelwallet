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
      <header className="flex items-center gap-3 px-5 pt-6 pb-4 safe-area-top border-b border-[#1e2a40]/50 sticky top-0 z-30 bg-[#0A0E1A]">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-xl bg-[#1a2234] border border-[#1e2a40] flex items-center justify-center flex-shrink-0 min-h-[44px]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F1F5F9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 className="text-lg font-bold text-[#F1F5F9]">Settle Up</h1>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-5 py-10">
        {/* Settlement visualization — centered */}
        <div className="w-full max-w-sm flex flex-col items-center gap-8 animate-fade-in">
          <p className="text-[#64748B] text-sm text-center">Recording the following settlement:</p>

          {/* From → amount → To */}
          <div className="flex items-center gap-4 w-full justify-center">
            {/* From */}
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold border-2"
                style={{
                  backgroundColor: fromProfile?.avatar_color ?? avatarBg(fromProfile?.name ?? ''),
                  borderColor: isMyDebt ? '#FF6B6B' : 'transparent',
                }}
              >
                {getInitial(fromProfile?.name ?? '?')}
              </div>
              <p className={`text-sm font-semibold ${isMyDebt ? 'text-[#FF6B6B]' : 'text-[#F1F5F9]'}`}>
                {isMyDebt ? 'You' : fromProfile?.name}
              </p>
            </div>

            {/* Arrow */}
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className="flex items-center gap-1 w-full justify-center">
                <div className="h-px flex-1 bg-[#1e2a40]" />
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00D4AA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
                <div className="h-px flex-1 bg-[#1e2a40]" />
              </div>
              <p className="text-[#64748B] text-xs">pays</p>
            </div>

            {/* To */}
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold border-2"
                style={{
                  backgroundColor: toProfile?.avatar_color ?? avatarBg(toProfile?.name ?? ''),
                  borderColor: isMyCredit ? '#00D4AA' : 'transparent',
                }}
              >
                {getInitial(toProfile?.name ?? '?')}
              </div>
              <p className={`text-sm font-semibold ${isMyCredit ? 'text-[#00D4AA]' : 'text-[#F1F5F9]'}`}>
                {isMyCredit ? 'You' : toProfile?.name}
              </p>
            </div>
          </div>

          {/* Big amount in accent */}
          <p className="text-4xl font-extrabold text-[#00D4AA] amount-display">
            {formatCurrency(amountParam, group?.currency ?? 'EUR')}
          </p>

          {/* Context note */}
          <div className="w-full bg-[#111827] rounded-xl border border-[#1e2a40]/50 p-3 text-center">
            <p className="text-[#64748B] text-xs">
              {isMyDebt
                ? `You are confirming that you have paid ${toProfile?.name} ${formatCurrency(amountParam, group?.currency ?? 'EUR')}.`
                : isMyCredit
                ? `You are confirming that ${fromProfile?.name} has paid you ${formatCurrency(amountParam, group?.currency ?? 'EUR')}.`
                : `Recording that ${fromProfile?.name} paid ${toProfile?.name} ${formatCurrency(amountParam, group?.currency ?? 'EUR')}.`}
            </p>
          </div>

          <div className="w-full flex flex-col gap-3">
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
        </div>
      </main>
    </div>
  )
}
