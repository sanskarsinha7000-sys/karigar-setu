import React from 'react'

export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm ${className}`}>
      {children}
    </div>
  )
}
