import React, { useEffect, useState } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import Auth from './pages/Auth'
import Home from './pages/Home'
import { createClient } from './lib/client'
import axios from 'axios'
import { backend_url } from './lib/config'

const supabase = createClient()

function App() {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        if (session) {
          setUser(session.user)
          setToken(session.access_token)
          if (window.location.pathname === '/auth') {
            navigate('/')
          }
        } else {
          setUser(null)
          setToken(null)
          if (window.location.pathname !== '/auth') {
            navigate('/auth')
          }
        }
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        if (session) {
          setUser(session.user)
          setToken(session.access_token)
          if (window.location.pathname === '/auth') {
            navigate('/')
          }
        } else {
          setUser(null)
          setToken(null)
          if (window.location.pathname !== '/auth') {
            navigate('/auth')
          }
        }
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [navigate])

  // Synchronize user with Postgres database via backend signup
  useEffect(() => {
    async function syncUser() {
      if (user && token) {
        try {
          await axios.post(`${backend_url}/signup`, {
            email: user.email,
            name: user.user_metadata?.full_name || user.email.split('@')[0],
            provider: user.app_metadata?.provider || 'google'
          }, {
            headers: {
              authorization: token
            }
          })
        } catch (e) {
          console.error("Failed to sync user with database:", e)
        }
      }
    }
    syncUser()
  }, [user, token])

  if (loading) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-[#09090b] text-[#fafafa] font-sans">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          {/* Custom chat-like pulsing icon */}
          <div className="w-12 h-12 rounded-full border border-neutral-800 flex items-center justify-center bg-neutral-900 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white animate-bounce">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <span className="text-sm font-medium tracking-wide text-neutral-400">Loading experience...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-screen bg-background text-foreground font-sans selection:bg-neutral-800 selection:text-white">
      <Routes>
        <Route path="/" element={<Home user={user} token={token} supabase={supabase} />} />
        <Route path="/auth" element={<Auth supabase={supabase} />} />
      </Routes>
    </div>
  )
}

export default App