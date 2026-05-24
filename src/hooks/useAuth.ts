import React, { useState, useEffect, createContext, useContext } from 'react'
import { createClient } from '@blinkdotnew/sdk'
import { toast } from '@blinkdotnew/ui'

export interface LocalUser {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: LocalUser | null;
  isLoading: boolean;
  sendVerificationCode: (email: string) => Promise<string>;
  login: (email: string, code: string) => Promise<void>;
  loginAsGuest: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Instantiate the Blink client using environment variables
const blink = createClient({
  projectId: import.meta.env.VITE_BLINK_PROJECT_ID || '',
  publishableKey: import.meta.env.VITE_BLINK_PUBLISHABLE_KEY || ''
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('local_user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [])

  const sendVerificationCode = async (email: string): Promise<string> => {
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    // 1. Register code in the SQLite backend
    const response = await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.detail || 'Failed to send verification code')
    }

    // 2. Dispatch real styled email via Blink Notifications with graceful fallback
    try {
      await blink.notifications.email({
        to: email,
        subject: "ScriptX Verification Code",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 30px; border: 1px solid rgba(255,255,255,0.06); background: #080808; color: #ffffff; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.65);">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; padding: 14px 20px; background: rgba(245,158,11,0.08); border-radius: 16px; border: 1px solid rgba(245,158,11,0.18);">
                <span style="font-size: 26px; color: #f59e0b; font-weight: 900; tracking-wide: 1px;">🎬 SCRIPTX</span>
              </div>
            </div>
            <h2 style="font-size: 22px; font-weight: 800; text-align: center; margin-top: 0; color: #ffffff; letter-spacing: -0.5px;">Your Verification Code</h2>
            <p style="font-size: 14px; color: #a3a3a3; line-height: 1.6; text-align: center; margin-bottom: 30px;">
              Use the 6-digit security code below to complete your login sequence.
            </p>
            <div style="text-align: center; margin: 35px 0;">
              <div style="display: inline-block; font-size: 38px; font-weight: 900; letter-spacing: 7px; color: #f59e0b; background: rgba(255,255,255,0.03); padding: 16px 32px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.09); font-family: 'Courier New', Courier, monospace;">
                ${code}
              </div>
            </div>
            <p style="font-size: 11px; color: #6b6b6b; text-align: center; margin-top: 30px; line-height: 1.6; max-width: 380px; margin-left: auto; margin-right: auto;">
              This security code was requested for logging in and is valid for 10 minutes. If you did not initiate this request, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.05); margin: 30px 0;" />
            <p style="font-size: 9px; color: #404040; text-align: center; margin: 0; letter-spacing: 0.5px; uppercase;">
              Powered by Blink • Zero-boilerplate developer platform
            </p>
          </div>
        `
      })
    } catch (e: any) {
      console.error('Blink Notifications Error detailed payload:', e)
      const reason = e?.message || JSON.stringify(e)
      toast.error(`⚠️ Blink Email failed: ${reason.replace(/\[object Object\]/g, 'domain not configured')}. Code simulated in console.`)
    }

    return code
  }

  const login = async (email: string, code: string) => {
    const response = await fetch('/api/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.detail || 'Invalid or expired verification code')
    }
    const loggedUser = await response.json()
    localStorage.setItem('local_user', JSON.stringify(loggedUser))
    setUser(loggedUser)
  }

  const loginAsGuest = () => {
    const guestId = `guest_${Math.floor(100000 + Math.random() * 900000)}`
    const guestUser = {
      id: guestId,
      name: 'Guest Screenwriter',
      email: 'guest@scriptx.com'
    }
    localStorage.setItem('local_user', JSON.stringify(guestUser))
    setUser(guestUser)
  }

  const logout = async () => {
    const storedUser = localStorage.getItem('local_user')
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser)
        if (parsed.id && parsed.id.startsWith('guest_')) {
          await fetch('/api/guest/cleanup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: parsed.id })
          }).catch(e => console.error('Guest session data cleanup failed:', e))
        }
      } catch (e) {
        console.error('Failed to parse local session during logout:', e)
      }
    }
    localStorage.removeItem('local_user')
    setUser(null)
  }

  return React.createElement(
    AuthContext.Provider,
    { value: { user, isLoading, sendVerificationCode, login, loginAsGuest, logout } },
    children
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context;
}
