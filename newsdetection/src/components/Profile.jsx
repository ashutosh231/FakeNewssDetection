import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { updateProfile, getScanHistory, requestDeleteOtp, deleteAccount, sendSupportQuery } from '../services/api'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from './Navbar'
import Footer from './Footer'

/* Animated counter */
function Counter({ value, duration = 800 }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let raf
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(eased * value))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return <>{display}</>
}

/* Tab config */
const TABS = [
  { id: 'overview', label: 'Overview', icon: 'lucide:user' },
  { id: 'history', label: 'History', icon: 'lucide:clock' },
  { id: 'settings', label: 'Settings', icon: 'lucide:settings' },
  { id: 'support', label: 'Support', icon: 'lucide:life-buoy' },
]

export default function Profile() {
  const { user, logout, refreshUser } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [tab, setTab] = useState('overview')
  const [scanHistory, setScanHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Settings state
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [settingsMsg, setSettingsMsg] = useState({ type: '', text: '' })
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState(user?.profileImage || '')
  const [imageFile, setImageFile] = useState(null)

  // Delete account state
  const [deleteStep, setDeleteStep] = useState('initial')
  const [deleteOtp, setDeleteOtp] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Support state
  const [supportMessage, setSupportMessage] = useState('')
  const [supportLoading, setSupportLoading] = useState(false)
  const [supportStatus, setSupportStatus] = useState({ type: '', text: '' })

  useEffect(() => {
    if (tab === 'history') {
      setHistoryLoading(true)
      getScanHistory()
        .then(data => setScanHistory(data))
        .catch(() => setScanHistory([]))
        .finally(() => setHistoryLoading(false))
    }
  }, [tab])

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSettingsSave = async (e) => {
    e.preventDefault()
    setSettingsMsg({ type: '', text: '' })
    if (newPassword && newPassword !== confirmNewPassword) {
      setSettingsMsg({ type: 'error', text: 'Passwords do not match' })
      return
    }
    setSettingsLoading(true)
    try {
      const formData = new FormData()
      if (name !== user.name) formData.append('name', name)
      if (email !== user.email) formData.append('email', email)
      if (newPassword) formData.append('password', newPassword)
      if (imageFile) formData.append('profileImage', imageFile)
      await updateProfile(formData)
      await refreshUser()
      setSettingsMsg({ type: 'success', text: 'Profile updated successfully!' })
      setNewPassword('')
      setConfirmNewPassword('')
      setImageFile(null)
    } catch (err) {
      setSettingsMsg({ type: 'error', text: err.message || 'Update failed' })
    } finally {
      setSettingsLoading(false)
    }
  }

  const handleDeleteRequest = async () => {
    setDeleteLoading(true)
    setDeleteError('')
    try {
      await requestDeleteOtp()
      setDeleteStep('otp')
    } catch (err) {
      setDeleteError(err.message || 'Failed to request OTP')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleDeleteConfirm = async (e) => {
    e.preventDefault()
    setDeleteLoading(true)
    setDeleteError('')
    try {
      await deleteAccount(deleteOtp)
      await logout()
      navigate('/')
    } catch (err) {
      setDeleteError(err.message || 'Invalid or expired OTP')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleSupportSubmit = async (e) => {
    e.preventDefault()
    if (!supportMessage.trim()) return
    setSupportLoading(true)
    setSupportStatus({ type: '', text: '' })
    try {
      await sendSupportQuery(supportMessage)
      setSupportStatus({ type: 'success', text: 'Message sent! We will get back to you soon.' })
      setSupportMessage('')
    } catch (err) {
      setSupportStatus({ type: 'error', text: err.message || 'Failed to send message.' })
    } finally {
      setSupportLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  if (!user) return null

  const daysLeft = user.subscriptionExpiry
    ? Math.max(0, Math.ceil((new Date(user.subscriptionExpiry) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0
  const scansLeft = Math.max(0, 2 - (user.freeScansUsed || 0))
  const isPremium = user.subscriptionPlan === 'premium'

  const getRiskColor = (score) => {
    if (score >= 70) return 'text-green-600 bg-green-50 border-green-200'
    if (score >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  return (
    <div className="min-h-screen flex flex-col relative z-10 bg-[#F8F4E8]">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 md:px-8 py-8 max-w-6xl">
        {/* ── Hero Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative bg-[#09090B] border-2 border-[#09090B] rounded-[24px] hard-shadow-lg overflow-hidden mb-8"
        >
          {/* Background pattern */}
          <div className="absolute inset-0 grid-pattern opacity-30 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#09090B] via-[#09090B]/95 to-[#D2E823]/10 pointer-events-none" />

          <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row items-center gap-8">
            {/* Avatar */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => fileInputRef.current?.click()}
              className="relative w-28 h-28 rounded-2xl border-4 border-[#D2E823] bg-[#D2E823] flex items-center justify-center text-4xl font-display overflow-hidden cursor-pointer group shrink-0"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[#09090B]">{user.name?.charAt(0).toUpperCase()}</span>
              )}
              <div className="absolute inset-0 bg-[#09090B]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <iconify-icon icon="lucide:camera" class="text-white text-2xl" />
              </div>
              <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageChange} className="hidden" />
            </motion.div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="font-display text-3xl md:text-4xl text-[#F8F4E8] uppercase tracking-tighter leading-none mb-1">
                {user.name}
              </h1>
              <p className="font-mono text-sm text-[#F8F4E8]/50 mb-4">{user.email}</p>

              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                <span className={`font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full border-2 font-bold ${
                  isPremium
                    ? 'bg-[#D2E823] border-[#D2E823] text-[#09090B]'
                    : 'bg-transparent border-[#F8F4E8]/30 text-[#F8F4E8]/70'
                }`}>
                  {isPremium ? '★ PREMIUM' : 'FREE PLAN'}
                </span>
                {isPremium && (
                  <span className="font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full border-2 border-[#D2E823]/30 text-[#D2E823] font-bold">
                    {daysLeft} DAYS LEFT
                  </span>
                )}
                {!isPremium && (
                  <span className="font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full border-2 border-[#F8F4E8]/20 text-[#F8F4E8]/50 font-bold">
                    {scansLeft} FREE SCANS LEFT
                  </span>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="flex gap-3 shrink-0">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center px-5 py-3 bg-[#F8F4E8]/5 border border-[#F8F4E8]/10 rounded-xl"
              >
                <div className="font-display text-2xl text-[#D2E823] leading-none">
                  <Counter value={user.totalScans || 0} />
                </div>
                <div className="font-mono text-[9px] text-[#F8F4E8]/40 tracking-widest mt-1">SCANS</div>
              </motion.div>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-center px-5 py-3 bg-[#F8F4E8]/5 border border-[#F8F4E8]/10 rounded-xl"
              >
                <div className="font-display text-2xl text-[#F8F4E8] leading-none">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : 'N/A'}
                </div>
                <div className="font-mono text-[9px] text-[#F8F4E8]/40 tracking-widest mt-1">JOINED</div>
              </motion.div>
            </div>

            {/* Logout */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="absolute top-4 right-4 md:relative md:top-auto md:right-auto px-4 py-2.5 bg-red-500/20 text-red-400 border border-red-500/40 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors cursor-none"
            >
              <iconify-icon icon="lucide:log-out" class="text-sm md:hidden" />
              <span className="hidden md:inline">Logout</span>
            </motion.button>
          </div>
        </motion.div>

        {/* ── Tabs ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex gap-1.5 mb-6 bg-white border-2 border-[#09090B] rounded-xl p-1.5 hard-shadow-sm overflow-x-auto no-scrollbar"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all whitespace-nowrap cursor-none ${
                tab === t.id
                  ? 'bg-[#09090B] text-[#D2E823] shadow-sm'
                  : 'text-[#09090B]/50 hover:text-[#09090B] hover:bg-[#F8F4E8]'
              }`}
            >
              <iconify-icon icon={t.icon} class="text-sm" />
              {t.label}
            </button>
          ))}
        </motion.div>

        {/* ── Tab Content ── */}
        <AnimatePresence mode="wait">
          {/* ── Overview ── */}
          {tab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Quick stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Scans', value: user.totalScans || 0, icon: 'lucide:scan-search', color: 'bg-[#D2E823]' },
                  { label: 'Plan', value: isPremium ? 'Premium' : 'Free', icon: 'lucide:crown', color: isPremium ? 'bg-[#D2E823]' : 'bg-white' },
                  { label: 'Role', value: (user.role || 'user').toUpperCase(), icon: 'lucide:shield', color: 'bg-white' },
                  { label: 'Status', value: 'Active', icon: 'lucide:check-circle', color: 'bg-green-100' },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                    className={`${stat.color} border-2 border-[#09090B] rounded-xl p-5 hard-shadow-sm`}
                  >
                    <iconify-icon icon={stat.icon} class="text-xl text-[#09090B]/60 mb-2" />
                    <p className="font-display text-xl text-[#09090B] leading-none mb-1">
                      {typeof stat.value === 'number' ? <Counter value={stat.value} /> : stat.value}
                    </p>
                    <p className="font-mono text-[9px] text-[#09090B]/50 uppercase tracking-widest">{stat.label}</p>
                  </motion.div>
                ))}
              </div>

              {/* Account details */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-white border-2 border-[#09090B] rounded-[20px] hard-shadow-md p-6 md:p-8"
              >
                <h2 className="font-display text-2xl uppercase tracking-tighter mb-6 flex items-center gap-2">
                  <iconify-icon icon="lucide:user-circle" class="text-[#D2E823]" />
                  Account Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'Full Name', value: user.name },
                    { label: 'Email', value: user.email },
                    { label: 'Member Since', value: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A' },
                    { label: 'Subscription', value: isPremium ? `Premium (${daysLeft} days remaining)` : `Free (${scansLeft} scans left)` },
                  ].map((item, i) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + i * 0.05 }}
                      className="bg-[#F8F4E8] border-2 border-[#09090B] rounded-xl p-4"
                    >
                      <p className="font-mono text-[9px] text-[#09090B]/50 uppercase tracking-widest mb-1">{item.label}</p>
                      <p className="font-bold text-sm text-[#09090B]">{item.value}</p>
                    </motion.div>
                  ))}
                </div>

                {!isPremium && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    onClick={() => navigate('/plans')}
                    className="mt-6 w-full py-3.5 bg-[#D2E823] text-[#09090B] font-bold uppercase tracking-widest text-xs border-2 border-[#09090B] rounded-xl hover:bg-[#09090B] hover:text-[#D2E823] transition-colors btn-press cursor-none flex items-center justify-center gap-2"
                  >
                    <iconify-icon icon="lucide:zap" class="text-base" />
                    Upgrade to Premium
                  </motion.button>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* ── History ── */}
          {tab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="bg-white border-2 border-[#09090B] rounded-[20px] hard-shadow-md p-6 md:p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl uppercase tracking-tighter flex items-center gap-2">
                  <iconify-icon icon="lucide:clock" class="text-[#D2E823]" />
                  Scan History
                </h2>
                {scanHistory.length > 0 && (
                  <span className="font-mono text-[10px] px-3 py-1 bg-[#09090B] text-[#D2E823] rounded-full font-bold">
                    {scanHistory.length} RECORDS
                  </span>
                )}
              </div>

              {historyLoading ? (
                <div className="py-16 flex flex-col items-center">
                  <div className="w-10 h-10 border-2 border-[#D2E823]/30 border-t-[#D2E823] rounded-full animate-spin mb-4" />
                  <p className="font-mono text-xs text-[#09090B]/50">Loading history...</p>
                </div>
              ) : scanHistory.length === 0 ? (
                <div className="py-16 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-[#F8F4E8] border-2 border-[#09090B]/20 rounded-full flex items-center justify-center mb-4">
                    <iconify-icon icon="lucide:search-x" class="text-2xl text-[#09090B]/30" />
                  </div>
                  <p className="font-mono text-xs text-[#09090B]/50 mb-1">No scans recorded yet</p>
                  <p className="font-mono text-[10px] text-[#09090B]/30">Go to the Detector to start scanning!</p>
                  <button
                    onClick={() => navigate('/detector')}
                    className="mt-4 px-5 py-2 bg-[#D2E823] border-2 border-[#09090B] rounded-xl font-bold text-xs uppercase tracking-widest btn-press cursor-none"
                  >
                    Open Detector
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
                  {scanHistory.map((scan, idx) => (
                    <motion.div
                      key={scan._id || idx}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="flex flex-col sm:flex-row gap-3 items-start sm:items-center p-4 bg-[#F8F4E8] border-2 border-[#09090B] rounded-xl hover:bg-[#D2E823]/10 transition-colors"
                    >
                      {/* Score badge */}
                      <div className={`shrink-0 w-14 h-14 rounded-xl border-2 border-[#09090B] flex flex-col items-center justify-center ${getRiskColor(scan.credibilityScore)}`}>
                        <span className="font-display text-lg leading-none">{scan.credibilityScore}</span>
                        <span className="font-mono text-[7px] tracking-wider">%</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs text-[#09090B] line-clamp-2 leading-relaxed mb-1">
                          {scan.content?.substring(0, 140)}...
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[9px] text-[#09090B]/40">
                            {new Date(scan.createdAt).toLocaleString()}
                          </span>
                          <span className="font-mono text-[9px] px-1.5 py-0.5 bg-[#09090B]/5 border border-[#09090B]/10 rounded">
                            {scan.inputType?.toUpperCase() || 'TEXT'}
                          </span>
                        </div>
                      </div>

                      {/* Verdict */}
                      <div className="shrink-0 text-right">
                        <span className="font-bold text-xs uppercase tracking-wider text-[#09090B]">
                          {scan.verdict}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Settings ── */}
          {tab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Edit profile */}
              <div className="bg-white border-2 border-[#09090B] rounded-[20px] hard-shadow-md p-6 md:p-8">
                <h2 className="font-display text-2xl uppercase tracking-tighter mb-6 flex items-center gap-2">
                  <iconify-icon icon="lucide:edit-3" class="text-[#D2E823]" />
                  Edit Profile
                </h2>

                {settingsMsg.text && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`border-2 px-4 py-3 mb-6 font-mono text-sm rounded-xl ${
                      settingsMsg.type === 'error'
                        ? 'bg-red-50 border-red-400 text-red-700'
                        : 'bg-green-50 border-green-400 text-green-700'
                    }`}
                  >
                    {settingsMsg.text}
                  </motion.div>
                )}

                <form onSubmit={handleSettingsSave} className="space-y-5">
                  {/* Avatar row */}
                  <div className="flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-xl border-2 border-[#09090B] bg-[#D2E823] flex items-center justify-center text-xl font-display overflow-hidden cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {imagePreview ? (
                        <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        user.name?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="font-mono text-xs font-bold px-4 py-2 border-2 border-[#09090B] rounded-lg hover:bg-[#D2E823] transition-colors cursor-none"
                    >
                      Change Photo
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="font-mono text-[10px] uppercase tracking-widest text-[#09090B]/60 font-bold block mb-2">Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full border-2 border-[#09090B] px-4 py-3 rounded-xl font-mono text-sm bg-[#F8F4E8] focus:outline-none focus:ring-2 focus:ring-[#D2E823] transition-all"
                      />
                    </div>
                    <div>
                      <label className="font-mono text-[10px] uppercase tracking-widest text-[#09090B]/60 font-bold block mb-2">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full border-2 border-[#09090B] px-4 py-3 rounded-xl font-mono text-sm bg-[#F8F4E8] focus:outline-none focus:ring-2 focus:ring-[#D2E823] transition-all"
                      />
                    </div>
                  </div>

                  <div className="border-t-2 border-[#09090B]/10 pt-5">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-[#09090B]/60 font-bold mb-4">Change Password</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="font-mono text-[10px] uppercase tracking-widest text-[#09090B]/60 font-bold block mb-2">New Password</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full border-2 border-[#09090B] px-4 py-3 rounded-xl font-mono text-sm bg-[#F8F4E8] focus:outline-none focus:ring-2 focus:ring-[#D2E823] transition-all"
                          placeholder="Leave blank to keep"
                        />
                      </div>
                      <div>
                        <label className="font-mono text-[10px] uppercase tracking-widest text-[#09090B]/60 font-bold block mb-2">Confirm Password</label>
                        <input
                          type="password"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          className="w-full border-2 border-[#09090B] px-4 py-3 rounded-xl font-mono text-sm bg-[#F8F4E8] focus:outline-none focus:ring-2 focus:ring-[#D2E823] transition-all"
                          placeholder="Confirm"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={settingsLoading}
                    className="w-full py-3.5 bg-[#09090B] text-[#D2E823] font-bold uppercase tracking-widest text-xs border-2 border-[#09090B] rounded-xl hover:bg-[#D2E823] hover:text-[#09090B] transition-colors disabled:opacity-50 btn-press cursor-none flex items-center justify-center gap-2"
                  >
                    {settingsLoading ? (
                      <><iconify-icon icon="lucide:loader-2" class="animate-spin" /> Saving...</>
                    ) : (
                      <><iconify-icon icon="lucide:save" /> Save Changes</>
                    )}
                  </button>
                </form>
              </div>

              {/* Danger zone */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-white border-2 border-red-400 rounded-[20px] p-6 md:p-8"
              >
                <h3 className="font-display text-xl uppercase tracking-tighter text-red-600 mb-3 flex items-center gap-2">
                  <iconify-icon icon="lucide:alert-octagon" />
                  Danger Zone
                </h3>

                {deleteError && (
                  <div className="bg-red-50 border-2 border-red-400 text-red-700 px-4 py-3 mb-4 font-mono text-sm rounded-xl">
                    {deleteError}
                  </div>
                )}

                {deleteStep === 'initial' ? (
                  <div>
                    <p className="font-mono text-xs text-[#09090B]/60 mb-4">
                      Once you delete your account, there is no going back. All data will be permanently removed.
                    </p>
                    <button
                      onClick={handleDeleteRequest}
                      disabled={deleteLoading}
                      className="px-5 py-2.5 bg-red-500 text-white font-bold uppercase text-xs tracking-widest border-2 border-[#09090B] rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 cursor-none flex items-center gap-2"
                    >
                      {deleteLoading ? 'Requesting...' : 'Delete Account'}
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="font-mono text-xs text-red-600 font-bold mb-4">
                      An OTP has been sent to your email. Enter it below to permanently delete your account.
                    </p>
                    <form onSubmit={handleDeleteConfirm} className="flex gap-3 items-end">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={deleteOtp}
                          onChange={(e) => setDeleteOtp(e.target.value)}
                          required
                          maxLength={6}
                          className="w-full border-2 border-red-400 px-4 py-3 rounded-xl font-mono text-lg tracking-[0.3em] bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400"
                          placeholder="------"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={deleteLoading || deleteOtp.length !== 6}
                        className="px-5 py-3 bg-red-600 text-white font-bold uppercase text-xs tracking-widest border-2 border-[#09090B] rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 cursor-none"
                      >
                        {deleteLoading ? 'Deleting...' : 'Confirm'}
                      </button>
                    </form>
                    <button
                      onClick={() => setDeleteStep('initial')}
                      className="mt-3 font-mono text-[10px] uppercase underline text-[#09090B]/50 hover:text-[#09090B] cursor-none"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* ── Support ── */}
          {tab === 'support' && (
            <motion.div
              key="support"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="bg-white border-2 border-[#09090B] rounded-[20px] hard-shadow-md p-6 md:p-8"
            >
              <h2 className="font-display text-2xl uppercase tracking-tighter mb-2 flex items-center gap-2">
                <iconify-icon icon="lucide:life-buoy" class="text-[#D2E823]" />
                Help & Support
              </h2>
              <p className="font-mono text-xs text-[#09090B]/50 mb-6">
                Have a question or facing an issue? Send us a message and we will get back to you via email.
              </p>

              {supportStatus.text && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`border-2 px-4 py-3 mb-6 font-mono text-sm rounded-xl ${
                    supportStatus.type === 'error'
                      ? 'bg-red-50 border-red-400 text-red-700'
                      : 'bg-green-50 border-green-400 text-green-700'
                  }`}
                >
                  {supportStatus.text}
                </motion.div>
              )}

              <form onSubmit={handleSupportSubmit} className="space-y-4">
                <textarea
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  rows="5"
                  placeholder="Describe your issue or question here..."
                  className="w-full border-2 border-[#09090B] p-4 rounded-xl font-mono text-sm bg-[#F8F4E8] focus:outline-none focus:ring-2 focus:ring-[#D2E823] transition-all resize-none"
                  required
                />
                <button
                  type="submit"
                  disabled={supportLoading || !supportMessage.trim()}
                  className="px-6 py-3 bg-[#09090B] text-[#D2E823] font-bold uppercase text-xs tracking-widest border-2 border-[#09090B] rounded-xl hover:bg-[#D2E823] hover:text-[#09090B] transition-colors disabled:opacity-50 btn-press cursor-none flex items-center gap-2"
                >
                  {supportLoading ? (
                    <><iconify-icon icon="lucide:loader-2" class="animate-spin" /> Sending...</>
                  ) : (
                    <><iconify-icon icon="lucide:send" /> Send Message</>
                  )}
                </button>
              </form>

              {/* FAQ */}
              <div className="mt-8 pt-6 border-t-2 border-[#09090B]/10">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#09090B]/50 font-bold mb-4">Quick Help</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { q: 'How does the AI detect fake news?', a: 'We use a multi-model RAG pipeline with 2 HF classifiers, sentiment analysis, and LLM reasoning.' },
                    { q: 'What is the free plan limit?', a: 'Free users get 2 scans. Upgrade to Premium for unlimited access.' },
                    { q: 'How accurate is the detection?', a: 'Our ensemble achieves 98.6% accuracy on benchmark datasets.' },
                    { q: 'Can I scan images?', a: 'Yes! Use the Image mode in the Detector to OCR screenshots.' },
                  ].map((faq, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      className="bg-[#F8F4E8] border-2 border-[#09090B] rounded-xl p-4"
                    >
                      <p className="font-bold text-xs text-[#09090B] mb-1">{faq.q}</p>
                      <p className="font-mono text-[10px] text-[#09090B]/60 leading-relaxed">{faq.a}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  )
}
