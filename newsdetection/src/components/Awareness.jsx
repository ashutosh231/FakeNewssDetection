import Navbar from './Navbar'
import Footer from './Footer'

export default function Awareness() {
  return (
    <div className="min-h-screen flex flex-col relative z-10 bg-[#F8F4E8]">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="font-display text-5xl md:text-7xl uppercase tracking-tighter text-[#09090B] mb-8 border-b-4 border-[#09090B] pb-4">
          AWARENESS CENTER
        </h1>
        <div className="space-y-8">
          <div className="bg-[#C8FF00] border-4 border-[#09090B] hard-shadow p-8">
            <h2 className="font-display text-4xl mb-4 uppercase tracking-tight">How to Spot Fake News</h2>
            <ul className="font-mono space-y-4 text-base mt-6">
              <li className="flex items-start gap-3 bg-white/50 p-4 border-2 border-[#09090B]">
                <iconify-icon icon="lucide:search" class="text-xl mt-1" /> 
                <span><strong>Check the source:</strong> Is it a reputable news organization? Look at the URL and verify the author.</span>
              </li>
              <li className="flex items-start gap-3 bg-white/50 p-4 border-2 border-[#09090B]">
                <iconify-icon icon="lucide:book-open" class="text-xl mt-1" /> 
                <span><strong>Read beyond the headline:</strong> Headlines are designed for clicks. Does the article actually support the title?</span>
              </li>
              <li className="flex items-start gap-3 bg-white/50 p-4 border-2 border-[#09090B]">
                <iconify-icon icon="lucide:brain-circuit" class="text-xl mt-1" /> 
                <span><strong>Look for manipulation:</strong> Is the language overly emotional, angry, or urgent? This is a common tactic to bypass critical thinking.</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-white border-4 border-[#09090B] hard-shadow p-8">
             <h2 className="font-display text-4xl mb-6 uppercase tracking-tight">Common Manipulation Tactics</h2>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-mono text-sm">
                <div className="border-2 border-[#09090B] p-5 hover:bg-[#F8F4E8] transition-colors">
                   <strong className="text-lg bg-[#09090B] text-white px-2 py-1 inline-block mb-3">Fear Mongering</strong><br/>
                   Using alarming claims to bypass critical thinking and force immediate emotional reactions.
                </div>
                <div className="border-2 border-[#09090B] p-5 hover:bg-[#F8F4E8] transition-colors">
                   <strong className="text-lg bg-[#09090B] text-white px-2 py-1 inline-block mb-3">False Urgency</strong><br/>
                   Phrases like "Share this before it's deleted!" designed to force quick action without verification.
                </div>
                <div className="border-2 border-[#09090B] p-5 hover:bg-[#F8F4E8] transition-colors">
                   <strong className="text-lg bg-[#09090B] text-white px-2 py-1 inline-block mb-3">Cherry-picking</strong><br/>
                   Using selective data or quoting out of context to support a false or misleading narrative.
                </div>
                <div className="border-2 border-[#09090B] p-5 hover:bg-[#F8F4E8] transition-colors">
                   <strong className="text-lg bg-[#09090B] text-white px-2 py-1 inline-block mb-3">Imposter Content</strong><br/>
                   Mimicking real news sites or impersonating organizations to gain false authority.
                </div>
             </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
