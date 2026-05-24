import { useState } from 'react'
import { createRouter, createRoute, createRootRoute, RouterProvider, Outlet } from '@tanstack/react-router'
import { DashboardPage } from './pages/Dashboard'
import { UploadPage } from './pages/Upload'
import { AnalysisPage } from './pages/Analysis'
import { useAuth } from './hooks/useAuth'
import { Button, LoadingOverlay, toast } from '@blinkdotnew/ui'
import { Film, Mail, KeyRound, AlertCircle, ArrowLeft } from 'lucide-react'

const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Outlet />
    </div>
  ),
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
})

const uploadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/upload',
  component: UploadPage,
})

const analysisRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/analysis/$id',
  component: AnalysisPage,
})

const routeTree = rootRoute.addChildren([indexRoute, uploadRoute, analysisRoute])
const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export default function App() {
  const { user, isLoading, sendVerificationCode, login, loginAsGuest } = useAuth()
  
  const [email, setEmail] = useState('')
  const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', ''])
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isLoading) {
    return <LoadingOverlay loading={true} />
  }

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast.error('Please enter a valid email address.')
      return
    }

    // Reset visual OTP digits inputs on every new code request
    setCodeDigits(['', '', '', '', '', ''])

    setIsSubmitting(true)
    try {
      await sendVerificationCode(cleanEmail)
      toast.success('Verification code simulated in terminal/logs!')
      setStep('code')
    } catch (err: any) {
      toast.error(err.message || 'Failed to send verification code.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = codeDigits.join('')
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      toast.error('Please enter a complete 6-digit verification code.')
      return
    }

    setIsSubmitting(true)
    try {
      await login(email.trim().toLowerCase(), code)
      toast.success('Successfully logged in!')
    } catch (err: any) {
      toast.error(err.message || 'Invalid verification code. Please check your terminal.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDigitChange = (value: string, idx: number) => {
    if (!/^\d*$/.test(value)) return
    
    const newDigits = [...codeDigits]
    newDigits[idx] = value.slice(-1)
    setCodeDigits(newDigits)
    
    if (value && idx < 5) {
      const nextInput = document.getElementById(`digit-${idx + 1}`)
      nextInput?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Backspace' && !codeDigits[idx] && idx > 0) {
      const prevInput = document.getElementById(`digit-${idx - 1}`)
      prevInput?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text').trim()
    if (/^\d{6}$/.test(pastedText)) {
      const digits = pastedText.split('')
      setCodeDigits(digits)
      document.getElementById('digit-5')?.focus()
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#050505] relative overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#f59e0b]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-md w-full text-center space-y-8 glass p-8 rounded-3xl border-white/10 animate-fade-in z-10 relative">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-2xl group border border-primary/20 transition-all hover:bg-primary/20">
              <Film className="w-12 h-12 text-primary animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-wider text-white bg-gradient-to-r from-white via-white to-primary bg-clip-text text-transparent">SCRIPTX</h1>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">
              Cinematic-grade intelligence for screenwriters and producers.
            </p>
          </div>

          {step === 'email' ? (
            <form onSubmit={handleSendCode} className="space-y-6 text-left">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" /> Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@screenplay.com"
                    required
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all text-base"
                  />
                </div>
              </div>

              <Button type="submit" size="lg" disabled={isSubmitting} className="w-full text-base h-12 font-bold shadow-lg shadow-primary/20 transition-all hover:translate-y-[-1px]">
                {isSubmitting ? 'Sending code...' : 'Send Verification Code'}
              </Button>

              <div className="relative flex py-1.5 items-center">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="flex-shrink mx-4 text-muted-foreground text-[10px] uppercase tracking-widest font-bold">Or</span>
                <div className="flex-grow border-t border-white/5"></div>
              </div>

              <Button 
                type="button" 
                variant="outline" 
                onClick={loginAsGuest} 
                className="w-full text-base h-12 font-bold bg-white/[0.02] border-white/10 hover:bg-white/[0.05] transition-all"
              >
                ⚡ Explore Demo Mode
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-6 text-left">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => {
                      setStep('email')
                      setCodeDigits(['', '', '', '', '', ''])
                    }} 
                    className="text-muted-foreground hover:text-white transition-colors p-1 rounded-lg bg-white/5 border border-white/5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <KeyRound className="w-3.5 h-3.5 text-primary" /> Enter 6-digit Code
                    </label>
                    <span className="text-xs text-muted-foreground block truncate max-w-[260px]">Sent to: {email}</span>
                  </div>
                </div>

                <div className="flex gap-2.5 justify-center py-2">
                  {codeDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`digit-${idx}`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(e.target.value, idx)}
                      onKeyDown={(e) => handleKeyDown(e, idx)}
                      onPaste={handlePaste}
                      className="w-12 h-14 text-center text-xl font-bold bg-white/[0.04] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all font-mono"
                    />
                  ))}
                </div>
              </div>

              <Button type="submit" size="lg" disabled={isSubmitting} className="w-full text-base h-12 font-bold shadow-lg shadow-primary/20 transition-all hover:translate-y-[-1px]">
                {isSubmitting ? 'Verifying...' : 'Verify & Sign In'}
              </Button>
            </form>
          )}

          {/* Dev helper notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-left text-xs text-muted-foreground">
            <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <span className="font-semibold text-foreground">Local Dev Mode:</span> The 6-digit verification code will print in the backend terminal console and log to <span className="font-mono text-primary">storage/email_sim.log</span> for testing.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return <RouterProvider router={router} />
}
