import Navbar from './Navbar'
import Footer from './Footer'
import jsPDF from 'jspdf'

export default function Reports() {
  const handleDownload = (i) => {
    const doc = new jsPDF()
    
    // Branding & Header
    doc.setFont("helvetica", "bold")
    doc.setFontSize(26)
    doc.text("TRUTHSCAN AI", 20, 30)
    
    doc.setFontSize(14)
    doc.setTextColor(100)
    doc.text(`PUBLIC INTELLIGENCE REPORT`, 20, 40)
    
    // Report Title
    doc.setTextColor(0)
    doc.setFontSize(18)
    doc.text(`Misinformation Trends Q${i} (Report #${1000 + i})`, 20, 60)
    
    // Content body
    doc.setFont("helvetica", "normal")
    doc.setFontSize(12)
    const bodyText = `EXECUTIVE SUMMARY
This is an automated analysis of the top fake news campaigns and manipulated narratives observed globally during this period, including platform-specific breakdown.

KEY FINDINGS:
• Emotional Manipulation: A sharp increase in fear-mongering and false urgency tactics, designed to bypass critical thinking.
• Visual Disinformation: Significant volume of manipulated screenshots and deepfake imagery originating from unverified social media networks.
• Imposter Content: A rising trend of bad actors mimicking mainstream news organizations to establish false authority.

SYSTEM ASSESSMENT
The manipulation of digital information continues to evolve rapidly. TruthScan AI remains committed to providing real-time detection, utilizing advanced NLP pipelines and state-of-the-art vision models to empower users with transparent fact-checking tools.`;

    const lines = doc.splitTextToSize(bodyText, 170)
    doc.text(lines, 20, 75)
    
    // Footer
    doc.setFontSize(10)
    doc.setTextColor(150)
    doc.text(`Generated securely by TruthScan AI  •  truthscan.ai`, 20, 280)
    
    // Trigger Download
    doc.save(`TruthScan_Report_Q${i}.pdf`)
  }

  return (
    <div className="min-h-screen flex flex-col relative z-10 bg-[#F8F4E8]">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-16 max-w-5xl">
        <div className="flex justify-between items-end border-b-4 border-[#09090B] pb-4 mb-8">
          <h1 className="font-display text-5xl md:text-7xl uppercase tracking-tighter text-[#09090B]">
            PUBLIC REPORTS
          </h1>
          <span className="font-mono text-sm font-bold bg-[#C8FF00] px-3 py-1 border-2 border-[#09090B]">UPDATED DAILY</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white border-4 border-[#09090B] hard-shadow p-6 flex flex-col hover:-translate-y-1 transition-transform">
              <div className="font-mono text-xs uppercase bg-[#C8FF00] border-2 border-[#09090B] inline-block px-2 py-1 mb-4 self-start font-bold">
                Report #{1000 + i}
              </div>
              <h2 className="font-bold text-3xl mb-3 font-display uppercase tracking-tight">Misinformation Trends Q{i}</h2>
              <p className="font-mono text-sm opacity-80 mb-6 leading-relaxed">An analysis of the top fake news campaigns and manipulated narratives observed globally during this period, including platform-specific breakdown.</p>
              <button 
                onClick={() => handleDownload(i)}
                className="mt-auto bg-[#09090B] text-white font-bold uppercase text-sm py-3 border-2 border-[#09090B] hover:bg-[#C8FF00] hover:text-[#09090B] transition-colors w-full"
              >
                Download Report (PDF)
              </button>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  )
}
