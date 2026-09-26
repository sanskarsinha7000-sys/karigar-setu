import { getAssistantIntentResponses } from './assistantResponses'

// The original English keyword tests below are still evaluated first and unchanged, so English
// behaviour is identical to before. These extra tests only ADD intent coverage for Hindi input
// (native Devanagari script and common Romanized Hindi), so a Hindi question no longer falls
// through to the fallback reply. `text` is already lowercased before these run.
const HINDI_GREETING = /(नमस्ते|नमस्कार|हैलो|हेलो|शुभ\s*(प्रभात|संध्या)|\bnamaste\b|\bnamaskar\b)/
const HINDI_PRICING = /(कीमत|क़ीमत|किमत|मूल्य|दाम|भाव|लागत|मुनाफ़ा|मुनाफा|कितने का|कितनी की|कितना पैसा|\bkimat\b|\bkeemat\b|\bmulya\b|\bmolya\b|\bdaam\b|\bbhav\b|\blagat\b|\bmunafa\b)/
const HINDI_ARTISAN_WORD = /(कारीगर|शिल्पकार|हस्तशिल्पी|\bkarigar\b|\bshilpkar\b|\bcraftsperson\b)/
const HINDI_ARTISAN_ACTION = /(जोड़|जोड|शामिल|ऑनबोर्ड|पंजीकरण|रजिस्टर|\bjod\b|\bjor\b|\bonboard|\bregister\b|\bnaya\b)/
const HINDI_INQUIRIES = /(पूछताछ|संदेश|खरीदार|जवाब|लंबित|प्रतीक्षा|\bpuchh\b|\bpoochh\b|\bsandesh\b|\bjawab\b|\bkharidar\b|\bgrahak\b|\bpratiksha\b|\blambit\b)/
const HINDI_MARKETPLACE = /(बाज़ार|बाजार|उत्पाद|श्रेणी|लिस्टिंग|मिट्टी|वस्त्र|आभूषण|सजावट|लकड़ी|भंडारण|\bbazar\b|\bbazaar\b|\butpad\b|\bshreni\b|\bmitti\b|\bvastra\b|\bsajawat\b|\blakdi\b|\bbhandaran\b)/

// Response text for every supported language lives in ./assistantResponses, which keeps English as
// the fallback, so the English pools are not duplicated here.
function pick(language, intent, seed) {
  const options = getAssistantIntentResponses(language, intent)
  return options[seed % options.length]
}

export function getAssistantResponse(message, context = {}) {
  const text = message.toLowerCase().trim()
  const seed = (text.length + (context.responseCount || 0))
  const language = context.language

  // The original English tests run first and unchanged; the Hindi tests only add extra matches.
  if (/\b(hi|hello|hey|namaste|good morning|good evening)\b/.test(text) || HINDI_GREETING.test(text)) return pick(language, 'greeting', seed)
  if (/\b(price|pricing|cost|margin|rate|valuation|how much)\b/.test(text) || HINDI_PRICING.test(text)) return pick(language, 'pricing', seed)
  const addArtisan = /(add|onboard|register|create).*(artisan|craftsperson)|(artisan|craftsperson).*(add|onboard|register)/.test(text) || (HINDI_ARTISAN_WORD.test(text) && HINDI_ARTISAN_ACTION.test(text))
  if (addArtisan) return pick(language, 'addArtisan', seed)
  if (/\b(inquir|message|buyer|conversation|reply|pending)\b/.test(text) || HINDI_INQUIRIES.test(text)) return pick(language, 'inquiries', seed).replace('{count}', String(context.pendingInquiries ?? 0))
  if (/\b(marketplace|product|catalog|category|pottery|textile|jewelry|decor|wood)\b/.test(text) || HINDI_MARKETPLACE.test(text)) return pick(language, 'marketplace', seed)
  return pick(language, 'fallback', seed)
}
