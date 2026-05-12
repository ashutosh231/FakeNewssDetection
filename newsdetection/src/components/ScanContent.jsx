import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from './Navbar'
import { analyzeNewsRaw } from '../services/huggingface'
import { extractTextFromImage } from '../services/ocr'
import { cleanOCRText } from '../utils/cleanOCRText'
import { saveScanResult } from '../services/api'
import { useAuth } from '../context/AuthContext'
import UpgradeModal from './UpgradeModal'

/* ──────────────────────────────────────────────────────────────────
   Pipeline stages (same multi-model chain as Detector + LiveNews)
   ────────────────────────────────────────────────────────────────── */
const PIPELINE_STAGES = [
  { id: 'capture',     label: 'Capture',            icon: 'lucide:camera' },
  { id: 'ocr',         label: 'OCR Extract',        icon: 'lucide:scan-text' },
  { id: 'validate',    label: 'Validate Text',      icon: 'lucide:check-circle' },
  { id: 'retrieval',   label: 'RAG Retrieval',      icon: 'lucide:database' },
  { id: 'classifier',  label: '2× HF Classifiers',  icon: 'lucide:layers' },
  { id: 'sentiment',   label: 'HF Sentiment',       icon: 'lucide:gauge' },
  { id: 'reasoning',   label: 'NVIDIA Llama 3.1',   icon: 'lucide:brain-circuit' },
  { id: 'scoring',     label: 'Credibility Score',  icon: 'lucide:scale' },
]

/* Animated counter */
function Counter({ value, duration = 900 }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let raf
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(eased * value))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return <>{display}</>
}

/* Validate extracted OCR text — return { ok, reason } */
const validateExtractedText = (text) => {
  if (!text || !text.trim()) {
    return { ok: false, reason: 'NO_TEXT', message: 'No readable text detected in the image.' }
  }
  const trimmed = text.trim()
  if (trimmed.length < 15) {
    return { ok: false, reason: 'TOO_SHORT', message: 'Too little text extracted. Try a clearer, closer shot with more readable content.' }
  }
  const words = trimmed.split(/\s+/).filter(Boolean)
  if (words.length < 5) {
    return { ok: false, reason: 'TOO_FEW_WORDS', message: 'Not enough words to analyze. Please capture a full headline or paragraph.' }
  }
  // Ratio of garbage chars (non-alphabetic/common punctuation)
  const alphaCount = (trimmed.match(/[a-zA-Z]/g) || []).length
  const alphaRatio = alphaCount / trimmed.length
  if (alphaRatio < 0.5) {
    return { ok: false, reason: 'GARBLED', message: 'Text is garbled or unreadable. Try better lighting and steady framing.' }
  }
  return { ok: true }
}

/* Pipeline visualizer node strip */
function PipelineStrip({ activeStage, completedStages }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-2">
      {PIPELINE_STAGES.map((stage, i) => {
        const isActive = activeStage === stage.id
        const isDone = completedStages.includes(stage.id)
        return (
          <div key={stage.id} className="flex items-center shrink-0">
            <motion.div
              animate={{ scale: isActive ? 1.05 : 1 }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors ${
                isActive
                  ? 'bg-[#C8FF00] text-[#09090B] border-[#C8FF00]'
                  : isDone
                    ? 'bg-[#C8FF00]/10 text-[#C8FF00] border-[#C8FF00]/30'
                    : 'bg-white/5 text-white/30 border-white/10'
              }`}
            >
              <iconify-icon icon={isDone ? 'lucide:check' : stage.icon} class="text-xs" />
              <span className="font-mono text-[9px] font-bold uppercase tracking-wider">{stage.label}</span>
              {isActive && (
                <motion.div
                  className="w-1 h-1 rounded-full bg-[#09090B]"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.9, repeat: Infinity }}
                />
              )}
            </motion.div>
            {i < PIPELINE_STAGES.length - 1 && (
              <div className={`w-3 h-[2px] ${isDone ? 'bg-[#C8FF00]' : 'bg-white/10'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────
   Main component
   ────────────────────────────────────────────────────────────────── */
export default function ScanContent() {
  const { user, refreshUser } = useAuth()
  const [mode, setMode] = useState('camera') // camera | upload | url
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  // Camera
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [capturedImage, setCapturedImage] = useState(null)
  const [cameraError, setCameraError] = useState('')

  // OCR
  const [ocrProgress, setOcrProgress] = useState(0)
  const [extractedText, setExtractedText] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionError, setExtractionError] = useState('')

  // URL mode
  const [inputUrl, setInputUrl] = useState('')

  // Pipeline
  const [isScanning, setIsScanning] = useState(false)
  const [activeStage, setActiveStage] = useState(null)
  const [completedStages, setCompletedStages] = useState([])
  const [result, setResult] = useState(null)

  /* ── Camera controls ── */
  const startCamera = async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      setCapturedImage(null)
      setExtractedText('')
      setExtractionError('')
      setResult(null)
      setCameraActive(true)
    } catch (err) {
      console.error('Camera access denied:', err)
      setCameraError('Camera access denied. Please enable camera permissions in your browser.')
    }
  }

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [cameraActive])

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraActive(false)
  }

  useEffect(() => () => stopCamera(), [])
  useEffect(() => {
    if (mode !== 'camera') stopCamera()
  }, [mode])

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const v = videoRef.current
    const c = canvasRef.current
    c.width = v.videoWidth
    c.height = v.videoHeight
    c.getContext('2d').drawImage(v, 0, 0)
    const dataUrl = c.toDataURL('image/jpeg', 0.9)
    setCapturedImage(dataUrl)
    stopCamera()
    runFullScan(dataUrl)
  }

  const retakePhoto = () => {
    setCapturedImage(null)
    setExtractedText('')
    setExtractionError('')
    setResult(null)
    setCompletedStages([])
    startCamera()
  }

  /* ── Upload ── */
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setExtractionError('Only image files are supported in Camera mode. Try uploading JPG or PNG.')
      return
    }
    const dataUrl = URL.createObjectURL(file)
    setCapturedImage(dataUrl)
    setExtractedText('')
    setExtractionError('')
    setResult(null)
    runFullScan(dataUrl)
  }

  /* ── URL scan ── */
  const runUrlScan = () => {
    if (!inputUrl.trim()) return
    const textToScan = inputUrl.trim()
    runPipelineOnText(textToScan, 'url')
  }

  /* ── Full scan (image → OCR → validate → pipeline) ── */
  const runFullScan = async (imageSource) => {
    // Check quota first
    if (user?.subscriptionPlan === 'free' && (user?.freeScansUsed || 0) >= 2) {
      setShowUpgradeModal(true)
      return
    }

    setResult(null)
    setCompletedStages([])
    setActiveStage('capture')
    setIsExtracting(true)
    setExtractionError('')
    setOcrProgress(0)

    // Stage 1: capture
    await new Promise((r) => setTimeout(r, 250))
    setCompletedStages(['capture'])
    setActiveStage('ocr')

    try {
      // Stage 2: OCR
      const { text } = await extractTextFromImage(imageSource, (p) => setOcrProgress(p))
      const cleaned = cleanOCRText(text)
      setExtractedText(cleaned)
      setCompletedStages((prev) => [...prev, 'ocr'])
      setActiveStage('validate')

      // Stage 3: Validate
      await new Promise((r) => setTimeout(r, 300))
      const validation = validateExtractedText(cleaned)
      if (!validation.ok) {
        setIsExtracting(false)
        setActiveStage(null)
        setExtractionError(validation.message)
        setResult({
          error: true,
          errorReason: validation.reason,
          errorMessage: validation.message,
        })
        return
      }
      setCompletedStages((prev) => [...prev, 'validate'])
      setIsExtracting(false)

      // Continue to pipeline
      await runPipelineOnText(cleaned, 'image')
    } catch (err) {
      console.error('OCR failed:', err)
      setIsExtracting(false)
      setActiveStage(null)
      const msg = 'OCR failed. Please try again with a clearer, higher-contrast image.'
      setExtractionError(msg)
      setResult({
        error: true,
        errorReason: 'OCR_FAILED',
        errorMessage: msg,
      })
    }
  }

  /* ── Pipeline on clean text (RAG + multi-model) ── */
  const runPipelineOnText = async (text, inputType) => {
    setIsScanning(true)
    const stageOrder = ['retrieval', 'classifier', 'sentiment', 'reasoning', 'scoring']
    let stageIdx = 0
    setActiveStage(stageOrder[0])

    const timer = setInterval(() => {
      setCompletedStages((prev) => [...prev, stageOrder[stageIdx]])
      stageIdx += 1
      if (stageIdx < stageOrder.length) setActiveStage(stageOrder[stageIdx])
      else clearInterval(timer)
    }, 800)

    try {
      const raw = await analyzeNewsRaw(text.substring(0, 4000))
      clearInterval(timer)
      setCompletedStages([...PIPELINE_STAGES.map((s) => s.id)])
      setActiveStage(null)
      setResult({ ...raw, extractedText: text })

      if (user) {
        saveScanResult({
          content: text.substring(0, 4000),
          inputType,
          credibilityScore: raw.credibilityScore,
          riskLevel: raw.riskLevel,
          verdict: raw.verdict,
          flags: raw.flags,
        }).then(() => refreshUser()).catch(console.error)
      }
    } catch (err) {
      console.error('Pipeline failed:', err)
      clearInterval(timer)
      setActiveStage(null)
      setResult({
        error: true,
        errorReason: 'PIPELINE_FAILED',
        errorMessage: 'The AI pipeline failed. Please check your network and try again.',
      })
    } finally {
      setIsScanning(false)
    }
  }

  const resetScan = () => {
    setCapturedImage(null)
    setExtractedText('')
    setExtractionError('')
    setResult(null)
    setCompletedStages([])
    setActiveStage(null)
    setOcrProgress(0)
    setInputUrl('')
  }

  const getScoreColor = (score) => {
    if (score >= 70) return '#C8FF00'
    if (score >= 40) return '#FBBF24'
    return '#EF4444'
  }

  const getRiskStyle = (risk) => {
    const r = (risk || '').toUpperCase()
    if (r === 'HIGH RISK') return { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/40' }
    if (r === 'SUSPICIOUS') return { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/40' }
    if (r === 'MODERATE') return { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/40' }
    if (r === 'SAFE') return { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/40' }
    return { text: 'text-white/60', bg: 'bg-white/5', border: 'border-white/10' }
  }

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />
      <div className="min-h-screen bg-[#09090B] text-[#F8F4E8] relative z-10">
        <Navbar />

        <main className="container mx-auto px-4 md:px-8 py-8 md:py-12 max-w-7xl">
          {/* ── Header ── */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#C8FF00]/60 mb-2">
              // Intelligence Scanner · Multi-Model RAG Chain
            </p>
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <h1 className="font-display text-4xl md:text-6xl uppercase tracking-tighter text-white leading-none">
                  SCAN<span className="text-[#C8FF00]">.</span>
                </h1>
                <p className="font-mono text-xs text-white/50 mt-2">
                  Point your camera, drop an image, or paste a URL. OCR + 2× HF classifiers + NVIDIA Llama handle the rest.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { label: 'TESSERACT OCR', style: 'bg-white/5 border-white/10 text-white/70' },
                  { label: '2× HF CLASSIFIERS', style: 'bg-[#C8FF00] border-[#C8FF00] text-[#09090B]' },
                  { label: 'HF SENTIMENT', style: 'bg-white/5 border-white/10 text-white/70' },
                  { label: 'NVIDIA LLAMA 3.1-70B', style: 'bg-white/5 border-white/10 text-white/70' },
                ].map((c) => (
                  <span
                    key={c.label}
                    className={`font-mono text-[9px] px-2 py-1 border rounded ${c.style}`}
                  >
                    {c.label}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ── Pipeline strip ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-6 bg-[#121212] border border-white/10 rounded-2xl p-3"
          >
            <PipelineStrip activeStage={activeStage} completedStages={completedStages} />
          </motion.div>

          {/* ── Two-col layout ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ── LEFT: Input ── */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#121212] border border-white/10 rounded-[24px] overflow-hidden shadow-2xl"
            >
              {/* Mode tabs */}
              <div className="border-b border-white/10 p-3">
                <div className="flex gap-1 bg-[#09090B] rounded-lg p-1">
                  {[
                    { id: 'camera', label: 'Camera', icon: 'lucide:camera' },
                    { id: 'upload', label: 'Upload', icon: 'lucide:upload' },
                    { id: 'url', label: 'URL', icon: 'lucide:link' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-[10px] uppercase tracking-widest font-bold transition-all ${
                        mode === m.id
                          ? 'bg-[#C8FF00] text-[#09090B] shadow-lg shadow-[#C8FF00]/20'
                          : 'text-white/50 hover:text-white'
                      }`}
                    >
                      <iconify-icon icon={m.icon} class="text-sm" />
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-5">
                <AnimatePresence mode="wait">
                  {/* Camera mode */}
                  {mode === 'camera' && (
                    <motion.div
                      key="camera"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      <div className="relative w-full aspect-[4/3] bg-[#09090B] rounded-2xl overflow-hidden border border-white/10">
                        {/* Idle */}
                        {!cameraActive && !capturedImage && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
                            <motion.div
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="w-20 h-20 rounded-2xl border-2 border-[#C8FF00]/30 bg-[#C8FF00]/5 flex items-center justify-center"
                            >
                              <iconify-icon icon="lucide:camera" class="text-3xl text-[#C8FF00]" />
                            </motion.div>
                            <div>
                              <p className="font-bold text-white mb-1">Ready to Scan</p>
                              <p className="text-white/40 font-mono text-xs">
                                Point your camera at a headline, article, or post
                              </p>
                            </div>
                            <button
                              onClick={startCamera}
                              className="px-6 py-3 bg-[#C8FF00] text-[#09090B] font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-white transition-colors flex items-center gap-2"
                            >
                              <iconify-icon icon="lucide:aperture" /> Start Camera
                            </button>
                            {cameraError && (
                              <div className="mt-2 px-4 py-2 bg-red-500/10 border border-red-500/40 rounded-lg text-red-400 font-mono text-[10px]">
                                {cameraError}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Live */}
                        {cameraActive && (
                          <>
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                            {/* Scanner frame */}
                            <div className="absolute inset-0 pointer-events-none">
                              <div className="absolute top-5 left-5 w-10 h-10 border-t-2 border-l-2 border-[#C8FF00]" />
                              <div className="absolute top-5 right-5 w-10 h-10 border-t-2 border-r-2 border-[#C8FF00]" />
                              <div className="absolute bottom-5 left-5 w-10 h-10 border-b-2 border-l-2 border-[#C8FF00]" />
                              <div className="absolute bottom-5 right-5 w-10 h-10 border-b-2 border-r-2 border-[#C8FF00]" />
                              <motion.div
                                className="absolute left-5 right-5 h-[2px] bg-[#C8FF00] shadow-[0_0_20px_5px_rgba(200,255,0,0.5)]"
                                initial={{ top: '10%' }}
                                animate={{ top: '90%' }}
                                transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
                              />
                              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full border border-red-500/30">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="font-mono text-[9px] text-white uppercase tracking-widest font-bold">Live</span>
                              </div>
                            </div>
                          </>
                        )}

                        {/* Captured */}
                        {capturedImage && (
                          <>
                            <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                            {isExtracting && (
                              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3">
                                <div className="relative w-16 h-16">
                                  <div className="absolute inset-0 border-2 border-[#C8FF00]/20 rounded-full" />
                                  <div className="absolute inset-0 border-t-2 border-[#C8FF00] rounded-full animate-spin" />
                                </div>
                                <p className="font-mono text-[11px] text-[#C8FF00] font-bold tracking-widest">
                                  EXTRACTING TEXT · {ocrProgress}%
                                </p>
                                <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                                  <motion.div
                                    className="h-full bg-[#C8FF00]"
                                    initial={{ width: '0%' }}
                                    animate={{ width: `${ocrProgress}%` }}
                                    transition={{ duration: 0.2 }}
                                  />
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Camera controls */}
                      {cameraActive && (
                        <div className="flex gap-3">
                          <button
                            onClick={capturePhoto}
                            className="flex-1 py-3 bg-[#C8FF00] text-[#09090B] font-bold uppercase text-sm rounded-xl hover:bg-white transition-colors flex items-center justify-center gap-2"
                          >
                            <iconify-icon icon="lucide:zap" class="text-lg" /> Capture & Analyze
                          </button>
                          <button
                            onClick={stopCamera}
                            className="px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-colors"
                          >
                            <iconify-icon icon="lucide:x" class="text-lg" />
                          </button>
                        </div>
                      )}
                      {capturedImage && !isExtracting && !isScanning && (
                        <button
                          onClick={retakePhoto}
                          className="w-full py-2.5 bg-white/5 border border-white/10 text-white/80 rounded-xl hover:bg-white/10 transition-colors font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                          <iconify-icon icon="lucide:refresh-cw" /> Retake Photo
                        </button>
                      )}
                    </motion.div>
                  )}

                  {/* Upload mode */}
                  {mode === 'upload' && (
                    <motion.div
                      key="upload"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                      {!capturedImage ? (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full border-2 border-dashed border-white/20 rounded-2xl py-16 bg-[#09090B] hover:border-[#C8FF00]/50 hover:bg-[#C8FF00]/5 transition-all flex flex-col items-center justify-center gap-3 group"
                        >
                          <iconify-icon icon="lucide:upload-cloud" class="text-4xl text-[#C8FF00] group-hover:-translate-y-1 transition-transform" />
                          <div>
                            <p className="font-bold text-white mb-1">Drop or Click to Upload</p>
                            <p className="font-mono text-[10px] text-white/40">JPG, PNG, WEBP</p>
                          </div>
                        </button>
                      ) : (
                        <div className="relative aspect-[4/3] bg-[#09090B] rounded-2xl overflow-hidden border border-white/10">
                          <img src={capturedImage} alt="uploaded" className="w-full h-full object-cover" />
                          {isExtracting && (
                            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3">
                              <div className="w-12 h-12 border-2 border-[#C8FF00]/20 border-t-[#C8FF00] rounded-full animate-spin" />
                              <p className="font-mono text-[11px] text-[#C8FF00] font-bold tracking-widest">
                                EXTRACTING · {ocrProgress}%
                              </p>
                            </div>
                          )}
                          <button
                            onClick={resetScan}
                            className="absolute top-3 right-3 w-8 h-8 bg-black/70 border border-white/20 rounded-full flex items-center justify-center hover:bg-red-500 hover:border-red-500"
                          >
                            <iconify-icon icon="lucide:x" class="text-white text-sm" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* URL mode */}
                  {mode === 'url' && (
                    <motion.div
                      key="url"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      <div className="relative">
                        <iconify-icon icon="lucide:link" class="absolute left-4 top-1/2 -translate-y-1/2 text-[#C8FF00] text-lg" />
                        <input
                          type="url"
                          value={inputUrl}
                          onChange={(e) => setInputUrl(e.target.value)}
                          placeholder="https://example.com/article"
                          className="w-full py-4 pl-12 pr-4 bg-[#09090B] border border-white/10 rounded-xl font-mono text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#C8FF00] transition-colors"
                        />
                      </div>
                      <button
                        onClick={runUrlScan}
                        disabled={!inputUrl.trim() || isScanning}
                        className="w-full py-3.5 bg-[#C8FF00] text-[#09090B] font-bold uppercase tracking-widest text-sm rounded-xl hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                      >
                        <iconify-icon icon="lucide:radar" /> Analyze URL
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Extraction error */}
                {extractionError && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 bg-red-500/10 border-2 border-red-500/40 rounded-xl"
                  >
                    <div className="flex items-start gap-3">
                      <iconify-icon icon="lucide:alert-octagon" class="text-red-400 text-xl shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-mono text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">
                          Invalid Input
                        </p>
                        <p className="text-sm text-red-200 leading-relaxed">{extractionError}</p>
                      </div>
                    </div>
                    <button
                      onClick={resetScan}
                      className="mt-3 w-full py-2 bg-red-500/20 border border-red-500/40 text-red-200 font-mono text-xs uppercase tracking-widest rounded-lg hover:bg-red-500/30 transition-colors"
                    >
                      Try Again
                    </button>
                  </motion.div>
                )}

                {/* Extracted text preview */}
                {extractedText && !extractionError && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 bg-[#09090B] border border-[#C8FF00]/30 rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-mono text-[10px] font-bold text-[#C8FF00] uppercase tracking-widest">
                        Extracted Text
                      </p>
                      <span className="text-[9px] text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded flex items-center gap-1 font-mono">
                        <iconify-icon icon="lucide:check-circle-2" /> VALID
                      </span>
                    </div>
                    <p className="text-xs text-white/70 leading-relaxed max-h-24 overflow-y-auto font-mono">
                      {extractedText.substring(0, 400)}
                      {extractedText.length > 400 && '...'}
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* ── RIGHT: Results ── */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              className="relative"
            >
              <AnimatePresence mode="wait">
                {/* Idle state */}
                {!isScanning && !isExtracting && !result && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-[#121212] border border-white/10 rounded-[24px] p-8 min-h-[560px] flex flex-col items-center justify-center text-center relative overflow-hidden"
                  >
                    <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(#C8FF00 1px, transparent 1px), linear-gradient(90deg, #C8FF00 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                      className="w-32 h-32 rounded-full border-2 border-dashed border-[#C8FF00]/30 flex items-center justify-center mb-6"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <iconify-icon icon="lucide:shield-check" class="text-5xl text-[#C8FF00]" />
                      </motion.div>
                    </motion.div>
                    <h3 className="font-display text-2xl uppercase tracking-tighter text-white mb-2">Awaiting Input</h3>
                    <p className="font-mono text-xs text-white/40 max-w-sm">
                      Capture a photo, upload an image, or paste a URL. The multi-model RAG pipeline will run automatically.
                    </p>

                    <div className="mt-8 grid grid-cols-3 gap-3 w-full max-w-sm">
                      {[
                        { label: 'SCANNED', val: '12.4K' },
                        { label: 'FLAGGED', val: '3.8K' },
                        { label: 'ACCURACY', val: '98%' },
                      ].map((s) => (
                        <div key={s.label} className="bg-[#09090B] border border-white/5 rounded-xl p-3 text-center">
                          <div className="font-display text-lg text-[#C8FF00]">{s.val}</div>
                          <div className="font-mono text-[8px] text-white/40 tracking-widest mt-0.5">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Scanning state */}
                {(isScanning || isExtracting) && !result?.error && (
                  <motion.div
                    key="scanning"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-[#121212] border border-[#C8FF00]/40 rounded-[24px] p-8 min-h-[560px] flex flex-col items-center justify-center shadow-[0_0_40px_rgba(200,255,0,0.1)]"
                  >
                    <div className="relative w-32 h-32 mb-8">
                      <div className="absolute inset-0 border-2 border-white/10 rounded-full" />
                      <motion.div
                        className="absolute inset-0 border-t-2 border-r-2 border-[#C8FF00] rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      />
                      <motion.div
                        className="absolute inset-3 border-b-2 border-l-2 border-white/20 rounded-full"
                        animate={{ rotate: -360 }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <iconify-icon icon="lucide:radar" class="text-4xl text-[#C8FF00] animate-pulse" />
                      </div>
                    </div>

                    <div className="font-mono text-[#C8FF00] tracking-[0.3em] font-bold text-sm mb-2 uppercase">
                      {isExtracting ? 'Extracting Text' : 'Running Pipeline'}
                    </div>
                    <div className="font-mono text-[10px] text-white/40 mb-6 uppercase tracking-widest">
                      {activeStage ? PIPELINE_STAGES.find((s) => s.id === activeStage)?.label : 'Processing'}
                    </div>

                    <div className="w-full max-w-sm space-y-2">
                      {PIPELINE_STAGES.map((stage, i) => {
                        const isDone = completedStages.includes(stage.id)
                        const isActive = activeStage === stage.id
                        return (
                          <div key={stage.id} className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                              isActive
                                ? 'bg-[#C8FF00] text-[#09090B]'
                                : isDone
                                  ? 'bg-[#C8FF00]/20 text-[#C8FF00]'
                                  : 'bg-white/5 text-white/20'
                            }`}>
                              <iconify-icon icon={isDone ? 'lucide:check' : stage.icon} class="text-xs" />
                            </div>
                            <div className={`font-mono text-[10px] uppercase tracking-widest flex-1 ${
                              isActive ? 'text-[#C8FF00] font-bold' : isDone ? 'text-white/60' : 'text-white/20'
                            }`}>
                              {stage.label}
                            </div>
                            {isActive && (
                              <motion.div
                                className="w-1 h-1 rounded-full bg-[#C8FF00]"
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 0.9, repeat: Infinity }}
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Error state (OCR / pipeline / validation) */}
                {result?.error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="bg-[#121212] border-2 border-red-500/40 rounded-[24px] p-8 min-h-[560px] flex flex-col items-center justify-center text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 14 }}
                      className="w-24 h-24 rounded-full bg-red-500/10 border-2 border-red-500/40 flex items-center justify-center mb-6"
                    >
                      <iconify-icon icon="lucide:alert-octagon" class="text-4xl text-red-400" />
                    </motion.div>
                    <h3 className="font-display text-3xl uppercase tracking-tighter text-red-400 mb-2">
                      INVALID
                    </h3>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-red-400/60 mb-4">
                      {result.errorReason?.replace(/_/g, ' ')}
                    </p>
                    <p className="text-sm text-white/70 max-w-sm mb-6 leading-relaxed">
                      {result.errorMessage}
                    </p>

                    {/* Tips based on reason */}
                    <div className="bg-[#09090B] border border-white/10 rounded-xl p-4 mb-6 max-w-sm">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-[#C8FF00] mb-2">Tips</p>
                      <ul className="text-xs text-white/60 space-y-1.5 text-left list-disc list-inside">
                        <li>Ensure good lighting and steady framing</li>
                        <li>Get closer to the text for a sharper image</li>
                        <li>Avoid glare on screens or glossy surfaces</li>
                        <li>Capture at least one full headline or paragraph</li>
                      </ul>
                    </div>

                    <button
                      onClick={resetScan}
                      className="px-6 py-3 bg-[#C8FF00] text-[#09090B] font-bold uppercase text-xs tracking-widest rounded-xl hover:bg-white transition-colors flex items-center gap-2"
                    >
                      <iconify-icon icon="lucide:refresh-cw" /> Try Again
                    </button>
                  </motion.div>
                )}

                {/* Success result */}
                {result && !result.error && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="bg-[#121212] border border-white/10 rounded-[24px] p-6 md:p-8 shadow-2xl space-y-5"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="inline-block font-mono text-[9px] uppercase tracking-widest px-2 py-1 border border-[#C8FF00]/30 text-[#C8FF00] bg-[#C8FF00]/10 rounded mb-3">
                          Analysis Complete
                        </span>
                        <h2 className="font-display text-3xl uppercase tracking-tighter text-white">
                          CREDIBILITY REPORT
                        </h2>
                        {result.reasoningModel && (
                          <p className="font-mono text-[10px] text-white/40 mt-1.5 tracking-wider">
                            reasoned via {result.reasoningModel}
                          </p>
                        )}
                      </div>

                      {/* Score ring */}
                      <div className="relative w-28 h-28 shrink-0">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="56" cy="56" r="48" stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="none" />
                          <motion.circle
                            cx="56"
                            cy="56"
                            r="48"
                            stroke={getScoreColor(result.credibilityScore)}
                            strokeWidth="8"
                            fill="none"
                            strokeLinecap="round"
                            initial={{ strokeDashoffset: 301.6 }}
                            animate={{ strokeDashoffset: 301.6 - (result.credibilityScore / 100) * 301.6 }}
                            transition={{ duration: 1.2, ease: 'easeOut' }}
                            strokeDasharray="301.6"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="font-display text-3xl leading-none text-white">
                            <Counter value={result.credibilityScore} />
                          </span>
                          <span className="text-[8px] font-mono text-white/40 uppercase tracking-widest mt-1">
                            Credibility
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Risk + verdict row */}
                    <div className={`p-4 rounded-xl border ${getRiskStyle(result.riskLevel).border} ${getRiskStyle(result.riskLevel).bg}`}>
                      <div className="flex items-center gap-3">
                        <iconify-icon
                          icon={
                            result.riskLevel === 'SAFE' ? 'lucide:shield-check' :
                            result.riskLevel === 'HIGH RISK' ? 'lucide:shield-alert' :
                            'lucide:shield'
                          }
                          class={`text-2xl ${getRiskStyle(result.riskLevel).text}`}
                        />
                        <div className="flex-1">
                          <div className={`font-mono text-[9px] uppercase tracking-widest ${getRiskStyle(result.riskLevel).text}`}>
                            Risk Level
                          </div>
                          <div className="font-bold text-lg text-white">
                            {result.verdict} <span className="text-white/40 text-sm">· {result.riskLevel}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Metrics row */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Fake Prob', value: `${result.fakeProbability}%` },
                        { label: 'Manipulation', value: result.manipulationLevel },
                        { label: 'Sentiment', value: result.sentiment },
                      ].map((m, i) => (
                        <motion.div
                          key={m.label}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 + i * 0.05 }}
                          className="bg-[#09090B] border border-white/5 rounded-xl p-3 text-center"
                        >
                          <p className="font-mono text-[8px] text-white/40 uppercase tracking-widest">{m.label}</p>
                          <p className="text-sm font-bold text-white mt-1">{m.value}</p>
                        </motion.div>
                      ))}
                    </div>

                    {/* Layer breakdown */}
                    {result.layerBreakdown && Object.keys(result.layerBreakdown).length > 0 && (
                      <div className="bg-[#09090B] border border-white/5 rounded-xl p-4">
                        <p className="font-mono text-[10px] text-[#C8FF00] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <iconify-icon icon="lucide:layers" /> Multi-Model Layer Breakdown
                        </p>
                        <div className="space-y-2.5">
                          {Object.entries(result.layerBreakdown).map(([key, val], i) => (
                            <div key={key} className="flex items-center gap-3">
                              <span className="font-mono text-[10px] text-white/60 uppercase w-20 shrink-0 font-bold">
                                {key}
                              </span>
                              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${val.score || 0}%` }}
                                  transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
                                  className={`h-full rounded-full ${
                                    val.score >= 70 ? 'bg-[#C8FF00]' : val.score >= 40 ? 'bg-yellow-400' : 'bg-red-500'
                                  }`}
                                />
                              </div>
                              <span className="font-mono text-[10px] text-white/80 w-10 text-right font-bold">
                                {val.score || 0}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* RAG topics */}
                    {result.retrievedTopics?.length > 0 && (
                      <div className="bg-[#C8FF00]/5 border border-[#C8FF00]/30 rounded-xl p-4">
                        <p className="font-mono text-[10px] text-[#C8FF00] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <iconify-icon icon="lucide:database" /> RAG Retrieved Context
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {result.retrievedTopics.map((t, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-mono px-2 py-0.5 bg-[#09090B] border border-[#C8FF00]/30 text-[#C8FF00] rounded-full font-bold"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Explanation */}
                    <div className="bg-[#09090B] border border-white/5 rounded-xl p-4">
                      <p className="font-mono text-[10px] text-[#C8FF00] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <iconify-icon icon="lucide:bot" /> AI Summary
                      </p>
                      <p className="text-sm leading-relaxed text-white/80">{result.explanation}</p>
                    </div>

                    {/* Flags */}
                    {result.flags?.length > 0 && (
                      <div>
                        <p className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-2">Detected Flags</p>
                        <div className="flex flex-wrap gap-1.5">
                          {result.flags.map((f, i) => (
                            <motion.span
                              key={i}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.3 + i * 0.05 }}
                              className="text-[10px] font-mono px-2 py-1 bg-red-500/10 border border-red-500/30 text-red-400 rounded-full"
                            >
                              {f}
                            </motion.span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Extracted text preview */}
                    {result.extractedText && (
                      <details className="bg-[#09090B] border border-white/5 rounded-xl p-4 cursor-pointer group">
                        <summary className="font-mono text-[10px] text-white/40 uppercase tracking-widest flex items-center gap-2 cursor-pointer">
                          <iconify-icon icon="lucide:file-text" />
                          Extracted Text
                          <iconify-icon icon="lucide:chevron-down" class="ml-auto group-open:rotate-180 transition-transform" />
                        </summary>
                        <p className="mt-3 text-xs font-mono text-white/60 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
                          {result.extractedText.substring(0, 600)}
                          {result.extractedText.length > 600 && '...'}
                        </p>
                      </details>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
                        className="flex-1 py-3 bg-[#09090B] hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-mono font-bold uppercase tracking-widest transition-colors text-white flex items-center justify-center gap-1.5"
                      >
                        <iconify-icon icon="lucide:clipboard" /> Copy JSON
                      </button>
                      <button
                        onClick={resetScan}
                        className="flex-1 py-3 bg-[#C8FF00] text-[#09090B] hover:bg-white rounded-xl text-[10px] font-mono font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5"
                      >
                        <iconify-icon icon="lucide:rotate-ccw" /> New Scan
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </main>
      </div>
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </>
  )
}
