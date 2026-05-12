/**
 * ──────────────────────────────────────────────────────────────
 * RAG RETRIEVER — Fact-check knowledge base
 *
 * A lightweight retrieval layer that scores a curated set of
 * domain "chunks" against the input text using keyword overlap,
 * pattern triggers, and topic classification. The top-k chunks
 * are passed to the reasoning LLM as grounding context (RAG).
 *
 * Each chunk captures real-world fact-checking heuristics for a
 * domain (medical, political, financial, science, conspiracy,
 * breaking-news) so the LLM reasons with expert priors instead of
 * from scratch.
 * ──────────────────────────────────────────────────────────────
 */

const KNOWLEDGE_BASE = [
  {
    id: "medical-miracle",
    topic: "Medical misinformation",
    triggers: [
      /miracle (cure|drug|pill|remedy)/i,
      /reverse[ds]? aging/i,
      /cures? (cancer|diabetes|covid|hiv|alzheimer)/i,
      /doctors (hate|don.?t want)/i,
      /big pharma/i,
      /ancient (herb|remedy|tea|spice)/i,
      /\b(burn fat|lose weight) (while you sleep|overnight|in \d+ days?)/i,
    ],
    keywords: ["miracle", "cure", "pharma", "herbal", "remedy", "weight loss", "cancer", "aging", "detox", "cleanse", "supplement"],
    context: `Medical miracle-cure claims are a classic misinformation pattern. Legitimate medical findings appear in peer-reviewed journals (NEJM, Lancet, JAMA), involve multi-phase clinical trials, and are never described as "reversing aging in 48 hours" or "curing cancer in 3 days". Red flags: suppression narratives ("doctors hate this"), single-ingredient panaceas, celebrity endorsements instead of clinical data, and urgency-based calls to action. The FDA and WHO explicitly warn against these patterns.`,
  },
  {
    id: "conspiracy-coverup",
    topic: "Conspiracy / cover-up narrative",
    triggers: [
      /cover[- ]?up/i,
      /(they|government|elite|cabal) (don.?t want you to|are hiding|secretly)/i,
      /mainstream media (lies|silent|ignor)/i,
      /deep state|new world order|globalist|illuminati/i,
      /leaked (documents|footage|insider)/i,
      /ufo landing|alien.* (cover|contact)/i,
      /weather (manipulation|control|engineering)/i,
    ],
    keywords: ["cover-up", "secret", "leaked", "insider", "deep state", "cabal", "suppressed", "hidden truth"],
    context: `Conspiracy framing uses unfalsifiable "they don't want you to know" narratives, anonymous insiders, and claims that "mainstream media is silent" — a common deflection when reputable outlets have not reported a story because it lacks evidence. Legitimate investigative journalism cites named sources, provides verifiable documents, and does not rely on "leaked" material that cannot be authenticated. Absence of mainstream coverage is evidence of low credibility, not of a cover-up.`,
  },
  {
    id: "breaking-urgency",
    topic: "False urgency / breaking news manipulation",
    triggers: [
      /\b(BREAKING|URGENT|ALERT|JUST IN)\b/,
      /share (this |before |now)/i,
      /forward this/i,
      /before.{0,15}(delete|taken down|banned)/i,
      /\b\d+ days? of (total darkness|blackout)/i,
    ],
    keywords: ["breaking", "urgent", "share", "forward", "alert", "just in"],
    context: `Fake viral content exploits urgency to bypass critical thinking. Phrases like "SHARE BEFORE IT'S DELETED", "BREAKING — they don't want you to see this", or "6 days of total darkness next month" are almost exclusively found in fabricated chain messages. NASA, NOAA, and legitimate scientific bodies never distribute catastrophic predictions through viral WhatsApp forwards. Authoritative breaking news comes from named reporters at established outlets with editorial standards.`,
  },
  {
    id: "financial-scam",
    topic: "Financial misinformation",
    triggers: [
      /\b(guaranteed|risk[- ]free|100%) (return|profit|income)/i,
      /get rich (quick|overnight|in \d+ days?)/i,
      /crypto.* (moonshot|1000x|guaranteed)/i,
      /passive income.* (\$\d+|while you sleep)/i,
    ],
    keywords: ["guaranteed returns", "crypto", "passive income", "get rich", "moonshot"],
    context: `Credible financial reporting (Bloomberg, FT, Reuters, WSJ) cites SEC filings, names specific analysts, and frames market movements with historical context. Content promising "guaranteed returns", "risk-free profit", or specific price targets with certainty violates basic investment-disclosure norms and is usually pump-and-dump or affiliate bait.`,
  },
  {
    id: "political-bias",
    topic: "Political manipulation",
    triggers: [
      /(radical|extremist|far.?left|far.?right) .* (agenda|takeover|destroying)/i,
      /(crooked|corrupt|evil) (politician|senator|president)/i,
      /rigged (election|system|media)/i,
      /patriots? (must|need to) (fight|rise|awaken)/i,
    ],
    keywords: ["rigged", "crooked", "radical agenda", "patriots", "takeover"],
    context: `Partisan misinformation often uses loaded terminology ("radical", "crooked", "rigged"), emotional framing, and outgroup demonization. Reputable political reporting distinguishes fact from analysis, names sources, and provides context for quotes. A piece that reads more like a rallying cry than reporting — with no named reporter, no quoted officials, and heavy use of all-caps or rhetorical questions — is editorial or propaganda, not news.`,
  },
  {
    id: "science-reputable",
    topic: "Reputable scientific reporting",
    triggers: [
      /peer[- ]reviewed/i,
      /published in (Nature|Science|Lancet|NEJM|JAMA|Cell)/i,
      /(double|single)[- ]blind .*(study|trial)/i,
      /clinical trial (phase|results)/i,
      /university of \w+|\w+ institute/i,
    ],
    keywords: ["peer-reviewed", "journal", "clinical trial", "study", "university", "institute"],
    context: `Legitimate scientific findings cite peer-reviewed journals, specify study methodology (sample size, control group, blinding), name institutions and lead authors, and acknowledge limitations. When these markers are present and the source is a reputable outlet, credibility rises significantly.`,
  },
  {
    id: "reputable-outlet",
    topic: "Established news outlets",
    triggers: [
      /\b(Reuters|Associated Press|AP News|BBC|NPR|Financial Times|Bloomberg|Wall Street Journal|Guardian|Nature|Science)\b/i,
    ],
    keywords: ["Reuters", "Bloomberg", "BBC", "AP", "Financial Times", "WSJ", "Guardian"],
    context: `This content references or originates from an established news outlet with editorial standards, named bylines, and a public corrections policy. These are not immune to error, but misinformation is substantially less frequent. Treat factual claims as credible unless the content itself shows manipulation markers.`,
  },
  {
    id: "attribution-missing",
    topic: "Missing attribution",
    triggers: [
      /^[^"'`]{0,500}$/, // Long block with zero quotes often means zero direct quotes
    ],
    keywords: [],
    context: `A credibility red flag is the absence of attribution: no named sources, no quoted officials, no citation of studies or documents, and vague phrases like "scientists say" or "reports indicate" without naming who. Genuine journalism attributes every non-obvious claim.`,
    // Special scorer: fires only when text is long and has no attribution markers
    specialScore: (text) => {
      if (text.length < 200) return 0
      const hasAttribution = /according to|said|stated|cited|published by|https?:\/\/|[A-Z][a-z]+ [A-Z][a-z]+,? (said|told|reported)/i.test(text)
      return hasAttribution ? 0 : 6
    },
  },
]

/**
 * Score a chunk against text.
 * @returns {number} relevance score
 */
const scoreChunk = (chunk, text) => {
  let score = 0

  // Pattern triggers — strongest signal
  if (chunk.triggers) {
    for (const rx of chunk.triggers) {
      if (rx.test(text)) score += 10
    }
  }

  // Keyword overlap
  if (chunk.keywords?.length) {
    const lower = text.toLowerCase()
    for (const kw of chunk.keywords) {
      if (lower.includes(kw.toLowerCase())) score += 2
    }
  }

  // Special scorers
  if (typeof chunk.specialScore === "function") {
    score += chunk.specialScore(text)
  }

  return score
}

/**
 * Retrieve the top-k most relevant fact-check chunks for given text.
 * @param {string} text - input content
 * @param {number} k - how many chunks to return
 * @returns {{ topic: string, context: string, score: number }[]}
 */
export const retrieveContext = (text, k = 3) => {
  if (!text || typeof text !== "string") return []

  const scored = KNOWLEDGE_BASE
    .map((chunk) => ({
      topic: chunk.topic,
      context: chunk.context,
      id: chunk.id,
      score: scoreChunk(chunk, text),
    }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)

  return scored
}

/**
 * Format retrieved chunks as a compact context block for the LLM prompt.
 */
export const formatContextForPrompt = (chunks) => {
  if (!chunks || chunks.length === 0) return ""
  return chunks
    .map((c, i) => `[Source ${i + 1} — ${c.topic}]\n${c.context}`)
    .join("\n\n")
}
