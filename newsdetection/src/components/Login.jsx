import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginUser, verifyOtp, googleAuth } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { auth, googleProvider } from '../firebase'
import { signInWithPopup } from 'firebase/auth'
import { motion } from 'framer-motion'
import Navbar from './Navbar'

const FloatingElements = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
    {/* Floating newspaper */}
    <div className="absolute top-[10%] left-[5%] animate-float-slow opacity-20">
      <svg width="120" height="140" viewBox="0 0 120 140" fill="none">
        <rect x="5" y="5" width="110" height="130" rx="4" fill="#F8F4E8" stroke="#09090B" strokeWidth="4" />
        <rect x="15" y="15" width="90" height="14" rx="2" fill="#09090B" />
        <rect x="15" y="38" width="60" height="6" rx="1" fill="#09090B" opacity="0.3" />
        <rect x="15" y="50" width="80" height="6" rx="1" fill="#09090B" opacity="0.3" />
        <rect x="15" y="62" width="45" height="6" rx="1" fill="#09090B" opacity="0.3" />
        <rect x="15" y="80" width="40" height="40" rx="2" fill="#D2E823" stroke="#09090B" strokeWidth="2" />
        <rect x="65" y="80" width="40" height="6" rx="1" fill="#09090B" opacity="0.3" />
        <rect x="65" y="92" width="35" height="6" rx="1" fill="#09090B" opacity="0.3" />
        <rect x="65" y="104" width="40" height="6" rx="1" fill="#09090B" opacity="0.3" />
      </svg>
    </div>

    {/* FAKE stamp */}
    <div className="absolute top-[18%] right-[8%] animate-float-mid opacity-15 rotate-[-15deg]">
      <svg width="160" height="80" viewBox="0 0 160 80">
        <rect x="4" y="4" width="152" height="72" rx="8" fill="none" stroke="#FF3333" strokeWidth="6" />
        <text x="80" y="52" textAnchor="middle" fill="#FF3333" fontFamily="monospace" fontWeight="900" fontSize="36">FAKE</text>
      </svg>
    </div>

    {/* Magnifying glass */}
    <div className="absolute bottom-[20%] left-[8%] animate-float-mid opacity-15">
      <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
        <circle cx="40" cy="40" r="28" stroke="#09090B" strokeWidth="5" fill="none" />
        <circle cx="40" cy="40" r="20" stroke="#D2E823" strokeWidth="3" fill="#D2E823" opacity="0.3" />
        <line x1="60" y1="60" x2="88" y2="88" stroke="#09090B" strokeWidth="6" strokeLinecap="round" />
      </svg>
    </div>

    {/* Shield check */}
    <div className="absolute top-[40%] right-[5%] animate-float-slow opacity-15">
      <svg width="90" height="110" viewBox="0 0 90 110" fill="none">
        <path d="M45 8L10 28V55C10 80 25 98 45 105C65 98 80 80 80 55V28L45 8Z" fill="#D2E823" stroke="#09090B" strokeWidth="4" />
        <path d="M30 55L42 67L62 42" stroke="#09090B" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    </div>

    {/* VERIFIED stamp */}
    <div className="absolute bottom-[15%] right-[12%] animate-float-slow opacity-12 rotate-[10deg]">
      <svg width="150" height="70" viewBox="0 0 150 70">
        <rect x="4" y="4" width="142" height="62" rx="8" fill="none" stroke="#22C55E" strokeWidth="5" />
        <text x="75" y="46" textAnchor="middle" fill="#22C55E" fontFamily="monospace" fontWeight="900" fontSize="26">VERIFIED</text>
      </svg>
    </div>

    {/* Floating exclamation */}
    <div className="absolute top-[60%] left-[15%] animate-float-fast opacity-10">
      <svg width="50" height="70" viewBox="0 0 50 70" fill="none">
        <circle cx="25" cy="25" r="23" fill="#FF3333" stroke="#09090B" strokeWidth="3" />
        <rect x="21" y="12" width="8" height="18" rx="2" fill="white" />
        <circle cx="25" cy="37" r="4" fill="white" />
      </svg>
    </div>

    {/* AI brain chip */}
    <div className="absolute top-[5%] left-[40%] animate-float-fast opacity-12">
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
        <rect x="20" y="20" width="40" height="40" rx="6" fill="#09090B" stroke="#D2E823" strokeWidth="3" />
        <text x="40" y="46" textAnchor="middle" fill="#D2E823" fontFamily="monospace" fontWeight="900" fontSize="16">AI</text>
        <line x1="20" y1="35" x2="8" y2="35" stroke="#09090B" strokeWidth="3" />
        <line x1="20" y1="45" x2="8" y2="45" stroke="#09090B" strokeWidth="3" />
        <line x1="60" y1="35" x2="72" y2="35" stroke="#09090B" strokeWidth="3" />
        <line x1="60" y1="45" x2="72" y2="45" stroke="#09090B" strokeWidth="3" />
        <line x1="35" y1="20" x2="35" y2="8" stroke="#09090B" strokeWidth="3" />
        <line x1="45" y1="20" x2="45" y2="8" stroke="#09090B" strokeWidth="3" />
        <line x1="35" y1="60" x2="35" y2="72" stroke="#09090B" strokeWidth="3" />
        <line x1="45" y1="60" x2="45" y2="72" stroke="#09090B" strokeWidth="3" />
      </svg>
    </div>

    {/* Small floating dots pattern */}
    <div className="absolute bottom-[35%] left-[35%] animate-float-mid opacity-8">
      <svg width="60" height="60" viewBox="0 0 60 60">
        <circle cx="10" cy="10" r="4" fill="#09090B" />
        <circle cx="30" cy="10" r="4" fill="#D2E823" />
        <circle cx="50" cy="10" r="4" fill="#09090B" />
        <circle cx="10" cy="30" r="4" fill="#D2E823" />
        <circle cx="30" cy="30" r="4" fill="#09090B" />
        <circle cx="50" cy="30" r="4" fill="#D2E823" />
        <circle cx="10" cy="50" r="4" fill="#09090B" />
        <circle cx="30" cy="50" r="4" fill="#D2E823" />
        <circle cx="50" cy="50" r="4" fill="#09090B" />
      </svg>
    </div>
  </div>
)

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState('login')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await loginUser(email, password)
      if (data.requireOtp) {
        setStep('otp')
      } else {
        login(data)
        navigate('/')
      }
    } catch (err) {
      if (err.data?.requireOtp) {
        setStep('otp')
        setError(err.message || 'Please verify your email. A new OTP has been sent.')
      } else {
        setError(err.message || 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await verifyOtp(email, otp)
      login(data)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    try {
      setLoading(true)
      const result = await signInWithPopup(auth, googleProvider)
      const user = result.user
      const data = await googleAuth({
        email: user.email,
        name: user.displayName,
        profileImage: user.photoURL,
        googleId: user.uid
      })
      login(data)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Google Auth failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col relative z-10 bg-[#F8F4E8]">
      <Navbar />
      <main className="flex-grow flex items-center justify-center px-4 py-16 relative">
        <FloatingElements />
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white border-4 border-[#09090B] hard-shadow p-8 relative z-10"
        >
            {/* Decorative top bar */}
            <div className="flex gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-400 border border-[#09090B]" />
              <div className="w-3 h-3 rounded-full bg-yellow-400 border border-[#09090B]" />
              <div className="w-3 h-3 rounded-full bg-green-400 border border-[#09090B]" />
              <span className="ml-auto font-mono text-[9px] uppercase tracking-widest opacity-40">secure_auth.tsx</span>
            </div>

            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#D2E823] border-2 border-[#09090B] rounded-lg flex items-center justify-center">
                <iconify-icon icon={step === 'otp' ? "lucide:shield-check" : "lucide:log-in"} class="text-[#09090B] text-lg" />
              </div>
              <h1 className="font-display text-4xl uppercase tracking-tighter">
                {step === 'otp' ? 'VERIFY EMAIL' : 'LOGIN'}
              </h1>
            </div>
            <p className="font-mono text-sm opacity-60 mb-8">
              {step === 'otp' ? 'Enter the 6-digit code sent to your email' : 'Access your TruthScan AI account'}
            </p>

            {error && (
              <div className="bg-red-100 border-2 border-red-500 text-red-700 px-4 py-3 mb-6 font-mono text-sm flex items-center gap-2">
                <iconify-icon icon="lucide:alert-triangle" /> {error}
              </div>
            )}

            {step === 'login' ? (
              <>
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={loading}
                  className="w-full bg-white text-[#09090B] font-bold uppercase text-sm py-4 border-2 border-[#09090B] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none hard-shadow-sm transition-all duration-300 flex items-center justify-center gap-2 mb-6"
                >
                  <iconify-icon icon="logos:google-icon" /> CONTINUE WITH GOOGLE
                </button>

                <div className="flex items-center gap-2 mb-6">
                  <div className="h-[2px] flex-grow bg-[#09090B]/10"></div>
                  <span className="font-mono text-xs font-bold uppercase opacity-40">OR EMAIL</span>
                  <div className="h-[2px] flex-grow bg-[#09090B]/10"></div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="font-bold uppercase text-xs tracking-widest block mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full border-2 border-[#09090B] px-4 py-3 font-mono text-sm bg-[#F8F4E8] focus:outline-none focus:border-[#D2E823] transition-colors"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="font-bold uppercase text-xs tracking-widest block mb-2">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full border-2 border-[#09090B] px-4 py-3 font-mono text-sm bg-[#F8F4E8] focus:outline-none focus:border-[#D2E823] transition-colors"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#09090B] text-white font-bold uppercase text-sm py-4 border-2 border-[#09090B] hover:bg-[#D2E823] hover:text-[#09090B] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><iconify-icon icon="lucide:loader-2" class="animate-spin" /> AUTHENTICATING...</>
                  ) : (
                    <><iconify-icon icon="lucide:shield-check" /> LOG IN</>
                  )}
                </button>
              </form>
            </>
            ) : (
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div>
                  <label className="font-bold uppercase text-xs tracking-widest block mb-2 text-center">Security Code</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    maxLength={6}
                    className="w-full border-2 border-[#09090B] px-4 py-4 font-mono text-2xl tracking-[0.5em] text-center bg-[#F8F4E8] focus:outline-none focus:border-[#D2E823] transition-colors"
                    placeholder="------"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#D2E823] text-[#09090B] font-bold uppercase text-sm py-4 border-2 border-[#09090B] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none hard-shadow-sm transition-all duration-300 flex items-center justify-center gap-2 mt-4"
                >
                  {loading ? (
                    <><iconify-icon icon="lucide:loader-2" class="animate-spin" /> VERIFYING...</>
                  ) : (
                    <><iconify-icon icon="lucide:unlock" /> UNLOCK ACCOUNT</>
                  )}
                </button>
              </form>
            )}

            <p className="font-mono text-xs text-center mt-6 opacity-60">
              Don't have an account?{' '}
              <Link to="/signup" className="text-[#09090B] font-bold underline hover:text-[#D2E823]">
                Sign Up
              </Link>
            </p>
        </motion.div>
      </main>
    </div>
  )
}
