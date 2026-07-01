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

  const [category, setCategory] = useState('other')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [paidBy, setPaidBy] = useState('')
  const [splitMode, setSplitMode] = useState('equal')
  const [customSplitMembers, setCustomSplitMembers] = useState([])

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

    const splitAmount = Math.round((parsedAmount / effectiveSplitMembers.length) * 100) / 100
    const splits = effectiveSplitMembers.map((userId, index) => {
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
      <header className="flex items-center gap-3 px-5 pt-6 pb-4 safe-area-top border-b sticky top-0 z-30" style={{ background: '#0c0c0c', borderColor: 'rgba(255,255,255,0.08)' }}>
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-xl glass flex items-center justify-center flex-shrink-0 min-h-[44px]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ebebeb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 className="flex-1 mono text-xs tracking-[0.15em] uppercase" style={{ color: '#ebebeb' }}>ADD EXPENSE</h1>
        {group && (
          <span className="mono text-[10px] px-2 py-0.5 rounded-full" style={{ color: '#ccff00', background: 'rgba(204,255,0,0.08)', border: '1px solid rgba(204,255,0,0.2)' }}>
            {group.currency}
          </span>
        )}
      </header>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-6 px-5 py-6" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>

          {/* Category grid */}
          <div className="flex flex-col">
            <label className="section-label">// Category</label>
            <div className="grid grid-cols-4 gap-2">
              {categoryList.map(([key, cat]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className="flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all"
                  style={category === key
                    ? { border: '2px solid rgba(204,255,0,0.6)', background: 'rgba(204,255,0,0.08)' }
                    : { border: '2px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }
                  }
                >
                  <span className="text-xl">{cat.emoji}</span>
                  <span className="mono text-[9px]" style={{ color: category === key ? '#ccff00' : 'rgba(235,235,235,0.3)' }}>
                    {cat.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div className="flex flex-col">
            <label className="section-label">// Amount</label>
            <p className="mono text-[10px] mb-2" style={{ color: 'rgba(235,235,235,0.3)' }}>
              {group?.currency ?? ''}
            </p>
            <input
              type="text"
              inputMode="decimal"
              className="input-field text-center"
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '2rem', fontWeight: 700, background: 'rgba(255,255,255,0.04)' }}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="flex flex-col">
            <label className="section-label">// Description</label>
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
          <div className="flex flex-col">
            <label className="section-label">// Date</label>
            <input
              type="date"
              className="input-field"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Paid by */}
          <div className="flex flex-col">
            <label className="section-label">// Paid By</label>
            <div className="flex flex-col gap-2">
              {members.map((m) => (
                <button
                  key={m.user_id}
                  type="button"
                  onClick={() => setPaidBy(m.user_id)}
                  className="card flex items-center gap-3 min-h-[52px] transition-all active:scale-[0.98]"
                  style={paidBy === m.user_id
                    ? { border: '1px solid rgba(204,255,0,0.4)', background: 'rgba(204,255,0,0.04)' }
                    : {}
                  }
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: m.profiles?.avatar_color ?? avatarBg(m.profiles?.name ?? '') }}
                  >
                    {getInitial(m.profiles?.name ?? '')}
                  </div>
                  <span className="text-sm font-medium" style={{ fontFamily: "'Space Grotesk', sans-serif", color: paidBy === m.user_id ? '#ccff00' : '#ebebeb' }}>
                    {m.profiles?.name ?? 'Unknown'}
                    {m.user_id === currentUser?.id ? ' (you)' : ''}
                  </span>
                  {paidBy === m.user_id && (
                    <svg className="ml-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccff00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Split */}
          <div className="flex flex-col">
            <label className="section-label">// Split</label>
            <div className="flex gap-2 mb-3">
              {['equal', 'custom'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSplitMode(mode)}
                  className="flex-1 py-2.5 rounded-full text-xs font-bold border transition-all min-h-[44px] mono"
                  style={splitMode === mode
                    ? { background: '#ccff00', color: '#000', border: '1px solid #ccff00' }
                    : { background: 'rgba(255,255,255,0.03)', color: 'rgba(235,235,235,0.4)', border: '1px solid rgba(255,255,255,0.1)' }
                  }
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>

            {amount && effectiveSplitMembers.length > 0 && (
              <p className="mono text-[10px] text-center mb-2" style={{ color: 'rgba(235,235,235,0.3)' }}>
                {group?.currency} {(parseAmount(amount) / effectiveSplitMembers.length).toFixed(2)} per person
                ({effectiveSplitMembers.length} {effectiveSplitMembers.length === 1 ? 'person' : 'people'})
              </p>
            )}

            {splitMode === 'custom' && (
              <div className="flex flex-col gap-2">
                <p className="mono text-[10px]" style={{ color: 'rgba(235,235,235,0.3)' }}>SELECT WHO TO SPLIT WITH:</p>
                {members.map((m) => {
                  const isSelected = customSplitMembers.includes(m.user_id)
                  return (
                    <button
                      key={m.user_id}
                      type="button"
                      onClick={() => toggleCustomMember(m.user_id)}
                      className="card flex items-center gap-3 min-h-[52px] transition-all active:scale-[0.98]"
                      style={isSelected
                        ? { border: '1px solid rgba(204,255,0,0.4)', background: 'rgba(204,255,0,0.04)' }
                        : {}
                      }
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ backgroundColor: m.profiles?.avatar_color ?? avatarBg(m.profiles?.name ?? '') }}
                      >
                        {getInitial(m.profiles?.name ?? '')}
                      </div>
                      <span className="text-sm font-medium" style={{ fontFamily: "'Space Grotesk', sans-serif", color: isSelected ? '#ccff00' : '#ebebeb' }}>
                        {m.profiles?.name ?? 'Unknown'}
                      </span>
                      {isSelected && (
                        <svg className="ml-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccff00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

        {/* Submit */}
        <div className="px-5 pb-8 sticky bottom-0 border-t pt-4" style={{ background: '#0c0c0c', borderColor: 'rgba(255,255,255,0.08)' }}>
          <button
            type="submit"
            disabled={loading || !amount || effectiveSplitMembers.length === 0}
            className="btn-primary flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              'Add Expense'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
