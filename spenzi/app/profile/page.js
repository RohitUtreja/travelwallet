'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getInitial, avatarBg } from '@/lib/utils'
import BottomNav from '@/components/BottomNav'
import Toast, { useToast } from '@/components/Toast'

const AVATAR_COLORS = [
  '#ccff00', '#10b981', '#4A90E2', '#ff4d4d', '#FFB547', '#A29BFE',
  '#50E3C2', '#FF9F43', '#EE5A24', '#7B68EE',
]

export default function ProfilePage() {
  const router = useRouter()
  const { toasts, showToast } = useToast()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [name, setName] = useState('')
  const [avatarColor, setAvatarColor] = useState('#ccff00')
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
      setAvatarColor(prof.avatar_color ?? '#ccff00')
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
      <div className="min-h-dvh flex items-center justify-center" style={{ background: '#0c0c0c' }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(204,255,0,0.3)', borderTopColor: '#ccff00' }} />
      </div>
    )
  }

  return (
    <div className="page-container">
      <Toast toasts={toasts} />

      {/* Header */}
      <header className="flex items-center px-5 pt-6 pb-4 safe-area-top border-b sticky top-0 z-30" style={{ background: '#0c0c0c', borderColor: 'rgba(255,255,255,0.08)' }}>
        <h1 className="mono text-xs tracking-[0.15em] uppercase" style={{ color: '#ebebeb' }}>PROFILE</h1>
      </header>

      <main className="flex-1 px-5 py-6 overflow-y-auto" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
        {/* Avatar centered */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold mb-3"
            style={{ backgroundColor: avatarColor, color: '#000' }}
          >
            {getInitial(name || user?.email || '?')}
          </div>
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '18px', color: '#ebebeb' }}>
            {name || 'Your name'}
          </p>
          <p className="text-sm mt-1" style={{ color: 'rgba(235,235,235,0.4)' }}>{user?.email}</p>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-6">
          {/* Name */}
          <div className="flex flex-col">
            <label className="section-label">// Display Name</label>
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
          <div className="flex flex-col">
            <label className="section-label">// Avatar Color</label>
            <div className="flex flex-wrap gap-3">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAvatarColor(color)}
                  className="w-10 h-10 rounded-full transition-transform active:scale-90 min-h-[44px] min-w-[44px]"
                  style={{
                    backgroundColor: color,
                    outline: avatarColor === color ? `3px solid rgba(255,255,255,0.8)` : 'none',
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
              <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              'Save Changes'
            )}
          </button>
        </form>

        {/* Account section */}
        <div className="mt-10 pt-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <p className="section-label mb-4">// Account</p>
          <button
            onClick={handleSignOut}
            className="w-full py-4 rounded-full font-semibold text-sm transition-all active:scale-95 hover:opacity-80 min-h-[44px]"
            style={{ border: '1px solid rgba(255,77,77,0.4)', color: '#ff4d4d', background: 'rgba(255,77,77,0.04)', fontFamily: "'Space Grotesk', sans-serif" }}
          >
            SIGN OUT
          </button>
        </div>

        <p className="mono text-center text-[10px] mt-8" style={{ color: 'rgba(235,235,235,0.2)' }}>SPENZI v1.0</p>
      </main>

      <BottomNav />
    </div>
  )
}
