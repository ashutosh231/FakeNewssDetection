import { Link } from 'react-router-dom'

export default function UpgradeModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#09090B]/80 backdrop-blur-sm">
      <div className="bg-[#F8F4E8] border-4 border-[#09090B] hard-shadow-lg p-8 max-w-md w-full relative animate-in fade-in zoom-in duration-200">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center border-2 border-[#09090B] bg-white hover:bg-[#D2E823] transition-colors hover:translate-x-[1px] hover:translate-y-[1px] hard-shadow-sm hover:shadow-none cursor-none"
        >
          <iconify-icon icon="lucide:x" class="text-xl" />
        </button>

        {/* Modal Content */}
        <div className="flex flex-col items-center text-center mt-2">
          <div className="w-16 h-16 bg-[#09090B] text-[#D2E823] rounded-full flex items-center justify-center border-4 border-[#D2E823] mb-6">
            <iconify-icon icon="lucide:lock" class="text-3xl" />
          </div>
          
          <h2 className="font-display text-3xl uppercase tracking-tighter mb-4 text-[#09090B]">
            LIMIT <span className="text-white bg-red-500 px-2 border-2 border-[#09090B]">REACHED</span>
          </h2>
          
          <p className="font-mono text-sm leading-relaxed text-[#09090B]/80 mb-8 font-medium">
            You have exhausted your free tier limit (2 scans). To continue accessing the neural fact-checking engine, please upgrade to Premium.
          </p>

          <div className="flex flex-col w-full gap-3">
            <Link 
              to="/plans"
              onClick={onClose}
              className="w-full bg-[#D2E823] text-[#09090B] font-bold uppercase text-sm py-4 border-2 border-[#09090B] hard-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all duration-300 cursor-none flex items-center justify-center gap-2"
            >
              <iconify-icon icon="lucide:zap" class="text-lg" />
              UPGRADE NOW
            </Link>
            
            <button 
              onClick={onClose}
              className="w-full bg-white text-[#09090B] font-bold uppercase text-sm py-4 border-2 border-[#09090B] hover:bg-[#09090B] hover:text-white transition-colors duration-300 cursor-none"
            >
              DISMISS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
