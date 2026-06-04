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
  const [groupMeta, setGroupMeta] = useState({}) // { [groupId]: { memberCount, myBalance } }
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }

    setUser(session.user)

    // Load profile
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
    setProfile(prof)

    // Load groups the user belongs to
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

    // For each group compute member count + my balance
    const meta = {}
    await Promise.all(
      (groupData ?? []).map(async (group) => {
        const [{ data: members }, { data: expenses }, { data: splits }, { data: settlements }] =
          await Promise.all([
            supabase
              .from('group_members')
              .select('user_id, profiles(name)')
              .eq('group_id', group.id),
            supabase
              .from('expenses')
              .select('id, paid_by, amount')
              .eq('group_id', group.id),
            supabase
              .from('expense_splits')
              .select('expense_id, user_id, amount'),
            supabase
              .from('settlements')
              .select('from_user, to_user, amount')
              .eq('group_id', group.id),
          ])

        // Filter splits to only those belonging to this group's expenses
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
      <div className="min-h-dvh bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="page-container">
      <Toast toasts={toasts} />

      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-safe safe-area-top pb-4 pt-6 bg-bg sticky top-0 z-30 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💸</span>
          <h1 className="text-xl font-extrabold text-textprimary tracking-tight">Spenzi</h1>
        </div>
        <button
          onClick={handleSignOut}
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-opacity hover:opacity-80"
          style={{ backgroundColor: avatarBg(profile?.name ?? '') }}
          title="Sign out"
        >
          {getInitial(profile?.name ?? user?.email ?? '?')}
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 px-5 py-5 pb-safe overflow-y-auto">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">✈️</div>
            <p className="text-textprimary font-semibold text-lg">No groups yet</p>
            <p className="text-muted text-sm mt-1">Create a group to start splitting expenses</p>
            <Link
              href="/groups/new"
              className="mt-6 px-6 py-3 bg-accent text-bg rounded-2xl font-bold text-sm active:scale-95 transition-transform"
            >
              Create your first group
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <h2 className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">
              Your groups
            </h2>
            {groups.map((group) => {
              const meta = groupMeta[group.id] ?? { memberCount: 0, myBalance: 0 }
              const balance = meta.myBalance
              return (
                <Link
                  key={group.id}
                  href={`/groups/${group.id}`}
                  className="bg-surface2 rounded-2xl p-4 border border-border flex items-center gap-4 active:scale-[0.98] transition-transform"
                >
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-2xl flex-shrink-0">
                    ✈️
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-textprimary font-semibold text-base truncate">{group.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-semibold bg-surface px-2 py-0.5 rounded-full border border-border text-muted">
                        {group.currency}
                      </span>
                      <span className="text-xs text-muted">
                        {meta.memberCount} {meta.memberCount === 1 ? 'member' : 'members'}
                      </span>
                    </div>
                  </div>

                  {/* Balance */}
                  <div className="flex-shrink-0 text-right">
                    {Math.abs(balance) < 0.01 ? (
                      <p className="text-muted text-sm font-medium">Settled</p>
                    ) : balance > 0 ? (
                      <>
                        <p className="text-accent text-xs font-medium">you are owed</p>
                        <p className="text-accent font-bold text-sm">
                          {formatCurrency(balance, group.currency)}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-danger text-xs font-medium">you owe</p>
                        <p className="text-danger font-bold text-sm">
                          {formatCurrency(Math.abs(balance), group.currency)}
                        </p>
                      </>
                    )}
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
        className="fixed bottom-24 right-5 w-14 h-14 bg-accent rounded-full flex items-center justify-center shadow-lg shadow-accent/30 active:scale-95 transition-transform z-20"
        aria-label="Create new group"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0A0E1A" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </Link>

      <BottomNav />
    </div>
  )
}
