'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { CATEGORIES, parseAmount, todayISO } from '@/lib/utils'
import Toast, { useToast } from '@/components/Toast'

const CURRENCIES = ['USD','EUR','GBP','JPY','CAD','AUD','CHF','SGD','AED','INR']

export default function AddTrackerExpensePage() {
  const router = useRouter()
  const { toasts, showToast } = useToast()

  const [userId, setUserId] = useState(null)
  const [category, setCategory] = useState('groceries')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [currency, setCurrency] = useState('USD')
  const [loading, setLoading] = useState(false)

  const init = useCallback(async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }
    setUserId(session.user.id)

    const { data: profile } = await supabase
      .from('profiles')
      .select('tracker_currency')
      .eq('id', session.user.id)
      .single()

    if (profile?.tracker_currency) setCurrency(profile.tracker_currency)
  }, [router])

  useEffect(() => { init() }, [init])

  async function handleSubmit(e) {
    e.preventDefault()
    const parsedAmount = parseAmount(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      showToast('Please enter a valid amount', 'error')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.from('personal_expenses').insert({
      user_id: userId,
      category,
      description: description.trim() || null,
      amount: parsedAmount,
      currency,
      date,
    })

    if (error) {
      showToast(error.message, 'error')
      setLoading(false)
      return
    }

    // Save chosen currency as default
    await supabase.from('profiles').update({ tracker_currency: currency }).eq('id', userId)

    router.push('/tracker')
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
        <span className="mono text-[10px] px-2 py-0.5 rounded-full" style={{ color: 'rgba(235,235,235,0.4)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          TRACKER
        </span>
      </header>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-6 px-5 py-6" style={{ paddingBottom: '120px' }}>

          {/* Category */}
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
                    ? { border: `2px solid ${cat.color}80`, background: `${cat.color}12` }
                    : { border: '2px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }
                  }
                >
                  <span className="text-xl">{cat.emoji}</span>
                  <span className="mono text-[9px]" style={{ color: category === key ? cat.color : 'rgba(235,235,235,0.3)' }}>
                    {cat.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount + Currency row */}
          <div className="flex flex-col gap-3">
            <label className="section-label">// Amount</label>
            <div className="flex gap-2">
              <select
                className="input-field"
                style={{ width: '90px', flexShrink: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                type="text"
                inputMode="decimal"
                className="input-field flex-1 text-center"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '2rem', fontWeight: 700 }}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
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

        </div>

        {/* Submit */}
        <div className="px-5 pb-8 sticky bottom-0 border-t pt-4" style={{ background: '#0c0c0c', borderColor: 'rgba(255,255,255,0.08)' }}>
          <button
            type="submit"
            disabled={loading || !amount}
            className="btn-primary flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              'Save Expense'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
