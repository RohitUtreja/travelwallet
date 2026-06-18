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
      <header className="flex items-center justify-between px-5 pt-6 pb-4 safe-area-top bg-[#0A0E1A] sticky top-0 z-30 border-b border-[#1e2a40]/50">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💸</span>
          <h1 className="text-xl font-extrabold text-[#F1F5F9] tracking-tight">Spenzi</h1>
        </div>
        <button
          onClick={handleSignOut}
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-opacity hover:opacity-80 border-2 border-[#0A0E1A]"
          style={{ backgroundColor: avatarBg(profile?.name ?? '') }}
          title="Sign out"
        >
          {getInitial(profile?.name ?? user?.email ?? '?')}
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 px-5 py-5 pb-[calc(80px+env(safe-area-inset-bottom))] overflow-y-auto">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-6xl mb-4">✈️</div>
            <p className="text-[#F1F5F9] font-semibold text-lg">No groups yet</p>
            <p className="text-[#64748B] text-sm mt-1">Create a group to start splitting expenses</p>
            <Link
              href="/groups/new"
              className="mt-6 px-6 py-3 bg-[#00D4AA] text-[#0A0E1A] rounded-2xl font-bold text-sm active:scale-95 transition-transform min-h-[44px] flex items-center"
            >
              Create your first group
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <h2 className="section-label mb-1">Your groups</h2>
            {groups.map((group) => {
              const meta = groupMeta[group.id] ?? { memberCount: 0, myBalance: 0 }
              const balance = meta.myBalance
              return (
                <Link
                  key={group.id}
                  href={`/groups/${group.id}`}
                  className="bg-[#111827] rounded-2xl p-4 border border-[#1e2a40] flex items-center gap-4 active:scale-[0.98] transition-transform"
                >
                  {/* Colored initial circle */}
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0 text-[#0A0E1A]"
                    style={{ backgroundColor: avatarBg(group.name) }}
                  >
                    {group.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[#F1F5F9] font-semibold text-base truncate">{group.name}</p>
                      <span className="chip flex-shrink-0">{group.currency}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1.5">
                      {/* stacked member avatars placeholder — memberCount only available */}
                      <span className="text-xs text-[#64748B]">
                        {meta.memberCount} {meta.memberCount === 1 ? 'member' : 'members'}
                      </span>
                    </div>
                  </div>

                  {/* Balance */}
                  <div className="flex-shrink-0 text-right">
                    {Math.abs(balance) < 0.01 ? (
                      <p className="text-[#64748B] text-sm font-medium">All settled</p>
                    ) : balance > 0 ? (
                      <>
                        <p className="text-[#00D4AA] text-xs font-medium">owed</p>
                        <p className="balance-positive text-sm">
                          {formatCurrency(balance, group.currency)}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-[#FF6B6B] text-xs font-medium">owe</p>
                        <p className="balance-negative text-sm">
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
        className="fixed bottom-24 right-5 w-14 h-14 bg-[#00D4AA] rounded-full flex items-center justify-center shadow-lg shadow-[#00D4AA]/30 active:scale-95 transition-transform z-20"
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
