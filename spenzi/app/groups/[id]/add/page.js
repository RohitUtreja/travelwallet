'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { CATEGORIES, parseAmount, todayISO, getInitial, avatarBg } from '@/lib/utils'
import Toast, { useToast } from '@/components/Toast'

export default function AddExpensePage() {
  const router = useRouter()
  const { id: groupId } = useParams()
  const { toasts, showToast } = useToast()

  const [currentUser, setCurrentUser] = useState(null)
  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)

  // Form state
  const [category, setCategory] = useState('other')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [paidBy, setPaidBy] = useState('')
  const [splitMode, setSplitMode] = useState('equal') // 'equal' | 'custom'
  const [customSplitMembers, setCustomSplitMembers] = useState([]) // userIds

  const init = useCallback(async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }
    setCurrentUser(session.user)
    setPaidBy(session.user.id)

    const [{ data: groupData }, { data: membersData }] = await Promise.all([
      supabase.from('groups').select('*').eq('id', groupId).single(),
      supabase.from('group_members').select('user_id, profiles(id, name, avatar_color)').eq('group_id', groupId),
    ])

    if (!groupData) { router.replace('/groups'); return }
    setGroup(groupData)
    setMembers(membersData ?? [])
    setCustomSplitMembers((membersData ?? []).map((m) => m.user_id))
  }, [groupId, router])

  useEffect(() => {
    init()
  }, [init])

  function toggleCustomMember(userId) {
    setCustomSplitMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const effectiveSplitMembers =
    splitMode === 'equal' ? members.map((m) => m.user_id) : customSplitMembers

  async function handleSubmit(e) {
    e.preventDefault()
    const parsedAmount = parseAmount(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      showToast('Please enter a valid amount', 'error')
      return
    }
    if (effectiveSplitMembers.length === 0) {
      showToast('Select at least one member to split with', 'error')
      return
    }

    setLoading(true)
    const supabase = createClient()

    // Insert expense
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        group_id: groupId,
        paid_by: paidBy,
        amount: parsedAmount,
        category,
        description: description.trim() || null,
        date,
      })
      .select()
      .single()

    if (expenseError) {
      showToast(expenseError.message, 'error')
      setLoading(false)
      return
    }

    // Calculate equal split
    const splitAmount = Math.round((parsedAmount / effectiveSplitMembers.length) * 100) / 100
    const splits = effectiveSplitMembers.map((userId, index) => {
      // Distribute rounding difference to the last member
      const isLast = index === effectiveSplitMembers.length - 1
      const otherTotal = splitAmount * (effectiveSplitMembers.length - 1)
      const lastAmount = Math.round((parsedAmount - otherTotal) * 100) / 100
      return {
        expense_id: expense.id,
        user_id: userId,
        amount: isLast ? lastAmount : splitAmount,
      }
    })

    const { error: splitsError } = await supabase.from('expense_splits').insert(splits)

    if (splitsError) {
      showToast(splitsError.message, 'error')
      setLoading(false)
      return
    }

    router.push(`/groups/${groupId}`)
  }

  const categoryList = Object.entries(CATEGORIES)

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
        <h1 className="text-lg font-bold text-textprimary">Add Expense</h1>
        {group && (
          <span className="ml-auto text-xs text-muted bg-surface2 border border-border px-2 py-1 rounded-full">
            {group.currency}
          </span>
        )}
      </header>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-6 px-5 py-6">

          {/* Category grid */}
          <div className="flex flex-col gap-2">
            <label className="text-muted text-xs font-semibold uppercase tracking-wider">
              Category
            </label>
            <div className="grid grid-cols-4 gap-2">
              {categoryList.map(([key, cat]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl border transition-all ${
                    category === key
                      ? 'border-accent/60 bg-accent/10'
                      : 'border-border bg-surface2'
                  }`}
                >
                  <span className="text-xl">{cat.emoji}</span>
                  <span className={`text-xs font-medium ${category === key ? 'text-accent' : 'text-muted'}`}>
                    {cat.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <label className="text-muted text-xs font-semibold uppercase tracking-wider">
              Description
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="What was this for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={120}
            />
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-2">
            <label className="text-muted text-xs font-semibold uppercase tracking-wider">
              Amount {group?.currency && <span className="normal-case">({group.currency})</span>}
            </label>
            <input
              type="text"
              inputMode="decimal"
              className="input-field text-2xl font-bold"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          {/* Date */}
          <div className="flex flex-col gap-2">
            <label className="text-muted text-xs font-semibold uppercase tracking-wider">
              Date
            </label>
            <input
              type="date"
              className="input-field"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Paid by */}
          <div className="flex flex-col gap-2">
            <label className="text-muted text-xs font-semibold uppercase tracking-wider">
              Paid by
            </label>
            <div className="flex flex-col gap-2">
              {members.map((m) => (
                <button
                  key={m.user_id}
                  type="button"
                  onClick={() => setPaidBy(m.user_id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    paidBy === m.user_id ? 'border-accent/60 bg-accent/10' : 'border-border bg-surface2'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: m.profiles?.avatar_color ?? avatarBg(m.profiles?.name ?? '') }}
                  >
                    {getInitial(m.profiles?.name ?? '')}
                  </div>
                  <span className={`text-sm font-medium ${paidBy === m.user_id ? 'text-accent' : 'text-textprimary'}`}>
                    {m.profiles?.name ?? 'Unknown'}
                    {m.user_id === currentUser?.id ? ' (you)' : ''}
                  </span>
                  {paidBy === m.user_id && (
                    <svg className="ml-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00D4AA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Split */}
          <div className="flex flex-col gap-2">
            <label className="text-muted text-xs font-semibold uppercase tracking-wider">
              Split
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSplitMode('equal')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  splitMode === 'equal' ? 'bg-accent text-bg border-accent' : 'bg-surface2 text-muted border-border'
                }`}
              >
                Equal split
              </button>
              <button
                type="button"
                onClick={() => setSplitMode('custom')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  splitMode === 'custom' ? 'bg-accent text-bg border-accent' : 'bg-surface2 text-muted border-border'
                }`}
              >
                Custom
              </button>
            </div>

            {splitMode === 'custom' && (
              <div className="flex flex-col gap-2 mt-1">
                <p className="text-muted text-xs">Select who to split with:</p>
                {members.map((m) => {
                  const isSelected = customSplitMembers.includes(m.user_id)
                  return (
                    <button
                      key={m.user_id}
                      type="button"
                      onClick={() => toggleCustomMember(m.user_id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        isSelected ? 'border-accent/60 bg-accent/10' : 'border-border bg-surface2'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ backgroundColor: m.profiles?.avatar_color ?? avatarBg(m.profiles?.name ?? '') }}
                      >
                        {getInitial(m.profiles?.name ?? '')}
                      </div>
                      <span className={`text-sm font-medium ${isSelected ? 'text-accent' : 'text-textprimary'}`}>
                        {m.profiles?.name ?? 'Unknown'}
                      </span>
                      {isSelected && (
                        <svg className="ml-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00D4AA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  )
                })}
                {amount && effectiveSplitMembers.length > 0 && (
                  <p className="text-muted text-xs text-center">
                    {group?.currency} {(parseAmount(amount) / effectiveSplitMembers.length).toFixed(2)} per person
                    ({effectiveSplitMembers.length} {effectiveSplitMembers.length === 1 ? 'person' : 'people'})
                  </p>
                )}
              </div>
            )}

            {splitMode === 'equal' && amount && members.length > 0 && (
              <p className="text-muted text-xs text-center mt-1">
                {group?.currency} {(parseAmount(amount) / members.length).toFixed(2)} per person
                ({members.length} people)
              </p>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="px-5 pb-10">
          <button
            type="submit"
            disabled={loading || !amount || effectiveSplitMembers.length === 0}
            className="btn-primary flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
            ) : (
              'Add Expense'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
