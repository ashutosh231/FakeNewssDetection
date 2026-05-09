import { useState, useEffect } from 'react'

const EVENT_REGISTRY_API_KEY = "7b9d03bd-dca0-43b4-a1cc-7a3e39ff7256"
const BASE_URL = "https://eventregistry.org/api/v1/article/getArticles"
const NVIDIA_API_KEY = import.meta.env.VITE_NVIDIA_API_KEY

export default function LiveNews() {
  const [articles, setArticles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [analyzingId, setAnalyzingId] = useState(null)
  const [factCheckResults, setFactCheckResults] = useState({})

  useEffect(() => {
    fetchNews()
  }, [])

  const fetchNews = async () => {
    setIsLoading(true)
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
        articleBodyLen: 200,
        lang: "eng"
      })

      const response = await fetch(`${BASE_URL}?${params}`)
      const data = await response.json()
      if (data?.articles?.results) {
        setArticles(data.articles.results)
      }
    } catch (err) {
      console.error("Failed to fetch news:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const analyzeArticle = async (article) => {
    setAnalyzingId(article.uri)
    try {
      const textToAnalyze = `Title: ${article.title}\nBody: ${article.body}`
      const url = "https://integrate.api.nvidia.com/v1/chat/completions"
      
      const prompt = `You are a misinformation detection AI. Analyze this news article.
      Article: "${textToAnalyze}"
      Return ONLY a raw JSON object (no markdown) with this structure:
      {
        "score": <number 0-100>,
        "verdict": "<VERIFIED, MIXED SIGNALS, or HIGHLY SUSPICIOUS>",
        "summary": "<1 short sentence reasoning>",
        "flags": ["<1-2 short flags like 'Biased tone' or 'None'>"]
      }`

      const res = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${NVIDIA_API_KEY}`
        },
        body: JSON.stringify({
          model: "meta/llama-3.1-70b-instruct",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 500,
          temperature: 0.2
        })
      })
      
      const data = await res.json()
      let textResponse = data.choices[0].message.content
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) textResponse = jsonMatch[0]

      const parsed = JSON.parse(textResponse)

      let resultHtml = ''
      let isFlagged = parsed.verdict === 'HIGHLY SUSPICIOUS'
      let ratingClass = 'text-yellow-600 bg-yellow-100'
      
      if (isFlagged) ratingClass = 'text-red-600 bg-red-100'
      if (parsed.verdict === 'VERIFIED') ratingClass = 'text-green-600 bg-green-100'

      resultHtml = `
        <div class="mt-2 p-3 border-2 border-[#09090B] bg-white rounded-lg hard-shadow-sm">
          <div class="flex justify-between items-center mb-1">
            <div class="text-[10px] font-mono text-[#09090B]/60">VERDICT:</div>
            <div class="text-[10px] font-mono font-bold">SCORE: ${parsed.score}%</div>
          </div>
          <div class="font-bold uppercase tracking-wider px-2 py-1 inline-block border border-[#09090B] ${ratingClass} text-xs mb-2">
            ${parsed.verdict}
          </div>
          <div class="text-xs leading-tight mb-2">${parsed.summary}</div>
          <div class="text-[9px] font-mono text-[#09090B]/60">FLAGS: ${parsed.flags.join(', ')}</div>
        </div>
      `

      setFactCheckResults(prev => ({ ...prev, [article.uri]: { html: resultHtml, isFlagged } }))
    } catch (err) {
      console.error(err)
      setFactCheckResults(prev => ({ 
        ...prev, 
        [article.uri]: { html: '<div class="text-xs text-red-500 font-bold p-2 border-2 border-red-500 bg-white">⚠️ AI Analysis Failed.</div>' } 
      }))
    } finally {
      setAnalyzingId(null)
    }
  }

  const getPlaceholderImg = () => "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' fill='%23F8F4E8'%3E%3Crect width='600' height='400'/%3E%3Ctext x='50%25' y='50%25' fill='%2309090B' font-family='sans-serif' font-size='18' text-anchor='middle' dy='.3em'%3E📰 No Image%3C/text%3E%3C/svg%3E"

  return (
    <section id="live-news" className="py-20 stripe-pattern">
      <div className="container mx-auto px-4 md:px-8 mb-10">
        <div>
          <p className="font-bold uppercase tracking-[0.2em] text-[#09090B]/50 mb-2 text-xs font-mono">
            Live Intelligence
          </p>
          <div className="flex items-center gap-4">
            <h2 className="font-display text-5xl">LIVE NEWS SCAN</h2>
            <div className="flex items-center gap-2 px-3 py-1.5 border-2 border-[#09090B] rounded-full hard-shadow-sm bg-white">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-bold text-[10px] uppercase tracking-widest font-mono">MONITORING</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-96 border-2 border-[#09090B] bg-[#F8F4E8] hard-shadow-md animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article) => {
              const isAnalyzing = analyzingId === article.uri
              const result = factCheckResults[article.uri]

              return (
                <div key={article.uri} className={`relative flex flex-col bg-white border-2 border-[#09090B] hard-shadow-lg rounded-2xl overflow-hidden group ${result?.isFlagged ? 'ring-4 ring-red-500' : ''}`}>
                  {/* Image */}
                  <div className="h-48 border-b-2 border-[#09090B] overflow-hidden relative">
                    <img 
                      src={article.image || getPlaceholderImg()} 
                      alt={article.title}
                      onError={(e) => { e.target.src = getPlaceholderImg() }}
                      className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${result?.isFlagged ? 'grayscale' : ''}`}
                    />
                    <div className="absolute top-3 left-3 px-2 py-1 bg-[#D2E823] border-2 border-[#09090B] font-mono text-[9px] font-bold">
                      {article.source?.title || 'UNKNOWN SOURCE'}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="font-bold text-lg leading-tight mb-3 line-clamp-3">
                      {article.title}
                    </h3>
                    <p className="text-sm opacity-70 mb-4 line-clamp-3">
                      {article.body}
                    </p>
                    
                    <div className="mt-auto">
                      {!result ? (
                        <button 
                          onClick={() => analyzeArticle(article)}
                          disabled={isAnalyzing}
                          className="w-full py-3 bg-[#09090B] text-[#D2E823] font-bold uppercase tracking-widest text-xs rounded-lg border-2 border-[#09090B] hover:bg-[#D2E823] hover:text-[#09090B] transition-colors disabled:opacity-50 cursor-none flex items-center justify-center gap-2 btn-press"
                        >
                          {isAnalyzing ? (
                            <><iconify-icon icon="lucide:loader-2" class="animate-spin text-lg" /> SCANNING...</>
                          ) : (
                            <><iconify-icon icon="lucide:scan-search" class="text-lg" /> AI FACT CHECK</>
                          )}
                        </button>
                      ) : (
                        <div 
                          className="animate-fade-in"
                          dangerouslySetInnerHTML={{ __html: result.html }} 
                        />
                      )}
                    </div>
                  </div>

                  {/* Flagged Overlay */}
                  {result?.isFlagged && (
                    <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 font-display text-sm -rotate-12 border-2 border-white/50 hard-shadow-sm z-10">
                      FLAGGED
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
