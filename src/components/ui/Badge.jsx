import React from 'react'

export default function Badge({ children, tone = 'gold', className = '' }){
  const colors = {
    gold: 'bg-gold text-forest',
    green: 'bg-forest text-white',
    rust: 'bg-terracotta text-white'
  }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${colors[tone] || colors.gold} ${className}`}>{children}</span>
}
