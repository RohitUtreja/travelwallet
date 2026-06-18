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
      <header className="flex items-center gap-3 px-5 pt-6 pb-4 safe-area-top border-b border-[#1e2a40]/50 sticky top-0 z-30 bg-[#0A0E1A]">
        <h1 className="text-lg font-bold text-[#F1F5F9]">Profile</h1>
      </header>

      <main className="flex-1 px-5 py-6 pb-[calc(80px+env(safe-area-inset-bottom))] overflow-y-auto">
        {/* Large avatar preview centered */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold mb-3 border-4 border-[#0A0E1A] shadow-lg"
            style={{ backgroundColor: avatarColor }}
          >
            {getInitial(name || user?.email || '?')}
          </div>
          <p className="text-[#F1F5F9] font-semibold text-lg">{name || 'Your name'}</p>
          <p className="text-[#64748B] text-sm">{user?.email}</p>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-6">
          {/* Name */}
          <div className="flex flex-col gap-2">
            <label className="section-label">Display Name</label>
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

          {/* Avatar color swatches */}
          <div className="flex flex-col gap-2">
            <label className="section-label">Avatar Color</label>
            <div className="flex flex-wrap gap-3">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAvatarColor(color)}
                  className="w-10 h-10 rounded-full transition-transform active:scale-90 min-h-[44px] min-w-[44px]"
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

        {/* Sign out in red */}
        <div className="mt-10 pt-6 border-t border-[#1e2a40]">
          <button
            onClick={handleSignOut}
            className="w-full py-3.5 rounded-2xl border border-[#FF6B6B]/30 text-[#FF6B6B] font-semibold text-base transition-all active:scale-95 hover:bg-[#FF6B6B]/10 min-h-[44px]"
          >
            Sign out
          </button>
        </div>

        <p className="text-center text-[#64748B]/40 text-xs mt-8">Spenzi v1.0</p>
      </main>

      <BottomNav />
    </div>
  )
}
