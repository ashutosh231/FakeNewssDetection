import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signupUser, verifyOtp, googleAuth } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { auth, googleProvider } from '../firebase'
import { signInWithPopup } from 'firebase/auth'
import { motion } from 'framer-motion'
import Navbar from './Navbar'

const FloatingElements = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
    {/* Robot detective */}
    <div className="absolute top-[8%] right-[6%] animate-float-slow opacity-20">
      <svg width="110" height="130" viewBox="0 0 110 130" fill="none">
        {/* Hat */}
        <rect x="20" y="5" width="70" height="15" rx="4" fill="#09090B"/>
        <rect x="10" y="18" width="90" height="8" rx="2" fill="#09090B"/>
        {/* Head */}
        <rect x="25" y="26" width="60" height="50" rx="8" fill="#F8F4E8" stroke="#09090B" strokeWidth="4"/>
        {/* Eyes */}
        <circle cx="42" cy="48" r="8" fill="#D2E823" stroke="#09090B" strokeWidth="3"/>
        <circle cx="42" cy="48" r="3" fill="#09090B"/>
        <circle cx="68" cy="48" r="8" fill="#D2E823" stroke="#09090B" strokeWidth="3"/>
        <circle cx="68" cy="48" r="3" fill="#09090B"/>
        {/* Mouth */}
        <rect x="38" y="62" width="34" height="4" rx="2" fill="#09090B"/>
        {/* Body */}
        <rect x="30" y="80" width="50" height="40" rx="6" fill="#09090B"/>
        <text x="55" y="106" textAnchor="middle" fill="#D2E823" fontFamily="monospace" fontWeight="900" fontSize="14">SCAN</text>
      </svg>
    </div>

    {/* Breaking news banner */}
    <div className="absolute top-[12%] left-[3%] animate-float-mid opacity-15 rotate-[-8deg]">
      <svg width="180" height="50" viewBox="0 0 180 50">
        <rect x="2" y="2" width="176" height="46" rx="4" fill="#FF3333" stroke="#09090B" strokeWidth="3"/>
        <text x="90" y="32" textAnchor="middle" fill="white" fontFamily="monospace" fontWeight="900" fontSize="18">⚡ BREAKING NEWS</text>
      </svg>
    </div>

    {/* Truth meter */}
    <div className="absolute bottom-[18%] left-[5%] animate-float-slow opacity-15">
      <svg width="100" height="120" viewBox="0 0 100 120" fill="none">
        <rect x="10" y="10" width="80" height="100" rx="6" fill="#F8F4E8" stroke="#09090B" strokeWidth="4"/>
        <text x="50" y="30" textAnchor="middle" fill="#09090B" fontFamily="monospace" fontWeight="900" fontSize="10">TRUTH</text>
        <text x="50" y="42" textAnchor="middle" fill="#09090B" fontFamily="monospace" fontWeight="900" fontSize="10">METER</text>
        {/* Gauge */}
        <rect x="25" y="52" width="50" height="8" rx="4" fill="#E5E5E5" stroke="#09090B" strokeWidth="2"/>
        <rect x="25" y="52" width="35" height="8" rx="4" fill="#D2E823"/>
        <rect x="25" y="66" width="50" height="8" rx="4" fill="#E5E5E5" stroke="#09090B" strokeWidth="2"/>
        <rect x="25" y="66" width="15" height="8" rx="4" fill="#FF3333"/>
        <rect x="25" y="80" width="50" height="8" rx="4" fill="#E5E5E5" stroke="#09090B" strokeWidth="2"/>
        <rect x="25" y="80" width="45" height="8" rx="4" fill="#22C55E"/>
        <text x="50" y="104" textAnchor="middle" fill="#09090B" fontFamily="monospace" fontWeight="700" fontSize="10">78% TRUE</text>
      </svg>
    </div>

    {/* Lock icon */}
    <div className="absolute bottom-[22%] right-[8%] animate-float-fast opacity-12">
      <svg width="70" height="90" viewBox="0 0 70 90" fill="none">
        <path d="M15 40V28C15 16 24 8 35 8C46 8 55 16 55 28V40" stroke="#09090B" strokeWidth="5" fill="none" strokeLinecap="round"/>
        <rect x="8" y="40" width="54" height="42" rx="6" fill="#D2E823" stroke="#09090B" strokeWidth="4"/>
        <circle cx="35" cy="56" r="6" fill="#09090B"/>
        <rect x="33" y="60" width="4" height="10" rx="2" fill="#09090B"/>
      </svg>
    </div>

    {/* Floating checkmarks */}
    <div className="absolute top-[50%] left-[12%] animate-float-fast opacity-10">
      <svg width="50" height="50" viewBox="0 0 50 50" fill="none">
        <circle cx="25" cy="25" r="22" fill="#22C55E" stroke="#09090B" strokeWidth="3"/>
        <path d="M14 25L22 33L37 17" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>

    {/* Cross mark */}
    <div className="absolute top-[35%] right-[15%] animate-float-mid opacity-10">
      <svg width="45" height="45" viewBox="0 0 45 45" fill="none">
        <circle cx="22" cy="22" r="20" fill="#FF3333" stroke="#09090B" strokeWidth="3"/>
        <path d="M14 14L31 31M31 14L14 31" stroke="white" strokeWidth="4" strokeLinecap="round"/>
      </svg>
    </div>

    {/* Dotted grid */}
    <div className="absolute top-[65%] right-[30%] animate-float-slow opacity-8">
      <svg width="60" height="60" viewBox="0 0 60 60">
        <circle cx="10" cy="10" r="3" fill="#09090B"/>
        <circle cx="30" cy="10" r="3" fill="#D2E823"/>
        <circle cx="50" cy="10" r="3" fill="#09090B"/>
        <circle cx="10" cy="30" r="3" fill="#D2E823"/>
        <circle cx="30" cy="30" r="3" fill="#09090B"/>
        <circle cx="50" cy="30" r="3" fill="#D2E823"/>
        <circle cx="10" cy="50" r="3" fill="#09090B"/>
        <circle cx="30" cy="50" r="3" fill="#D2E823"/>
        <circle cx="50" cy="50" r="3" fill="#09090B"/>
      </svg>
    </div>
  </div>
)

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [step, setStep] = useState('signup')
  const [otp, setOtp] = useState('')
  const [otpEmail, setOtpEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      const data = await signupUser(name, email, password)
      if (data.requireOtp) {
        setOtpEmail(data.email)
        setStep('otp')
      } else {
        login(data)
        navigate('/')
      }
    } catch (err) {
      setError(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await verifyOtp(otpEmail, otp)
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
      <main className="flex-grow flex items-center justify-center p-4">
        <FloatingElements />
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white border-4 border-[#09090B] hard-shadow p-8"
        >
            {/* Decorative top bar */}
            <div className="flex gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-400 border border-[#09090B]" />
              <div className="w-3 h-3 rounded-full bg-yellow-400 border border-[#09090B]" />
              <div className="w-3 h-3 rounded-full bg-green-400 border border-[#09090B]" />
              <span className="ml-auto font-mono text-[9px] uppercase tracking-widest opacity-40">create_account.tsx</span>
            </div>

            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#D2E823] border-2 border-[#09090B] rounded-lg flex items-center justify-center">
                <iconify-icon icon={step === 'otp' ? "lucide:shield-check" : "lucide:user-plus"} class="text-[#09090B] text-lg" />
              </div>
              <h1 className="font-display text-4xl uppercase tracking-tighter">
                {step === 'otp' ? 'VERIFY EMAIL' : 'SIGN UP'}
              </h1>
            </div>
            <p className="font-mono text-sm opacity-60 mb-6">
              {step === 'otp' ? 'Enter the 6-digit code sent to your email' : 'Create your TruthScan AI account'}
            </p>

            {step === 'signup' && (
              <div className="bg-[#D2E823]/30 border-2 border-[#D2E823] px-4 py-2 mb-6 font-mono text-xs flex items-center gap-2">
                <iconify-icon icon="lucide:gift" class="text-base" /> You get <strong className="mx-1">2 free AI scans</strong> on signup!
              </div>
            )}

            {error && (
              <div className="bg-red-100 border-2 border-red-500 text-red-700 px-4 py-3 mb-6 font-mono text-sm flex items-center gap-2">
                <iconify-icon icon="lucide:alert-triangle" /> {error}
              </div>
            )}

            {step === 'signup' ? (
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

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                <label className="font-bold uppercase text-xs tracking-widest block mb-2">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full border-2 border-[#09090B] px-4 py-3 font-mono text-sm bg-[#F8F4E8] focus:outline-none focus:border-[#D2E823] transition-colors"
                  placeholder="John Doe"
                />
              </div>
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
              <div>
                <label className="font-bold uppercase text-xs tracking-widest block mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                  <><iconify-icon icon="lucide:loader-2" class="animate-spin" /> CREATING ACCOUNT...</>
                ) : (
                  <><iconify-icon icon="lucide:rocket" /> CREATE ACCOUNT</>
                )}
              </button>
            </form>

            <p className="font-mono text-xs text-center mt-6 opacity-60">
              Already have an account?{' '}
              <Link to="/login" className="text-[#09090B] font-bold underline hover:text-[#D2E823]">
                Log In
              </Link>
            </p>
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
        </motion.div>
      </main>
    </div>
  )
}
