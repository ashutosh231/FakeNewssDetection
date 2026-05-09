import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { updateProfile, getScanHistory, requestDeleteOtp, deleteAccount, sendSupportQuery } from '../services/api'
import { motion } from 'framer-motion'
import Navbar from './Navbar'
import Footer from './Footer'
import { useEffect } from 'react'

export default function Profile() {
  const { user, logout, refreshUser } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [tab, setTab] = useState('profile') // profile | history | settings
  const [scanHistory, setScanHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Settings state
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [settingsMsg, setSettingsMsg] = useState({ type: '', text: '' })
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState(user?.profileImage || '')
  const [imageFile, setImageFile] = useState(null)

  // Delete account state
  const [deleteStep, setDeleteStep] = useState('initial') // initial | otp
  const [deleteOtp, setDeleteOtp] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Support state
  const [supportMessage, setSupportMessage] = useState('')
  const [supportLoading, setSupportLoading] = useState(false)
  const [supportStatus, setSupportStatus] = useState({ type: '', text: '' })

  useEffect(() => {
    if (!user) navigate('/login')
  }, [user, navigate])

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
      setCurrentPassword('')
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
      setSupportStatus({ type: 'success', text: 'Message sent successfully! We will get back to you soon.' })
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

  return (
    <div className="min-h-screen flex flex-col relative z-10 bg-[#F8F4E8] overflow-hidden">
      {/* Neo-brutalist dot background */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(#09090B 2px, transparent 2px)', backgroundSize: '32px 32px' }} 
      />

      {/* Decorative floating shapes */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute top-20 -right-20 w-64 h-64 border-4 border-[#09090B] bg-[#D2E823] -z-10 opacity-20 hidden md:block"
      />
      <motion.div
        animate={{ y: [0, -30, 0], rotate: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-40 -left-10 w-48 h-48 rounded-full border-4 border-[#09090B] bg-purple-400 -z-10 opacity-20 hidden md:block"
      />
      
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-16 max-w-4xl relative z-10">
        {/* Profile Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border-4 border-[#09090B] hard-shadow p-8 mb-8 flex flex-col sm:flex-row items-center gap-6"
        >
          <div
            className="w-24 h-24 rounded-full border-4 border-[#09090B] bg-[#D2E823] flex items-center justify-center text-3xl font-display overflow-hidden cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              user.name?.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="font-display text-3xl uppercase tracking-tighter">{user.name}</h1>
            <p className="font-mono text-sm opacity-60">{user.email}</p>
            <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
              <span className={`font-mono text-[10px] uppercase tracking-widest px-3 py-1 border-2 font-bold ${
                user.subscriptionPlan === 'premium'
                  ? 'bg-[#D2E823] border-[#09090B] text-[#09090B]'
                  : 'bg-[#09090B] border-[#09090B] text-white'
              }`}>
                {user.subscriptionPlan === 'premium' ? '★ PREMIUM' : 'FREE PLAN'}
              </span>
              {user.subscriptionPlan === 'premium' && (
                <span className="font-mono text-[10px] uppercase tracking-widest px-3 py-1 border-2 border-[#09090B] bg-white font-bold">
                  {daysLeft} DAYS LEFT
                </span>
              )}
              {user.subscriptionPlan === 'free' && (
                <span className="font-mono text-[10px] uppercase tracking-widest px-3 py-1 border-2 border-[#09090B] bg-white font-bold">
                  {Math.max(0, 2 - (user.freeScansUsed || 0))} SCANS LEFT
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white font-bold uppercase text-xs px-5 py-3 border-2 border-[#09090B] hover:bg-red-600 transition-colors"
          >
            LOGOUT
          </button>
        </motion.div>

        {/* Tabs */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 mb-8"
        >
          {['profile', 'history', 'settings'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`font-bold uppercase text-xs tracking-widest px-6 py-3 border-2 border-[#09090B] transition-colors ${
                tab === t
                  ? 'bg-[#09090B] text-white'
                  : 'bg-white text-[#09090B] hover:bg-[#D2E823]'
              }`}
            >
              {t}
            </button>
          ))}
        </motion.div>

        {/* Tab Content */}
        {tab === 'profile' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border-4 border-[#09090B] hard-shadow p-8"
          >
            <h2 className="font-display text-2xl uppercase tracking-tight mb-6">Account Overview</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-mono text-sm">
              <div className="border-2 border-[#09090B] p-5">
                <div className="uppercase text-[10px] tracking-widest opacity-50 mb-1">Name</div>
                <div className="font-bold text-lg">{user.name}</div>
              </div>
              <div className="border-2 border-[#09090B] p-5">
                <div className="uppercase text-[10px] tracking-widest opacity-50 mb-1">Email</div>
                <div className="font-bold text-lg">{user.email}</div>
              </div>
              <div className="border-2 border-[#09090B] p-5">
                <div className="uppercase text-[10px] tracking-widest opacity-50 mb-1">Plan</div>
                <div className="font-bold text-lg">{user.subscriptionPlan?.toUpperCase()}</div>
              </div>
              <div className="border-2 border-[#09090B] p-5">
                <div className="uppercase text-[10px] tracking-widest opacity-50 mb-1">Total Scans</div>
                <div className="font-bold text-lg">{user.freeScansUsed || 0}</div>
              </div>
              <div className="border-2 border-[#09090B] p-5">
                <div className="uppercase text-[10px] tracking-widest opacity-50 mb-1">Member Since</div>
                <div className="font-bold text-lg">{new Date(user.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="border-2 border-[#09090B] p-5">
                <div className="uppercase text-[10px] tracking-widest opacity-50 mb-1">Role</div>
                <div className="font-bold text-lg">{user.role?.toUpperCase()}</div>
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'history' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border-4 border-[#09090B] hard-shadow p-8"
          >
            <h2 className="font-display text-2xl uppercase tracking-tight mb-6">Scan History</h2>
            {historyLoading ? (
              <p className="font-mono text-sm opacity-60">Loading history...</p>
            ) : scanHistory.length === 0 ? (
              <p className="font-mono text-sm opacity-60">No scans recorded yet. Go to the Detector to start scanning!</p>
            ) : (
              <div className="space-y-4">
                {scanHistory.map((scan, idx) => (
                  <div key={scan._id || idx} className="border-2 border-[#09090B] p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className="flex-1">
                      <div className="font-mono text-[10px] uppercase tracking-widest opacity-50 mb-1">
                        {new Date(scan.createdAt).toLocaleString()} · {scan.inputType?.toUpperCase()}
                      </div>
                      <p className="font-mono text-sm line-clamp-2">{scan.content?.substring(0, 120)}...</p>
                    </div>
                    <div className="flex gap-2 items-center shrink-0">
                      <span className={`font-bold text-lg px-3 py-1 border-2 border-[#09090B] ${
                        scan.credibilityScore >= 70 ? 'bg-green-200 text-green-800' :
                        scan.credibilityScore >= 40 ? 'bg-yellow-200 text-yellow-800' :
                        'bg-red-200 text-red-800'
                      }`}>
                        {scan.credibilityScore}%
                      </span>
                      <span className="font-mono text-xs uppercase font-bold">{scan.verdict}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {tab === 'settings' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border-4 border-[#09090B] hard-shadow p-8"
          >
            <h2 className="font-display text-2xl uppercase tracking-tight mb-6">Account Settings</h2>

            {settingsMsg.text && (
              <div className={`border-2 px-4 py-3 mb-6 font-mono text-sm ${
                settingsMsg.type === 'error'
                  ? 'bg-red-100 border-red-500 text-red-700'
                  : 'bg-green-100 border-green-500 text-green-700'
              }`}>
                {settingsMsg.text}
              </div>
            )}

            <form onSubmit={handleSettingsSave} className="space-y-6">
              <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageChange} className="hidden" />

              <div className="flex items-center gap-4 mb-4">
                <div
                  className="w-16 h-16 rounded-full border-4 border-[#09090B] bg-[#D2E823] flex items-center justify-center text-xl font-display overflow-hidden cursor-pointer"
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
                  className="font-mono text-xs uppercase font-bold underline hover:text-[#D2E823]"
                >
                  Change Photo
                </button>
              </div>

              <div>
                <label className="font-bold uppercase text-xs tracking-widest block mb-2">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border-2 border-[#09090B] px-4 py-3 font-mono text-sm bg-[#F8F4E8] focus:outline-none focus:border-[#D2E823] transition-colors"
                />
              </div>
              <div>
                <label className="font-bold uppercase text-xs tracking-widest block mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border-2 border-[#09090B] px-4 py-3 font-mono text-sm bg-[#F8F4E8] focus:outline-none focus:border-[#D2E823] transition-colors"
                />
              </div>

              <hr className="border-[#09090B] border-t-2" />
              <h3 className="font-bold uppercase text-sm tracking-widest">Change Password</h3>

              <div>
                <label className="font-bold uppercase text-xs tracking-widest block mb-2">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border-2 border-[#09090B] px-4 py-3 font-mono text-sm bg-[#F8F4E8] focus:outline-none focus:border-[#D2E823] transition-colors"
                  placeholder="Leave blank to keep current"
                />
              </div>
              <div>
                <label className="font-bold uppercase text-xs tracking-widest block mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full border-2 border-[#09090B] px-4 py-3 font-mono text-sm bg-[#F8F4E8] focus:outline-none focus:border-[#D2E823] transition-colors"
                  placeholder="Confirm new password"
                />
              </div>

              <button
                type="submit"
                disabled={settingsLoading}
                className="w-full bg-[#09090B] text-white font-bold uppercase text-sm py-4 border-2 border-[#09090B] hover:bg-[#D2E823] hover:text-[#09090B] transition-colors disabled:opacity-50"
              >
                {settingsLoading ? 'SAVING...' : 'SAVE CHANGES'}
              </button>
            </form>

            {/* Help & Support Section */}
            <div className="mt-12 pt-8 border-t-4 border-[#09090B]">
              <h3 className="font-display text-2xl uppercase tracking-tight mb-4 flex items-center gap-2">
                <iconify-icon icon="lucide:life-buoy" /> HELP & SUPPORT
              </h3>
              <p className="font-mono text-sm mb-6 opacity-80">
                Have a question or facing an issue? Send us a message and we'll get back to you via email.
              </p>

              {supportStatus.text && (
                <div className={`border-2 px-4 py-3 mb-6 font-mono text-sm ${
                  supportStatus.type === 'error'
                    ? 'bg-red-100 border-red-500 text-red-700'
                    : 'bg-green-100 border-green-500 text-green-700'
                }`}>
                  {supportStatus.text}
                </div>
              )}

              <form onSubmit={handleSupportSubmit} className="space-y-4">
                <textarea
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  rows="4"
                  placeholder="Describe your issue or question here..."
                  className="w-full border-2 border-[#09090B] p-4 font-mono text-sm bg-white focus:outline-none focus:border-[#D2E823] transition-colors resize-none"
                  required
                ></textarea>
                <button
                  type="submit"
                  disabled={supportLoading || !supportMessage.trim()}
                  className="w-full sm:w-auto bg-white text-[#09090B] font-bold uppercase text-sm px-8 py-4 border-2 border-[#09090B] hover:bg-[#D2E823] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {supportLoading ? 'SENDING...' : 'SEND MESSAGE'} <iconify-icon icon="lucide:send" />
                </button>
              </form>
            </div>

            {/* Danger Zone */}
            <div className="mt-12 pt-8 border-t-4 border-[#09090B] border-dashed">
              <h3 className="font-display text-2xl uppercase tracking-tight text-red-600 mb-4 flex items-center gap-2">
                <iconify-icon icon="lucide:alert-octagon" /> DANGER ZONE
              </h3>
              
              {deleteError && (
                <div className="bg-red-100 border-2 border-red-500 text-red-700 px-4 py-3 mb-6 font-mono text-sm flex items-center gap-2">
                  <iconify-icon icon="lucide:alert-triangle" /> {deleteError}
                </div>
              )}

              {deleteStep === 'initial' ? (
                <div className="border-2 border-red-600 bg-red-50 p-6">
                  <p className="font-mono text-sm mb-4">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                  <button
                    onClick={handleDeleteRequest}
                    disabled={deleteLoading}
                    className="bg-red-600 text-white font-bold uppercase text-sm px-6 py-3 border-2 border-[#09090B] hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {deleteLoading ? 'REQUESTING...' : 'DELETE ACCOUNT'}
                  </button>
                </div>
              ) : (
                <div className="border-2 border-red-600 bg-red-50 p-6">
                  <p className="font-mono text-sm mb-4 font-bold text-red-600">
                    An OTP has been sent to your email. Enter it below to permanently delete your account.
                  </p>
                  <form onSubmit={handleDeleteConfirm} className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="font-bold uppercase text-xs tracking-widest block mb-2 text-red-800">Security Code</label>
                      <input
                        type="text"
                        value={deleteOtp}
                        onChange={(e) => setDeleteOtp(e.target.value)}
                        required
                        maxLength={6}
                        className="w-full border-2 border-[#09090B] px-4 py-3 font-mono text-lg tracking-[0.2em] bg-white focus:outline-none focus:border-red-600 transition-colors"
                        placeholder="------"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={deleteLoading || deleteOtp.length !== 6}
                      className="bg-red-600 text-white font-bold uppercase text-sm px-6 py-3 border-2 border-[#09090B] hover:bg-red-700 transition-colors disabled:opacity-50 h-[52px]"
                    >
                      {deleteLoading ? 'DELETING...' : 'CONFIRM DELETION'}
                    </button>
                  </form>
                  <button
                    onClick={() => setDeleteStep('initial')}
                    className="mt-4 font-mono text-xs uppercase underline text-gray-600 hover:text-[#09090B]"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </main>
      <Footer />
    </div>
  )
}
