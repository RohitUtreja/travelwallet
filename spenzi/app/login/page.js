'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Toast, { useToast } from '@/components/Toast'

export default function LoginPage() {
  const router = useRouter()
  const { toasts, showToast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (error) {
      showToast(
        error.message === 'Invalid login credentials'
          ? 'Incorrect email or password'
          : error.message,
        'error'
      )
      setLoading(false)
      return
    }

    router.replace('/groups')
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 safe-area-top" style={{ background: '#000' }}>
      <Toast toasts={toasts} />

      {/* Mono tag */}
      <div className="flex items-center gap-2 mb-10 animate-fade-in">
        <span className="pulse-lime w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#ccff00', display: 'inline-block' }} />
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(235,235,235,0.4)' }}>
          [ SPENZI // EXPENSE SPLIT ]
        </span>
      </div>

      {/* Logo + name */}
      <div className="flex flex-col items-center mb-10 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <div className="card flex items-center justify-center mb-5 float-anim" style={{ width: '80px', height: '80px', borderRadius: '1.5rem' }}>
          <span style={{ fontSize: '2.5rem' }}>💸</span>
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.04em', color: '#ebebeb', lineHeight: 1 }}>
          Spenzi
        </h1>
        <p className="mt-2 text-sm text-center" style={{ color: 'rgba(235,235,235,0.4)' }}>
          Split smarter, travel together
        </p>
      </div>

      {/* Form card */}
      <div className="card w-full max-w-sm animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="section-label">Email</label>
            <input
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="section-label">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field pr-12"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 min-h-[44px] flex items-center transition-colors"
                style={{ color: 'rgba(235,235,235,0.3)' }}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="btn-primary mt-2 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              'Sign in'
            )}
          </button>
        </form>
      </div>

      <p className="text-xs mt-8 text-center" style={{ color: 'rgba(235,235,235,0.2)' }}>
        Contact your admin to get access
      </p>
    </div>
  )
}
