const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const multer = require('multer')

const db = require('./db')
const enhanceRouter = require('./routes/enhance')
const pricingRouter = require('./routes/pricing')

// Fix 10A: in production the JWT secret must come from the environment. When
// NODE_ENV is not "production" (the local demo), the fallback below is still used.
if (process.env.NODE_ENV === 'production' && !(process.env.JWT_SECRET || '').trim()) {
  console.error(
    'FATAL: JWT_SECRET is required when NODE_ENV=production. ' +
    'Refusing to start with the development fallback secret. ' +
    'Set JWT_SECRET in the environment (see .env.example) and restart.'
  )
  process.exit(1)
}

const JWT_SECRET = process.env.JWT_SECRET || 'karigar-setu-dev-secret-change-me'
const VISION_URL = process.env.VISION_URL || 'http://localhost:8000/analyze'
// Internal credential for the local vision service (audit P2-15). Read from the process
// environment only; it is never logged and never sent to a browser. When it is empty the
// vision service runs in its documented local-development open mode and the header is
// simply omitted.
const VISION_INTERNAL_TOKEN = (process.env.VISION_INTERNAL_TOKEN || '').trim()
const visionHeaders = () => (VISION_INTERNAL_TOKEN ? { 'x-vision-token': VISION_INTERNAL_TOKEN } : {})
const OTP_TTL_MS = 5 * 60 * 1000
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })
const app = express()

app.use(express.json({ limit: '1mb' }))

function normalizeIdentifier(identifier) {
  return String(identifier || '').trim().toLowerCase()
}

function identifierColumn(identifier) {
  return identifier.includes('@') ? 'email' : 'phone'
}

function publicUser(user) {
  if (!user) return null
  return { id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role, created_at: user.created_at }
}

function issueSession(res, user) {
  const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' })
  res.cookie('karigar_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  })
}

function readSession(req) {
  const cookieHeader = req.headers.cookie || ''
  const token = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith('karigar_session='))?.split('=')[1]
  if (!token) return null
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

function findUserByIdentifier(identifier) {
  const column = identifierColumn(identifier)
  return db.prepare(`SELECT * FROM users WHERE ${column} = ?`).get(identifier)
}

// Routes are async; without a wrapper a rejected bcrypt/db promise becomes an
// unhandled rejection that can crash the server instead of returning an error response.
function asyncHandler(handler) {
  return (req, res, next) => { Promise.resolve(handler(req, res, next)).catch(next) }
}

function isUniqueConstraintError(error) {
  return String(error && error.code || '').startsWith('SQLITE_CONSTRAINT')
}

function validateIdentity({ phone, email }) {
  const normalizedPhone = phone ? String(phone).trim() : null
  const normalizedEmail = email ? normalizeIdentifier(email) : null
  if (!normalizedPhone && !normalizedEmail) return { error: 'Provide a phone number or email address' }
  if (normalizedEmail && !normalizedEmail.includes('@')) return { error: 'Enter a valid email address' }
  return { phone: normalizedPhone, email: normalizedEmail }
}

app.post('/api/auth/signup', asyncHandler(async (req, res) => {
  const { name, role = 'operator', password } = req.body || {}
  const identity = validateIdentity(req.body || {})
  if (!name || !password || identity.error) return res.status(400).json({ error: identity.error || 'Name and password are required' })
  if (!['operator', 'buyer', 'artisan', 'ngo'].includes(role)) return res.status(400).json({ error: 'Invalid role' })
  if (findUserByIdentifier(identity.email || identity.phone)) return res.status(409).json({ error: 'An account already exists for that identifier' })

  const passwordHash = await bcrypt.hash(password, 12)
  let result
  try {
    result = db.prepare('INSERT INTO users (name, phone, email, password_hash, role) VALUES (?, ?, ?, ?, ?)').run(name.trim(), identity.phone, identity.email, passwordHash, role)
  } catch (error) {
    // The pre-check above can race with a concurrent signup; the UNIQUE index is the source of truth.
    if (isUniqueConstraintError(error)) return res.status(409).json({ error: 'An account already exists for that identifier' })
    throw error
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid)
  issueSession(res, user)
  res.status(201).json({ user: publicUser(user) })
}))

app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const identifier = normalizeIdentifier(req.body?.identifier)
  const password = String(req.body?.password || '')
  if (!identifier || !password) return res.status(400).json({ error: 'Identifier and password are required' })
  const user = findUserByIdentifier(identifier)
  if (!user || !user.password_hash || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Invalid credentials' })
  issueSession(res, user)
  res.json({ user: publicUser(user) })
}))

// --- OTP abuse protection (audit P2-13) -----------------------------------------------------
// Deliberately in-memory: this API runs as a single local/demo process, so small fixed-window
// counters are enough to stop OTP spam and code guessing without Redis, a new database table or
// any other infrastructure. Nothing here logs identifiers or codes, and the throttling replies are
// identical for known and unknown identifiers, so they never disclose whether an account exists.
const OTP_SEND_WINDOW_MS = 15 * 60 * 1000
const OTP_SEND_MAX_PER_IDENTIFIER = 5
const OTP_SEND_MAX_PER_IP = 20
const OTP_VERIFY_MAX_ATTEMPTS = 5

const otpSendHits = new Map()    // key -> timestamps of recent sends
const otpVerifyHits = new Map()  // key -> timestamps of recent failed verifications

function clientIp(req) {
  return String(req.ip || (req.socket && req.socket.remoteAddress) || 'unknown')
}

// Keep only the hits still inside the window, and drop the key entirely once it is empty.
function liveHits(store, key, windowMs) {
  const now = Date.now()
  const live = (store.get(key) || []).filter((at) => now - at < windowMs)
  if (live.length) store.set(key, live)
  else store.delete(key)
  return live
}

function otpSendCount(key) {
  return liveHits(otpSendHits, key, OTP_SEND_WINDOW_MS).length
}

function otpSendRecord(key) {
  const hits = liveHits(otpSendHits, key, OTP_SEND_WINDOW_MS)
  hits.push(Date.now())
  otpSendHits.set(key, hits)
}

function otpSendClear(key) {
  otpSendHits.delete(key)
}

// Verification guesses are capped for as long as the code could still be live (OTP_TTL_MS).
function otpVerifyCount(key) {
  return liveHits(otpVerifyHits, key, OTP_TTL_MS).length
}

function otpVerifyRecord(key) {
  const hits = liveHits(otpVerifyHits, key, OTP_TTL_MS)
  hits.push(Date.now())
  otpVerifyHits.set(key, hits)
}

function otpVerifyClear(key) {
  otpVerifyHits.delete(key)
}

// Housekeeping so the maps cannot grow without bound on a long-running local server.
const otpThrottleSweep = setInterval(() => {
  const now = Date.now()
  for (const [key, hits] of otpSendHits) if (!hits.some((at) => now - at < OTP_SEND_WINDOW_MS)) otpSendHits.delete(key)
  for (const [key, hits] of otpVerifyHits) if (!hits.some((at) => now - at < OTP_TTL_MS)) otpVerifyHits.delete(key)
}, 60 * 1000)
if (typeof otpThrottleSweep.unref === 'function') otpThrottleSweep.unref()

app.post('/api/auth/otp/request', (req, res) => {
  const identifier = normalizeIdentifier(req.body?.identifier)
  if (!identifier) return res.status(400).json({ error: 'Phone number or email is required' })
  // Throttle before generating anything, and answer the same way for every identifier.
  if (otpSendCount(`id:${identifier}`) >= OTP_SEND_MAX_PER_IDENTIFIER || otpSendCount(`ip:${clientIp(req)}`) >= OTP_SEND_MAX_PER_IP) {
    return res.status(429).json({ error: 'Too many OTP requests. Please wait before requesting another code.' })
  }
  const code = String(Math.floor(100000 + Math.random() * 900000))
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString()
  db.prepare('INSERT INTO otp_codes (identifier, code, expires_at, used) VALUES (?, ?, ?, 0)').run(identifier, code, expiresAt)
  console.log(`[DEV OTP] Code for ${identifier}: ${code}`)
  otpSendRecord(`id:${identifier}`)
  otpSendRecord(`ip:${clientIp(req)}`)
  res.json({ message: 'OTP generated. Check the server console.' })
})

app.post('/api/auth/otp/verify', (req, res) => {
  const identifier = normalizeIdentifier(req.body?.identifier)
  const code = String(req.body?.code || '').trim()
  if (!identifier || !/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Identifier and 6-digit code are required' })
  const otp = db.prepare('SELECT * FROM otp_codes WHERE identifier = ? AND used = 0 ORDER BY id DESC LIMIT 1').get(identifier)
  // Cap guesses per issued code; 'none' also covers identifiers with no pending code, so the
  // endpoint cannot be used to probe which identifiers exist.
  const attemptKey = `otp:${otp ? otp.id : 'none'}:${identifier}`
  if (otpVerifyCount(attemptKey) >= OTP_VERIFY_MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'Too many verification attempts. Please request a new code.' })
  }
  if (!otp || otp.code !== code || new Date(otp.expires_at).getTime() < Date.now()) {
    otpVerifyRecord(attemptKey)
    return res.status(401).json({ error: 'Invalid or expired OTP' })
  }
  db.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').run(otp.id)
  // A successful verification clears this code's attempt counter and the identifier's send throttle.
  otpVerifyClear(attemptKey)
  otpSendClear(`id:${identifier}`)

  let user = findUserByIdentifier(identifier)
  if (!user) {
    const column = identifierColumn(identifier)
    const name = column === 'email' ? identifier.split('@')[0] : `Craftsperson ${identifier.slice(-4)}`
    const result = db.prepare(`INSERT INTO users (name, ${column}, role) VALUES (?, ?, 'operator')`).run(name, identifier)
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid)
  }
  issueSession(res, user)
  res.json({ user: publicUser(user) })
})

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('karigar_session', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' })
  res.json({ ok: true })
})

app.get('/api/auth/me', (req, res) => {
  const session = readSession(req)
  if (!session) return res.status(401).json({ user: null })
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.sub)
  if (!user) return res.status(401).json({ user: null })
  res.json({ user: publicUser(user) })
})

// --- Legacy /api/scan upload validation (audit P2-14) ---------------------------------
// The vision service decodes uploads with Pillow and the browser pickers use accept="image/*",
// so the allow-list covers the raster formats that pipeline really handles. SVG is deliberately
// excluded: it is not a raster image and Pillow cannot decode it.
const SCAN_ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
  'image/bmp', 'image/x-ms-bmp', 'image/tiff', 'image/avif'
])

function isAllowedScanImageType(mimetype) {
  return SCAN_ALLOWED_IMAGE_TYPES.has(String(mimetype || '').trim().toLowerCase())
}

// Magic-byte check: a declared image MIME type is not enough, because the header is client
// controlled. Anything that is not recognisably a supported image is refused before it is
// forwarded. Only the leading bytes are inspected; the file is never decoded here.
function looksLikeSupportedImage(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return false
  const ascii = (start, end) => buffer.subarray(start, end).toString('latin1')
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true                 // JPEG
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return true // PNG
  if (ascii(0, 4) === 'GIF8') return true                                                        // GIF87a / GIF89a
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return true                             // WEBP
  if (ascii(0, 2) === 'BM') return true                                                          // BMP
  if (ascii(0, 4) === 'II*\u0000' || ascii(0, 4) === 'MM\u0000*') return true                              // TIFF (LE/BE)
  if (ascii(4, 8) === 'ftyp' && ['avif', 'avis', 'heic', 'heix', 'mif1', 'msf1'].includes(ascii(8, 12))) return true
  return false
}

app.post('/api/scan', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'An image file is required' })
  if (!isAllowedScanImageType(req.file.mimetype)) {
    return res.status(400).json({ error: 'The uploaded file must be a supported image (JPEG, PNG, WEBP, GIF, BMP, TIFF or AVIF)' })
  }
  if (!looksLikeSupportedImage(req.file.buffer)) {
    return res.status(400).json({ error: 'The uploaded file is not a readable image' })
  }
  try {
    const form = new FormData()
    form.append('file', new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname)
    const response = await fetch(VISION_URL, { method: 'POST', body: form, headers: visionHeaders() })
    const body = await response.text()
    res.status(response.status).type('application/json').send(body)
  } catch (error) {
    console.error('Vision service request failed:', error.message)
    res.status(502).json({ error: 'Vision service unavailable. Start the Python service on port 8000.' })
  }
})

app.use('/api/enhance', enhanceRouter)

app.use('/api/pricing', pricingRouter)
const catalogerRouter = require('./routes/cataloger')
app.use('/api/cataloger', catalogerRouter)

// Final error handler: turns rejections escaped from async routes into responses.
app.use((error, req, res, next) => {
  if (isUniqueConstraintError(error)) return res.status(409).json({ error: 'An account already exists for that identifier' })
  console.error('Unhandled request error:', error.message)
  res.status(500).json({ error: 'Unexpected server error' })
})

module.exports = app
