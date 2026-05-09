export default function StatusModal({ isOpen, onClose, title, message, type = 'success' }) {
  if (!isOpen) return null;

  const isSuccess = type === 'success';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#09090B]/80 backdrop-blur-sm">
      <div className="bg-[#F8F4E8] border-4 border-[#09090B] hard-shadow-lg p-8 max-w-md w-full relative animate-in fade-in zoom-in duration-200">
        <div className="flex flex-col items-center text-center mt-2">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 border-[#09090B] mb-6 ${
            isSuccess ? 'bg-[#D2E823] text-[#09090B]' : 'bg-red-500 text-white'
          }`}>
            <iconify-icon icon={isSuccess ? "lucide:check" : "lucide:alert-triangle"} class="text-3xl" />
          </div>
          
          <h2 className="font-display text-3xl uppercase tracking-tighter mb-4 text-[#09090B]">
            {title}
          </h2>
          
          <p className="font-mono text-sm leading-relaxed text-[#09090B]/80 mb-8 font-medium">
            {message}
          </p>

          <button 
            onClick={onClose}
            className={`w-full font-bold uppercase text-sm py-4 border-2 border-[#09090B] hard-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all duration-300 cursor-none ${
              isSuccess ? 'bg-[#D2E823] text-[#09090B]' : 'bg-[#09090B] text-white hover:bg-white hover:text-[#09090B]'
            }`}
          >
            CONTINUE
          </button>
        </div>
      </div>
    </div>
  );
}
