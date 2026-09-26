import React from 'react'
import ChatWindow from '../components/shared/ChatWindow'

export default function Assistant() {
  return <div className="assistant-page"><div className="assistant-page-intro"><span>Workspace companion</span><h1>AI Assistant</h1><p>Practical guidance for the craft marketplace, whenever you need it.</p></div><ChatWindow embedded /></div>
}
