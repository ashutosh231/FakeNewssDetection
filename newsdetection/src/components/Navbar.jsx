import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const location = useLocation()
  const isOnScan = location.pathname === '/scan'
  const { user } = useAuth()

  return (
    <header className="sticky top-4 z-40 mx-4 md:mx-8">
      <nav className={`border-2 rounded-[12px] flex items-center justify-between px-6 py-4 transition-all duration-300 ${
        isOnScan 
          ? 'bg-[#09090B] border-[#D2E823] text-[#F8F4E8] shadow-[4px_4px_0px_0px_#D2E823]' 
          : 'bg-[#F8F4E8] border-[#09090B] text-[#09090B]'
      }`}>
        {/* Logo */}
        <Link
          to="/"
          id="nav-logo"
          className="font-display text-xl md:text-2xl tracking-tighter hover:text-[#D2E823] transition-colors duration-300 cursor-none flex items-center gap-2"
        >
          <div className={`w-8 h-8 border-2 rounded-lg flex items-center justify-center overflow-hidden ${
            isOnScan ? 'bg-[#09090B] border-[#D2E823]' : 'bg-[#D2E823] border-[#09090B]'
          }`}>
            {/* You can replace the src below with your custom app logo URL from Cloudinary */}
            {/* <img src="YOUR_CLOUDINARY_LOGO_URL" alt="Logo" className="w-full h-full object-cover" /> */}
            <iconify-icon icon="lucide:shield-check" class={`text-sm ${isOnScan ? 'text-[#D2E823]' : 'text-[#09090B]'}`} />
          </div>
          <span className="hidden sm:inline">TRUTHSCAN AI</span>
        </Link>

        {/* Nav Links — context aware */}
        <div className="hidden md:flex items-center gap-8 font-bold uppercase text-sm tracking-widest">
          {isOnScan ? (
            <>
              <Link to="/" className="nav-link cursor-none flex items-center gap-1.5 hover:text-[#D2E823]">
                <iconify-icon icon="lucide:layout-dashboard" class="text-xs" />
                Dashboard
              </Link>
              <Link to="/detector" className="nav-link cursor-none flex items-center gap-1.5 hover:text-[#D2E823]">
                <iconify-icon icon="lucide:search" class="text-xs" />
                Detector
              </Link>
              <Link to="/plans" className="nav-link cursor-none flex items-center gap-1.5 hover:text-[#D2E823]">
                <iconify-icon icon="lucide:zap" class="text-xs" />
                Plans
              </Link>
            </>
          ) : (
            <>
              <Link to="/detector"   id="nav-detect"    className="nav-link cursor-none hover:text-[#D2E823]">Detect</Link>
              <Link to="/reports"    id="nav-reports"   className="nav-link cursor-none hover:text-[#D2E823]">Reports</Link>
              <Link to="/awareness"  id="nav-awareness" className="nav-link cursor-none hover:text-[#D2E823]">Awareness</Link>
              <Link to="/about"      id="nav-about"     className="nav-link cursor-none hover:text-[#D2E823]">About</Link>
              <Link to="/plans"      id="nav-plans"     className="nav-link cursor-none hover:text-[#D2E823]">Plans</Link>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Link
            to="/scan"
            id="nav-scan-btn"
            className={`p-2 border-2 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all duration-300 cursor-none block ${
              isOnScan 
                ? 'bg-[#D2E823] border-[#D2E823] text-[#09090B] shadow-[2px_2px_0px_0px_#D2E823]' 
                : 'bg-white hover:bg-[#D2E823] border-[#09090B] shadow-[2px_2px_0px_0px_#09090B]'
            }`}
          >
            <iconify-icon icon="lucide:scan-search" class="text-xl" />
          </Link>

          {user ? (
            <Link
              to="/profile"
              id="nav-profile-btn"
              className={`flex items-center gap-2 px-4 py-2 border-2 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all duration-300 font-bold uppercase text-xs tracking-widest cursor-none ${
                isOnScan 
                  ? 'bg-[#D2E823] border-[#D2E823] text-[#09090B] shadow-[2px_2px_0px_0px_#D2E823]' 
                  : 'bg-[#D2E823] border-[#09090B] text-[#09090B] shadow-[2px_2px_0px_0px_#09090B]'
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-[#09090B] text-white flex items-center justify-center text-[10px] font-bold overflow-hidden">
                {user.profileImage ? (
                  <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  user.name?.charAt(0).toUpperCase()
                )}
              </div>
              {user.name?.split(' ')[0]}
            </Link>
          ) : (
            <Link
              to="/login"
              id="nav-auth-btn"
              className={`px-5 py-2 border-2 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all duration-300 font-bold uppercase text-xs tracking-widest cursor-none block ${
                isOnScan 
                  ? 'bg-[#09090B] border-[#D2E823] text-[#D2E823] hover:bg-[#D2E823] hover:text-[#09090B] shadow-[2px_2px_0px_0px_#D2E823]' 
                  : 'bg-[#09090B] border-[#09090B] text-white hover:bg-[#D2E823] hover:text-[#09090B] shadow-[2px_2px_0px_0px_#09090B]'
              }`}
            >
              LOGIN
            </Link>
          )}
        </div>
      </nav>
    </header>
  )
}
