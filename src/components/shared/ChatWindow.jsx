import React, { useEffect, useRef, useState } from 'react'
import { Bot, Mic, Send, Sparkles, X } from 'lucide-react'
import { useInquiryStore } from '../../store/inquiryStore'
import { useAssistantStore } from '../../store/assistantStore'
import { getAssistantResponse } from '../../lib/fakeAssistant'
import { ASSISTANT_WELCOME_ID, getAssistantChrome, getAssistantWelcome } from '../../lib/assistantResponses'
import { useTranslation } from '../../i18n'
import Input from '../ui/Input'

function Message({ message, welcomeText }) {
  const isUser = message.role === 'user'
  const text = message.id === ASSISTANT_WELCOME_ID ? welcomeText : message.text
  return <div className={`assistant-message-row ${isUser ? 'is-user' : 'is-bot'}`}>
    {!isUser && <span className="assistant-avatar"><Bot size={16} /></span>}
    <div className="assistant-message-bubble">{text}</div>
  </div>
}

function TypingIndicator() {
  return <div className="assistant-message-row is-bot"><span className="assistant-avatar"><Bot size={16} /></span><div className="assistant-typing"><i /><i /><i /></div></div>
}

function createSpeechRecognition() {
  if (typeof window === 'undefined') return null
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!Recognition) return null
  const recognition = new Recognition()
  recognition.continuous = false
  recognition.interimResults = false
  recognition.lang = 'en-IN'
  return recognition
}

export default function ChatWindow({ embedded = false, onClose }) {
  const [draft, setDraft] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [speechSupported] = useState(() => Boolean(typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)))
  const messages = useAssistantStore((state) => state.messages)
  const responseCount = useAssistantStore((state) => state.responseCount)
  const addMessage = useAssistantStore((state) => state.addMessage)
  const incrementResponses = useAssistantStore((state) => state.incrementResponses)
  const pendingInquiries = useInquiryStore((state) => state.inquiries.filter((inquiry) => !inquiry.reply).length)
  const { language } = useTranslation()
  const chrome = getAssistantChrome(language)
  const welcomeText = getAssistantWelcome(language)
  const messagesEndRef = useRef(null)
  const recognitionRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  useEffect(() => () => recognitionRef.current?.stop(), [])

  const submit = (value = draft) => {
    const text = value.trim()
    if (!text || isThinking) return
    addMessage({ id: `user-${Date.now()}`, role: 'user', text, createdAt: Date.now() })
    setDraft('')
    setIsThinking(true)
    window.setTimeout(() => {
      const response = getAssistantResponse(text, { pendingInquiries, responseCount, language })
      addMessage({ id: `bot-${Date.now()}`, role: 'bot', text: response, createdAt: Date.now() })
      if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(response); utterance.lang = language; window.speechSynthesis.speak(utterance) }
      incrementResponses()
      setIsThinking(false)
    }, 600 + Math.floor(Math.random() * 601))
  }

  const toggleListening = () => {
    if (!speechSupported) return
    if (isListening) {
      recognitionRef.current?.stop()
      return
    }
    const recognition = createSpeechRecognition()
    if (!recognition) return
    recognitionRef.current = recognition
    recognition.onstart = () => setIsListening(true)
    recognition.onresult = (event) => setDraft(Array.from(event.results).map((result) => result[0].transcript).join(' '))
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    recognition.start()
  }

  return <section className={`assistant-window ${embedded ? 'assistant-window-embedded' : 'assistant-window-panel'}`}>
    <header className="assistant-header">
      <span className="assistant-header-icon"><Bot size={22} /></span>
      <div><h1>{chrome.title}</h1><p><span className="assistant-online-dot" /> {chrome.subtitle}</p></div>
      {onClose && <button className="assistant-close" type="button" onClick={onClose} aria-label={chrome.closeLabel}><X size={18} /></button>}
    </header>
    <div className="assistant-messages" aria-live="polite">
      {messages.map((message) => <Message key={message.id} message={message} welcomeText={welcomeText} />)}
      {isThinking && <TypingIndicator />}
      <div ref={messagesEndRef} />
    </div>
    <div className="assistant-composer">
      <div className="assistant-suggestions">{chrome.suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => submit(suggestion)} disabled={isThinking}>{suggestion}</button>)}</div>
      <div className="assistant-input-row"><Input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submit() }} placeholder={chrome.placeholder} aria-label={chrome.inputLabel} /><button className={`assistant-mic ${isListening ? 'is-listening' : ''}`} type="button" onClick={toggleListening} disabled={!speechSupported} title={speechSupported ? chrome.micLabel : chrome.micUnsupported} aria-label={speechSupported ? chrome.micLabel : chrome.micUnsupported}><Mic size={18} /></button><button className="assistant-send" type="button" onClick={() => submit()} disabled={!draft.trim() || isThinking} aria-label={chrome.sendLabel}><Send size={17} /></button></div>
      {isListening && <span className="assistant-listening-label">{chrome.listening}</span>}
    </div>
  </section>
}
