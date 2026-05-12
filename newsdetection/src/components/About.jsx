import Navbar from './Navbar'
import Footer from './Footer'

const stats = [
  { value: '2.4M+', label: 'Articles Analyzed' },
  { value: '98.6%', label: 'Detection Accuracy' },
  { value: '50K+', label: 'Active Users' },
  { value: '180+', label: 'Countries Reached' },
]

const milestones = [
  { year: '2023', title: 'Foundation', desc: 'TruthScan AI was founded to combat the rising tide of digital misinformation using advanced NLP models.' },
  { year: '2024', title: 'Public Launch', desc: 'Released v1.0 with real-time URL scanning, credibility scoring, and bias analysis engine.' },
  { year: '2025', title: 'Vision AI', desc: 'Integrated multimodal detection — OCR for images, deepfake screening, and visual manipulation analysis.' },
  { year: '2026', title: 'Global Scale', desc: 'Expanded to 180+ countries with enterprise API, live news monitoring, and community threat alerts.' },
]

const team = [
  { name: 'Ashutosh Kumar', role: 'CEO & AI Research Lead', initials: 'AS' },
  { name: 'Aman Kumar Yadav', role: 'CTO, Full-Stack Engineering', initials: 'AKY' },
  { name: 'Harshit Aggarwal', role: 'Head of Misinformation Analysis', initials: 'HA' },
  { name: 'Misty Soni', role: 'Lead NLP Engineer', initials: 'MS' },
]

const techStack = [
  'LLAMA 3.1 70B', 'GPT-4o', 'Hugging Face', 'Tesseract OCR',
  'Python', 'Node.js', 'React', 'Tailwind CSS',
  'Firebase', 'Netlify', 'NVIDIA AI', 'TensorFlow',
]

export default function About() {
  return (
    <div className="min-h-screen flex flex-col relative z-10 bg-[#F8F4E8]">
      <Navbar />
      <main className="flex-grow">
        {/* ── Hero ── */}
        <section className="container mx-auto px-4 py-16 max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between border-b-4 border-[#09090B] pb-6 mb-12">
            <div>
              <p className="font-mono text-xs font-bold text-[#09090B]/50 mb-2 tracking-[0.2em] uppercase">// About</p>
              <h1 className="font-display text-5xl md:text-7xl uppercase tracking-tighter text-[#09090B]">
                TRUTHSCAN AI
              </h1>
            </div>
            <p className="font-mono text-sm mt-2 md:mt-0 text-[#09090B]/60">Est. 2023</p>
          </div>

          {/* Mission block */}
          <div className="bg-white border-4 border-[#09090B] hard-shadow p-8 md:p-12 mb-12">
            <p className="font-display text-3xl md:text-4xl uppercase tracking-tight mb-6 leading-tight">
              Restoring Trust in the<br />Digital Ecosystem
            </p>
            <p className="font-mono text-lg leading-relaxed mb-6">
              TRUTHSCAN AI is an elite misinformation detection engine. Using advanced NLP pipelines and state-of-the-art vision models, we detect emotional manipulation, unverified claims, and logical fallacies in real-time — across text, images, and social media.
            </p>
            <p className="font-mono text-lg leading-relaxed">
              Our platform empowers journalists, researchers, and everyday users with enterprise-grade fact-checking tools that make the web more transparent and accountable.
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {stats.map(s => (
              <div key={s.label} className="bg-[#09090B] border-2 border-[#09090B] hard-shadow-sm p-6 text-center">
                <p className="font-display text-4xl md:text-5xl text-[#D2E823]">{s.value}</p>
                <p className="font-mono text-xs uppercase tracking-widest text-white/60 mt-2">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Vision / Mission */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="bg-[#D2E823] border-2 border-[#09090B] hard-shadow-md p-8">
              <iconify-icon icon="lucide:eye" class="text-4xl mb-4" />
              <h3 className="font-display text-3xl uppercase tracking-tight mb-3">Our Vision</h3>
              <p className="font-mono text-base leading-relaxed">
                A transparent web where the truth is independently verifiable by anyone, anywhere — free from manipulation, bias, and deceit.
              </p>
            </div>
            <div className="bg-[#09090B] text-white border-2 border-[#09090B] hard-shadow-md p-8">
              <iconify-icon icon="lucide:target" class="text-4xl mb-4 text-[#D2E823]" />
              <h3 className="font-display text-3xl uppercase tracking-tight mb-3 text-[#D2E823]">Our Mission</h3>
              <p className="font-mono text-base leading-relaxed text-white/70">
                To democratize access to AI-powered misinformation detection and equip every internet user with the tools to verify what they see, read, and share.
              </p>
            </div>
          </div>

          {/* Timeline */}
          <h2 className="font-display text-4xl md:text-5xl uppercase tracking-tighter mb-8 border-b-4 border-[#09090B] pb-4">
            OUR JOURNEY
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
            {milestones.map(m => (
              <div key={m.year} className="bg-white border-2 border-[#09090B] hard-shadow-sm p-6 relative">
                <span className="font-display text-5xl text-[#D2E823] opacity-40 absolute top-2 right-3">{m.year}</span>
                <p className="font-mono text-xs font-bold text-[#D2E823] bg-[#09090B] inline-block px-2 py-1 mb-3">{m.year}</p>
                <h4 className="font-bold text-lg uppercase tracking-tight mb-2">{m.title}</h4>
                <p className="font-mono text-sm text-[#09090B]/70 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>

          {/* Tech Stack */}
          <h2 className="font-display text-4xl md:text-5xl uppercase tracking-tighter mb-8 border-b-4 border-[#09090B] pb-4">
            TECHNOLOGY
          </h2>
          <div className="bg-white border-4 border-[#09090B] hard-shadow p-8 mb-12">
            <p className="font-mono text-sm mb-6">POWERED BY</p>
            <div className="flex flex-wrap gap-3">
              {techStack.map(t => (
                <span key={t} className="font-mono text-xs font-bold px-4 py-2 border-2 border-[#09090B] bg-[#F8F4E8] hover:bg-[#D2E823] transition-colors">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Team */}
          <h2 className="font-display text-4xl md:text-5xl uppercase tracking-tighter mb-8 border-b-4 border-[#09090B] pb-4">
            LEADERSHIP
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {team.map(m => (
              <div key={m.name} className="bg-white border-2 border-[#09090B] hard-shadow-sm p-6 text-center hover:-translate-y-1 transition-transform">
                <div className="w-20 h-20 mx-auto mb-4 bg-[#09090B] border-2 border-[#D2E823] rounded-full flex items-center justify-center">
                  <span className="font-display text-2xl text-[#D2E823]">{m.initials}</span>
                </div>
                <h4 className="font-bold uppercase tracking-tight">{m.name}</h4>
                <p className="font-mono text-xs text-[#09090B]/60 mt-1">{m.role}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
