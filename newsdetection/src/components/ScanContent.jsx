import { useState, useEffect, useRef } from 'react'
import Navbar from './Navbar'
import Cursor from './Cursor'
import { analyzeNewsRaw } from '../services/huggingface'
import { extractTextFromImage } from '../services/ocr'
import { cleanOCRText } from '../utils/cleanOCRText'
import { saveScanResult } from '../services/api'
import { useAuth } from '../context/AuthContext'
import UpgradeModal from './UpgradeModal'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

export default function ScanContent() {
  const { user, refreshUser } = useAuth()
  const [activeTab, setActiveTab] = useState('camera')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [inputText, setInputText] = useState('')
  const [inputUrl, setInputUrl] = useState('')
  const [fileContent, setFileContent] = useState('')
  const [fileName, setFileName] = useState('')

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [capturedImage, setCapturedImage] = useState(null)
  const [ocrText, setOcrText] = useState('')
  const [ocrProgress, setOcrProgress] = useState(0)
  const [isExtracting, setIsExtracting] = useState(false)

  const [isScanning, setIsScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [progress, setProgress] = useState(0)

  // Circular gauge logic
  const gaugeRadius = 40
  const gaugeCircumference = 2 * Math.PI * gaugeRadius

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    
    if (file.type.startsWith('image/')) {
      const dataUrl = URL.createObjectURL(file)
      setCapturedImage(dataUrl)
      setOcrProgress(0)
      setIsExtracting(true)
      setFileContent('SCANNING IMAGE...\nOCR Progress: 0%')
      
      try {
        const { text, confidence } = await extractTextFromImage(file, (progress) => {
          setOcrProgress(progress)
          setFileContent(`SCANNING IMAGE...\nOCR Progress: ${progress}%`)
        })
        const cleaned = cleanOCRText(text)
        if (!cleaned) throw new Error("Empty extraction")
        
        setFileContent(cleaned)
        setOcrText(cleaned)
        setIsExtracting(false)
      } catch (err) {
        setFileContent('Unable to clearly extract text from image. Please upload a clearer screenshot.')
        setIsExtracting(false)
      }
      return;
    }

    setCapturedImage(null)
    setFileContent('Extracting text...')
    
    try {
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise
        let text = ''
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          text += content.items.map(item => item.str).join(' ') + ' '
        }
        setFileContent(text)
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer()
        const { value } = await window.mammoth.extractRawText({ arrayBuffer })
        setFileContent(value)
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const text = await file.text()
        setFileContent(text)
      } else {
        setFileContent('Unsupported file type. Please upload PDF, DOCX, or TXT.')
      }
    } catch (err) {
      setFileContent('Failed to extract text from file.')
      console.error(err)
    }
  }

  // Camera functions
  const streamRef = useRef(null)

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } })
      streamRef.current = stream
      setCapturedImage(null)
      setOcrText('')
      setCameraActive(true)
    } catch (err) { console.error('Camera access denied:', err); alert('Camera access denied. Please allow camera permissions.') }
  }

  // Attach stream to video element once it's rendered
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [cameraActive])

  const stopCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    if (videoRef.current) { videoRef.current.srcObject = null }
     setCameraActive(false)
  }
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const v = videoRef.current, c = canvasRef.current; c.width = v.videoWidth; c.height = v.videoHeight
    c.getContext('2d').drawImage(v, 0, 0)
    const dataUrl = c.toDataURL('image/jpeg', 0.85)
    setCapturedImage(dataUrl); stopCamera()
    // Directly analyze via Gemini Vision — no OCR step
    analyzeImageDirectly(dataUrl)
  }

  const retakePhoto = () => { setCapturedImage(null); setOcrText(''); startCamera() }
  useEffect(() => { if (activeTab !== 'camera') stopCamera(); return () => stopCamera() }, [activeTab])

  // ── LOCAL OCR + HUGGING FACE PIPELINE: Image → Full Analysis ──
  const analyzeImageDirectly = async (imgDataUrl) => {
    if (user?.subscriptionPlan === 'free' && (user?.freeScansUsed || 0) >= 2) {
      setShowUpgradeModal(true);
      setCapturedImage(null); startCamera(); return;
    }

    setIsScanning(true); setResult(null); setProgress(0)
    const progInterval = setInterval(() => {
      setProgress(p => p >= 40 ? 40 : p + Math.floor(Math.random() * 5))
    }, 500)

    try {
      // 1. OCR Extraction (Tesseract.js)
      const { text } = await extractTextFromImage(imgDataUrl)
      const cleanedText = cleanOCRText(text)

      if (!cleanedText) throw new Error("No readable text found in image")
      setOcrText(cleanedText)
      
      clearInterval(progInterval)
      const progInterval2 = setInterval(() => {
        setProgress(p => p >= 95 ? 95 : p + Math.floor(Math.random() * 10))
      }, 400)

      // 2. Multi-Model NLP Pipeline (Hugging Face)
      const pipelineResult = await analyzeNewsRaw(cleanedText.substring(0, 4000))
      
      const parsed = {
        score: pipelineResult?.credibilityScore ?? 0,
        sourceTrust: pipelineResult?.layerBreakdown?.source?.score ?? 0,
        factualAccuracy: pipelineResult?.layerBreakdown?.classifier?.score ?? 0,
        bias: pipelineResult?.manipulationLevel === 'High' ? 'High' : pipelineResult?.manipulationLevel === 'Moderate' ? 'Medium' : 'Low',
        manipulation: (pipelineResult?.manipulationLevel || '').toLowerCase() === 'high' || (pipelineResult?.manipulationLevel || '').toLowerCase() === 'moderate',
        summary: pipelineResult?.explanation || 'No explanation available.',
        flags: pipelineResult?.flags || [],
        isImage: true,
        extractedText: cleanedText.substring(0, 4000),
      }

      clearInterval(progInterval2)
      setProgress(100)

      if (user) {
        saveScanResult({
          content: parsed.extractedText,
          inputType: 'image',
          credibilityScore: parsed.score,
          riskLevel: parsed.bias,
          verdict: parsed.score >= 70 ? 'True' : parsed.score >= 40 ? 'Misleading' : 'Fake',
          flags: parsed.flags
        }).then(() => refreshUser()).catch(console.error)
      }

      setTimeout(() => { setIsScanning(false); setResult(parsed) }, 500)

    } catch (err) {
      console.error('Image analysis failed:', err)
      clearInterval(progInterval)
      setProgress(100)
      setTimeout(() => {
        setIsScanning(false)
        setResult({ score: 0, sourceTrust: 0, factualAccuracy: 0, bias: 'High', manipulation: true,
          summary: err.message === "No readable text found in image" 
            ? 'No readable text was found in the captured image. Please try again with a clearer photo.' 
            : 'Image analysis failed to process. Ensure your API keys and network connections are active.',
          flags: ['Analysis Failed'] })
      }, 500)
    }
  }

  // ── TEXT-BASED ANALYSIS (for file/URL tabs) — Multi-Model Pipeline ──
  const runAnalysis = async () => {
    let contentToAnalyze = ''
    if (activeTab === 'file') contentToAnalyze = fileContent
    if (activeTab === 'url') contentToAnalyze = `Analyze the content of this URL: ${inputUrl}` 
    if (!contentToAnalyze.trim() || contentToAnalyze.startsWith('Extracting')) return

    if (user?.subscriptionPlan === 'free' && (user?.freeScansUsed || 0) >= 2) {
      setShowUpgradeModal(true);
      return;
    }

    setIsScanning(true); setResult(null); setProgress(0)
    const progInterval = setInterval(() => {
      setProgress(p => p >= 95 ? 95 : p + Math.floor(Math.random() * 15))
    }, 400)

    try {
      const pipelineResult = await analyzeNewsRaw(contentToAnalyze.substring(0, 4000))

      // Map orchestrator output to the ScanContent result shape
      const parsed = {
        score: pipelineResult?.credibilityScore ?? 0,
        sourceTrust: pipelineResult?.layerBreakdown?.source?.score ?? 0,
        factualAccuracy: pipelineResult?.layerBreakdown?.classifier?.score ?? 0,
        bias: pipelineResult?.manipulationLevel === 'High' ? 'High' : pipelineResult?.manipulationLevel === 'Moderate' ? 'Medium' : 'Low',
        manipulation: (pipelineResult?.manipulationLevel || '').toLowerCase() === 'high' || (pipelineResult?.manipulationLevel || '').toLowerCase() === 'moderate',
        summary: pipelineResult?.explanation || 'No explanation available.',
        flags: pipelineResult?.flags || [],
        isImage: activeTab === 'file' && !!capturedImage,
        extractedText: contentToAnalyze.substring(0, 4000),
      }

      clearInterval(progInterval)
      setProgress(100)
      
      if (user) {
        saveScanResult({
          content: parsed.extractedText,
          inputType: activeTab,
          credibilityScore: parsed.score,
          riskLevel: parsed.bias,
          verdict: parsed.score >= 70 ? 'True' : parsed.score >= 40 ? 'Misleading' : 'Fake',
          flags: parsed.flags
        }).then(() => refreshUser()).catch(console.error)
      }

      setTimeout(() => {
        setIsScanning(false)
        setResult(parsed)
      }, 500)

    } catch (err) {
      console.error(err)
      clearInterval(progInterval)
      setProgress(100)
      setTimeout(() => {
        setIsScanning(false)
        setResult({
          score: 0,
          sourceTrust: 0,
          factualAccuracy: 0,
          bias: "High",
          manipulation: true,
          summary: "AI Analysis failed to process this content. Ensure your API keys and network connections are active.",
          flags: ["Analysis Failed", "Network Error"]
        })
      }, 500)
    }
  }

  const removeFlag = (idx) => {
    setResult(prev => ({ ...prev, flags: prev.flags.filter((_, i) => i !== idx) }))
  }

  return (
    <>
      <div className="noise-overlay pointer-events-none z-50 mix-blend-overlay opacity-20" style={{ position: 'fixed', inset: 0, background: 'url(/noise.png)' }} />
      <Cursor />
      <canvas ref={canvasRef} className="hidden" />
      <div className="min-h-screen bg-[#09090B] text-[#F8F4E8] font-sans selection:bg-[#C8FF00] selection:text-[#09090B] relative z-10">
        <Navbar />
        
        <main className="container mx-auto px-4 md:px-8 py-12 md:py-24 max-w-7xl">
          <div className="mb-12">
             <h1 className="font-display text-5xl md:text-6xl uppercase tracking-tighter text-white">
              INTELLIGENCE <span className="text-[#C8FF00]">SCANNER</span>
            </h1>
            <p className="font-mono text-sm opacity-70 mt-2 tracking-widest uppercase text-[#C8FF00]">
              // Advanced NLP Misinformation Detection Protocol v3.1
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
            
            {/* LEFT COL: INPUT */}
            <div className="flex flex-col border border-white/20 bg-[#121212] rounded-[24px] p-6 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#C8FF00] to-transparent opacity-50" />
              
              <div className="flex border-b border-white/10 mb-6 font-mono text-xs uppercase tracking-widest font-bold">
                <button 
                  className={`pb-4 px-4 transition-colors flex items-center gap-2 ${activeTab === 'camera' ? 'text-[#C8FF00] border-b-2 border-[#C8FF00]' : 'text-white/50 hover:text-white'}`}
                  onClick={() => setActiveTab('camera')}
                >
                  <iconify-icon icon="lucide:scan-line" /> Scan
                </button>
                <button 
                  className={`pb-4 px-4 transition-colors ${activeTab === 'file' ? 'text-[#C8FF00] border-b-2 border-[#C8FF00]' : 'text-white/50 hover:text-white'}`}
                  onClick={() => setActiveTab('file')}
                >
                  Upload File
                </button>
                <button 
                  className={`pb-4 px-4 transition-colors ${activeTab === 'url' ? 'text-[#C8FF00] border-b-2 border-[#C8FF00]' : 'text-white/50 hover:text-white'}`}
                  onClick={() => setActiveTab('url')}
                >
                  Import URL
                </button>
              </div>

              <div className="flex-1 flex flex-col mb-6">
                {activeTab === 'camera' && (
                  <div className="flex-1 flex flex-col min-h-[340px]">
                    <div className="relative w-full aspect-[4/3] bg-[#09090B] rounded-xl overflow-hidden border border-white/10 mb-4">
                      {!cameraActive && !capturedImage && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                          <div className="w-20 h-20 rounded-full border-2 border-[#C8FF00]/30 flex items-center justify-center bg-[#C8FF00]/5">
                            <iconify-icon icon="lucide:camera" class="text-3xl text-[#C8FF00]" />
                          </div>
                          <p className="text-white/50 font-mono text-xs text-center px-4">Point your camera at a newspaper, article, or social media post</p>
                          <button onClick={startCamera} className="px-6 py-2.5 bg-[#C8FF00] text-[#09090B] font-mono font-bold text-xs uppercase rounded-lg hover:bg-white transition-colors flex items-center gap-2">
                            <iconify-icon icon="lucide:aperture" /> Open Camera
                          </button>
                        </div>
                      )}
                      {cameraActive && (
                        <>
                          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                          <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-[#C8FF00]" />
                            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-[#C8FF00]" />
                            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-[#C8FF00]" />
                            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-[#C8FF00]" />
                            <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C8FF00] to-transparent" style={{ animation: 'scanLineVert 2.5s ease-in-out infinite' }} />
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#09090B]/70 backdrop-blur-sm px-3 py-1 rounded-full">
                              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                              <span className="font-mono text-[9px] text-white uppercase tracking-widest font-bold">Live</span>
                            </div>
                          </div>
                        </>
                      )}
                      {capturedImage && <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />}
                    </div>
                    {cameraActive && (
                      <div className="flex gap-3 mb-4">
                        <button onClick={capturePhoto} className="flex-1 py-3 bg-[#C8FF00] text-[#09090B] font-display uppercase text-sm rounded-xl hover:bg-white transition-colors flex items-center justify-center gap-2">
                          <iconify-icon icon="lucide:zap" class="text-lg" /> Capture & Analyze
                        </button>
                        <button onClick={stopCamera} className="px-4 py-3 bg-white/10 border border-white/10 text-white rounded-xl hover:bg-white/20 transition-colors">
                          <iconify-icon icon="lucide:x" class="text-lg" />
                        </button>
                      </div>
                    )}
                    {capturedImage && !isScanning && !result && (
                      <button onClick={retakePhoto} className="mt-2 w-full py-2 bg-white/10 border border-white/10 text-white rounded-xl hover:bg-white/20 transition-colors font-mono text-xs uppercase flex items-center justify-center gap-2">
                        <iconify-icon icon="lucide:refresh-cw" class="text-sm" /> Retake Photo
                      </button>
                    )}
                  </div>
                )}
                {activeTab === 'file' && (
                  <div className="flex-1 w-full border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center p-8 min-h-[300px] hover:border-[#C8FF00]/50 transition-colors bg-[#09090B] relative group">
                     <input type="file" accept=".txt,.pdf,.docx,.jpg,.jpeg,.png" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                     <iconify-icon icon="lucide:file-up" class="text-4xl text-[#C8FF00] mb-4 group-hover:-translate-y-2 transition-transform" />
                     <p className="font-bold mb-2">Drag & Drop or Click</p>
                     <p className="font-mono text-xs text-white/50">Supports JPG, PNG, PDF, DOCX, TXT</p>
                     {fileName && (
                       <div className="mt-6 text-[#C8FF00] font-mono text-xs p-3 bg-[#C8FF00]/10 rounded border border-[#C8FF00]/30 text-center z-10 w-full overflow-hidden">
                         File selected: <br/><strong className="truncate block mt-1">{fileName}</strong>
                         {isExtracting && (
                           <div className="mt-3 text-white/90 flex flex-col items-center justify-center gap-2">
                             <div className="flex items-center gap-2 text-[#C8FF00]">
                               <iconify-icon icon="lucide:scan" class="animate-pulse" /> SCANNING IMAGE...
                             </div>
                             <div className="w-full max-w-[150px] h-1 bg-white/20 rounded overflow-hidden">
                               <div className="h-full bg-[#C8FF00] transition-all duration-300" style={{ width: `${ocrProgress}%` }} />
                             </div>
                             <span className="text-[10px] opacity-70">OCR Progress: {ocrProgress}%</span>
                           </div>
                         )}
                         {capturedImage && !isExtracting && (
                           <div className="mt-3 text-white flex flex-col items-center gap-2">
                             <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/30 text-[9px] uppercase tracking-wider flex items-center gap-1">
                               <iconify-icon icon="lucide:check-circle-2" /> Text extracted successfully
                             </span>
                             <button onClick={(e) => { e.preventDefault(); setFileName(''); setFileContent(''); setCapturedImage(null); }} className="mt-2 text-red-400 hover:text-red-300 underline decoration-red-400/30 text-[10px]">Remove Image</button>
                           </div>
                         )}
                       </div>
                     )}
                     {capturedImage && (
                       <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none opacity-20 group-hover:opacity-10 transition-opacity">
                         <img src={capturedImage} className="w-full h-full object-cover blur-sm" alt="Preview" />
                       </div>
                     )}
                  </div>
                )}
                {activeTab === 'url' && (
                  <div className="flex-1 flex flex-col gap-4 min-h-[300px]">
                    <div className="flex items-center bg-[#09090B] border border-white/10 rounded-xl p-3 focus-within:border-[#C8FF00] transition-colors">
                      <iconify-icon icon="lucide:link" class="text-[#C8FF00] ml-2 text-xl" />
                      <input 
                        type="url" 
                        value={inputUrl}
                        onChange={e => setInputUrl(e.target.value)}
                        placeholder="https://example.com/news-article"
                        className="w-full bg-transparent p-2 pl-4 font-mono text-sm text-white focus:outline-none"
                      />
                    </div>
                    <div className="flex-1 border border-white/10 rounded-xl bg-[#09090B] flex items-center justify-center p-8 text-center border-dashed">
                       <p className="text-white/30 font-mono text-xs leading-relaxed">
                         <iconify-icon icon="lucide:globe" class="text-3xl block mx-auto mb-2 opacity-50" />
                         URL Extractor Mode active.<br/>Paste a link above to scan public web content.
                       </p>
                    </div>
                  </div>
                )}
              </div>

              {activeTab !== 'camera' && (
                <button 
                  onClick={runAnalysis}
                  disabled={isScanning || (activeTab === 'file' && !fileContent) || (activeTab === 'url' && !inputUrl)}
                  className="w-full py-4 bg-[#C8FF00] text-[#09090B] font-display uppercase text-xl hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-3 rounded-xl shadow-[0_0_20px_rgba(200,255,0,0.2)]"
                >
                  {isScanning ? (
                    <><iconify-icon icon="lucide:loader-2" class="animate-spin text-2xl" /> SCANNING...</>
                  ) : (
                    <><iconify-icon icon="lucide:radar" class="text-2xl" /> INITIATE SCAN</>
                  )}
                </button>
              )}
            </div>

            {/* RIGHT COL: RESULT / LOADING */}
            <div className="relative flex flex-col justify-center min-h-[400px]">
              
              {!isScanning && !result && (
                <div className="relative bg-[#121212] border border-white/10 rounded-[24px] overflow-hidden h-full min-h-[560px] shadow-2xl">
                  {/* Animated grid background */}
                  <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(#C8FF00 1px, transparent 1px), linear-gradient(90deg, #C8FF00 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                  
                  {/* Scan line sweeping vertically */}
                  <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C8FF00]/40 to-transparent z-30" style={{ animation: 'scanLineVert 3s ease-in-out infinite' }} />

                  {/* Top status bar */}
                  <div className="relative z-20 flex items-center justify-between px-5 py-3 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="font-mono text-[9px] text-red-400 uppercase tracking-[0.2em] font-bold">THREAT DETECTED</span>
                    </div>
                    <span className="font-mono text-[9px] text-white/30">SAMPLE_SCAN_001</span>
                  </div>

                  {/* Fake newspaper article card */}
                  <div className="relative z-10 m-5 bg-[#1a1a1a] border border-white/10 rounded-xl p-6 overflow-hidden">
                    {/* Article image placeholder */}
                    <div className="w-full h-28 bg-gradient-to-br from-[#1e1e1e] to-[#2a2a2a] rounded-lg mb-4 flex items-center justify-center overflow-hidden relative">
                      <div className="absolute inset-0 bg-[#09090B]/50" />
                      <div className="grid grid-cols-3 gap-1 opacity-30 scale-110">
                        {[...Array(6)].map((_, i) => <div key={i} className="w-12 h-8 bg-white/10 rounded" />)}
                      </div>
                      <div className="absolute top-2 left-2 bg-red-500/20 border border-red-500/40 px-2 py-0.5 rounded font-mono text-[8px] text-red-400 font-bold">UNVERIFIED SOURCE</div>
                    </div>
                    
                    {/* Article text skeleton */}
                    <div className="space-y-2 mb-3">
                      <div className="h-4 bg-white/10 rounded w-[90%]" />
                      <div className="h-4 bg-white/10 rounded w-full" />
                      <div className="h-4 bg-white/10 rounded w-[75%]" />
                    </div>
                    <div className="space-y-1.5 mb-4">
                      <div className="h-2.5 bg-white/5 rounded w-full" />
                      <div className="h-2.5 bg-white/5 rounded w-[95%]" />
                      <div className="h-2.5 bg-white/5 rounded w-[80%]" />
                      <div className="h-2.5 bg-white/5 rounded w-[60%]" />
                    </div>

                    {/* Red flags inline */}
                    <div className="flex flex-wrap gap-1.5">
                      {['Emotional Language', 'Missing Sources', 'Clickbait'].map(f => (
                        <span key={f} className="text-[9px] font-mono px-2 py-0.5 bg-red-500/10 text-red-400/80 border border-red-500/20 rounded">{f}</span>
                      ))}
                    </div>
                  </div>

                  {/* ── FAKE RIBBONS ── */}
                  {/* Ribbon 1 — top-left to bottom-right */}
                  <div className="absolute z-20 top-[30%] -left-[15%] w-[140%] flex items-center justify-center" style={{ transform: 'rotate(-25deg)' }}>
                    <div className="w-full bg-red-600 py-2 flex items-center justify-center gap-6 shadow-[0_4px_30px_rgba(239,68,68,0.4)]" style={{ animation: 'ribbonSlide 8s linear infinite' }}>
                      {[...Array(8)].map((_, i) => (
                        <span key={i} className="font-display text-white text-xl tracking-[0.3em] whitespace-nowrap select-none opacity-90">FAKE</span>
                      ))}
                    </div>
                  </div>
                  {/* Ribbon 2 — opposite diagonal */}
                  <div className="absolute z-20 top-[55%] -left-[15%] w-[140%] flex items-center justify-center" style={{ transform: 'rotate(20deg)' }}>
                    <div className="w-full bg-yellow-500/90 py-1.5 flex items-center justify-center gap-4 shadow-[0_4px_30px_rgba(234,179,8,0.3)]" style={{ animation: 'ribbonSlideReverse 10s linear infinite' }}>
                      {[...Array(10)].map((_, i) => (
                        <span key={i} className="font-mono text-[#09090B] text-xs font-bold tracking-[0.2em] whitespace-nowrap select-none">⚠ MISINFORMATION ⚠</span>
                      ))}
                    </div>
                  </div>
                  {/* Ribbon 3 — thin accent ribbon */}
                  <div className="absolute z-20 top-[75%] -left-[10%] w-[130%]" style={{ transform: 'rotate(-15deg)' }}>
                    <div className="w-full bg-red-500/80 py-1 flex items-center justify-center gap-5" style={{ animation: 'ribbonSlide 12s linear infinite' }}>
                      {[...Array(12)].map((_, i) => (
                        <span key={i} className="font-mono text-white/90 text-[9px] font-bold tracking-[0.15em] whitespace-nowrap select-none">DO NOT SHARE</span>
                      ))}
                    </div>
                  </div>

                  {/* Bottom stats bar */}
                  <div className="absolute bottom-0 left-0 right-0 z-20 bg-[#09090B]/95 backdrop-blur-sm border-t border-white/5 px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <iconify-icon icon="lucide:radar" class="text-[#C8FF00] text-base animate-pulse" />
                        <span className="font-mono text-[10px] text-[#C8FF00] tracking-widest font-bold uppercase">Veritas Engine Ready</span>
                      </div>
                      <div className="flex gap-1 items-end">
                        {[3, 5, 2, 6, 4, 3, 5].map((h, i) => (
                          <div key={i} className="w-1 rounded-full bg-[#C8FF00]/60" style={{ height: `${h * 3}px`, animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'ARTICLES SCANNED', val: '12.4K' },
                        { label: 'THREATS CAUGHT', val: '3,891' },
                        { label: 'ACCURACY', val: '97.2%' },
                      ].map(s => (
                        <div key={s.label} className="text-center">
                          <div className="font-display text-lg text-[#C8FF00]">{s.val}</div>
                          <div className="font-mono text-[8px] text-white/40 tracking-widest">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CSS animations (inline style tag) */}
                  <style>{`
                    @keyframes scanLineVert {
                      0% { top: 0; }
                      50% { top: 100%; }
                      100% { top: 0; }
                    }
                    @keyframes ribbonSlide {
                      0% { transform: translateX(0); }
                      100% { transform: translateX(-50%); }
                    }
                    @keyframes ribbonSlideReverse {
                      0% { transform: translateX(-50%); }
                      100% { transform: translateX(0); }
                    }
                  `}</style>
                </div>
              )}

              {isScanning && (
                <div className="flex flex-col items-center justify-center p-8 bg-[#121212] border border-[#C8FF00]/50 rounded-[24px] shadow-[0_0_40px_rgba(200,255,0,0.15)] h-full">
                  <div className="relative flex items-center justify-center w-32 h-32 mb-8">
                    <div className="absolute inset-0 border-2 border-white/10 rounded-full" />
                    <div className="absolute inset-0 border-t-2 border-r-2 border-[#C8FF00] rounded-full animate-spin" style={{ animationDuration: '1.5s' }} />
                    <iconify-icon icon="lucide:radar" class="text-4xl text-[#C8FF00] animate-pulse" />
                  </div>
                  <div className="font-mono text-[#C8FF00] tracking-[0.3em] font-bold text-sm mb-4">LIVE SCAN IN PROGRESS</div>
                  <div className="w-full max-w-xs h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-[#C8FF00] transition-all duration-300 relative" style={{ width: `${progress}%` }}>
                       <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/30 animate-pulse" />
                    </div>
                  </div>
                  <div className="mt-4 font-mono text-xs text-white/50">{progress}% COMPLETE</div>
                </div>
              )}

              {result && !isScanning && (
                <div className="flex flex-col bg-[#121212] border border-white/20 rounded-[24px] p-6 md:p-8 animate-fade-in relative overflow-hidden shadow-2xl h-full">
                  {/* Decorative background grid */}
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#C8FF00 1px, transparent 1px)', backgroundSize: '20px 20px' }} pointer-events-none="true" />
                  
                  <div className="flex justify-between items-start mb-8 relative z-10">
                    <div>
                      <div className="font-mono text-[10px] text-[#C8FF00] uppercase tracking-widest mb-1 border border-[#C8FF00]/30 inline-block px-2 py-0.5 rounded bg-[#C8FF00]/10">
                        Analysis Complete
                      </div>
                      <h2 className="font-display text-3xl mt-2">CREDIBILITY REPORT</h2>
                      {result.isImage && (
                        <div className="flex gap-2 mt-2">
                          <span className="bg-[#C8FF00]/20 text-[#C8FF00] border border-[#C8FF00]/50 font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded flex items-center gap-1">
                            <iconify-icon icon="lucide:image" /> IMAGE ANALYSIS
                          </span>
                          <span className="bg-white/10 text-white/70 border border-white/20 font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded flex items-center gap-1">
                            <iconify-icon icon="lucide:text-cursor-input" /> OCR EXTRACTED
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Animated Circular Gauge */}
                    <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="48" cy="48" r={gaugeRadius} stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
                        <circle 
                          cx="48" cy="48" r={gaugeRadius} 
                          stroke={result.score >= 70 ? '#C8FF00' : result.score >= 40 ? '#FBBF24' : '#EF4444'} 
                          strokeWidth="8" fill="none" strokeDasharray={gaugeCircumference}
                          strokeDashoffset={gaugeCircumference - (result.score / 100) * gaugeCircumference}
                          className="transition-all duration-1000 ease-out drop-shadow-md"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="font-display text-3xl leading-none text-white">{result.score}</span>
                        <span className="text-[9px] font-mono opacity-50 uppercase tracking-wider">Score</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8 relative z-10">
                    <div className="bg-[#09090B] p-5 rounded-xl border border-white/5">
                      <div className="flex justify-between font-mono text-[10px] uppercase mb-3">
                        <span className="opacity-60">Source Trust</span>
                        <span className="text-[#C8FF00] font-bold">{result.sourceTrust}%</span>
                      </div>
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#C8FF00] transition-all duration-1000 delay-300 relative" style={{ width: `${result.sourceTrust}%` }}>
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/30" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#09090B] p-5 rounded-xl border border-white/5">
                      <div className="flex justify-between font-mono text-[10px] uppercase mb-3">
                        <span className="opacity-60">Factual Accuracy</span>
                        <span className="text-[#C8FF00] font-bold">{result.factualAccuracy}%</span>
                      </div>
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#C8FF00] transition-all duration-1000 delay-500 relative" style={{ width: `${result.factualAccuracy}%` }}>
                           <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/30" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 mb-6 relative z-10">
                    <div className="flex-1 bg-[#09090B] border border-white/5 p-4 rounded-xl flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase opacity-60">Bias Level</span>
                      <span className={`text-xs font-bold uppercase px-3 py-1 rounded bg-white/5 ${result.bias.toLowerCase() === 'low' ? 'text-green-400' : result.bias.toLowerCase() === 'high' ? 'text-red-400' : 'text-yellow-400'}`}>
                        {result.bias}
                      </span>
                    </div>
                    <div className="flex-1 bg-[#09090B] border border-white/5 p-4 rounded-xl flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase opacity-60">Manipulation</span>
                      <span className={`text-xs font-bold uppercase px-3 py-1 rounded bg-white/5 ${result.manipulation ? 'text-red-400' : 'text-[#C8FF00]'}`}>
                        {result.manipulation ? 'DETECTED' : 'CLEAR'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#09090B] p-5 rounded-xl border border-white/5 mb-6 relative z-10">
                    <div className="font-mono text-[10px] uppercase text-[#C8FF00] mb-2 flex items-center gap-2">
                       <iconify-icon icon="lucide:bot" class="text-sm" /> AI Summary
                    </div>
                    <p className="text-sm leading-relaxed text-white/90">{result.summary}</p>
                  </div>

                  {result.isImage && result.extractedText && (
                    <div className="bg-[#09090B] p-5 rounded-xl border border-white/5 mb-6 relative z-10">
                      <div className="font-mono text-[10px] uppercase text-white/50 mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <iconify-icon icon="lucide:file-text" class="text-sm" /> EXTRACTED TEXT PREVIEW
                        </div>
                        <span className="text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">OCR Confidence: High</span>
                      </div>
                      <p className="text-xs leading-relaxed text-white/70 font-mono bg-white/5 p-3 rounded border border-white/10 max-h-32 overflow-y-auto whitespace-pre-wrap">{result.extractedText.length > 500 ? result.extractedText.substring(0, 500) + '...' : result.extractedText}</p>
                    </div>
                  )}

                  {result.flags && result.flags.length > 0 && (
                    <div className="mb-6 relative z-10">
                       <div className="font-mono text-[10px] uppercase opacity-50 mb-3">Detected Flags</div>
                       <div className="flex flex-wrap gap-2">
                         {result.flags.map((flag, idx) => (
                           <div key={idx} className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-1.5 rounded-full font-medium transition-all hover:bg-red-500/20">
                             <iconify-icon icon="lucide:alert-triangle" />
                             {flag}
                             <button onClick={() => removeFlag(idx)} className="ml-1 opacity-50 hover:opacity-100 transition-opacity"><iconify-icon icon="lucide:x" /></button>
                           </div>
                         ))}
                       </div>
                    </div>
                  )}

                  <div className="mt-auto flex gap-3 relative z-10 border-t border-white/10 pt-6">
                    <button 
                      onClick={() => { navigator.clipboard.writeText(JSON.stringify(result, null, 2)); alert('Report copied to clipboard!') }}
                      className="flex-1 py-3 bg-[#09090B] hover:bg-white/10 border border-white/10 rounded-xl text-xs font-mono font-bold uppercase transition-colors text-white"
                    >
                      Copy Report
                    </button>
                    <button 
                      onClick={() => setResult(null)}
                      className="flex-1 py-3 bg-[#C8FF00] text-[#09090B] hover:bg-white rounded-xl text-xs font-mono font-bold uppercase transition-colors"
                    >
                      New Scan
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </>
  )
}
