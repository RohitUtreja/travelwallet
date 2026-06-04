'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getInitial, avatarBg } from '@/lib/utils'
import BottomNav from '@/components/BottomNav'
import Toast, { useToast } from '@/components/Toast'

const AVATAR_COLORS = [
  '#00D4AA', '#4A90E2', '#FF6B6B', '#FFB547', '#A29BFE',
  '#50E3C2', '#FF9F43', '#EE5A24', '#C0392B', '#7B68EE',
]

export default function ProfilePage() {
  const router = useRouter()
  const { toasts, showToast } = useToast()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [name, setName] = useState('')
  const [avatarColor, setAvatarColor] = useState('#00D4AA')
  const [loading, setLoading] = useState(false)
  const [initing, setIniting] = useState(true)

  const init = useCallback(async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }
    setUser(session.user)

    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (prof) {
      setProfile(prof)
      setName(prof.name ?? '')
      setAvatarColor(prof.avatar_color ?? '#00D4AA')
    }

    setIniting(false)
  }, [router])

  useEffect(() => {
    init()
  }, [init])

  async function handleSave(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ name: name.trim(), avatar_color: avatarColor })
      .eq('id', user.id)

    if (error) {
      showToast(error.message, 'error')
    } else {
      showToast('Profile updated', 'success')
    }

    setLoading(false)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (initing) {
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
      <header className="flex items-center gap-3 px-5 pt-6 pb-4 safe-area-top border-b border-border/50 sticky top-0 z-30 bg-bg">
        <h1 className="text-lg font-bold text-textprimary">Profile</h1>
      </header>

      <main className="flex-1 px-5 py-6 pb-safe overflow-y-auto">
        {/* Avatar preview */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold mb-3"
            style={{ backgroundColor: avatarColor }}
          >
            {getInitial(name || user?.email || '?')}
          </div>
          <p className="text-textprimary font-semibold text-lg">{name || 'Your name'}</p>
          <p className="text-muted text-sm">{user?.email}</p>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-6">
          {/* Name */}
          <div className="flex flex-col gap-2">
            <label className="text-muted text-xs font-semibold uppercase tracking-wider">
              Display Name
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={50}
            />
          </div>

          {/* Avatar color */}
          <div className="flex flex-col gap-2">
            <label className="text-muted text-xs font-semibold uppercase tracking-wider">
              Avatar Color
            </label>
            <div className="flex flex-wrap gap-3">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAvatarColor(color)}
                  className="w-9 h-9 rounded-full transition-transform active:scale-90"
                  style={{
                    backgroundColor: color,
                    outline: avatarColor === color ? `3px solid ${color}` : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="btn-primary flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
            ) : (
              'Save Changes'
            )}
          </button>
        </form>

        {/* Sign out */}
        <div className="mt-10 pt-6 border-t border-border">
          <button
            onClick={handleSignOut}
            className="w-full py-3.5 rounded-2xl border border-danger/30 text-danger font-semibold text-base transition-all active:scale-95 hover:bg-danger/10"
          >
            Sign out
          </button>
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
