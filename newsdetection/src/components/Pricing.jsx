import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createPaymentOrder, verifyPayment } from '../services/api'
import Navbar from './Navbar'
import Footer from './Footer'
import StatusModal from './StatusModal'

const featureCompare = [
  { feature: 'AI Fact-Checking Scans', free: '2 Total', premium: 'Unlimited' },
  { feature: 'URL / Article Analysis', free: '✓', premium: '✓' },
  { feature: 'Credibility Scoring', free: '✓', premium: '✓' },
  { feature: 'Bias & Manipulation Detection', free: '✓', premium: '✓' },
  { feature: 'Image / OCR Scanning', free: '✗', premium: '✓' },
  { feature: 'Deepfake Detection', free: '✗', premium: '✓' },
  { feature: 'Live News Monitoring', free: '✗', premium: '✓' },
  { feature: 'Scan History & Export', free: '✗', premium: '✓' },
  { feature: 'Premium NVIDIA LLM Model', free: '✗', premium: '✓' },
  { feature: 'Priority Support', free: '✗', premium: '✓' },
]

const faqs = [
  { q: 'How does the AI detection work?', a: 'TruthScan AI uses a 4-layer multi-model pipeline: a dual-ensemble classifier, sentiment/manipulation analyzer, LLM reasoning engine (Mixtral 8x7B + NVIDIA Llama-3.1-70B), and a weighted credibility scoring engine. Each layer cross-validates the others for maximum accuracy.' },
  { q: 'What happens after my 2 free scans?', a: 'Once you exhaust your 2 free scans, you\'ll need to upgrade to the OPERATIVE plan to continue scanning. Your scan history and account remain intact.' },
  { q: 'Can I cancel my subscription?', a: 'Yes, you can cancel anytime. Your premium access remains active until the end of the current billing period.' },
  { q: 'Is my data private?', a: 'Yes. All content you submit for analysis is encrypted in transit and at rest. We do not sell or share your scanning data with third parties.' },
  { q: 'What models power the analysis?', a: 'Our pipeline uses RoBERTa for classification, sentiment analysis, Mixtral 8x7B for reasoning via HuggingFace, and NVIDIA Llama-3.1-70B as a fallback — all coordinated by our proprietary credibility engine.' },
]

const testimonials = [
  { quote: 'Catches manipulated news our team missed. The layer breakdown is incredibly helpful for understanding why something is flagged.', name: 'Dr. Sarah Chen', role: 'Journalism Professor, Columbia', initials: 'SC' },
  { quote: 'I use it daily to verify WhatsApp forwards in my family group. Stopped so much misinformation from spreading.', name: 'Raj Mehta', role: 'Verified User', initials: 'RM' },
  { quote: 'The deepfake detection caught a manipulated video that looked convincing to everyone on our editorial team.', name: 'Emma Torres', role: 'Fact-Checker, AFP', initials: 'ET' },
]

export default function Pricing() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [modalState, setModalState] = useState({ isOpen: false, title: '', message: '', type: 'success', redirect: null })
  const [openFaq, setOpenFaq] = useState(null)

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
    if (!user) { navigate('/login'); return }
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
        key, amount: order.amount, currency: order.currency,
        name: 'TruthScan AI', description: 'Premium Access (30 Days)',
        image: '/logo.png',
        order_id: order.id,
        handler: async (response) => {
          try {
            await verifyPayment({ razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature })
            await refreshUser()
            setModalState({ isOpen: true, title: 'ACCESS GRANTED', message: 'Payment Successful! You are now a Premium member. All neural tools unlocked.', type: 'success', redirect: '/profile' })
          } catch (err) {
            setModalState({ isOpen: true, title: 'VERIFICATION FAILED', message: 'Payment verification failed!', type: 'error', redirect: null })
          }
        },
        prefill: { name: user.name, email: user.email },
        theme: { color: '#D2E823' }
      }
      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (response) {
        setModalState({ isOpen: true, title: 'PAYMENT FAILED', message: `Transaction declined: ${response.error.description}`, type: 'error', redirect: null })
      })
      rzp.open()
    } catch (err) {
      console.error(err)
      setModalState({ isOpen: true, title: 'ERROR', message: 'Failed to initialize payment. Please try again.', type: 'error', redirect: null })
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex flex-col relative z-10 bg-[#F8F4E8]">
      <Navbar />
      <main className="flex-1 py-24 border-t-4 border-[#09090B]">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#D2E823] border-2 border-[#09090B] rounded-full font-bold text-xs mb-4">
              <iconify-icon icon="lucide:zap" class="text-sm" /> PRICING
            </span>
            <h2 className="font-display text-4xl md:text-6xl uppercase tracking-tighter mb-4 text-[#09090B]">
              ACCESS <span className="text-white bg-[#09090B] px-3">LEVELS</span>
            </h2>
            <p className="font-mono text-sm uppercase tracking-widest font-bold opacity-60">
              Choose your clearance level for the neural network.
            </p>
          </div>

          {/* Plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
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
                <li className="flex items-center gap-3"><iconify-icon icon="lucide:check" class="text-xl" />2 Free Scans Total</li>
                <li className="flex items-center gap-3"><iconify-icon icon="lucide:check" class="text-xl" />Basic AI Fact Checking</li>
                <li className="flex items-center gap-3 opacity-30"><iconify-icon icon="lucide:x" class="text-xl" />Image / OCR Scanning</li>
                <li className="flex items-center gap-3 opacity-30"><iconify-icon icon="lucide:x" class="text-xl" />Advanced Manipulation Detection</li>
                <li className="flex items-center gap-3 opacity-30"><iconify-icon icon="lucide:x" class="text-xl" />Deepfake Detection</li>
                <li className="flex items-center gap-3 opacity-30"><iconify-icon icon="lucide:x" class="text-xl" />Premium LLM Models</li>
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
              <div className="absolute -top-12 -right-12 w-24 h-24 bg-[#D2E823] rotate-45 border-4 border-[#09090B]" />
              <div className="absolute top-3 left-3 bg-[#D2E823] text-[#09090B] px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest rotate-[-3deg]">BEST VALUE</div>
              <h3 className="font-display text-2xl uppercase tracking-tighter mb-2 text-[#D2E823] mt-6">OPERATIVE</h3>
              <div className="font-mono text-xs font-bold uppercase tracking-widest opacity-60 mb-6 border-b-2 border-[#1a1a1a] pb-4">
                Unlimited Neural Access
              </div>
              <div className="text-5xl font-display mb-8">
                ₹150<span className="text-lg opacity-50 font-mono">/MONTH</span>
              </div>
              <ul className="space-y-4 mb-8 font-mono text-sm font-bold flex-1">
                <li className="flex items-center gap-3 text-[#D2E823]"><iconify-icon icon="lucide:infinity" class="text-xl" />Unlimited AI Scans</li>
                <li className="flex items-center gap-3"><iconify-icon icon="lucide:scan" class="text-xl text-[#D2E823]" />Full Image OCR Analysis</li>
                <li className="flex items-center gap-3"><iconify-icon icon="lucide:cpu" class="text-xl text-[#D2E823]" />Advanced Multi-Model Detection</li>
                <li className="flex items-center gap-3"><iconify-icon icon="lucide:history" class="text-xl text-[#D2E823]" />Complete Scan History Logging</li>
                <li className="flex items-center gap-3"><iconify-icon icon="lucide:image" class="text-xl text-[#D2E823]" />Deepfake & Visual Forensics</li>
                <li className="flex items-center gap-3"><iconify-icon icon="lucide:bot" class="text-xl text-[#D2E823]" />Premium NVIDIA LLM Backend</li>
              </ul>
              <button 
                onClick={handleUpgrade}
                disabled={loading || (user && user.subscriptionPlan === 'premium')}
                className="w-full py-4 border-2 border-[#D2E823] bg-[#D2E823] text-[#09090B] font-bold uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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

          {/* ── Feature Comparison Table ── */}
          <div className="bg-white border-4 border-[#09090B] hard-shadow p-6 md:p-8 mb-16">
            <h3 className="font-display text-3xl uppercase tracking-tighter mb-6 text-center">FULL COMPARISON</h3>
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-sm">
                <thead>
                  <tr className="border-b-2 border-[#09090B]">
                    <th className="text-left py-3 px-4 font-bold uppercase tracking-wider">Feature</th>
                    <th className="text-center py-3 px-4 font-bold uppercase tracking-wider bg-[#F8F4E8]">CIVILIAN</th>
                    <th className="text-center py-3 px-4 font-bold uppercase tracking-wider bg-[#09090B] text-[#D2E823]">OPERATIVE</th>
                  </tr>
                </thead>
                <tbody>
                  {featureCompare.map((row, i) => (
                    <tr key={row.feature} className={`border-b border-[#09090B]/10 ${i % 2 === 0 ? 'bg-[#F8F4E8]/50' : ''}`}>
                      <td className="py-3 px-4 font-bold">{row.feature}</td>
                      <td className={`text-center py-3 px-4 ${row.free === '✗' ? 'text-red-400' : row.free === '✓' ? 'text-green-500' : ''}`}>{row.free}</td>
                      <td className={`text-center py-3 px-4 bg-[#09090B]/5 font-bold ${row.premium === '✗' ? 'text-red-400' : row.premium === '✓' ? 'text-green-500' : 'text-[#09090B]'}`}>{row.premium}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Testimonials ── */}
          <div className="mb-16">
            <h3 className="font-display text-3xl uppercase tracking-tighter mb-8 text-center">TRUSTED BY EXPERTS</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map(t => (
                <div key={t.name} className="bg-white border-2 border-[#09090B] hard-shadow-sm p-6 flex flex-col">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => <iconify-icon key={i} icon="lucide:star" class="text-[#D2E823] text-sm" />)}
                  </div>
                  <p className="font-mono text-sm leading-relaxed flex-1 mb-4">&ldquo;{t.quote}&rdquo;</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-[#09090B]/10">
                    <div className="w-10 h-10 bg-[#09090B] rounded-full flex items-center justify-center text-[#D2E823] font-display text-sm">{t.initials}</div>
                    <div>
                      <p className="font-bold text-xs uppercase">{t.name}</p>
                      <p className="font-mono text-[10px] text-[#09090B]/50">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── FAQ ── */}
          <div className="max-w-3xl mx-auto">
            <h3 className="font-display text-3xl uppercase tracking-tighter mb-8 text-center">FREQUENTLY ASKED</h3>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-white border-2 border-[#09090B] hard-shadow-sm">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left font-bold uppercase tracking-tight"
                  >
                    {faq.q}
                    <iconify-icon icon={openFaq === i ? 'lucide:minus' : 'lucide:plus'} class="text-xl shrink-0 ml-4" />
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-5 font-mono text-sm leading-relaxed text-[#09090B]/70 border-t-2 border-[#09090B] pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <StatusModal isOpen={modalState.isOpen} title={modalState.title} message={modalState.message} type={modalState.type} onClose={closeModal} />
    </div>
  )
}
