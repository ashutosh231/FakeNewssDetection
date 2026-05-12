import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from './Navbar'
import { analyzeNewsRaw } from '../services/huggingface'
import { extractTextFromImage } from '../services/ocr'
import { cleanOCRText } from '../utils/cleanOCRText'
import { saveScanResult } from '../services/api'
import { useAuth } from '../context/AuthContext'
import UpgradeModal from './UpgradeModal'

/* ──────────────────────────────────────────────────────────────────
   Sample presets
   ────────────────────────────────────────────────────────────────── */
const SAMPLES = [
  {
    label: 'Vaccine Hoax',
    icon: 'lucide:syringe',
    tag: 'HEALTH',
    text: 'Breaking: Scientists confirm that vaccines contain microchips for tracking. New study proves 5G towers activate these chips. Share before this is deleted.',
  },
  {
    label: 'Political Claim',
    icon: 'lucide:landmark',
    tag: 'POLITICS',
    text: 'Senator Johnson caught on video accepting bribes from foreign lobbyists. Mainstream media refuses to cover this story. Retweet to spread the truth.',
  },
  {
    label: 'Legit News',
    icon: 'lucide:rocket',
    tag: 'SCIENCE',
    text: 'NASA successfully launched its Artemis III mission to the lunar south pole today, marking the first crewed Moon landing since 1972. According to NASA officials, the mission will conduct geological surveys over a 30-day period.',
  },
  {
    label: 'Conspiracy',
    icon: 'lucide:eye-off',
    tag: 'VIRAL',
    text: 'Deep state operatives are using chemtrails to control weather patterns. Leaked documents reveal the illuminati agenda. Wake up sheeple! Share before they delete this!',
  },
]

/* ──────────────────────────────────────────────────────────────────
   Pipeline nodes
   ────────────────────────────────────────────────────────────────── */
const PIPELINE_NODES = [
  { id: 'input',     label: 'Input',              icon: 'lucide:file-text',     sub: 'Text / URL / Image' },
  { id: 'retrieval', label: 'RAG Retrieval',      icon: 'lucide:database',      sub: 'Fact-check KB (7 domains)' },
  { id: 'classifier', label: 'Classifier Ensemble', icon: 'lucide:layers',      sub: 'RoBERTa + BERT-tiny' },
  { id: 'sentiment', label: 'Sentiment & Manip',  icon: 'lucide:gauge',         sub: 'Twitter-RoBERTa' },
  { id: 'reasoning', label: 'LLM Reasoning',      icon: 'lucide:brain-circuit', sub: 'Zephyr → Mistral → Llama 3.1-70B' },
  { id: 'scoring',   label: 'Credibility Engine', icon: 'lucide:scale',         sub: 'Weighted aggregation' },
  { id: 'output',    label: 'Verdict',            icon: 'lucide:shield-check',  sub: 'Score + flags + evidence' },
]

const gaugeRadius = 42
const gaugeCircumference = 2 * Math.PI * gaugeRadius

/* ──────────────────────────────────────────────────────────────────
   Animated counter
   ────────────────────────────────────────────────────────────────── */
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

/* ──────────────────────────────────────────────────────────────────
   Pipeline Visualizer
   ────────────────────────────────────────────────────────────────── */
function PipelineVisualizer({ activeStage, completedStages }) {
  return (
    <div className="bg-[#09090B] border-2 border-[#09090B] rounded-[24px] p-5 hard-shadow-md relative overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-30 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#D2E823] animate-pulse" />
            <p className="font-mono text-[10px] text-[#D2E823] uppercase tracking-widest font-bold">
              Pipeline Visualizer
            </p>
          </div>
          <span className="font-mono text-[9px] text-[#D2E823]/50 tracking-widest">
            {activeStage ? 'RUNNING' : 'READY'}
          </span>
        </div>

        <div className="space-y-2">
          {PIPELINE_NODES.map((node, i) => {
            const isActive = activeStage === node.id
            const isDone = completedStages.includes(node.id)
            const isPending = !isActive && !isDone

            return (
              <div key={node.id} className="relative">
                {/* Connecting line to next node */}
                {i < PIPELINE_NODES.length - 1 && (
                  <div className="absolute left-5 top-full w-[2px] h-2 bg-[#D2E823]/10 overflow-hidden">
                    {(isDone || isActive) && (
                      <motion.div
                        initial={{ y: '-100%' }}
                        animate={{ y: isDone ? 0 : ['-100%', '100%'] }}
                        transition={
                          isDone
                            ? { duration: 0.3 }
                            : { duration: 0.8, repeat: Infinity, ease: 'linear' }
                        }
                        className="w-full h-full bg-[#D2E823]"
                      />
                    )}
                  </div>
                )}

                <motion.div
                  animate={{
                    scale: isActive ? 1.01 : 1,
                    backgroundColor: isActive ? 'rgba(210, 232, 35, 0.12)' : 'rgba(248, 244, 232, 0.03)',
                  }}
                  transition={{ duration: 0.25 }}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${
                    isActive
                      ? 'border-[#D2E823]'
                      : isDone
                        ? 'border-[#D2E823]/40'
                        : 'border-[#F8F4E8]/10'
                  }`}
                >
                  {/* Node icon */}
                  <div className={`relative w-10 h-10 shrink-0 rounded-lg border flex items-center justify-center ${
                    isActive
                      ? 'bg-[#D2E823] border-[#D2E823] text-[#09090B]'
                      : isDone
                        ? 'bg-[#D2E823]/20 border-[#D2E823]/50 text-[#D2E823]'
                        : 'bg-[#F8F4E8]/5 border-[#F8F4E8]/10 text-[#F8F4E8]/30'
                  }`}>
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 rounded-lg bg-[#D2E823]"
                        animate={{ opacity: [0.4, 0, 0.4] }}
                        transition={{ duration: 1.4, repeat: Infinity }}
                      />
                    )}
                    <iconify-icon
                      icon={isDone ? 'lucide:check' : node.icon}
                      class="text-base relative z-10"
                    />
                  </div>

                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    <div className={`font-bold text-sm tracking-tight ${
                      isActive || isDone ? 'text-[#F8F4E8]' : 'text-[#F8F4E8]/40'
                    }`}>
                      {node.label}
                    </div>
                    <div className={`font-mono text-[9px] tracking-wider ${
                      isActive ? 'text-[#D2E823]' : 'text-[#F8F4E8]/30'
                    }`}>
                      {node.sub}
                    </div>
                  </div>

                  {/* Status pill */}
                  <div className="shrink-0">
                    {isActive && (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-[#D2E823] text-[#09090B] rounded-full font-mono text-[9px] font-bold">
                        <motion.div
                          className="w-1 h-1 rounded-full bg-[#09090B]"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 0.9, repeat: Infinity }}
                        />
                        LIVE
                      </div>
                    )}
                    {isDone && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="px-2 py-0.5 bg-[#D2E823]/20 text-[#D2E823] rounded-full font-mono text-[9px] font-bold"
                      >
                        ✓ OK
                      </motion.div>
                    )}
                    {isPending && (
                      <div className="px-2 py-0.5 bg-transparent text-[#F8F4E8]/20 rounded-full font-mono text-[9px] font-bold border border-[#F8F4E8]/10">
                        IDLE
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────
   Main component
   ────────────────────────────────────────────────────────────────── */
export default function DetectorPage() {
  const { user, refreshUser } = useAuth()
  const [input, setInput] = useState('')
  const [inputMode, setInputMode] = useState('text')
  const [isScanning, setIsScanning] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [scanHistory, setScanHistory] = useState([])
  const [activePanel, setActivePanel] = useState('result')

  // Pipeline state
  const [activeStage, setActiveStage] = useState(null)
  const [completedStages, setCompletedStages] = useState([])

  // Image state
  const [imagePreview, setImagePreview] = useState(null)
  const [isOcrRunning, setIsOcrRunning] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const fileInputRef = useRef(null)

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return

    const dataUrl = URL.createObjectURL(file)
    setImagePreview(dataUrl)
    setIsOcrRunning(true)
    setOcrProgress(0)
    setInput('')

    try {
      const { text } = await extractTextFromImage(file, (p) => setOcrProgress(p))
      const cleaned = cleanOCRText(text)
      setInput(cleaned || '')
    } catch (err) {
      console.error('OCR failed:', err)
      setInput('')
    } finally {
      setIsOcrRunning(false)
    }
  }

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
    setOcrProgress(0)
    setInput('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleScan = useCallback(async (text) => {
    const cleanedText = (text || '').trim()
    if (!cleanedText) return

    if (user?.subscriptionPlan === 'free' && (user?.freeScansUsed || 0) >= 2) {
      setShowUpgradeModal(true)
      return
    }

    setIsScanning(true)
    setLastResult(null)
    setActiveStage('input')
    setCompletedStages([])

    // Drive visualizer through stages concurrently with the real pipeline
    const stageOrder = ['input', 'retrieval', 'classifier', 'sentiment', 'reasoning', 'scoring']
    let stageIdx = 0
    const stageTimer = setInterval(() => {
      setCompletedStages((prev) => [...prev, stageOrder[stageIdx]])
      stageIdx += 1
      if (stageIdx < stageOrder.length) {
        setActiveStage(stageOrder[stageIdx])
      } else {
        clearInterval(stageTimer)
      }
    }, 750)

    try {
      const raw = await analyzeNewsRaw(cleanedText)

      // Ensure the visualizer completes even if the pipeline returns quickly
      clearInterval(stageTimer)
      setCompletedStages([...stageOrder])
      setActiveStage('output')

      setTimeout(() => {
        setCompletedStages((prev) => [...prev, 'output'])
        setActiveStage(null)
      }, 400)

      setLastResult(raw)
      setScanHistory((prev) => [{
        id: Date.now(),
        snippet: cleanedText.substring(0, 100),
        text: cleanedText,
        score: raw.credibilityScore,
        risk: raw.riskLevel,
        verdict: raw.verdict,
        timestamp: new Date().toISOString(),
      }, ...prev].slice(0, 20))

      if (user && raw) {
        saveScanResult({
          content: cleanedText,
          inputType: inputMode,
          credibilityScore: raw.credibilityScore,
          riskLevel: raw.riskLevel,
          verdict: raw.verdict,
          flags: raw.flags,
        }).then(() => refreshUser()).catch(console.error)
      }
    } catch (err) {
      console.error('Scan failed:', err)
      clearInterval(stageTimer)
      setActiveStage(null)
    } finally {
      setIsScanning(false)
    }
  }, [user, refreshUser, inputMode])

  const handleSubmit = (e) => {
    e.preventDefault()
    handleScan(input)
  }

  const copyResult = () => {
    if (!lastResult) return
    navigator.clipboard.writeText(JSON.stringify(lastResult, null, 2))
  }

  const resetScan = () => {
    setLastResult(null)
    setCompletedStages([])
    setActiveStage(null)
    setInput('')
    clearImage()
  }

  /* ── Style helpers ── */
  const getRiskStyle = (risk) => {
    const r = (risk || '').toUpperCase()
    if (r === 'HIGH RISK') return { text: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500', bar: 'bg-red-500' }
    if (r === 'SUSPICIOUS') return { text: 'text-orange-600', bg: 'bg-orange-50', dot: 'bg-orange-500', bar: 'bg-orange-500' }
    if (r === 'MODERATE') return { text: 'text-yellow-600', bg: 'bg-yellow-50', dot: 'bg-yellow-500', bar: 'bg-yellow-500' }
    if (r === 'SAFE') return { text: 'text-green-600', bg: 'bg-green-50', dot: 'bg-green-500', bar: 'bg-green-500' }
    return { text: 'text-[#09090B]/60', bg: 'bg-[#F8F4E8]', dot: 'bg-[#09090B]/40', bar: 'bg-[#09090B]/40' }
  }

  const getScoreColor = (score) => {
    if (score >= 70) return '#16a34a'
    if (score >= 40) return '#ca8a04'
    return '#dc2626'
  }

  /* ── Stats ── */
  const avgScore = scanHistory.length > 0
    ? Math.round(scanHistory.reduce((a, b) => a + b.score, 0) / scanHistory.length)
    : 0
  const countByRisk = (risk) =>
    scanHistory.filter((h) => (h.risk || '').toUpperCase() === risk).length

  return (
    <>
      <div className="min-h-screen flex flex-col bg-[#F8F4E8] relative z-10">
        <Navbar />

        <main className="flex-1 container mx-auto px-4 md:px-8 py-6 max-w-[1400px]">
          {/* ── Hero header ── */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4"
          >
            <div>
              <p className="font-bold uppercase tracking-[0.2em] text-[#09090B]/50 mb-2 text-[10px] font-mono">
                // Veritas Engine · Multi-Model RAG Chain
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-display text-4xl md:text-5xl uppercase tracking-tighter text-[#09090B] leading-none">
                  DETECTOR
                </h1>
                <span className="bg-[#09090B] text-[#D2E823] px-2.5 py-1 border-2 border-[#09090B] font-display text-xl uppercase tracking-tighter hard-shadow-sm">
                  v2.0
                </span>
                <div className="flex items-center gap-2 px-3 py-1.5 border-2 border-[#09090B] rounded-full hard-shadow-sm bg-white">
                  <span className="relative flex w-2 h-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  <span className="font-bold text-[10px] uppercase tracking-widest font-mono">Neural Net Active</span>
                </div>
              </div>
              <p className="font-mono text-xs text-[#09090B]/50 mt-2">
                Paste any article, URL, or screenshot. Seven pipeline stages will reason about it and return evidence.
              </p>
            </div>

            {/* Model chips */}
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { label: '2× HF CLASSIFIERS', style: 'bg-[#09090B] text-[#D2E823]' },
                { label: 'HF SENTIMENT', style: 'bg-white' },
                { label: 'RAG KB', style: 'bg-[#D2E823]' },
                { label: 'NVIDIA LLAMA 3.1-70B', style: 'bg-white' },
              ].map((chip) => (
                <span
                  key={chip.label}
                  className={`font-mono text-[10px] px-2 py-1 border-2 border-[#09090B] rounded ${chip.style}`}
                >
                  {chip.label}
                </span>
              ))}
            </div>
          </motion.div>

          {/* ── Three-column layout ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* ── LEFT: Input panel ── */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-5 xl:col-span-4"
            >
              <div className="border-2 border-[#09090B] bg-white rounded-[24px] hard-shadow-lg overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D2E823] to-transparent" />

                {/* Mode tabs */}
                <div className="p-5 pb-0">
                  <div className="flex gap-1 bg-[#F8F4E8] border-2 border-[#09090B] rounded-xl p-1">
                    {[
                      { id: 'text', label: 'Text', icon: 'lucide:type' },
                      { id: 'url', label: 'URL', icon: 'lucide:link' },
                      { id: 'image', label: 'Image', icon: 'lucide:image' },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => {
                          setInputMode(mode.id)
                          if (mode.id !== 'image') clearImage()
                        }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all cursor-none ${
                          inputMode === mode.id
                            ? 'bg-[#09090B] text-[#D2E823] shadow-sm'
                            : 'text-[#09090B]/50 hover:text-[#09090B]'
                        }`}
                      >
                        <iconify-icon icon={mode.icon} class="text-sm" />
                        <span>{mode.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input area */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                  <AnimatePresence mode="wait">
                    {inputMode === 'text' && (
                      <motion.div
                        key="text"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <textarea
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder="Paste article text, a claim, or social media post..."
                          rows={8}
                          disabled={isScanning}
                          className="w-full p-4 bg-[#F8F4E8] border-2 border-[#09090B] rounded-xl text-sm placeholder:text-[#09090B]/30 outline-none focus:ring-2 focus:ring-[#D2E823] transition-all font-mono leading-relaxed resize-none"
                        />
                        <div className="flex justify-between items-center mt-2 font-mono text-[10px] text-[#09090B]/40">
                          <span>{input.length} chars · {input.trim().split(/\s+/).filter(Boolean).length} words</span>
                          {input && (
                            <button type="button" onClick={() => setInput('')} className="hover:text-[#09090B] cursor-none">
                              Clear
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {inputMode === 'url' && (
                      <motion.div
                        key="url"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <div className="relative">
                          <iconify-icon icon="lucide:link" class="absolute left-4 top-1/2 -translate-y-1/2 text-[#09090B]/40" />
                          <input
                            type="url"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="https://example.com/article"
                            disabled={isScanning}
                            className="w-full py-4 pl-11 pr-4 bg-[#F8F4E8] border-2 border-[#09090B] rounded-xl text-sm placeholder:text-[#09090B]/30 outline-none focus:ring-2 focus:ring-[#D2E823] transition-all font-mono"
                          />
                        </div>
                        <p className="font-mono text-[10px] text-[#09090B]/40 mt-2">
                          Orchestrator will fetch and extract article text before analysis.
                        </p>
                      </motion.div>
                    )}

                    {inputMode === 'image' && (
                      <motion.div
                        key="image"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-3"
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        {!imagePreview ? (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full border-2 border-dashed border-[#09090B] rounded-xl py-10 bg-[#F8F4E8] hover:bg-[#D2E823]/20 transition-colors flex flex-col items-center justify-center gap-2 cursor-none"
                          >
                            <iconify-icon icon="lucide:upload-cloud" class="text-3xl text-[#09090B]/60" />
                            <p className="font-mono text-xs font-bold text-[#09090B]">Drop screenshot</p>
                            <p className="font-mono text-[10px] text-[#09090B]/40">or click to browse</p>
                          </button>
                        ) : (
                          <div className="space-y-3">
                            <div className="relative rounded-xl overflow-hidden border-2 border-[#09090B]">
                              <img src={imagePreview} alt="preview" className="w-full max-h-56 object-cover" />
                              {isOcrRunning && (
                                <div className="absolute inset-0 bg-[#09090B]/80 flex flex-col items-center justify-center gap-3">
                                  <div className="w-10 h-10 border-2 border-[#D2E823]/30 border-t-[#D2E823] rounded-full animate-spin" />
                                  <p className="font-mono text-[10px] text-[#D2E823] font-bold tracking-widest">
                                    EXTRACTING · {ocrProgress}%
                                  </p>
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={clearImage}
                                className="absolute top-2 right-2 w-7 h-7 bg-white border-2 border-[#09090B] rounded-full flex items-center justify-center cursor-none hover:bg-red-500 hover:text-white"
                              >
                                <iconify-icon icon="lucide:x" class="text-xs" />
                              </button>
                            </div>
                            {input && !isOcrRunning && (
                              <div className="bg-[#F8F4E8] border-2 border-[#09090B] rounded-xl p-3">
                                <p className="font-mono text-[9px] text-[#09090B]/50 uppercase tracking-wider mb-1.5">
                                  Extracted text
                                </p>
                                <p className="font-mono text-xs text-[#09090B] leading-relaxed line-clamp-4">{input}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={!input.trim() || isScanning || isOcrRunning}
                    className="w-full py-3.5 bg-[#09090B] text-[#D2E823] font-bold uppercase tracking-widest text-xs rounded-xl border-2 border-[#09090B] hover:bg-[#D2E823] hover:text-[#09090B] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 btn-press cursor-none"
                  >
                    {isScanning ? (
                      <>
                        <iconify-icon icon="lucide:loader-2" class="animate-spin text-lg" />
                        RUNNING PIPELINE
                      </>
                    ) : (
                      <>
                        <iconify-icon icon="lucide:scan-search" class="text-lg" />
                        RUN DETECTION
                      </>
                    )}
                  </button>
                </form>

                {/* Sample presets */}
                {!lastResult && !isScanning && (
                  <div className="px-5 pb-5">
                    <p className="font-mono text-[10px] text-[#09090B]/50 uppercase tracking-widest mb-2.5">
                      Try a sample
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {SAMPLES.map((s) => (
                        <motion.button
                          key={s.label}
                          whileHover={{ y: -2 }}
                          whileTap={{ y: 0 }}
                          onClick={() => {
                            setInputMode('text')
                            clearImage()
                            handleScan(s.text)
                          }}
                          className="text-left p-3 border-2 border-[#09090B] bg-[#F8F4E8] rounded-xl hover:bg-[#D2E823]/30 transition-colors cursor-none"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <iconify-icon icon={s.icon} class="text-lg" />
                            <span className="font-mono text-[8px] bg-[#09090B] text-[#D2E823] px-1.5 py-0.5 rounded font-bold tracking-widest">
                              {s.tag}
                            </span>
                          </div>
                          <p className="font-bold text-xs text-[#09090B]">{s.label}</p>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* ── CENTER: Pipeline visualizer ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-3 xl:col-span-3"
            >
              <PipelineVisualizer activeStage={activeStage} completedStages={completedStages} />
            </motion.div>

            {/* ── RIGHT: Results dashboard ── */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-4 xl:col-span-5 flex flex-col gap-4"
            >
              {/* Tabs */}
              <div className="flex gap-1 bg-white border-2 border-[#09090B] rounded-xl p-1 hard-shadow-sm">
                {[
                  { id: 'result', icon: 'lucide:bar-chart-3', label: 'Analysis' },
                  { id: 'history', icon: 'lucide:clock', label: 'History' },
                  { id: 'stats', icon: 'lucide:activity', label: 'Stats' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActivePanel(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all cursor-none ${
                      activePanel === tab.id
                        ? 'bg-[#09090B] text-[#D2E823]'
                        : 'text-[#09090B]/40 hover:text-[#09090B]/70'
                    }`}
                  >
                    <iconify-icon icon={tab.icon} class="text-sm" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Panels */}
              <AnimatePresence mode="wait">
                {activePanel === 'result' && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="border-2 border-[#09090B] bg-white rounded-[24px] p-5 hard-shadow-md relative overflow-hidden"
                  >
                    <div className="absolute inset-0 dot-pattern opacity-20 pointer-events-none" />

                    <div className="relative z-10 space-y-4">
                      {/* Empty */}
                      {!lastResult && !isScanning && (
                        <div className="py-14 flex flex-col items-center text-center">
                          <div className="w-16 h-16 border-2 border-[#09090B]/20 rounded-full flex items-center justify-center mb-4 bg-[#F8F4E8]">
                            <iconify-icon icon="lucide:scan-search" class="text-2xl text-[#09090B]/30" />
                          </div>
                          <p className="font-mono text-xs text-[#09090B]/50">Submit content to see analysis</p>
                          <p className="font-mono text-[10px] text-[#09090B]/20 mt-1">
                            Results will appear here in real-time
                          </p>
                        </div>
                      )}

                      {/* Scanning */}
                      {isScanning && !lastResult && (
                        <div className="py-14 flex flex-col items-center text-center">
                          <div className="relative w-24 h-24 mb-6">
                            <div className="absolute inset-0 border-2 border-[#09090B]/10 rounded-full" />
                            <div
                              className="absolute inset-0 border-t-2 border-r-2 border-[#D2E823] rounded-full animate-spin"
                              style={{ animationDuration: '1.2s' }}
                            />
                            <div
                              className="absolute inset-2 border-l-2 border-b-2 border-[#09090B]/30 rounded-full animate-spin"
                              style={{ animationDuration: '2s', animationDirection: 'reverse' }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <iconify-icon icon="lucide:radar" class="text-3xl text-[#D2E823] animate-pulse" />
                            </div>
                          </div>
                          <p className="font-mono text-xs text-[#09090B] font-bold tracking-widest uppercase">
                            Processing
                          </p>
                          <p className="font-mono text-[10px] text-[#09090B]/40 mt-1">
                            Watch the pipeline for live stage status
                          </p>
                        </div>
                      )}

                      {/* Result */}
                      {lastResult && (
                        <>
                          {/* Score ring + risk */}
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center gap-4 p-4 bg-[#F8F4E8] border-2 border-[#09090B] rounded-xl"
                          >
                            <div className="relative w-24 h-24 shrink-0">
                              <svg className="w-full h-full transform -rotate-90">
                                <circle cx="48" cy="48" r={gaugeRadius} stroke="#09090B10" strokeWidth="6" fill="none" />
                                <motion.circle
                                  cx="48" cy="48" r={gaugeRadius}
                                  stroke={getScoreColor(lastResult.credibilityScore)}
                                  strokeWidth="6"
                                  fill="none"
                                  strokeLinecap="round"
                                  initial={{ strokeDashoffset: gaugeCircumference }}
                                  animate={{
                                    strokeDashoffset:
                                      gaugeCircumference - (lastResult.credibilityScore / 100) * gaugeCircumference,
                                  }}
                                  transition={{ duration: 1.2, ease: 'easeOut' }}
                                  strokeDasharray={gaugeCircumference}
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="font-display text-2xl leading-none text-[#09090B]">
                                  <Counter value={lastResult.credibilityScore} />
                                </span>
                                <span className="text-[8px] font-mono text-[#09090B]/50 uppercase tracking-wider mt-0.5">
                                  Credibility
                                </span>
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border-2 border-[#09090B] text-[10px] font-bold uppercase tracking-wider font-mono mb-2 ${
                                  getRiskStyle(lastResult.riskLevel).bg
                                } ${getRiskStyle(lastResult.riskLevel).text}`}
                              >
                                <div className={`w-1.5 h-1.5 rounded-full ${getRiskStyle(lastResult.riskLevel).dot}`} />
                                {lastResult.riskLevel}
                              </div>
                              <p className="text-base font-bold leading-tight text-[#09090B] uppercase">
                                {lastResult.verdict}
                              </p>
                              {lastResult.reasoningModel && (
                                <p className="font-mono text-[9px] text-[#09090B]/40 mt-1.5 tracking-wider">
                                  via {lastResult.reasoningModel}
                                </p>
                              )}
                            </div>
                          </motion.div>

                          {/* Metrics row */}
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              {
                                label: 'Fake',
                                value: `${lastResult.fakeProbability}%`,
                                color:
                                  lastResult.fakeProbability >= 70
                                    ? 'text-red-600'
                                    : lastResult.fakeProbability >= 40
                                      ? 'text-yellow-600'
                                      : 'text-green-600',
                              },
                              {
                                label: 'Manip',
                                value: lastResult.manipulationLevel,
                                color:
                                  (lastResult.manipulationLevel || '').toLowerCase() === 'high'
                                    ? 'text-red-600'
                                    : 'text-[#09090B]',
                              },
                              {
                                label: 'Emotion',
                                value: `${lastResult.emotionalIntensity}%`,
                                color: 'text-[#09090B]',
                              },
                            ].map((m, i) => (
                              <motion.div
                                key={m.label}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 + i * 0.06 }}
                                className="bg-[#F8F4E8] border-2 border-[#09090B] rounded-xl p-2.5 text-center"
                              >
                                <p className="font-mono text-[8px] text-[#09090B]/50 uppercase tracking-wider">
                                  {m.label}
                                </p>
                                <p className={`text-sm font-bold mt-1 ${m.color}`}>{m.value}</p>
                              </motion.div>
                            ))}
                          </div>

                          {/* Layer breakdown */}
                          {lastResult.layerBreakdown && Object.keys(lastResult.layerBreakdown).length > 0 && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.3 }}
                              className="bg-[#F8F4E8] border-2 border-[#09090B] rounded-xl p-4"
                            >
                              <p className="font-mono text-[9px] text-[#09090B]/50 uppercase tracking-wider mb-3">
                                Layer Breakdown
                              </p>
                              <div className="space-y-2.5">
                                {Object.entries(lastResult.layerBreakdown).map(([key, val], i) => (
                                  <div key={key} className="flex items-center gap-3">
                                    <span className="font-mono text-[10px] text-[#09090B]/70 uppercase w-20 shrink-0 font-bold">
                                      {key}
                                    </span>
                                    <div className="flex-1 h-2 bg-[#09090B]/10 rounded-full overflow-hidden">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${val.score || 0}%` }}
                                        transition={{ duration: 0.8, delay: 0.4 + i * 0.1, ease: 'easeOut' }}
                                        className={`h-full rounded-full ${
                                          val.score >= 70
                                            ? 'bg-green-500'
                                            : val.score >= 40
                                              ? 'bg-yellow-500'
                                              : 'bg-red-500'
                                        }`}
                                      />
                                    </div>
                                    <span className="font-mono text-[10px] text-[#09090B] w-10 text-right font-bold">
                                      {val.score || 0}%
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}

                          {/* RAG retrieved topics */}
                          {lastResult.retrievedTopics?.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.35 }}
                              className="bg-[#D2E823]/20 border-2 border-[#09090B] rounded-xl p-4"
                            >
                              <p className="font-mono text-[9px] text-[#09090B]/70 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <iconify-icon icon="lucide:database" class="text-xs" />
                                RAG Retrieved Context
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {lastResult.retrievedTopics.map((t, i) => (
                                  <span
                                    key={i}
                                    className="text-[10px] font-mono px-2 py-0.5 bg-white border-2 border-[#09090B] rounded-full font-bold"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </motion.div>
                          )}

                          {/* Explanation */}
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="bg-[#F8F4E8] border-2 border-[#09090B] rounded-xl p-4"
                          >
                            <p className="font-mono text-[9px] text-[#09090B]/70 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <iconify-icon icon="lucide:bot" class="text-xs" /> AI Explanation
                            </p>
                            <p className="text-xs leading-relaxed text-[#09090B]/90">
                              {lastResult.explanation}
                            </p>
                          </motion.div>

                          {/* Flags */}
                          {lastResult.flags?.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.45 }}
                              className="bg-[#F8F4E8] border-2 border-[#09090B] rounded-xl p-4"
                            >
                              <p className="font-mono text-[9px] text-[#09090B]/50 uppercase tracking-wider mb-2">
                                Detected Flags
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {lastResult.flags.map((f, i) => (
                                  <motion.span
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.5 + i * 0.04 }}
                                    className="text-[10px] font-mono px-2 py-1 border border-red-200 bg-red-50 text-red-600 rounded-full font-bold"
                                  >
                                    {f}
                                  </motion.span>
                                ))}
                              </div>
                            </motion.div>
                          )}

                          {/* Source signals */}
                          {lastResult.sourceSignals?.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.5 }}
                              className="bg-[#F8F4E8] border-2 border-[#09090B] rounded-xl p-4"
                            >
                              <p className="font-mono text-[9px] text-[#09090B]/50 uppercase tracking-wider mb-2">
                                Source Signals
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {lastResult.sourceSignals.map((s, i) => (
                                  <span
                                    key={i}
                                    className={`text-[10px] font-mono px-2 py-1 rounded font-bold ${
                                      s.startsWith('✓')
                                        ? 'text-green-600 bg-green-50 border border-green-200'
                                        : 'text-red-600 bg-red-50 border border-red-200'
                                    }`}
                                  >
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </motion.div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={copyResult}
                              className="flex-1 py-2.5 bg-[#09090B] text-[#D2E823] border-2 border-[#09090B] rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider hover:bg-[#D2E823] hover:text-[#09090B] transition-colors flex items-center justify-center gap-1.5 btn-press cursor-none"
                            >
                              <iconify-icon icon="lucide:clipboard" class="text-xs" />
                              Copy JSON
                            </button>
                            <button
                              onClick={resetScan}
                              className="flex-1 py-2.5 bg-white text-[#09090B] border-2 border-[#09090B] rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider hover:bg-[#D2E823] transition-colors flex items-center justify-center gap-1.5 cursor-none"
                            >
                              <iconify-icon icon="lucide:rotate-ccw" class="text-xs" />
                              New Scan
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* History */}
                {activePanel === 'history' && (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="border-2 border-[#09090B] bg-white rounded-[24px] p-5 hard-shadow-md max-h-[640px] overflow-y-auto"
                  >
                    {scanHistory.length === 0 ? (
                      <div className="py-14 flex flex-col items-center text-center">
                        <iconify-icon icon="lucide:clock" class="text-3xl text-[#09090B]/20 mb-3" />
                        <p className="font-mono text-xs text-[#09090B]/50">No scans yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="font-mono text-[9px] text-[#09090B]/50 uppercase tracking-wider mb-3">
                          Recent Scans ({scanHistory.length})
                        </p>
                        {scanHistory.map((item, i) => (
                          <motion.button
                            key={item.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            onClick={() => handleScan(item.text || item.snippet)}
                            className="w-full text-left bg-[#F8F4E8] border-2 border-[#09090B] rounded-xl p-3 hover:bg-[#D2E823]/20 transition-colors cursor-none"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-mono text-[10px] text-[#09090B]/70 truncate flex-1">
                                {item.snippet}
                              </span>
                              <span
                                className={`text-[10px] font-bold font-mono ml-2 ${
                                  item.score >= 70
                                    ? 'text-green-600'
                                    : item.score >= 40
                                      ? 'text-yellow-600'
                                      : 'text-red-600'
                                }`}
                              >
                                {item.score}%
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[9px] font-mono px-1.5 py-0.5 rounded border border-[#09090B] font-bold ${
                                  getRiskStyle(item.risk).bg
                                } ${getRiskStyle(item.risk).text}`}
                              >
                                {item.risk}
                              </span>
                              <span className="font-mono text-[8px] text-[#09090B]/30">
                                {new Date(item.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Stats */}
                {activePanel === 'stats' && (
                  <motion.div
                    key="stats"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="border-2 border-[#09090B] bg-white rounded-[24px] p-5 hard-shadow-md"
                  >
                    {scanHistory.length === 0 ? (
                      <div className="py-14 flex flex-col items-center text-center">
                        <iconify-icon icon="lucide:activity" class="text-3xl text-[#09090B]/20 mb-3" />
                        <p className="font-mono text-xs text-[#09090B]/50">Run scans to see stats</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="font-mono text-[9px] text-[#09090B]/50 uppercase tracking-wider">
                          Session Statistics
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                          <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className="bg-[#F8F4E8] border-2 border-[#09090B] rounded-xl p-4 text-center"
                          >
                            <p className="font-display text-3xl text-[#09090B]">
                              <Counter value={scanHistory.length} />
                            </p>
                            <p className="font-mono text-[9px] text-[#09090B]/50 uppercase tracking-wider mt-1">
                              Total Scans
                            </p>
                          </motion.div>
                          <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.1 }}
                            className="bg-[#09090B] text-[#D2E823] border-2 border-[#09090B] rounded-xl p-4 text-center"
                          >
                            <p className="font-display text-3xl text-[#D2E823]">
                              <Counter value={avgScore} />
                            </p>
                            <p className="font-mono text-[9px] text-[#D2E823]/60 uppercase tracking-wider mt-1">
                              Avg Credibility
                            </p>
                          </motion.div>
                        </div>

                        <div className="bg-[#F8F4E8] border-2 border-[#09090B] rounded-xl p-4">
                          <p className="font-mono text-[9px] text-[#09090B]/50 uppercase tracking-wider mb-3">
                            Risk Distribution
                          </p>
                          <div className="space-y-2">
                            {['SAFE', 'MODERATE', 'SUSPICIOUS', 'HIGH RISK'].map((risk, i) => {
                              const count = countByRisk(risk)
                              const pct =
                                scanHistory.length > 0 ? Math.round((count / scanHistory.length) * 100) : 0
                              const style = getRiskStyle(risk)
                              return (
                                <div key={risk} className="flex items-center gap-3">
                                  <span className={`font-mono text-[10px] w-24 shrink-0 font-bold ${style.text}`}>
                                    {risk}
                                  </span>
                                  <div className="flex-1 h-2 bg-[#09090B]/10 rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${pct}%` }}
                                      transition={{ duration: 0.7, delay: 0.2 + i * 0.1 }}
                                      className={`h-full rounded-full ${style.bar}`}
                                    />
                                  </div>
                                  <span className="font-mono text-[10px] text-[#09090B]/60 w-8 text-right">
                                    {count}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )}
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
