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
    // Auto-select current user
    setSelectedMembers([session.user.id])
  }, [router])

  useEffect(() => {
    init()
  }, [init])

  function toggleMember(userId) {
    if (userId === currentUser?.id) return // Can't deselect yourself
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

    // Create group
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

    // Add members (include current user)
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
      <header className="flex items-center gap-3 px-5 pt-6 pb-4 safe-area-top border-b border-[#1e2a40]/50 sticky top-0 z-30 bg-[#0A0E1A]">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-xl bg-[#1a2234] border border-[#1e2a40] flex items-center justify-center flex-shrink-0 min-h-[44px]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F1F5F9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 className="text-lg font-bold text-[#F1F5F9]">New Group</h1>
      </header>

      <form onSubmit={handleCreate} className="flex-1 flex flex-col overflow-y-auto">
        <div className="flex flex-col gap-6 px-5 py-6">
          {/* Group name */}
          <div className="flex flex-col gap-2">
            <label className="section-label">Group name</label>
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

          {/* Currency — horizontal scroll pill chips */}
          <div className="flex flex-col gap-2">
            <label className="section-label">Currency</label>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all flex-shrink-0 min-h-[44px] ${
                    currency === c
                      ? 'bg-[#00D4AA] text-[#0A0E1A] border-[#00D4AA]'
                      : 'bg-[#1a2234] text-[#64748B] border-[#1e2a40] hover:border-[#00D4AA]/40'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Members */}
          <div className="flex flex-col gap-2">
            <label className="section-label">Members ({selectedMembers.length} selected)</label>
            <input
              type="text"
              className="input-field"
              placeholder="Search people..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex flex-col gap-2 mt-1 max-h-64 overflow-y-auto">
              {filteredProfiles.length === 0 && (
                <p className="text-[#64748B] text-sm text-center py-4">No profiles found</p>
              )}
              {filteredProfiles.map((profile) => {
                const isSelected = selectedMembers.includes(profile.id)
                const isMe = profile.id === currentUser?.id
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => toggleMember(profile.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all min-h-[44px] ${
                      isSelected ? 'bg-[#00D4AA]/10 border-[#00D4AA]/40' : 'bg-[#1a2234] border-[#1e2a40]'
                    } ${isMe ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: profile.avatar_color ?? '#00D4AA' }}
                    >
                      {profile.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[#F1F5F9] text-sm font-medium flex-1 text-left">
                      {profile.name} {isMe ? '(you)' : ''}
                    </span>
                    {isSelected && (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00D4AA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Submit — fixed at bottom */}
        <div className="px-5 pb-8 mt-auto sticky bottom-0 bg-[#0A0E1A] border-t border-[#1e2a40]/50 pt-4">
          <button
            type="submit"
            disabled={loading || !name.trim() || selectedMembers.length < 1}
            className="btn-primary flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
            ) : (
              'Create Group'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
