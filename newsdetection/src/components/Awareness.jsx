import Navbar from './Navbar'
import Footer from './Footer'

const misinfoStats = [
  { value: '73%', label: 'of adults encounter fake news monthly' },
  { value: '59%', label: 'share articles without reading them' },
  { value: '6x', label: 'faster falsehoods spread vs. truth' },
  { value: '$78B', label: 'annual economic impact of misinformation' },
]

const warningSigns = [
  { icon: 'lucide:alert-triangle', title: 'Emotional Language', desc: 'Overly angry, fearful, or urgent wording designed to bypass critical thinking.' },
  { icon: 'lucide:link-2-off', title: 'Missing Sources', desc: 'No citations, anonymous authors, or references to vague "experts" and "studies."' },
  { icon: 'lucide:image-off', title: 'Manipulated Media', desc: 'Out-of-context images, deepfakes, or screenshots with no original source.' },
  { icon: 'lucide:megaphone', title: 'Echo Chambers', desc: 'Content that only appears on fringe platforms or is amplified by bot networks.' },
]

const aiTactics = [
  { title: 'LLM-Generated Articles', desc: 'AI models can produce convincing fake news at scale, making it harder to distinguish real reporting from synthetic content.' },
  { title: 'Deepfake Audio/Video', desc: 'Synthetic media that mimics real people saying things they never said — used to create false scandals and panic.' },
  { title: 'Bot Network Amplification', desc: 'Coordinated inauthentic behavior using automated accounts to artificially trend misleading hashtags and narratives.' },
  { title: 'Contextual Manipulation', desc: 'Real media reshared with fabricated captions or translated inaccurately to completely change the original meaning.' },
]

const checklist = [
  'Verify the source domain — check for unusual TLDs or misspelled names',
  'Cross-reference the story with 2+ reputable news outlets',
  'Reverse-image search photos to check if they have been reused from unrelated events',
  'Read past the headline — clickbait titles often contradict the article body',
  'Check the publication date — old stories are frequently recirculated as "breaking news"',
  'Ask: Is this designed to make me angry or scared? Emotional manipulation is a red flag',
  'Use TruthScan AI to scan the URL or paste the text for automated analysis',
]

export default function Awareness() {
  return (
    <div className="min-h-screen flex flex-col relative z-10 bg-[#F8F4E8]">
      <Navbar />
      <main className="flex-grow">
        <section className="container mx-auto px-4 py-16 max-w-6xl">
          {/* ── Header ── */}
          <div className="border-b-4 border-[#09090B] pb-6 mb-12">
            <p className="font-mono text-xs font-bold text-[#09090B]/50 mb-2 tracking-[0.2em] uppercase">// Education</p>
            <h1 className="font-display text-5xl md:text-7xl uppercase tracking-tighter text-[#09090B]">
              AWARENESS CENTER
            </h1>
          </div>

          {/* ── Crisis Stats ── */}
          <div className="bg-[#09090B] border-4 border-[#09090B] hard-shadow p-8 md:p-12 mb-12">
            <p className="font-mono text-xs text-[#D2E823] tracking-[0.2em] uppercase mb-2">The Scale of the Problem</p>
            <h2 className="font-display text-4xl md:text-5xl text-white uppercase tracking-tight mb-8">
              THE MISINFORMATION CRISIS
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {misinfoStats.map(s => (
                <div key={s.label} className="text-center">
                  <p className="font-display text-5xl text-[#D2E823]">{s.value}</p>
                  <p className="font-mono text-xs text-white/60 mt-2 leading-relaxed">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── How to Spot Fake News ── */}
          <div className="bg-[#D2E823] border-4 border-[#09090B] hard-shadow p-8 mb-12">
            <h2 className="font-display text-4xl mb-6 uppercase tracking-tight">How to Spot Fake News</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {warningSigns.map(w => (
                <div key={w.title} className="bg-white/80 border-2 border-[#09090B] p-5 flex items-start gap-4 hover:bg-white transition-colors">
                  <iconify-icon icon={w.icon} class="text-3xl shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold uppercase mb-1">{w.title}</h3>
                    <p className="font-mono text-sm text-[#09090B]/70">{w.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Common Manipulation Tactics ── */}
          <div className="bg-white border-4 border-[#09090B] hard-shadow p-8 mb-12">
            <h2 className="font-display text-4xl mb-6 uppercase tracking-tight">Common Manipulation Tactics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-mono text-sm">
              <div className="border-2 border-[#09090B] p-5 hover:bg-[#F8F4E8] transition-colors">
                <strong className="text-lg bg-[#09090B] text-white px-2 py-1 inline-block mb-3">Fear Mongering</strong>
                Using alarming claims to bypass critical thinking and force immediate emotional reactions.
              </div>
              <div className="border-2 border-[#09090B] p-5 hover:bg-[#F8F4E8] transition-colors">
                <strong className="text-lg bg-[#09090B] text-white px-2 py-1 inline-block mb-3">False Urgency</strong>
                Phrases like "Share this before it's deleted!" designed to force quick action without verification.
              </div>
              <div className="border-2 border-[#09090B] p-5 hover:bg-[#F8F4E8] transition-colors">
                <strong className="text-lg bg-[#09090B] text-white px-2 py-1 inline-block mb-3">Cherry-picking</strong>
                Using selective data or quoting out of context to support a false or misleading narrative.
              </div>
              <div className="border-2 border-[#09090B] p-5 hover:bg-[#F8F4E8] transition-colors">
                <strong className="text-lg bg-[#09090B] text-white px-2 py-1 inline-block mb-3">Imposter Content</strong>
                Mimicking real news sites or impersonating organizations to gain false authority.
              </div>
            </div>
          </div>

          {/* ── AI-Powered Misinformation ── */}
          <div className="bg-[#09090B] border-4 border-[#09090B] hard-shadow p-8 mb-12">
            <div className="flex items-center gap-3 mb-4">
              <iconify-icon icon="lucide:bot" class="text-[#D2E823] text-3xl" />
              <span className="font-mono text-xs text-[#D2E823] tracking-[0.2em] uppercase">Emerging Threat</span>
            </div>
            <h2 className="font-display text-4xl text-white uppercase tracking-tight mb-6">AI-Generated Misinformation</h2>
            <p className="font-mono text-base text-white/60 mb-8 leading-relaxed">
              The rise of generative AI has created a new frontier in misinformation. Bad actors now use large language models, deepfake technology, and automated bot networks to produce and spread false content at unprecedented scale.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiTactics.map(t => (
                <div key={t.title} className="bg-white/5 border border-[#D2E823]/20 p-5 hover:bg-white/10 transition-colors">
                  <h3 className="font-display text-xl text-[#D2E823] uppercase mb-2">{t.title}</h3>
                  <p className="font-mono text-sm text-white/50">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Digital Literacy Checklist ── */}
          <div className="bg-white border-4 border-[#09090B] hard-shadow p-8 mb-12">
            <h2 className="font-display text-4xl mb-2 uppercase tracking-tight">Digital Literacy Checklist</h2>
            <p className="font-mono text-sm text-[#09090B]/50 mb-6">Before you share, verify these 7 things:</p>
            <div className="space-y-3">
              {checklist.map((item, i) => (
                <div key={i} className="flex items-start gap-3 font-mono text-sm border-b border-[#09090B]/10 pb-3">
                  <span className="w-6 h-6 bg-[#09090B] text-[#D2E823] flex items-center justify-center font-bold text-xs shrink-0">
                    {i + 1}
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Resources ── */}
          <h2 className="font-display text-4xl uppercase tracking-tighter mb-6 border-b-4 border-[#09090B] pb-4">
            RESOURCES & GUIDES
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <div className="bg-white border-2 border-[#09090B] hard-shadow-sm p-6 hover:-translate-y-1 transition-transform">
              <iconify-icon icon="lucide:book-open" class="text-3xl mb-3" />
              <h3 className="font-bold uppercase mb-2">Media Literacy Guide</h3>
              <p className="font-mono text-xs text-[#09090B]/60 leading-relaxed">A comprehensive introduction to evaluating news sources and identifying bias in reporting.</p>
            </div>
            <div className="bg-white border-2 border-[#09090B] hard-shadow-sm p-6 hover:-translate-y-1 transition-transform">
              <iconify-icon icon="lucide:shield" class="text-3xl mb-3" />
              <h3 className="font-bold uppercase mb-2">Deepfake Detection</h3>
              <p className="font-mono text-xs text-[#09090B]/60 leading-relaxed">Learn to spot AI-generated video and audio with our visual forensics cheat sheet.</p>
            </div>
            <div className="bg-white border-2 border-[#09090B] hard-shadow-sm p-6 hover:-translate-y-1 transition-transform">
              <iconify-icon icon="lucide:users" class="text-3xl mb-3" />
              <h3 className="font-bold uppercase mb-2">Community Toolkit</h3>
              <p className="font-mono text-xs text-[#09090B]/60 leading-relaxed">Resources for educators and community leaders to run misinformation awareness workshops.</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
