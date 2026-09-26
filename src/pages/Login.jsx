import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import Button from '../components/ui/Button'
import BrandLogo from '../components/shared/BrandLogo'
import LanguageSelector from '../components/shared/LanguageSelector'
import { useTranslation } from '../i18n'

export default function Login() {
  const { t } = useTranslation()
  const roles = [
    { value: 'operator', label: t('auth.roleOperator') },
    { value: 'artisan', label: t('auth.roleArtisan') },
    { value: 'buyer', label: t('auth.roleBuyer') },
    { value: 'ngo', label: t('auth.roleNgoPartner') }
  ]
  const [mode, setMode] = useState('login')
  const [method, setMethod] = useState('phone')
  const [identifier, setIdentifier] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('operator')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [otpMode, setOtpMode] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const login = useAuthStore((state) => state.login)
  const signup = useAuthStore((state) => state.signup)
  const requestOtp = useAuthStore((state) => state.requestOtp)
  const verifyOtp = useAuthStore((state) => state.verifyOtp)
  const nav = useNavigate()

  const routeFor = (nextRole) => nextRole === 'buyer' ? '/shop' : '/dashboard'
  const resetNotice = () => { setError(''); setMessage('') }
  const handleSubmit = async (event) => {
    event.preventDefault()
    resetNotice()
    setBusy(true)
    try {
      const identity = identifier.trim()
      const user = mode === 'signup'
        ? await signup({ name, role, password, ...(method === 'phone' ? { phone: identity } : { email: identity }) })
        : await login(identity, password)
      nav(routeFor(user.role))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }
  const sendOtp = async () => {
    resetNotice()
    setBusy(true)
    try {
      await requestOtp(identifier.trim())
      setOtpMode(true)
      setMessage(t('auth.otpSent'))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }
  const verify = async (event) => {
    event.preventDefault()
    resetNotice()
    setBusy(true)
    try {
      const user = await verifyOtp(identifier.trim(), code)
      nav(routeFor(user.role))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page max-w-md mx-auto mt-24">
      <div className="flex justify-end mb-3"><LanguageSelector /></div>
      <BrandLogo className="login-brand" />
      <h2 className="text-2xl font-heading text-rust">{mode === 'signup' ? t('auth.createAccountTitle') : t('auth.signInTitle')}</h2>
      <div className="mt-4 flex gap-2 border-b pb-2">
        <button className={mode === 'login' ? 'font-semibold text-rust' : 'text-gray-500'} onClick={() => { setMode('login'); resetNotice() }}>{t('auth.signIn')}</button>
        <button className={mode === 'signup' ? 'font-semibold text-rust' : 'text-gray-500'} onClick={() => { setMode('signup'); setOtpMode(false); resetNotice() }}>{t('auth.createAccount')}</button>
      </div>
      {!otpMode ? (
        <form className="mt-4" onSubmit={handleSubmit}>
          {mode === 'signup' && <input required value={name} onChange={(event) => setName(event.target.value)} placeholder={t('auth.fullName')} className="mb-3 w-full p-2 rounded-md" />}
          {mode === 'signup' && <select value={role} onChange={(event) => setRole(event.target.value)} className="mb-3 w-full p-2 rounded-md">{roles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>}
          <div className="mb-2 flex gap-2 text-sm">
            <button type="button" className={method === 'phone' ? 'font-semibold text-rust' : 'text-gray-500'} onClick={() => { setMethod('phone'); setIdentifier(''); resetNotice() }}>{t('auth.phone')}</button>
            <button type="button" className={method === 'email' ? 'font-semibold text-rust' : 'text-gray-500'} onClick={() => { setMethod('email'); setIdentifier(''); resetNotice() }}>{t('auth.email')}</button>
          </div>
          <input required value={identifier} onChange={(event) => setIdentifier(event.target.value)} type={method === 'email' ? 'email' : 'tel'} placeholder={method === 'phone' ? t('auth.phonePlaceholder') : t('auth.emailPlaceholder')} className="w-full p-2 rounded-md" />
          <input required value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder={t('auth.password')} className="mt-3 w-full p-2 rounded-md" />
          <div className="mt-3 flex flex-wrap gap-3 items-center"><Button type="submit" disabled={busy}>{busy ? t('auth.pleaseWait') : mode === 'signup' ? t('auth.createAccount') : t('auth.signIn')}</Button>{mode === 'login' && <button type="button" className="text-sm text-rust" onClick={sendOtp}>{t('auth.useOtpInstead')}</button>}</div>
        </form>
      ) : (
        <form className="mt-4" onSubmit={verify}>
          <p className="text-sm text-gray-600">{t('auth.enterCodeTo', { identifier })}</p>
          <input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} placeholder={t('auth.otpPlaceholder')} className="mt-3 w-full p-2 rounded-md" />
          <div className="mt-3 flex gap-3"><Button type="submit" disabled={busy}>{busy ? t('auth.checking') : t('auth.verifyContinue')}</Button><button type="button" className="text-sm text-rust" onClick={() => setOtpMode(false)}>{t('auth.usePassword')}</button></div>
        </form>
      )}
      {message && <p className="mt-3 text-sm text-forest">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  )
}
