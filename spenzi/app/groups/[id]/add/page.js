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
      <header className="flex items-center gap-3 px-5 pt-6 pb-4 safe-area-top border-b border-[#1e2a40]/50 sticky top-0 z-30 bg-[#0A0E1A]">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-xl bg-[#1a2234] border border-[#1e2a40] flex items-center justify-center flex-shrink-0 min-h-[44px]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F1F5F9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 className="text-lg font-bold text-[#F1F5F9]">Add Expense</h1>
        {group && (
          <span className="ml-auto chip">{group.currency}</span>
        )}
      </header>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-6 px-5 py-6 pb-[calc(80px+env(safe-area-inset-bottom))]">

          {/* Category grid — colored border+tint on selected */}
          <div className="flex flex-col gap-2">
            <label className="section-label">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {categoryList.map(([key, cat]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all ${
                    category === key
                      ? 'border-[#00D4AA] bg-[#00D4AA]/10'
                      : 'border-[#1e2a40] bg-[#1a2234]'
                  }`}
                >
                  <span className="text-xl">{cat.emoji}</span>
                  <span className={`text-xs font-medium ${category === key ? 'text-[#00D4AA]' : 'text-[#64748B]'}`}>
                    {cat.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount — large centered mono font */}
          <div className="flex flex-col gap-2 items-center">
            <label className="section-label self-start">
              Amount {group?.currency && <span className="normal-case">({group.currency})</span>}
            </label>
            <input
              type="text"
              inputMode="decimal"
              className="w-full bg-[#1a2234] border border-[#1e2a40] rounded-2xl px-4 py-4 text-[#F1F5F9] text-4xl font-mono font-bold text-center outline-none focus:border-[#00D4AA]/60 transition-colors placeholder-[#64748B]/40"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <label className="section-label">Description</label>
            <input
              type="text"
              className="input-field"
              placeholder="What was this for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={120}
            />
          </div>

          {/* Date */}
          <div className="flex flex-col gap-2">
            <label className="section-label">Date</label>
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
            <label className="section-label">Paid by</label>
            <div className="flex flex-col gap-2">
              {members.map((m) => (
                <button
                  key={m.user_id}
                  type="button"
                  onClick={() => setPaidBy(m.user_id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all min-h-[44px] ${
                    paidBy === m.user_id ? 'border-[#00D4AA]/60 bg-[#00D4AA]/10' : 'border-[#1e2a40] bg-[#1a2234]'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: m.profiles?.avatar_color ?? avatarBg(m.profiles?.name ?? '') }}
                  >
                    {getInitial(m.profiles?.name ?? '')}
                  </div>
                  <span className={`text-sm font-medium ${paidBy === m.user_id ? 'text-[#00D4AA]' : 'text-[#F1F5F9]'}`}>
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

          {/* Split — EQUAL|CUSTOM chips */}
          <div className="flex flex-col gap-2">
            <label className="section-label">Split</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSplitMode('equal')}
                className={`flex-1 py-2.5 rounded-full text-sm font-semibold border transition-all min-h-[44px] ${
                  splitMode === 'equal' ? 'bg-[#00D4AA] text-[#0A0E1A] border-[#00D4AA]' : 'bg-[#1a2234] text-[#64748B] border-[#1e2a40]'
                }`}
              >
                EQUAL
              </button>
              <button
                type="button"
                onClick={() => setSplitMode('custom')}
                className={`flex-1 py-2.5 rounded-full text-sm font-semibold border transition-all min-h-[44px] ${
                  splitMode === 'custom' ? 'bg-[#00D4AA] text-[#0A0E1A] border-[#00D4AA]' : 'bg-[#1a2234] text-[#64748B] border-[#1e2a40]'
                }`}
              >
                CUSTOM
              </button>
            </div>

            {/* Per-person preview */}
            {amount && effectiveSplitMembers.length > 0 && (
              <p className="text-[#64748B] text-xs text-center mt-1">
                {group?.currency} {(parseAmount(amount) / effectiveSplitMembers.length).toFixed(2)} per person
                ({effectiveSplitMembers.length} {effectiveSplitMembers.length === 1 ? 'person' : 'people'})
              </p>
            )}

            {splitMode === 'custom' && (
              <div className="flex flex-col gap-2 mt-1">
                <p className="text-[#64748B] text-xs">Select who to split with:</p>
                {members.map((m) => {
                  const isSelected = customSplitMembers.includes(m.user_id)
                  return (
                    <button
                      key={m.user_id}
                      type="button"
                      onClick={() => toggleCustomMember(m.user_id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all min-h-[44px] ${
                        isSelected ? 'border-[#00D4AA]/60 bg-[#00D4AA]/10' : 'border-[#1e2a40] bg-[#1a2234]'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ backgroundColor: m.profiles?.avatar_color ?? avatarBg(m.profiles?.name ?? '') }}
                      >
                        {getInitial(m.profiles?.name ?? '')}
                      </div>
                      <span className={`text-sm font-medium ${isSelected ? 'text-[#00D4AA]' : 'text-[#F1F5F9]'}`}>
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
              </div>
            )}
          </div>
        </div>

        {/* Submit — fixed at bottom */}
        <div className="px-5 pb-8 sticky bottom-0 bg-[#0A0E1A] border-t border-[#1e2a40]/50 pt-4">
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
