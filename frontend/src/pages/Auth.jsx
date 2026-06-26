import React from 'react'
import { Button } from '@/components/ui/button'

function Auth({ supabase }) {
  async function Login(provider) {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: window.location.origin
        }
      })
      if (error) {
        console.error("Login error:", error)
        alert(`Error while signing in: ${error.message}`)
      }
    } catch (e) {
      console.error(e)
      alert("An unexpected error occurred.")
    }
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#09090b] overflow-hidden px-4 selection:bg-neutral-800">
      {/* Premium ambient light backgrounds */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-8 md:p-10 shadow-2xl relative z-10 flex flex-col items-center">
        
        {/* Animated logo badge */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20 mb-6 hover:scale-105 transition-transform duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-white">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>

        {/* Text headers */}
        <h1 className="text-2xl font-bold tracking-tight text-white text-center mb-1">
          Purple City AI
        </h1>
        <p className="text-sm text-zinc-400 text-center mb-8">
          Your creative coding companion
        </p>

        {/* Social login buttons */}
        <div className="w-full flex flex-col gap-3.5">
          <Button
            variant="outline"
            onClick={() => Login("google")}
            className="w-full h-12 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:text-white hover:border-zinc-700 text-zinc-300 text-sm font-medium rounded-xl flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.98] cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Sign in with Google
          </Button>

          <Button
            variant="outline"
            onClick={() => Login("github")}
            className="w-full h-12 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:text-white hover:border-zinc-700 text-zinc-300 text-sm font-medium rounded-xl flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.98] cursor-pointer"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z"
              />
            </svg>
            Sign in with GitHub
          </Button>
        </div>

        {/* Footer info */}
        <div className="mt-12 text-center">
          <p className="text-xs text-zinc-500">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Auth