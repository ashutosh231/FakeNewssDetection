import { useState, useRef, useEffect } from 'react'
import Navbar from './Navbar'
import Cursor from './Cursor'

import { analyzeNews } from '../services/huggingface'
import { saveScanResult } from '../services/api'
import { useAuth } from '../context/AuthContext'
import UpgradeModal from './UpgradeModal'

export default function DetectorPage() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'ai',
      text: 'SYSTEM INITIALIZED. I am VERITAS, your AI truth engine. Paste a news article, URL, or social media post below for instant misinformation analysis.'
    }
  ])
  const [input, setInput] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const chatEndRef = useRef(null)
  const { user, refreshUser } = useAuth()

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isScanning])

  const handleSend = (e) => {
    e.preventDefault()
    if (!input.trim()) return

    if (user?.subscriptionPlan === 'free' && (user?.freeScansUsed || 0) >= 2) {
      setShowUpgradeModal(true);
      return;
    }

    const userMsg = { id: Date.now(), role: 'user', text: input.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsScanning(true)

    // Real AI Fact Check API Call
    setTimeout(async () => {
      const { html, raw } = await analyzeNews(userMsg.text)
      setIsScanning(false)
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: html }])

      if (user && raw) {
        saveScanResult({
          content: userMsg.text,
          inputType: 'text',
          credibilityScore: raw.credibilityScore,
          riskLevel: raw.riskLevel,
          verdict: raw.verdict,
          flags: raw.flags
        }).then(() => refreshUser()).catch(console.error)
      }
    }, 500)
  }

  return (
    <>
      <div className="noise-overlay" />
      <Cursor />
      
      <div className="min-h-screen flex flex-col bg-[#F8F4E8] relative z-10">
        <Navbar />

        <main className="flex-1 container mx-auto px-4 md:px-8 py-8 flex flex-col max-w-5xl h-[calc(100vh-100px)]">
          {/* Header */}
          <div className="mb-6 flex items-center gap-4">
            <h1 className="font-display text-4xl uppercase tracking-tighter">
              LIVE <span className="text-[#D2E823] bg-[#09090B] px-3 py-1 ml-2 border-2 border-[#09090B] hard-shadow-sm">ANALYSIS</span>
            </h1>
            <div className="flex items-center gap-2 px-3 py-1.5 border-2 border-[#09090B] rounded-full hard-shadow-sm bg-white ml-auto">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-bold text-[10px] uppercase tracking-widest font-mono">NEURAL NET: ACTIVE</span>
            </div>
          </div>

          {/* Chat Window */}
          <div className="flex-1 border-2 border-[#09090B] bg-white hard-shadow-lg rounded-[24px] overflow-hidden flex flex-col relative">
            <div className="absolute inset-0 dot-pattern opacity-50 pointer-events-none" />
            
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 z-10">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[85%] md:max-w-[75%] p-5 border-2 border-[#09090B] hard-shadow-sm 
                      ${msg.role === 'user' 
                        ? 'bg-[#09090B] text-[#F8F4E8] rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl rounded-br-none' 
                        : 'bg-[#D2E823] text-[#09090B] rounded-tl-2xl rounded-tr-2xl rounded-br-2xl rounded-bl-none'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2 mb-2 opacity-60">
                      <iconify-icon icon={msg.role === 'user' ? 'lucide:user' : 'lucide:cpu'} class="text-sm" />
                      <span className="font-mono text-[10px] uppercase font-bold tracking-widest">
                        {msg.role === 'user' ? 'YOU' : 'VERITAS AI'}
                      </span>
                    </div>
                    {msg.role === 'ai' ? (
                      <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap font-bold" dangerouslySetInnerHTML={{ __html: msg.text }} />
                    ) : (
                      <p className="font-medium">{msg.text}</p>
                    )}
                  </div>
                </div>
              ))}
              
              {isScanning && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] md:max-w-[75%] p-5 border-2 border-[#09090B] hard-shadow-sm bg-white rounded-tl-2xl rounded-tr-2xl rounded-br-2xl rounded-bl-none flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-[#09090B]/50">
                      <iconify-icon icon="lucide:loader-2" class="text-sm animate-spin" />
                      <span className="font-mono text-[10px] uppercase font-bold tracking-widest">ANALYZING CLAIMS...</span>
                    </div>
                    <div className="flex gap-1.5 items-end h-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div 
                          key={i} 
                          className="w-1.5 bg-[#D2E823] rounded-full animate-scan-pulse border border-[#09090B]"
                          style={{ height: `${Math.max(20, Math.random() * 100)}%`, animationDelay: `${i * 0.1}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-6 border-t-2 border-[#09090B] bg-[#F8F4E8] z-10">
              <form onSubmit={handleSend} className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Paste URL, article text, or a claim to verify..."
                  className="w-full py-4 pl-6 pr-32 bg-white border-2 border-[#09090B] rounded-xl font-bold font-mono placeholder:text-[#09090B]/30 outline-none focus:border-[#D2E823] focus:ring-4 focus:ring-[#D2E823]/20 transition-all cursor-none"
                  disabled={isScanning}
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isScanning}
                  className="absolute right-2 px-6 py-2.5 bg-[#09090B] text-[#D2E823] font-bold uppercase tracking-widest text-sm rounded-lg border-2 border-[#09090B] hover:bg-[#D2E823] hover:text-[#09090B] transition-colors disabled:opacity-50 cursor-none flex items-center gap-2 btn-press"
                >
                  SCAN <iconify-icon icon="lucide:zap" />
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
      
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </>
  )
}
