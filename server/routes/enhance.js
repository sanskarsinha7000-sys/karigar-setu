// Phase 2: AI Image Studio — forwards enhancement requests to the FastAPI vision
// service (/enhance). Mirrors the /api/scan pattern: multer memory storage, 10 MB cap,
// global fetch/FormData, no persistence, no new storage system.
const express = require('express')
const multer = require('multer')

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })
const VISION_ENHANCE_URL = process.env.VISION_ENHANCE_URL || 'http://localhost:8000/enhance'
// Internal credential for the local vision service (audit P2-15). Read from the process
// environment only; never logged and never returned to a client.
const VISION_INTERNAL_TOKEN = (process.env.VISION_INTERNAL_TOKEN || '').trim()
const visionHeaders = () => (VISION_INTERNAL_TOKEN ? { 'x-vision-token': VISION_INTERNAL_TOKEN } : {})

// Only these option fields are forwarded to the vision service.
const OPTION_FIELDS = ['remove_background', 'lighting', 'white_balance', 'denoise', 'sharpen', 'ecommerce_format', 'background']

router.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'An image file is required' })
  if (!req.file.mimetype || !req.file.mimetype.startsWith('image/')) {
    return res.status(400).json({ error: 'The uploaded file must be an image' })
  }

  try {
    const form = new FormData()
    form.append('file', new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname)
    for (const field of OPTION_FIELDS) {
      const value = req.body?.[field]
      if (value !== undefined && value !== null && String(value).length <= 32) form.append(field, String(value))
    }
    const response = await fetch(VISION_ENHANCE_URL, { method: 'POST', body: form, headers: visionHeaders() })
    const body = await response.text()
    res.status(response.status).type('application/json').send(body)
  } catch (error) {
    console.error('Vision enhance request failed:', error.message)
    res.status(502).json({ error: 'Vision service unavailable. Start the Python service on port 8000.' })
  }
})

module.exports = router
