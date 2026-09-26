import React from 'react'
import { Link } from 'react-router-dom'
import logoUrl from '../../assets/karigar-setu-logo.png'

export default function BrandLogo({ className = '', to = '/', footer = false }) {
  return (
    <Link to={to} className={`official-brand ${className}`} aria-label="Karigar Setu - Powering the Craft Network">
      <img src={logoUrl} alt="KAARIGAR SETU - Powering the Craft Network" />
      {footer && <span>Powering the Craft Network</span>}
    </Link>
  )
}
