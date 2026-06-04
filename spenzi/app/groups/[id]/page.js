'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { computeBalances, simplifyDebts, getInitial, avatarBg } from '@/lib/utils'
import ExpenseCard from '@/components/ExpenseCard'
import BalanceCard from '@/components/BalanceCard'
import Toast, { useToast } from '@/components/Toast'

export default function GroupDetailPage() {
  const router = useRouter()
  const { id } = useParams()
  const { toasts, showToast } = useToast()
  const [tab, setTab] = useState('expenses') // 'expenses' | 'balances'
  const [currentUser, setCurrentUser] = useState(null)
  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [expenses, setExpenses] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  const loadGroup = useCallback(async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }
    setCurrentUser(session.user)

    const [
      { data: groupData },
      { data: membersData },
      { data: expensesData },
      { data: settlementsData },
    ] = await Promise.all([
      supabase.from('groups').select('*').eq('id', id).single(),
      supabase.from('group_members').select('user_id, profiles(id, name, avatar_color)').eq('group_id', id),
      supabase
        .from('expenses')
        .select('*, profiles(name), expense_splits(user_id, amount, profiles(name))')
        .eq('group_id', id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('settlements').select('*').eq('group_id', id),
    ])

    if (!groupData) { router.replace('/groups'); return }

    setGroup(groupData)
    setMembers(membersData ?? [])
    setExpenses(expensesData ?? [])

    // Compute balances + simplify debts
    const expenseIds = new Set((expensesData ?? []).map((e) => e.id))
    const allSplits = (expensesData ?? []).flatMap((e) =>
      (e.expense_splits ?? []).map((s) => ({ ...s, expense_id: e.id }))
    )

    const balances = computeBalances(
      expensesData ?? [],
      allSplits,
      settlementsData ?? [],
      membersData ?? []
    )

    setTransactions(simplifyDebts(balances))
    setLoading(false)
  }, [id, router])

  useEffect(() => {
    loadGroup()
  }, [loadGroup])

  async function handleDeleteExpense(expenseId) {
    const supabase = createClient()
    const { error } = await supabase.from('expenses').delete().eq('id', expenseId)
    if (error) {
      showToast(error.message, 'error')
    } else {
      showToast('Expense deleted', 'success')
      loadGroup()
    }
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
      <header className="px-5 pt-6 pb-0 safe-area-top bg-bg sticky top-0 z-30 border-b border-border/50">
        <div className="flex items-center gap-3 pb-4">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-surface2 border border-border flex items-center justify-center flex-shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8F0FE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-textprimary truncate">{group?.name}</h1>
              <span className="text-xs font-semibold bg-surface2 border border-border text-muted px-2 py-0.5 rounded-full flex-shrink-0">
                {group?.currency}
              </span>
            </div>
            {/* Member avatars */}
            <div className="flex items-center gap-1 mt-1">
              {members.slice(0, 6).map((m) => (
                <div
                  key={m.user_id}
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border border-bg"
                  style={{ backgroundColor: m.profiles?.avatar_color ?? avatarBg(m.profiles?.name ?? '') }}
                  title={m.profiles?.name}
                >
                  {getInitial(m.profiles?.name ?? '')}
                </div>
              ))}
              {members.length > 6 && (
                <span className="text-muted text-xs ml-1">+{members.length - 6}</span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0">
          {['expenses', 'balances'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors border-b-2 ${
                tab === t
                  ? 'text-accent border-accent'
                  : 'text-muted border-transparent hover:text-textprimary'
              }`}
            >
              {t === 'expenses' ? `Expenses (${expenses.length})` : `Balances (${transactions.length})`}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-5 py-5 pb-safe overflow-y-auto">
        {tab === 'expenses' && (
          <div className="flex flex-col gap-3">
            {expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-4xl mb-3">🧾</div>
                <p className="text-textprimary font-semibold">No expenses yet</p>
                <p className="text-muted text-sm mt-1">Add the first expense below</p>
              </div>
            ) : (
              expenses.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  currency={group?.currency}
                  currentUserId={currentUser?.id}
                  onDelete={handleDeleteExpense}
                />
              ))
            )}
          </div>
        )}

        {tab === 'balances' && (
          <div className="flex flex-col gap-3">
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-4xl mb-3">🎉</div>
                <p className="text-textprimary font-semibold">All settled up!</p>
                <p className="text-muted text-sm mt-1">No outstanding balances</p>
              </div>
            ) : (
              transactions.map((tx, i) => (
                <BalanceCard
                  key={i}
                  transaction={tx}
                  currency={group?.currency}
                  groupId={id}
                  currentUserId={currentUser?.id}
                />
              ))
            )}
          </div>
        )}
      </main>

      {/* FAB */}
      <Link
        href={`/groups/${id}/add`}
        className="fixed bottom-8 right-5 w-14 h-14 bg-accent rounded-full flex items-center justify-center shadow-lg shadow-accent/30 active:scale-95 transition-transform z-20"
        aria-label="Add expense"
        style={{ bottom: 'max(2rem, calc(env(safe-area-inset-bottom) + 1rem))' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0A0E1A" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </Link>
    </div>
  )
}
