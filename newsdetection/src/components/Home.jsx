import Navbar from './Navbar'
import Hero from './Hero'
import TrustedBy from './TrustedBy'
import BentoGrid from './BentoGrid'
import RecentScans from './RecentScans'
import LiveNews from './LiveNews'
import Footer from './Footer'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col relative z-10">
      <Navbar />
      <Hero />
      <TrustedBy />
      <BentoGrid />
      <RecentScans />
      <LiveNews />
      <Footer />
    </div>
  )
}
