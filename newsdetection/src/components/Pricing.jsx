import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createPaymentOrder, verifyPayment } from '../services/api'
import Navbar from './Navbar'
import Footer from './Footer'
import StatusModal from './StatusModal'

export default function Pricing() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [modalState, setModalState] = useState({ isOpen: false, title: '', message: '', type: 'success', redirect: null })

  const closeModal = () => {
    const target = modalState.redirect;
    setModalState(prev => ({ ...prev, isOpen: false }));
    if (target) navigate(target);
  }

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  const handleUpgrade = async () => {
    if (!user) {
      navigate('/login')
      return
    }

    setLoading(true)
    const isLoaded = await loadRazorpay()
    if (!isLoaded) {
      setModalState({ isOpen: true, title: 'ERROR', message: 'Razorpay SDK failed to load. Please check your connection.', type: 'error', redirect: null })
      setLoading(false)
      return
    }

    try {
      const { order, key } = await createPaymentOrder()

      const options = {
        key,
        amount: order.amount,
        currency: order.currency,
        name: 'TruthScan AI',
        description: 'Premium Access (30 Days)',
        image: 'https://cdn-icons-png.flaticon.com/512/808/808439.png', // Default shield icon
        order_id: order.id,
        handler: async (response) => {
          try {
            await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
            await refreshUser()
            setModalState({ isOpen: true, title: 'ACCESS GRANTED', message: 'Payment Successful! You are now a Premium member. All neural tools unlocked.', type: 'success', redirect: '/profile' })
          } catch (err) {
            setModalState({ isOpen: true, title: 'VERIFICATION FAILED', message: 'Payment verification failed!', type: 'error', redirect: null })
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: '#D2E823'
        }
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (response) {
        setModalState({ isOpen: true, title: 'PAYMENT FAILED', message: `Transaction declined: ${response.error.description}`, type: 'error', redirect: null })
      })
      rzp.open()
    } catch (err) {
      console.error(err)
      setModalState({ isOpen: true, title: 'ERROR', message: 'Failed to initialize payment. Please try again.', type: 'error', redirect: null })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col relative z-10 bg-[#F8F4E8]">
      <Navbar />
      
      <main className="flex-1 py-24 border-t-4 border-[#09090B]">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl">
          <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-6xl uppercase tracking-tighter mb-4 text-[#09090B]">
            ACCESS <span className="text-white bg-[#09090B] px-3">LEVELS</span>
          </h2>
          <p className="font-mono text-sm uppercase tracking-widest font-bold opacity-60">
            Choose your clearance level for the neural network.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <div className="border-4 border-[#09090B] bg-white p-8 hard-shadow flex flex-col transition-transform hover:-translate-y-2 duration-300">
            <h3 className="font-display text-2xl uppercase tracking-tighter mb-2">CIVILIAN</h3>
            <div className="font-mono text-xs font-bold uppercase tracking-widest opacity-50 mb-6 border-b-2 border-[#09090B] pb-4">
              Basic Fact-Checking
            </div>
            
            <div className="text-5xl font-display mb-8">
              ₹0<span className="text-lg opacity-50 font-mono">/FOREVER</span>
            </div>

            <ul className="space-y-4 mb-8 font-mono text-sm font-bold flex-1">
              <li className="flex items-center gap-3">
                <iconify-icon icon="lucide:check" class="text-xl" />
                2 Free Scans Total
              </li>
              <li className="flex items-center gap-3">
                <iconify-icon icon="lucide:check" class="text-xl" />
                Basic AI Fact Checking
              </li>
              <li className="flex items-center gap-3 opacity-30">
                <iconify-icon icon="lucide:x" class="text-xl" />
                Image / OCR Scanning
              </li>
              <li className="flex items-center gap-3 opacity-30">
                <iconify-icon icon="lucide:x" class="text-xl" />
                Advanced Manipulations
              </li>
            </ul>

            <button 
              onClick={() => { if(!user) navigate('/login') }}
              disabled={user && user.subscriptionPlan === 'free'}
              className="w-full py-4 border-2 border-[#09090B] bg-[#09090B] text-white font-bold uppercase tracking-widest hover:bg-[#D2E823] hover:text-[#09090B] transition-colors disabled:opacity-50 disabled:hover:bg-[#09090B] disabled:hover:text-white"
            >
              {user && user.subscriptionPlan === 'free' ? 'CURRENT PLAN' : 'GET STARTED'}
            </button>
          </div>

          {/* Premium Plan */}
          <div className="border-4 border-[#09090B] bg-[#09090B] text-white p-8 hard-shadow-lg flex flex-col transition-transform hover:-translate-y-2 duration-300 relative overflow-hidden">
            {/* Accent Corner */}
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-[#D2E823] rotate-45 border-4 border-[#09090B]" />
            
            <h3 className="font-display text-2xl uppercase tracking-tighter mb-2 text-[#D2E823]">OPERATIVE</h3>
            <div className="font-mono text-xs font-bold uppercase tracking-widest opacity-60 mb-6 border-b-2 border-[#1a1a1a] pb-4">
              Unlimited Neural Access
            </div>
            
            <div className="text-5xl font-display mb-8">
              ₹150<span className="text-lg opacity-50 font-mono">/MONTH</span>
            </div>

            <ul className="space-y-4 mb-8 font-mono text-sm font-bold flex-1">
              <li className="flex items-center gap-3 text-[#D2E823]">
                <iconify-icon icon="lucide:infinity" class="text-xl" />
                Unlimited AI Scans
              </li>
              <li className="flex items-center gap-3">
                <iconify-icon icon="lucide:scan" class="text-xl text-[#D2E823]" />
                Full Image OCR Analysis
              </li>
              <li className="flex items-center gap-3">
                <iconify-icon icon="lucide:cpu" class="text-xl text-[#D2E823]" />
                Advanced Multi-Model Detection
              </li>
              <li className="flex items-center gap-3">
                <iconify-icon icon="lucide:history" class="text-xl text-[#D2E823]" />
                Complete Scan History Logging
              </li>
            </ul>

            <button 
              onClick={handleUpgrade}
              disabled={loading || (user && user.subscriptionPlan === 'premium')}
              className="w-full py-4 border-2 border-[#D2E823] bg-[#D2E823] text-[#09090B] font-bold uppercase tracking-widest hover:bg-white transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <><iconify-icon icon="lucide:loader-2" class="animate-spin" /> PROCESSING...</>
              ) : user && user.subscriptionPlan === 'premium' ? (
                'ALREADY UNLOCKED'
              ) : (
                <><iconify-icon icon="lucide:zap" /> UPGRADE TO OPERATIVE</>
              )}
            </button>
          </div>
          </div>
        </div>
      </main>

      <Footer />
      
      <StatusModal 
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        onClose={closeModal}
      />
    </div>
  )
}
