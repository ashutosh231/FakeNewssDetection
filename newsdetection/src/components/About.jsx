import Navbar from './Navbar'
import Footer from './Footer'

export default function About() {
  return (
    <div className="min-h-screen flex flex-col relative z-10 bg-[#F8F4E8]">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="font-display text-5xl md:text-7xl uppercase tracking-tighter text-[#09090B] mb-8 border-b-4 border-[#09090B] pb-4">
          ABOUT US
        </h1>
        <div className="bg-white border-4 border-[#09090B] hard-shadow p-8 mb-8">
          <p className="font-mono text-lg leading-relaxed mb-6">
            TRUTHSCAN AI is an elite misinformation detection engine. Our mission is to restore trust in the digital ecosystem by providing users with the tools they need to verify claims and identify fake news.
          </p>
          <p className="font-mono text-lg leading-relaxed mb-6">
            Using advanced NLP pipelines and state-of-the-art vision models, we detect emotional manipulation, unverified claims, and logical fallacies in real-time.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            <div className="bg-[#C8FF00] border-2 border-[#09090B] p-6 text-center">
              <h3 className="font-bold uppercase text-2xl">Our Vision</h3>
              <p className="text-sm mt-2 font-mono">A transparent web where the truth is independently verifiable by anyone.</p>
            </div>
            <div className="bg-[#09090B] text-white border-2 border-[#09090B] p-6 text-center">
              <h3 className="font-bold uppercase text-2xl text-[#C8FF00]">Our Mission</h3>
              <p className="text-sm mt-2 font-mono text-white/70">To empower everyday users with enterprise-grade AI fact-checking tools.</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
