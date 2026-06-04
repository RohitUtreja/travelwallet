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
      <header className="flex items-center gap-3 px-5 pt-6 pb-4 safe-area-top border-b border-border/50 sticky top-0 z-30 bg-bg">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-surface2 border border-border flex items-center justify-center flex-shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8F0FE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 className="text-lg font-bold text-textprimary">New Group</h1>
      </header>

      <form onSubmit={handleCreate} className="flex-1 flex flex-col overflow-y-auto">
        <div className="flex flex-col gap-6 px-5 py-6">
          {/* Group name */}
          <div className="flex flex-col gap-2">
            <label className="text-muted text-xs font-semibold uppercase tracking-wider">
              Group name
            </label>
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
          <div className="flex flex-col gap-2">
            <label className="text-muted text-xs font-semibold uppercase tracking-wider">
              Currency
            </label>
            <div className="flex flex-wrap gap-2">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    currency === c
                      ? 'bg-accent text-bg border-accent'
                      : 'bg-surface2 text-muted border-border hover:border-accent/40'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Members */}
          <div className="flex flex-col gap-2">
            <label className="text-muted text-xs font-semibold uppercase tracking-wider">
              Members ({selectedMembers.length} selected)
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Search people..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex flex-col gap-2 mt-1 max-h-64 overflow-y-auto">
              {filteredProfiles.length === 0 && (
                <p className="text-muted text-sm text-center py-4">No profiles found</p>
              )}
              {filteredProfiles.map((profile) => {
                const isSelected = selectedMembers.includes(profile.id)
                const isMe = profile.id === currentUser?.id
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => toggleMember(profile.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      isSelected ? 'bg-accent/10 border-accent/40' : 'bg-surface2 border-border'
                    } ${isMe ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: profile.avatar_color ?? '#00D4AA' }}
                    >
                      {profile.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-textprimary text-sm font-medium flex-1 text-left">
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

        {/* Submit */}
        <div className="px-5 pb-8 mt-auto">
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
