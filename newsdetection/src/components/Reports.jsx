import { useState } from 'react'
import Navbar from './Navbar'
import Footer from './Footer'
import jsPDF from 'jspdf'

const reportCategories = ['All Reports', 'Misinformation Trends', 'Platform Analysis', 'Deepfake Reports', 'Election Integrity']

const allReports = [
  {
    id: 1,
    category: 'Misinformation Trends',
    title: 'Misinformation Trends Q1',
    number: 1001,
    description: 'Analysis of top fake news campaigns and manipulated narratives observed globally during Q1, including platform-specific breakdown.',
    color: 'bg-[#D2E823]',
    icon: 'lucide:trending-up',
    tags: ['Global', 'Trending'],
  },
  {
    id: 2,
    category: 'Misinformation Trends',
    title: 'Misinformation Trends Q2',
    number: 1002,
    description: 'Mid-year assessment of misinformation patterns with focus on AI-generated content and deepfake proliferation across social platforms.',
    color: 'bg-[#D2E823]',
    icon: 'lucide:trending-up',
    tags: ['AI', 'Deepfake'],
  },
  {
    id: 3,
    category: 'Platform Analysis',
    title: 'Social Media Manipulation',
    number: 2001,
    description: 'In-depth analysis of coordinated inauthentic behavior across Twitter, Facebook, and Telegram during major global events.',
    color: 'bg-[#09090B]',
    icon: 'lucide:share-2',
    tags: ['Social Media', 'Bots'],
  },
  {
    id: 4,
    category: 'Election Integrity',
    title: 'Election Disinformation Watch',
    number: 3001,
    description: 'Real-time monitoring report on election-related false narratives, foreign interference attempts, and viral hoaxes.',
    color: 'bg-[#09090B]',
    icon: 'lucide:vote',
    tags: ['Elections', 'Critical'],
  },
  {
    id: 5,
    category: 'Deepfake Reports',
    title: 'Deepfake & Synthetic Media',
    number: 4001,
    description: 'Technical assessment of deepfake detection capabilities, emerging synthetic media threats, and visual manipulation trends.',
    color: 'bg-[#D2E823]',
    icon: 'lucide:image',
    tags: ['AI', 'Forensics'],
  },
  {
    id: 6,
    category: 'Platform Analysis',
    title: 'Health Misinformation Report',
    number: 2002,
    description: 'Tracking vaccine misinformation, fake cure claims, and pseudoscience narratives spreading across messaging apps and forums.',
    color: 'bg-[#09090B]',
    icon: 'lucide:heart-pulse',
    tags: ['Health', 'Crisis'],
  },
]

const trendingTopics = [
  { topic: 'AI-generated news sites', change: '+47%', direction: 'up' },
  { topic: 'Deepfake political ads', change: '+32%', direction: 'up' },
  { topic: 'Impersonation accounts', change: '+28%', direction: 'up' },
  { topic: 'Manipulated statistics', change: '-12%', direction: 'down' },
]

export default function Reports() {
  const [activeCategory, setActiveCategory] = useState('All Reports')

  const filtered = activeCategory === 'All Reports'
    ? allReports
    : allReports.filter(r => r.category === activeCategory)

  const handleDownload = (report) => {
    const doc = new jsPDF()

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(26)
    doc.text('TRUTHSCAN AI', 20, 30)

    doc.setFontSize(14)
    doc.setTextColor(100)
    doc.text('PUBLIC INTELLIGENCE REPORT', 20, 40)

    doc.setTextColor(0)
    doc.setFontSize(18)
    doc.text(`${report.title} (Report #${report.number})`, 20, 60)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    const bodyText = `EXECUTIVE SUMMARY
${report.description}

KEY FINDINGS:
• Emotional Manipulation: A sharp increase in fear-mongering and false urgency tactics, designed to bypass critical thinking.
• Visual Disinformation: Significant volume of manipulated screenshots and deepfake imagery originating from unverified social media networks.
• Imposter Content: A rising trend of bad actors mimicking mainstream news organizations to establish false authority.

SYSTEM ASSESSMENT
The manipulation of digital information continues to evolve rapidly. TruthScan AI remains committed to providing real-time detection, utilizing advanced NLP pipelines and state-of-the-art vision models to empower users with transparent fact-checking tools.`;

    const lines = doc.splitTextToSize(bodyText, 170)
    doc.text(lines, 20, 75)

    doc.setFontSize(10)
    doc.setTextColor(150)
    doc.text('Generated securely by TruthScan AI  •  truthscan.ai', 20, 280)

    doc.save(`TruthScan_Report_${report.number}.pdf`)
  }

  return (
    <div className="min-h-screen flex flex-col relative z-10 bg-[#F8F4E8]">
      <Navbar />
      <main className="flex-grow">
        <section className="container mx-auto px-4 py-16 max-w-6xl">
          {/* ── Header ── */}
          <div className="flex flex-col md:flex-row md:items-end justify-between border-b-4 border-[#09090B] pb-6 mb-12">
            <div>
              <p className="font-mono text-xs font-bold text-[#09090B]/50 mb-2 tracking-[0.2em] uppercase">// Intelligence</p>
              <h1 className="font-display text-5xl md:text-7xl uppercase tracking-tighter text-[#09090B]">
                PUBLIC REPORTS
              </h1>
            </div>
            <span className="font-mono text-sm font-bold bg-[#D2E823] px-3 py-1 border-2 border-[#09090B] mt-2 md:mt-0 inline-block">
              UPDATED DAILY
            </span>
          </div>

          {/* ── Trending Topics ── */}
          <div className="bg-white border-4 border-[#09090B] hard-shadow p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <iconify-icon icon="lucide:flame" class="text-xl text-[#09090B]" />
              <h3 className="font-bold uppercase tracking-wider text-sm">Trending Threats</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {trendingTopics.map(t => (
                <div key={t.topic} className="border border-[#09090B]/20 p-3 flex items-center justify-between">
                  <span className="font-mono text-xs font-bold">{t.topic}</span>
                  <span className={`font-mono text-xs font-bold ${t.direction === 'up' ? 'text-red-500' : 'text-green-500'}`}>
                    {t.change}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Category Filter ── */}
          <div className="flex flex-wrap gap-2 mb-8">
            {reportCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`font-mono text-xs font-bold px-4 py-2 border-2 border-[#09090B] transition-all ${
                  activeCategory === cat
                    ? 'bg-[#09090B] text-[#D2E823] hard-shadow-sm'
                    : 'bg-white text-[#09090B] hover:bg-[#D2E823]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* ── Reports Grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {filtered.map(report => (
              <div
                key={report.id}
                className="bg-white border-4 border-[#09090B] hard-shadow p-6 flex flex-col hover:-translate-y-1 transition-transform"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${report.color} border-2 border-[#09090B] flex items-center justify-center`}>
                      <iconify-icon icon={report.icon} class={`text-lg ${report.color === 'bg-[#09090B]' ? 'text-[#D2E823]' : 'text-[#09090B]'}`} />
                    </div>
                    <div>
                      <span className="font-mono text-[10px] uppercase bg-[#D2E823] border border-[#09090B] px-2 py-0.5 font-bold">
                        Report #{report.number}
                      </span>
                      <p className="font-mono text-[10px] text-[#09090B]/50 mt-1">{report.category}</p>
                    </div>
                  </div>
                </div>
                <h2 className="font-bold text-2xl mb-3 font-display uppercase tracking-tight">{report.title}</h2>
                <p className="font-mono text-sm opacity-70 mb-4 leading-relaxed">{report.description}</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {report.tags.map(tag => (
                    <span key={tag} className="font-mono text-[9px] uppercase tracking-wider bg-[#F8F4E8] border border-[#09090B]/30 px-2 py-0.5 font-bold">
                      {tag}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => handleDownload(report)}
                  className="mt-auto bg-[#09090B] text-white font-bold uppercase text-sm py-3 border-2 border-[#09090B] hover:bg-[#D2E823] hover:text-[#09090B] transition-colors w-full flex items-center justify-center gap-2"
                >
                  <iconify-icon icon="lucide:download" class="text-base" />
                  Download Report (PDF)
                </button>
              </div>
            ))}
          </div>

          {/* ── Stats Summary ── */}
          <div className="bg-[#09090B] border-4 border-[#09090B] hard-shadow p-8">
            <h3 className="font-display text-3xl text-white uppercase tracking-tight mb-6">INTELLIGENCE SUMMARY</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="border border-[#D2E823]/20 p-4 text-center">
                <p className="font-display text-4xl text-[#D2E823]">12</p>
                <p className="font-mono text-xs text-white/50 mt-1">Reports Published</p>
              </div>
              <div className="border border-[#D2E823]/20 p-4 text-center">
                <p className="font-display text-4xl text-[#D2E823]">47</p>
                <p className="font-mono text-xs text-white/50 mt-1">Threats Tracked</p>
              </div>
              <div className="border border-[#D2E823]/20 p-4 text-center">
                <p className="font-display text-4xl text-[#D2E823]">18K</p>
                <p className="font-mono text-xs text-white/50 mt-1">Reports Downloaded</p>
              </div>
              <div className="border border-[#D2E823]/20 p-4 text-center">
                <p className="font-display text-4xl text-[#D2E823]">24h</p>
                <p className="font-mono text-xs text-white/50 mt-1">Response Time</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
