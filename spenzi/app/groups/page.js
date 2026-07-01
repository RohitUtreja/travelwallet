'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { computeBalances, simplifyDebts, formatCurrency, getInitial, avatarBg } from '@/lib/utils'
import BottomNav from '@/components/BottomNav'
import Toast, { useToast } from '@/components/Toast'

export default function GroupsPage() {
  const router = useRouter()
  const { toasts, showToast } = useToast()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [groups, setGroups] = useState([])
  const [groupMeta, setGroupMeta] = useState({})
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }

    setUser(session.user)

    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
    setProfile(prof)

    const { data: memberRows } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', session.user.id)

    if (!memberRows || memberRows.length === 0) {
      setGroups([])
      setLoading(false)
      return
    }

    const groupIds = memberRows.map((r) => r.group_id)

    const { data: groupData } = await supabase
      .from('groups')
      .select('*')
      .in('id', groupIds)
      .order('created_at', { ascending: false })

    setGroups(groupData ?? [])

    const meta = {}
    await Promise.all(
      (groupData ?? []).map(async (group) => {
        const [{ data: members }, { data: expenses }, { data: splits }, { data: settlements }] =
          await Promise.all([
            supabase.from('group_members').select('user_id, profiles(name)').eq('group_id', group.id),
            supabase.from('expenses').select('id, paid_by, amount').eq('group_id', group.id),
            supabase.from('expense_splits').select('expense_id, user_id, amount'),
            supabase.from('settlements').select('from_user, to_user, amount').eq('group_id', group.id),
          ])

        const expenseIds = new Set((expenses ?? []).map((e) => e.id))
        const groupSplits = (splits ?? []).filter((s) => expenseIds.has(s.expense_id))

        const balances = computeBalances(
          expenses ?? [],
          groupSplits,
          settlements ?? [],
          members ?? []
        )

        const myBalance = balances.find((b) => b.userId === session.user.id)?.balance ?? 0

        meta[group.id] = {
          memberCount: (members ?? []).length,
          myBalance,
        }
      })
    )

    setGroupMeta(meta)
    setLoading(false)
  }, [router])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: '#0c0c0c' }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(204,255,0,0.3)', borderTopColor: '#ccff00' }} />
      </div>
    )
  }

  const initial = getInitial(profile?.name ?? user?.email ?? '?')

  return (
    <div className="page-container">
      <Toast toasts={toasts} />

      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-6 pb-4 safe-area-top sticky top-0 z-30 border-b" style={{ background: '#0c0c0c', borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#ccff00' }}>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '14px', color: '#000' }}>S</span>
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '18px', color: '#ebebeb', letterSpacing: '-0.02em' }}>
            Spenzi
          </h1>
        </div>
        <button
          onClick={handleSignOut}
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-opacity hover:opacity-80"
          style={{ background: '#ccff00', color: '#000' }}
          title="Sign out"
        >
          {initial}
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 px-5 py-5 overflow-y-auto" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-6xl mb-5">✈️</div>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '18px', color: '#ebebeb' }}>No groups yet</p>
            <p className="text-sm mt-2" style={{ color: 'rgba(235,235,235,0.4)' }}>Create a group to start splitting expenses</p>
            <Link
              href="/groups/new"
              className="mt-6 px-6 py-3 rounded-full font-bold text-sm active:scale-95 transition-transform min-h-[44px] flex items-center lime-glow"
              style={{ background: '#ccff00', color: '#000', fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Create your first group
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="section-label">// Your Groups</p>
            {groups.map((group) => {
              const meta = groupMeta[group.id] ?? { memberCount: 0, myBalance: 0 }
              const balance = meta.myBalance
              return (
                <Link
                  key={group.id}
                  href={`/groups/${group.id}`}
                  className="card flex items-center gap-4 active:scale-[0.98] transition-transform"
                >
                  {/* Group icon */}
                  <div className="glass w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
                    ✈️
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="truncate" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, color: '#ebebeb', fontSize: '15px' }}>
                        {group.name}
                      </p>
                      <span className="mono text-[10px] px-2 py-0.5 rounded-full flex-shrink-0" style={{ color: '#ccff00', background: 'rgba(204,255,0,0.08)', border: '1px solid rgba(204,255,0,0.2)' }}>
                        {group.currency}
                      </span>
                    </div>
                    <p className="mono text-[10px] mt-1" style={{ color: 'rgba(235,235,235,0.3)' }}>
                      {meta.memberCount} {meta.memberCount === 1 ? 'member' : 'members'}
                    </p>
                  </div>

                  {/* Balance */}
                  <div className="flex-shrink-0 text-right flex flex-col items-end gap-0.5">
                    {Math.abs(balance) < 0.01 ? (
                      <p className="mono text-[11px]" style={{ color: 'rgba(235,235,235,0.3)' }}>SETTLED</p>
                    ) : balance > 0 ? (
                      <>
                        <p className="mono text-[10px]" style={{ color: '#10b981' }}>OWED</p>
                        <p className="mono text-sm font-semibold" style={{ color: '#10b981' }}>
                          {formatCurrency(balance, group.currency)}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="mono text-[10px]" style={{ color: '#ff4d4d' }}>OWES</p>
                        <p className="mono text-sm font-semibold" style={{ color: '#ff4d4d' }}>
                          {formatCurrency(Math.abs(balance), group.currency)}
                        </p>
                      </>
                    )}
                    <span className="text-lg" style={{ color: 'rgba(235,235,235,0.2)', lineHeight: 1 }}>›</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      {/* FAB */}
      <Link
        href="/groups/new"
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full flex items-center justify-center active:scale-95 transition-transform z-20 lime-glow"
        style={{ background: '#ccff00' }}
        aria-label="Create new group"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </Link>

      <BottomNav />
    </div>
  )
}
