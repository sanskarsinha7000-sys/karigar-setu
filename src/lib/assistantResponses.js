// Assistant response text for KARIGAR SETU, keyed by language code.
// - English (`en`) is the source of truth AND the fallback for every unsupported language.
// - Only `en` and `hi` carry content today; the other 21 languages in src/i18n/languages.js
//   automatically fall back to `en` (see getAssistantIntentResponses / getAssistantWelcome).
// - The six assistant intents are unchanged: greeting, pricing, addArtisan, inquiries, marketplace, fallback.
// - `{count}` is replaced with the pending buyer-inquiry count when the response is generated.
// - Kept OUT of src/i18n/translations.js on purpose so the 23-language translation file is never
//   edited or regenerated. Display-only: user-entered text is never translated.

export const DEFAULT_ASSISTANT_LANGUAGE = 'en'

// Languages that currently have assistant content. Everything else falls back to `en`.
export const SUPPORTED_ASSISTANT_LANGUAGES = ['en', 'hi']

// Matches the `id` of the welcome message created in src/store/assistantStore.js.
// The store is intentionally left unchanged; the bubble is localized at render time.
export const ASSISTANT_WELCOME_ID = 'assistant-welcome'

export const ASSISTANT_RESPONSES = {
  greeting: {
    en: [
      'Hello! I am your Karigar Setu Assistant. I can help with pricing, listings, artisans, and buyer inquiries.',
      'Namaste! Ask me about your marketplace, fair pricing, new artisans, or messages from buyers.',
      'Welcome back. I can guide you through pricing, catalog listings, artisan onboarding, and buyer conversations.'
    ],
    hi: [
      'नमस्ते! मैं आपका कारीगर सेतु सहायक हूँ। मैं मूल्य निर्धारण, लिस्टिंग, कारीगरों और खरीदार पूछताछ में मदद कर सकता हूँ।',
      'नमस्कार! अपने बाज़ार, उचित मूल्य, नए कारीगरों या खरीदारों के संदेशों के बारे में मुझसे पूछें।',
      'वापसी पर स्वागत है। मैं मूल्य निर्धारण, कैटलॉग लिस्टिंग, कारीगर ऑनबोर्डिंग और खरीदार बातचीत में मार्गदर्शन कर सकता हूँ।'
    ]
  },
  pricing: {
    en: [
      'The Price Assistant considers material cost, making time, craft complexity, and a fair artisan margin. You can review the suggested range on the Price Assistant screen.',
      'For pricing, start with material and labor costs, then add a sustainable artisan margin. The Price Assistant can help turn those inputs into a market-ready range.',
      'Karigar Setu pricing is designed to protect artisan earnings while staying buyer-friendly. Open Price Assistant for a guided estimate.'
    ],
    hi: [
      'मूल्य सहायक सामग्री की लागत, बनाने में लगने वाला समय, शिल्प की जटिलता और कारीगर के उचित मुनाफ़े को ध्यान में रखता है। सुझाया गया दायरा आप मूल्य सहायक स्क्रीन पर देख सकते हैं।',
      'मूल्य तय करने के लिए सामग्री और मज़दूरी की लागत से शुरू करें, फिर टिकाऊ कारीगर मुनाफ़ा जोड़ें। मूल्य सहायक इन जानकारियों को बाज़ार-योग्य दायरे में बदलने में मदद करता है।',
      'कारीगर सेतु का मूल्य निर्धारण कारीगर की कमाई की रक्षा करता है और खरीदार के लिए वहनीय भी रहता है। निर्देशित अनुमान के लिए मूल्य सहायक खोलें।'
    ]
  },
  addArtisan: {
    en: [
      'To add an artisan: open Add Artisan, enter their name and village, choose their craft, add language and affiliation details, then save the profile.',
      'You can onboard someone from Add Artisan. Add their identity and craft details, review the profile, and submit it to create their artisan record.',
      'Start at Add Artisan, complete the basic profile, village, craft, and affiliation fields, then save. Their profile will be ready for listings.'
    ],
    hi: [
      'कारीगर जोड़ने के लिए: कारीगर जोड़ें खोलें, उनका नाम और गाँव भरें, उनका शिल्प चुनें, भाषा और संबद्धता की जानकारी जोड़ें, फिर प्रोफ़ाइल सहेजें।',
      'आप कारीगर जोड़ें से किसी को ऑनबोर्ड कर सकते हैं। उनकी पहचान और शिल्प की जानकारी भरें, प्रोफ़ाइल जाँचें और उनका कारीगर रिकॉर्ड बनाने के लिए सबमिट करें।',
      'कारीगर जोड़ें से शुरू करें, बुनियादी प्रोफ़ाइल, गाँव, शिल्प और संबद्धता के फ़ील्ड भरें, फिर सहेजें। उनकी प्रोफ़ाइल लिस्टिंग के लिए तैयार हो जाएगी।'
    ]
  },
  inquiries: {
    en: [
      'You currently have {count} pending buyer inquiries. Open Inquiries to review each message and reply.',
      'There are {count} buyer conversations waiting for attention. The Inquiries screen keeps replies and SMS fallback in one place.',
      'Your marketplace has {count} pending inquiries. I recommend answering the newest requests first from the Inquiries screen.'
    ],
    hi: [
      'इस समय आपके पास {count} लंबित खरीदार पूछताछ हैं। हर संदेश देखने और जवाब देने के लिए पूछताछ खोलें।',
      'आपकी प्रतीक्षा में {count} खरीदार बातचीत हैं। पूछताछ स्क्रीन जवाब और एसएमएस विकल्प एक ही जगह रखती है।',
      'आपके बाज़ार में {count} लंबित पूछताछ हैं। मेरा सुझाव है कि पूछताछ स्क्रीन से सबसे नए अनुरोधों का जवाब पहले दें।'
    ]
  },
  marketplace: {
    en: [
      'The marketplace includes pottery, textiles, jewelry, home decor, woodcraft, storage, and wearable pieces from artisan communities.',
      'You can browse terracotta pottery, handloom textiles, woven baskets, brass jewelry, woodcraft, and home decor in the Marketplace.',
      'For product discovery, try Home Decor, Textiles, Jewellery, Storage, or Wearable categories. Each listing keeps its artisan story nearby.'
    ],
    hi: [
      'बाज़ार में कारीगर समुदायों की मिट्टी के बर्तन, वस्त्र, आभूषण, घर की सजावट, लकड़ी का काम, भंडारण और पहनने योग्य वस्तुएँ शामिल हैं।',
      'आप बाज़ार में मिट्टी के बर्तन, हथकरघा वस्त्र, बुने हुए टोकरे, पीतल के आभूषण, लकड़ी का काम और घर की सजावट देख सकते हैं।',
      'उत्पाद खोजने के लिए घर की सजावट, वस्त्र, आभूषण, भंडारण या पहनने योग्य श्रेणियाँ देखें। हर लिस्टिंग के साथ उस कारीगर की कहानी भी रहती है।'
    ]
  },
  fallback: {
    en: [
      'I can help with onboarding, pricing, listings, and buyer inquiries. Could you rephrase your question?',
      'I am ready to help with artisans, products, pricing, or messages. Try asking about one of those areas.',
      'I did not quite catch that. Ask me how pricing works, how to add an artisan, or how many inquiries are pending.'
    ],
    hi: [
      'मैं ऑनबोर्डिंग, मूल्य निर्धारण, लिस्टिंग और खरीदार पूछताछ में मदद कर सकता हूँ। कृपया अपना प्रश्न दूसरे शब्दों में पूछें।',
      'मैं कारीगरों, उत्पादों, मूल्य निर्धारण या संदेशों में मदद के लिए तैयार हूँ। इनमें से किसी विषय के बारे में पूछें।',
      'मैं समझ नहीं पाया। मुझसे पूछें कि मूल्य कैसे तय होता है, नया कारीगर कैसे जोड़ें, या कितनी पूछताछ लंबित हैं।'
    ]
  }
}

export const ASSISTANT_WELCOME = {
  en: 'Namaste! I am the Karigar Setu Assistant. Ask me about pricing, listings, artisans, or buyer inquiries.',
  hi: 'नमस्ते! मैं कारीगर सेतु सहायक हूँ। मुझसे मूल्य निर्धारण, लिस्टिंग, कारीगरों या खरीदार पूछताछ के बारे में पूछें।'
}

export const ASSISTANT_CHROME = {
  en: {
    title: 'Karigar Setu Assistant',
    subtitle: 'Ask me about pricing, listings, or buyers',
    suggestions: ['How is pricing calculated?', 'Show my pending inquiries', 'How do I add a new artisan?'],
    placeholder: 'Ask your assistant...',
    inputLabel: 'Message assistant',
    listening: 'Listening...',
    sendLabel: 'Send message',
    closeLabel: 'Close assistant',
    micLabel: 'Use voice input',
    micUnsupported: 'Voice input not supported in this browser'
  },
  hi: {
    title: 'कारीगर सेतु सहायक',
    subtitle: 'मूल्य, लिस्टिंग या खरीदारों के बारे में मुझसे पूछें',
    suggestions: ['मूल्य कैसे तय होता है?', 'मेरी लंबित पूछताछ दिखाएँ', 'नया कारीगर कैसे जोड़ें?'],
    placeholder: 'अपने सहायक से पूछें...',
    inputLabel: 'सहायक को संदेश भेजें',
    listening: 'सुन रहा हूँ...',
    sendLabel: 'संदेश भेजें',
    closeLabel: 'सहायक बंद करें',
    micLabel: 'आवाज़ से लिखें',
    micUnsupported: 'इस ब्राउज़र में आवाज़ इनपुट उपलब्ध नहीं है'
  }
}

// Any language without assistant content resolves to English.
function resolveAssistantLanguage(language) {
  return SUPPORTED_ASSISTANT_LANGUAGES.includes(language) ? language : DEFAULT_ASSISTANT_LANGUAGE
}

// Returns the response variants for an intent; unknown intents use `fallback`,
// unsupported languages use `en`. Always returns a non-empty array.
export function getAssistantIntentResponses(language, intent) {
  const entry = ASSISTANT_RESPONSES[intent] || ASSISTANT_RESPONSES.fallback
  const localized = entry[resolveAssistantLanguage(language)]
  if (Array.isArray(localized) && localized.length) return localized
  return entry[DEFAULT_ASSISTANT_LANGUAGE]
}

export function getAssistantWelcome(language) {
  return ASSISTANT_WELCOME[resolveAssistantLanguage(language)] || ASSISTANT_WELCOME[DEFAULT_ASSISTANT_LANGUAGE]
}

export function getAssistantChrome(language) {
  return ASSISTANT_CHROME[resolveAssistantLanguage(language)] || ASSISTANT_CHROME[DEFAULT_ASSISTANT_LANGUAGE]
}

