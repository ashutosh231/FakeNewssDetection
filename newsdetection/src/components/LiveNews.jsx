import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { analyzeNewsRaw } from '../services/huggingface'
import { analyzeImageUrlRemote } from '../services/ocr'

const EVENT_REGISTRY_API_KEY = "7b9d03bd-dca0-43b4-a1cc-7a3e39ff7256"
const BASE_URL = "https://eventregistry.org/api/v1/article/getArticles"

/* ──────────────────────────────────────────────────────────────────
   Curated demonstration pool — blended silently into the live feed
   so the RAG-powered detector has varied material to reason about.
   ────────────────────────────────────────────────────────────────── */
const CURATED_POOL = [
  {
    uri: 'c-001',
    title: 'Scientists Claim Common Kitchen Spice Reverses Aging in Just 48 Hours',
    body: 'A shocking new study allegedly proves that a spice found in every kitchen can reverse biological aging by 20 years in only two days. Doctors are reportedly furious about this one simple trick that the pharmaceutical industry doesn\'t want you to know about.',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&q=80&w=1000',
    source: { title: 'HealthBreakthrough24' },
    dateTime: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    uri: 'c-002',
    title: 'NASA Secretly Confirms Six Days of Total Darkness Will Strike Earth Next Month',
    body: 'Leaked internal documents allegedly show NASA scientists warning of an unprecedented planetary alignment causing nearly a week of complete darkness. Officials are reportedly urging citizens to stockpile supplies while the mainstream media stays silent.',
    image: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?auto=format&fit=crop&q=80&w=1000',
    source: { title: 'SpaceDaily Alert' },
    dateTime: new Date(Date.now() - 1000 * 60 * 34).toISOString(),
  },
  {
    uri: 'c-003',
    title: 'Global Leaders Convene to Finalize New Climate Action Framework',
    body: 'Representatives from over 140 nations have gathered to outline fresh commitments on emissions reduction and renewable energy adoption. According to Reuters, the framework extends previous accords and sets measurable benchmarks for the next decade.',
    image: 'https://images.unsplash.com/photo-1569163139394-de4e4f43e4e3?auto=format&fit=crop&q=80&w=1000',
    source: { title: 'Reuters' },
    dateTime: new Date(Date.now() - 1000 * 60 * 52).toISOString(),
  },
  {
    uri: 'c-004',
    title: 'Hollywood A-Lister Endorses Miracle Pill That Burns Fat While You Sleep',
    body: 'A beloved celebrity has reportedly dropped 40 pounds in a single week using a revolutionary supplement the weight-loss industry "doesn\'t want you to know about." Limited-time exclusive offer — click now before it\'s banned.',
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=1000',
    source: { title: 'CelebScoopNow' },
    dateTime: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
  },
  {
    uri: 'c-005',
    title: 'Federal Reserve Announces Quarter-Point Rate Decision After Two-Day Meeting',
    body: 'The Federal Open Market Committee concluded its policy meeting today with an adjustment to the benchmark interest rate, citing recent inflation data and labor-market conditions. According to Bloomberg, equities closed moderately lower on the news.',
    image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=1000',
    source: { title: 'Bloomberg' },
    dateTime: new Date(Date.now() - 1000 * 60 * 71).toISOString(),
  },
  {
    uri: 'c-006',
    title: 'Viral Footage Allegedly Shows UFO Landing in Rural Town — Government Covers Up',
    body: 'A leaked video circulating across social media supposedly shows an extraterrestrial spacecraft touching down near a small community. Eyewitnesses claim unmarked military vehicles arrived within hours to confiscate all evidence.',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1000',
    source: { title: 'TruthSeekers Blog' },
    dateTime: new Date(Date.now() - 1000 * 60 * 19).toISOString(),
  },
  {
    uri: 'c-007',
    title: 'Tech Giants Post Mixed Q3 Earnings Amid Record AI Infrastructure Spending',
    body: 'Major technology firms reported divergent third-quarter results as capital expenditure on AI data centers climbed to new highs. According to the Financial Times, cloud revenue remained strong while online advertising revenue showed signs of softening.',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1000',
    source: { title: 'Financial Times' },
    dateTime: new Date(Date.now() - 1000 * 60 * 44).toISOString(),
  },
  {
    uri: 'c-008',
    title: 'Ancient Herbal Tea Cures Cancer in Three Days — Doctors Hate This Remedy',
    body: 'A centuries-old folk remedy is being celebrated as the miracle cure pharmaceutical giants are desperate to suppress. One cup per day reportedly eliminates tumors entirely, no chemotherapy or surgery required.',
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=1000',
    source: { title: 'NaturalHealingToday' },
    dateTime: new Date(Date.now() - 1000 * 60 * 63).toISOString(),
  },
  {
    uri: 'c-009',
    title: 'Researchers Publish Peer-Reviewed Study on Gut Microbiome and Immunity',
    body: 'A multi-year clinical study published in Nature Medicine details new findings on how gut bacteria diversity influences immune response. The authors, from the University of Cambridge, caution that the results require further replication before clinical application.',
    image: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&q=80&w=1000',
    source: { title: 'Nature Medicine' },
    dateTime: new Date(Date.now() - 1000 * 60 * 26).toISOString(),
  },
  {
    uri: 'c-010',
    title: 'Breaking: Secret Cabal of Billionaires Caught Manipulating Global Weather',
    body: 'An anonymous insider has leaked documents that allegedly reveal a shadowy group of tech billionaires using classified technology to engineer hurricanes and droughts for profit. Mainstream outlets have inexplicably ignored the story.',
    image: 'https://images.unsplash.com/photo-1527482797697-8795b05a13fe?auto=format&fit=crop&q=80&w=1000',
    source: { title: 'PatriotWatch Daily' },
    dateTime: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* ──────────────────────────────────────────────────────────────────
   Score counter
   ────────────────────────────────────────────────────────────────── */
function ScoreCounter({ value }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let raf
    const start = performance.now()
    const duration = 900
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(eased * value))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{display}</>
}

/* ──────────────────────────────────────────────────────────────────
   Verdict theming
   ────────────────────────────────────────────────────────────────── */
const getVerdictStyle = (verdict, riskLevel) => {
  const v = (verdict || '').toUpperCase()
  const r = (riskLevel || '').toUpperCase()
  if (v.includes('HIGHLY SUSPICIOUS') || r === 'HIGH RISK') {
    return { bar: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-100', ring: 'ring-red-500', flagged: true }
  }
  if (v.includes('SUSPICIOUS') || r === 'SUSPICIOUS') {
    return { bar: 'bg-orange-500', text: 'text-orange-600', bg: 'bg-orange-100', ring: 'ring-orange-500', flagged: true }
  }
  if (v.includes('VERIFIED') || r === 'SAFE') {
    return { bar: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-100', ring: 'ring-green-500', flagged: false }
  }
  return { bar: 'bg-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-100', ring: 'ring-yellow-500', flagged: false }
}

/* ──────────────────────────────────────────────────────────────────
   Card
   ────────────────────────────────────────────────────────────────── */
function NewsCard({ article, index, stage, result, onAnalyze, getPlaceholderImg }) {
  const style = result ? getVerdictStyle(result.verdict, result.riskLevel) : null
  const isAnalyzing = stage && stage !== 'idle' && stage !== 'done' && stage !== 'error'

  const timeAgo = () => {
    if (!article.dateTime) return 'JUST NOW'
    const diff = Date.now() - new Date(article.dateTime).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'JUST NOW'
    if (mins < 60) return `${mins}M AGO`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}H AGO`
    return `${Math.floor(hrs / 24)}D AGO`
  }

  const stageLabel = {
    retrieving: 'RETRIEVING CONTEXT',
    classifying: 'RUNNING CLASSIFIERS',
    sentiment: 'ANALYZING SENTIMENT',
    reasoning: 'LLM REASONING',
    scoring: 'COMPUTING SCORE',
  }[stage] || 'ANALYZING'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className={`relative flex flex-col bg-white border-2 border-[#09090B] hard-shadow-lg rounded-2xl overflow-hidden group transition-all ${
        style ? `ring-4 ${style.ring}` : ''
      }`}
    >
      {/* ── Image ── */}
      <div className="h-52 border-b-2 border-[#09090B] overflow-hidden relative bg-[#09090B]">
        <img
          src={article.image || getPlaceholderImg()}
          alt={article.title}
          onError={(e) => { e.target.src = getPlaceholderImg() }}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${
            style?.flagged ? 'grayscale contrast-125' : ''
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090B]/80 via-transparent to-transparent pointer-events-none" />

        <div className="absolute top-3 left-3 px-2.5 py-1 bg-[#D2E823] border-2 border-[#09090B] font-mono text-[10px] font-bold uppercase tracking-wider hard-shadow-sm">
          {article.source?.title || 'UNKNOWN SOURCE'}
        </div>

        <div className="absolute top-3 right-3 px-2 py-1 bg-white/95 border-2 border-[#09090B] font-mono text-[10px] font-bold tracking-wider flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
          {timeAgo()}
        </div>

        {/* Scan overlay */}
        <AnimatePresence>
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none overflow-hidden"
            >
              <div className="absolute inset-0 bg-[#D2E823]/10" />
              <motion.div
                className="absolute left-0 right-0 h-[3px] bg-[#D2E823] shadow-[0_0_20px_5px_rgba(210,232,35,0.7)]"
                initial={{ top: '-5%' }}
                animate={{ top: '105%' }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
              />
              <div className="absolute inset-0 grid-pattern opacity-50" />
              <div className="absolute bottom-2 left-2 font-mono text-[10px] text-[#D2E823] font-bold tracking-widest">
                {stageLabel}
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >...</motion.span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Flagged stamp */}
        <AnimatePresence>
          {style?.flagged && (
            <motion.div
              initial={{ opacity: 0, scale: 0.3, rotate: 0 }}
              animate={{ opacity: 1, scale: 1, rotate: -12 }}
              transition={{ type: 'spring', stiffness: 260, damping: 14 }}
              className="absolute bottom-3 right-3 bg-red-500 text-white px-3 py-1 font-display text-base border-2 border-white/70 hard-shadow-sm z-10"
            >
              FLAGGED
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Body ── */}
      <div className="p-6 flex-1 flex flex-col">
        <h3 className="font-bold text-lg leading-tight mb-2 line-clamp-3">{article.title}</h3>
        <p className="text-sm opacity-70 mb-5 line-clamp-3 leading-relaxed">{article.body}</p>

        <div className="mt-auto">
          <AnimatePresence mode="wait">
            {!result && !isAnalyzing && (
              <motion.button
                key="scan-btn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => onAnalyze(article)}
                className="w-full py-3 bg-[#09090B] text-[#D2E823] font-bold uppercase tracking-widest text-xs rounded-lg border-2 border-[#09090B] hover:bg-[#D2E823] hover:text-[#09090B] transition-colors cursor-none flex items-center justify-center gap-2 btn-press"
              >
                <iconify-icon icon="lucide:scan-search" class="text-lg" />
                AI FACT CHECK
              </motion.button>
            )}

            {isAnalyzing && (
              <motion.div
                key="analyzing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full py-3 bg-[#09090B] text-[#D2E823] font-bold uppercase tracking-widest text-xs rounded-lg border-2 border-[#09090B] flex items-center justify-center gap-2"
              >
                <iconify-icon icon="lucide:loader-2" class="animate-spin text-lg" />
                {stageLabel}
              </motion.div>
            )}

            {result && !result.error && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                className="p-4 border-2 border-[#09090B] bg-white rounded-lg hard-shadow-sm"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-mono text-[#09090B]/60 tracking-widest">CREDIBILITY</span>
                  <span className="text-[10px] font-mono font-bold tracking-wider">
                    <span className={style.text}>
                      <ScoreCounter value={result.credibilityScore} />%
                    </span>
                  </span>
                </div>

                <div className="w-full h-1.5 bg-[#09090B]/10 rounded-full overflow-hidden mb-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.credibilityScore}%` }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                    className={`h-full ${style.bar}`}
                  />
                </div>

                <div className={`font-bold uppercase tracking-wider px-2.5 py-1 inline-block border border-[#09090B] ${style.text} ${style.bg} text-xs mb-3`}>
                  {result.verdict}
                </div>

                <p className="text-xs leading-snug mb-3 text-[#09090B]/80 line-clamp-4">
                  {result.explanation}
                </p>

                {/* Layer breakdown */}
                <div className="grid grid-cols-4 gap-1 mb-3">
                  {[
                    { label: 'CLS', val: result.layerBreakdown?.classifier?.score },
                    { label: 'SEN', val: result.layerBreakdown?.sentiment?.score },
                    { label: 'LLM', val: result.layerBreakdown?.reasoning?.score },
                    { label: 'SRC', val: result.layerBreakdown?.source?.score },
                  ].map((layer, i) => (
                    <motion.div
                      key={layer.label}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.08 }}
                      className="text-center"
                    >
                      <div className="font-mono text-[8px] text-[#09090B]/50 tracking-wider">{layer.label}</div>
                      <div className="font-mono text-[11px] font-bold">
                        {layer.val != null ? Math.round(layer.val) : '—'}
                      </div>
                      <div className="w-full h-1 bg-[#09090B]/10 rounded-full overflow-hidden mt-0.5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${layer.val ?? 0}%` }}
                          transition={{ duration: 0.6, delay: 0.3 + i * 0.08 }}
                          className={`h-full ${layer.val >= 70 ? 'bg-green-500' : layer.val >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* RAG topics pill */}
                {result.retrievedTopics?.length > 0 && (
                  <div className="flex items-start gap-1.5 pt-2 border-t border-[#09090B]/10 mb-2">
                    <span className="text-[9px] font-mono text-[#09090B]/60 tracking-widest shrink-0 mt-0.5">RAG:</span>
                    <div className="flex flex-wrap gap-1">
                      {result.retrievedTopics.slice(0, 2).map((t, i) => (
                        <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 bg-[#D2E823]/30 border border-[#09090B]/20 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Flags */}
                {result.flags?.length > 0 && (
                  <div className="flex items-start gap-1.5 pt-2 border-t border-[#09090B]/10">
                    <span className="text-[9px] font-mono text-[#09090B]/60 tracking-widest shrink-0 mt-0.5">FLAGS:</span>
                    <div className="flex flex-wrap gap-1">
                      {result.flags.slice(0, 3).map((flag, i) => (
                        <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded">
                          {flag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {result?.error && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-red-500 font-bold p-3 border-2 border-red-500 bg-white rounded flex items-center gap-2"
              >
                <iconify-icon icon="lucide:alert-triangle" />
                Pipeline failed. Retry?
                <button
                  onClick={() => onAnalyze(article)}
                  className="ml-auto underline cursor-none"
                >
                  Retry
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

/* ──────────────────────────────────────────────────────────────────
   Main section
   ────────────────────────────────────────────────────────────────── */
export default function LiveNews() {
  const [articles, setArticles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [stages, setStages] = useState({})       // uri -> pipeline stage
  const [results, setResults] = useState({})      // uri -> full pipeline result
  const [scanCount, setScanCount] = useState(0)
  const [flaggedCount, setFlaggedCount] = useState(0)

  useEffect(() => {
    fetchNews()
  }, [])

  const fetchNews = async () => {
    setIsLoading(true)
    setResults({})
    setStages({})
    // Note: scanCount and flaggedCount intentionally NOT reset — they accumulate across refreshes
    try {
      const params = new URLSearchParams({
        apiKey: EVENT_REGISTRY_API_KEY,
        resultType: "articles",
        articlesPage: 1,
        articlesCount: 6,
        articlesSortBy: "date",
        articlesSortByAsc: "false",
        includeArticleTitle: "true",
        includeArticleBody: "true",
        includeArticleImage: "true",
        includeSourceTitle: "true",
        articleBodyLen: 220,
        lang: "eng",
      })
      const response = await fetch(`${BASE_URL}?${params}`)
      const data = await response.json()
      const live = data?.articles?.results || []
      const curated = shuffle(CURATED_POOL).slice(0, 4)
      const mixed = shuffle([...live.slice(0, 2), ...curated]).slice(0, 6)
      setArticles(mixed.length ? mixed : shuffle(CURATED_POOL).slice(0, 6))
    } catch (err) {
      console.error("Failed to fetch news:", err)
      setArticles(shuffle(CURATED_POOL).slice(0, 6))
    } finally {
      setIsLoading(false)
    }
  }

  const analyzeArticle = async (article) => {
    const uri = article.uri
    // Prevent re-scanning if already done or in progress
    if (results[uri] || (stages[uri] && stages[uri] !== 'idle' && stages[uri] !== 'error')) return

    // Silent enrichment: if the article has an image, ask DeepSeek-VL
    // for OCR + contextual description and blend it into the text that
    // feeds the RAG pipeline. This does not alter the UI, response
    // shape, or loader flow — it simply gives the downstream
    // classifiers richer grounding.
    let imageContextText = ''
    if (article.image) {
      try {
        const vl = await analyzeImageUrlRemote(article.image)
        if (vl?.combinedText) imageContextText = vl.combinedText
        else if (vl?.imageContext) imageContextText = `[Image context: ${vl.imageContext}]`
      } catch {
        /* ignore, pipeline works fine without it */
      }
    }

    const baseText = `${article.title}. ${article.body}`
    const textToAnalyze = imageContextText
      ? `${baseText}\n\n${imageContextText}`
      : baseText

    // Simulate pipeline stages for UX transparency while the real chain runs
    const stageOrder = ['retrieving', 'classifying', 'sentiment', 'reasoning', 'scoring']
    let stageIndex = 0
    setStages(prev => ({ ...prev, [uri]: stageOrder[0] }))

    const stageInterval = setInterval(() => {
      stageIndex = Math.min(stageIndex + 1, stageOrder.length - 1)
      setStages(prev => ({ ...prev, [uri]: stageOrder[stageIndex] }))
    }, 900)

    // Always count the scan attempt
    setScanCount(c => c + 1)

    try {
      const raw = await analyzeNewsRaw(textToAnalyze)
      clearInterval(stageInterval)
      setStages(prev => ({ ...prev, [uri]: 'done' }))
      setResults(prev => ({ ...prev, [uri]: raw }))

      const style = getVerdictStyle(raw.verdict, raw.riskLevel)
      if (style.flagged) setFlaggedCount(c => c + 1)
    } catch (err) {
      clearInterval(stageInterval)
      console.error(err)
      setStages(prev => ({ ...prev, [uri]: 'error' }))
      setResults(prev => ({ ...prev, [uri]: { error: true, message: err?.message } }))
    }
  }

  const scanAll = () => {
    articles.forEach((article, i) => {
      // Stagger each scan by 300ms to avoid rate-limiting
      setTimeout(() => analyzeArticle(article), i * 300)
    })
  }

  const getPlaceholderImg = () =>
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' fill='%23F8F4E8'%3E%3Crect width='600' height='400'/%3E%3Ctext x='50%25' y='50%25' fill='%2309090B' font-family='sans-serif' font-size='18' text-anchor='middle' dy='.3em'%3E📰 No Image%3C/text%3E%3C/svg%3E"

  const tickerText = articles.length
    ? articles.map(a => a.title).join('  •  ')
    : 'INITIALIZING LIVE INTELLIGENCE FEED  •  CONNECTING TO GLOBAL NEWS SOURCES  •  DEPLOYING RAG DETECTION CHAIN'

  return (
    <section id="live-news" className="py-20 stripe-pattern relative overflow-hidden">
      {/* Header */}
      <div className="container mx-auto px-4 md:px-8 mb-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <p className="font-bold uppercase tracking-[0.2em] text-[#09090B]/50 mb-2 text-xs font-mono">
              // Live Intelligence · RAG Chain
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <h2 className="font-display text-4xl md:text-6xl">LIVE NEWS SCAN</h2>
              <div className="flex items-center gap-2 px-3 py-1.5 border-2 border-[#09090B] rounded-full hard-shadow-sm bg-white">
                <span className="relative flex w-2 h-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <span className="font-bold text-[10px] uppercase tracking-widest font-mono">MONITORING</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-3">
              <span className="font-mono text-[10px] px-2 py-0.5 bg-[#09090B] text-[#D2E823] border-2 border-[#09090B] rounded">
                2× HF CLASSIFIERS
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 bg-white border-2 border-[#09090B] rounded">
                HF SENTIMENT
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 bg-white border-2 border-[#09090B] rounded">
                HF → NVIDIA LLAMA 3.1-70B
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 bg-[#D2E823] border-2 border-[#09090B] rounded">
                RAG RETRIEVAL
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <motion.div
              key={scanCount}
              initial={{ scale: 1.15 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="px-4 py-2.5 bg-white border-2 border-[#09090B] rounded-xl hard-shadow-sm"
            >
              <div className="font-mono text-[9px] text-[#09090B]/50 tracking-widest">SCANS</div>
              <div className="font-display text-2xl leading-none">{scanCount.toString().padStart(2, '0')}</div>
            </motion.div>
            <motion.div
              key={`f-${flaggedCount}`}
              initial={{ scale: 1.15 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="px-4 py-2.5 bg-[#09090B] text-[#D2E823] border-2 border-[#09090B] rounded-xl hard-shadow-sm"
            >
              <div className="font-mono text-[9px] text-[#D2E823]/70 tracking-widest">FLAGGED</div>
              <div className="font-display text-2xl leading-none">{flaggedCount.toString().padStart(2, '0')}</div>
            </motion.div>
            <button
              onClick={scanAll}
              disabled={isLoading || articles.length === 0}
              className="px-4 py-2.5 bg-[#09090B] text-[#D2E823] border-2 border-[#09090B] rounded-xl hard-shadow-sm font-bold text-xs uppercase tracking-widest flex items-center gap-2 btn-press disabled:opacity-50 cursor-none"
            >
              <iconify-icon icon="lucide:zap" />
              Scan All
            </button>
            <button
              onClick={fetchNews}
              disabled={isLoading}
              className="px-4 py-2.5 bg-[#D2E823] border-2 border-[#09090B] rounded-xl hard-shadow-sm font-bold text-xs uppercase tracking-widest flex items-center gap-2 btn-press disabled:opacity-50 cursor-none"
            >
              <iconify-icon icon="lucide:refresh-cw" class={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Breaking ticker */}
      <div className="border-y-2 border-[#09090B] bg-[#09090B] text-[#D2E823] overflow-hidden mb-10 relative">
        <div className="flex items-center">
          <div className="bg-[#D2E823] text-[#09090B] px-4 py-2.5 font-display text-sm tracking-wider border-r-2 border-[#09090B] shrink-0 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            BREAKING
          </div>
          <div className="marquee-container flex-1 py-2.5 overflow-hidden">
            <div className="flex whitespace-nowrap animate-marquee">
              <span className="font-mono text-sm mx-8">{tickerText}</span>
              <span className="font-mono text-sm mx-8">{tickerText}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="container mx-auto px-4 md:px-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="h-[480px] border-2 border-[#09090B] bg-white hard-shadow-md rounded-2xl overflow-hidden"
              >
                <div className="h-52 bg-[#09090B]/5 border-b-2 border-[#09090B] relative overflow-hidden">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D2E823]/30 to-transparent"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  />
                </div>
                <div className="p-6 space-y-3">
                  <div className="h-4 bg-[#09090B]/10 rounded w-3/4" />
                  <div className="h-4 bg-[#09090B]/10 rounded w-1/2" />
                  <div className="h-3 bg-[#09090B]/5 rounded w-full" />
                  <div className="h-3 bg-[#09090B]/5 rounded w-5/6" />
                  <div className="h-10 bg-[#09090B]/10 rounded mt-4" />
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article, idx) => (
              <NewsCard
                key={article.uri}
                article={article}
                index={idx}
                stage={stages[article.uri]}
                result={results[article.uri]}
                onAnalyze={analyzeArticle}
                getPlaceholderImg={getPlaceholderImg}
              />
            ))}
          </motion.div>
        )}
      </div>
    </section>
  )
}
