'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Toast, { useToast } from '@/components/Toast'

const CURRENCIES = [
  'EUR', 'USD', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'SGD', 'AED', 'TRY', 'INR',
]

export default function NewGroupPage() {
  const router = useRouter()
  const { toasts, showToast } = useToast()
  const [currentUser, setCurrentUser] = useState(null)
  const [allProfiles, setAllProfiles] = useState([])
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [selectedMembers, setSelectedMembers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const init = useCallback(async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }
    setCurrentUser(session.user)

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, avatar_color')
      .order('name')

    setAllProfiles(profiles ?? [])
    setSelectedMembers([session.user.id])
  }, [router])

  useEffect(() => {
    init()
  }, [init])

  function toggleMember(userId) {
    if (userId === currentUser?.id) return
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const filteredProfiles = allProfiles.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim() || selectedMembers.length === 0) return
    setLoading(true)

    const supabase = createClient()

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({ name: name.trim(), currency, created_by: currentUser.id })
      .select()
      .single()

    if (groupError) {
      showToast(groupError.message, 'error')
      setLoading(false)
      return
    }

    const memberSet = Array.from(new Set([currentUser.id, ...selectedMembers]))
    const { error: membersError } = await supabase.from('group_members').insert(
      memberSet.map((userId) => ({ group_id: group.id, user_id: userId }))
    )

    if (membersError) {
      showToast(membersError.message, 'error')
      setLoading(false)
      return
    }

    router.push(`/groups/${group.id}`)
  }

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
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '17px', color: '#ebebeb', letterSpacing: '-0.02em' }}>New Group</h1>
      </header>

      <form onSubmit={handleCreate} className="flex-1 flex flex-col overflow-y-auto">
        <div className="flex flex-col gap-6 px-5 py-6">
          {/* Group name */}
          <div className="flex flex-col">
            <label className="section-label">// Group Name</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Bali 2025"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={60}
            />
          </div>

          {/* Currency */}
          <div className="flex flex-col">
            <label className="section-label">// Currency</label>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  className="px-4 py-2 rounded-full text-xs font-bold border transition-all flex-shrink-0 min-h-[44px] mono"
                  style={currency === c
                    ? { background: '#ccff00', color: '#000', border: '1px solid #ccff00' }
                    : { background: 'rgba(255,255,255,0.03)', color: 'rgba(235,235,235,0.4)', border: '1px solid rgba(255,255,255,0.1)' }
                  }
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Members */}
          <div className="flex flex-col">
            <label className="section-label">// Members ({selectedMembers.length} selected)</label>
            <input
              type="text"
              className="input-field mb-3"
              placeholder="Search people..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
              {filteredProfiles.length === 0 && (
                <p className="text-sm text-center py-4" style={{ color: 'rgba(235,235,235,0.3)' }}>No profiles found</p>
              )}
              {filteredProfiles.map((profile) => {
                const isSelected = selectedMembers.includes(profile.id)
                const isMe = profile.id === currentUser?.id
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => toggleMember(profile.id)}
                    className="card flex items-center gap-3 min-h-[56px] transition-all active:scale-[0.98] text-left"
                    style={isSelected
                      ? { border: '1px solid rgba(204,255,0,0.3)', background: 'rgba(204,255,0,0.04)' }
                      : {}
                    }
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ background: isSelected ? '#ccff00' : (profile.avatar_color ?? 'rgba(255,255,255,0.1)'), color: isSelected ? '#000' : '#ebebeb' }}
                    >
                      {profile.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium flex-1" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#ebebeb' }}>
                      {profile.name} {isMe ? '(you)' : ''}
                    </span>
                    {isSelected && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccff00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="px-5 pb-8 mt-auto sticky bottom-0 border-t pt-4" style={{ background: '#0c0c0c', borderColor: 'rgba(255,255,255,0.08)' }}>
          <button
            type="submit"
            disabled={loading || !name.trim() || selectedMembers.length < 1}
            className="btn-primary flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              'Create Group'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
