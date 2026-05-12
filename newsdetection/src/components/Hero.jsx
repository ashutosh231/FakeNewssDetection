import { Link } from 'react-router-dom'

const stats = [
  { value: '2.4M+', label: 'Articles Analyzed' },
  { value: '98.6%', label: 'Detection Accuracy' },
  { value: '50K+', label: 'Active Users' },
  { value: '180+', label: 'Countries' },
]

const features = [
  { icon: 'lucide:brain-circuit', label: 'NLP Engine v3.1' },
  { icon: 'lucide:eye', label: 'Deepfake Detection' },
  { icon: 'lucide:shield-check', label: 'Source Verification' },
  { icon: 'lucide:bar-chart-3', label: 'Bias Analysis' },
]

const headlines = ['SPOT', 'FAKE', 'NEWS']

export default function Hero() {
  return (
    <section id="detect" className="relative overflow-hidden bg-[#F8F4E8]">
      <div className="hero-glow absolute inset-0 pointer-events-none" />

      <div className="container mx-auto px-4 md:px-8 pt-20 md:pt-28 pb-20 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">

          {/* ── Left ── */}
          <div className="lg:col-span-7">
            {/* Badge row */}
            <div className="flex flex-wrap gap-3 mb-10">
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#D2E823] border-2 border-[#09090B] rounded-full font-bold text-xs -rotate-1 transform">
                <iconify-icon icon="lucide:badge-check" class="text-sm" />
                AI VERIFIED SYSTEM
              </span>
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white border-2 border-[#09090B] rounded-full font-bold text-xs rotate-1 transform">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                v3.1 ACTIVE
              </span>
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white border-2 border-[#09090B] rounded-full font-bold text-xs -rotate-1 transform">
                <iconify-icon icon="lucide:infinity" class="text-sm" />
                MULTI-MODEL
              </span>
            </div>

            {/* Main headline */}
            <h1 className="font-display text-6xl md:text-8xl lg:text-[7.5rem] leading-[0.9] tracking-tighter cursor-default select-none mb-8">
              {headlines.map((word) => (
                <span
                  key={word}
                  className="block hover:animate-glitch transition-all"
                >
                  {word}
                </span>
              ))}
            </h1>

            {/* Description */}
            <p className="text-base md:text-lg font-medium leading-relaxed max-w-xl text-[#09090B]/80 mb-10">
              AI-powered misinformation detection engine. Analyze news articles, social media posts, and forwarded messages with real-time credibility scoring and manipulation analysis.
            </p>

            {/* CTA row */}
            <div className="flex flex-col sm:flex-row items-start gap-4 mb-12">
              <Link
                to="/scan"
                className="group relative inline-block px-8 py-4 bg-[#09090B] text-[#D2E823] border-2 border-[#09090B] hard-shadow-lg btn-press"
              >
                <span className="font-display text-lg md:text-xl flex items-center gap-3">
                  <iconify-icon icon="lucide:scan-search" />
                  SCAN CONTENT
                </span>
              </Link>
              <Link
                to="/detector"
                className="inline-block px-8 py-4 bg-white text-[#09090B] border-2 border-[#09090B] hard-shadow-md btn-press font-display text-lg md:text-xl hover:bg-[#D2E823] transition-colors"
              >
                TRY DEMO
              </Link>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-8">
              {stats.map(s => (
                <div key={s.label} className="bg-white border-2 border-[#09090B] hard-shadow-sm p-3 md:p-4 text-center">
                  <p className="font-display text-lg md:text-2xl text-[#09090B]">{s.value}</p>
                  <p className="font-mono text-[8px] md:text-[10px] uppercase tracking-wider text-[#09090B]/50 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Feature badges */}
            <div className="flex flex-wrap gap-2">
              {features.map(f => (
                <div key={f.label} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F8F4E8] border border-[#09090B]/20 rounded-full text-[10px] font-mono font-bold text-[#09090B]/60">
                  <iconify-icon icon={f.icon} class="text-sm" />
                  {f.label}
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: AI Dashboard Card ── */}
          <div className="lg:col-span-5 relative">
            <div className="bg-[#09090B] border-2 border-[#09090B] rounded-[32px] overflow-hidden aspect-[4/5] relative">
              <img
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200"
                alt="AI Analytics Dashboard"
                className="w-full h-full object-cover opacity-30"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#09090B]/40 via-transparent to-[#09090B]/80" />
              <div className="absolute inset-0 grid-pattern opacity-40" />

              {/* Dashboard overlay */}
              <div className="absolute inset-0 p-6 flex flex-col justify-between">
                {/* Top bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#D2E823] animate-scan-pulse" />
                    <span className="text-[#D2E823] font-mono text-xs font-bold tracking-widest">LIVE SCAN</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#F8F4E8]/40 font-mono text-xs">v3.1.0</span>
                    <div className="w-6 h-6 border border-[#D2E823]/30 rounded flex items-center justify-center">
                      <iconify-icon icon="lucide:wifi" class="text-[#D2E823] text-[10px]" />
                    </div>
                  </div>
                </div>

                <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D2E823]/60 to-transparent animate-scan-line" />

                {/* Credibility Ring */}
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                  <div className="relative w-44 h-44">
                    <div className="absolute inset-0 animate-ring-rotate">
                      <svg viewBox="0 0 176 176" className="w-full h-full">
                        <circle cx="88" cy="88" r="82" fill="none" stroke="#D2E823" strokeWidth="1" opacity="0.15" strokeDasharray="8 8" />
                      </svg>
                    </div>
                    <div className="absolute inset-2 animate-ring-rotate-rev">
                      <svg viewBox="0 0 160 160" className="w-full h-full">
                        <circle cx="80" cy="80" r="74" fill="none" stroke="#D2E823" strokeWidth="1.5" opacity="0.1" strokeDasharray="4 12" />
                      </svg>
                    </div>
                    <svg viewBox="0 0 176 176" className="w-full h-full">
                      <circle cx="88" cy="88" r="70" fill="none" stroke="#D2E823" strokeWidth="2" opacity="0.12" />
                      <circle cx="88" cy="88" r="70" fill="none" stroke="#D2E823" strokeWidth="3" strokeDasharray="330 110" strokeLinecap="round" strokeDashoffset="-55" opacity="0.9">
                        <animateTransform attributeName="transform" type="rotate" from="0 88 88" to="360 88 88" dur="6s" repeatCount="indefinite" />
                      </circle>
                      <circle cx="88" cy="88" r="58" fill="none" stroke="#D2E823" strokeWidth="2" strokeDasharray="260 105" strokeLinecap="round" opacity="0.5">
                        <animateTransform attributeName="transform" type="rotate" from="360 88 88" to="0 88 88" dur="8s" repeatCount="indefinite" />
                      </circle>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-display text-5xl text-[#D2E823]">94</span>
                      <span className="text-[#F8F4E8]/50 font-mono text-[10px] tracking-[0.2em]">CREDIBILITY</span>
                    </div>
                  </div>

                  <div className="w-full max-w-[240px] space-y-2.5 mt-2">
                    {[
                      { label: 'SOURCE TRUST', pct: 92, color: '#D2E823', val: '92%' },
                      { label: 'FACTUAL ACCURACY', pct: 88, color: '#D2E823', val: '88%' },
                      { label: 'BIAS DETECTION', pct: 18, color: 'rgba(210,232,35,0.6)', val: 'LOW' },
                      { label: 'MANIPULATION', pct: 34, color: '#f87171', val: 'DETECTED', valColor: '#f87171' },
                    ].map(({ label, pct, color, val, valColor }) => (
                      <div key={label}>
                        <div className="flex justify-between text-[10px] font-mono text-[#F8F4E8]/50 mb-1">
                          <span>{label}</span>
                          <span style={{ color: valColor || '#D2E823' }}>{val}</span>
                        </div>
                        <div className="h-1.5 bg-[#F8F4E8]/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom bar */}
                <div className="flex items-center justify-between border-t border-[#F8F4E8]/10 pt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 border border-[#D2E823]/30 rounded-lg flex items-center justify-center">
                      <iconify-icon icon="lucide:brain-circuit" class="text-[#D2E823] text-sm" />
                    </div>
                    <div>
                      <p className="text-[#F8F4E8]/70 text-[10px] font-mono">NLP ENGINE</p>
                      <p className="text-[#D2E823] text-[10px] font-bold font-mono">PROCESSING</p>
                    </div>
                  </div>
                  <div className="flex gap-1 items-end">
                    {[4, 6, 3, 5, 2].map((h, i) => (
                      <div key={i} className="w-1 bg-[#D2E823] rounded-full animate-scan-pulse" style={{ height: `${h * 4}px`, animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating card */}
            <div className="hidden md:block absolute -bottom-8 -left-6 lg:-left-10 w-60 lg:w-64 animate-floating bg-[#D2E823] border-2 border-[#09090B] p-5 lg:p-6 hard-shadow-lg z-10">
              <div className="flex items-center gap-2 mb-3">
                <iconify-icon icon="lucide:sparkles" class="text-xl" />
                <p className="font-display text-lg lg:text-xl">MULTI-MODEL AI</p>
              </div>
              <p className="text-sm leading-snug font-medium">Real-time NLP analysis, deepfake detection, source verification, emotional manipulation detection, and credibility scoring.</p>
              <div className="mt-4 pt-4 border-t-2 border-[#09090B] flex justify-between items-center">
                <span className="font-bold text-sm">v3.1 ENSEMBLE</span>
                <div className="flex gap-0.5">
                  {[1,2,3,4].map(i => <div key={i} className="w-2 h-2 bg-[#09090B] rounded-full" />)}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
