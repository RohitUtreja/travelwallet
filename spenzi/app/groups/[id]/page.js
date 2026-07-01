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
  const [tab, setTab] = useState('expenses')
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
      <div className="min-h-dvh flex items-center justify-center" style={{ background: '#0c0c0c' }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(204,255,0,0.3)', borderTopColor: '#ccff00' }} />
      </div>
    )
  }

  return (
    <div className="page-container">
      <Toast toasts={toasts} />

      {/* Header */}
      <header className="px-5 pt-6 pb-0 safe-area-top sticky top-0 z-30 border-b" style={{ background: '#0c0c0c', borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3 pb-3">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl glass flex items-center justify-center flex-shrink-0 min-h-[44px]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ebebeb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '17px', color: '#ebebeb', letterSpacing: '-0.02em' }}>
                {group?.name}
              </h1>
              <span className="mono text-[10px] px-2 py-0.5 rounded-full flex-shrink-0" style={{ color: '#ccff00', background: 'rgba(204,255,0,0.08)', border: '1px solid rgba(204,255,0,0.2)' }}>
                {group?.currency}
              </span>
            </div>
            {/* Member avatar stack */}
            <div className="flex items-center gap-0.5 mt-1.5">
              {members.slice(0, 6).map((m, i) => (
                <div
                  key={m.user_id}
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                  style={{
                    backgroundColor: m.profiles?.avatar_color ?? avatarBg(m.profiles?.name ?? ''),
                    border: '1.5px solid #ccff00',
                    marginLeft: i > 0 ? '-5px' : '0',
                    zIndex: 6 - i,
                    position: 'relative',
                    color: '#000',
                  }}
                  title={m.profiles?.name}
                >
                  {getInitial(m.profiles?.name ?? '')}
                </div>
              ))}
              {members.length > 6 && (
                <span className="mono text-[10px] ml-2" style={{ color: 'rgba(235,235,235,0.3)' }}>+{members.length - 6}</span>
              )}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-0 pb-0">
          {['expenses', 'balances'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-3 text-xs font-semibold transition-all mono relative"
              style={{
                color: tab === t ? '#ccff00' : 'rgba(235,235,235,0.3)',
                letterSpacing: '0.1em',
              }}
            >
              {t === 'expenses' ? `EXPENSES (${expenses.length})` : `BALANCES (${transactions.length})`}
              {tab === t && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: '#ccff00' }} />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-5 py-5 overflow-y-auto" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
        {tab === 'expenses' && (
          <div className="flex flex-col gap-3">
            {expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-4xl mb-3">🧾</div>
                <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, color: '#ebebeb' }}>No expenses yet</p>
                <p className="text-sm mt-1" style={{ color: 'rgba(235,235,235,0.4)' }}>Add the first expense below</p>
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
                <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, color: '#ebebeb' }}>All settled up!</p>
                <p className="text-sm mt-1" style={{ color: 'rgba(235,235,235,0.4)' }}>No outstanding balances</p>
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

      {/* FAB — only on expenses tab */}
      {tab === 'expenses' && (
        <Link
          href={`/groups/${id}/add`}
          className="fixed right-5 w-14 h-14 rounded-full flex items-center justify-center active:scale-95 transition-transform z-20 lime-glow"
          style={{ bottom: 'max(5rem, calc(4rem + env(safe-area-inset-bottom)))', background: '#ccff00' }}
          aria-label="Add expense"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </Link>
      )}
    </div>
  )
}
