// Phase 4: Bhashini / ULCA provider for regional-language ASR + translation.
//
// STATUS: implemented against the documented ULCA flow but NOT live-verified here, because
// no Bhashini credentials are configured in this environment. Capability metadata always
// states honestly whether it is configured, and no result is ever fabricated.
//
// Credentials come ONLY from environment variables (never hard-coded, never committed):
//   BHASHINI_USER_ID                (required)
//   BHASHINI_ULCA_API_KEY           (required)
//   BHASHINI_PIPELINE_ID            (optional; used when asking ULCA for a pipeline)
//   BHASHINI_INFERENCE_API_KEY      (optional; skips the pipeline-auth call when supplied)
//   BHASHINI_INFERENCE_URL          (optional; callback URL paired with that key)
//   BHASHINI_ASR_SERVICE_ID         (optional; defaults to the serviceId ULCA returns)
//   BHASHINI_TRANSLATION_SERVICE_ID (optional; defaults to the serviceId ULCA returns)
//   BHASHINI_AUTH_URL               (optional; overrides the ULCA pipeline endpoint)
const NAME = 'bhashini'
const KIND = 'real-provider'
const DEFAULT_AUTH_URL = 'https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline'

function getConfig() {
  const userID = process.env.BHASHINI_USER_ID || ''
  const ulcaApiKey = process.env.BHASHINI_ULCA_API_KEY || ''
  const pipelineId = process.env.BHASHINI_PIPELINE_ID || ''
  const inferenceApiKey = process.env.BHASHINI_INFERENCE_API_KEY || ''
  const inferenceUrl = process.env.BHASHINI_INFERENCE_URL || ''
  const asrServiceId = process.env.BHASHINI_ASR_SERVICE_ID || ''
  const translationServiceId = process.env.BHASHINI_TRANSLATION_SERVICE_ID || ''
  const authUrl = process.env.BHASHINI_AUTH_URL || DEFAULT_AUTH_URL

  const missing = []
  if (!inferenceApiKey || !inferenceUrl) {
    if (!userID) missing.push('BHASHINI_USER_ID')
    if (!ulcaApiKey) missing.push('BHASHINI_ULCA_API_KEY')
  }
  return {
    userID,
    ulcaApiKey,
    pipelineId,
    inferenceApiKey,
    inferenceUrl,
    asrServiceId,
    translationServiceId,
    authUrl,
    missing,
    configured: missing.length === 0
  }
}

// Capability metadata for GET /api/cataloger/capabilities. `languages` stays empty even when
// configured: which languages a given Bhashini pipeline actually serves is not knowable from
// here, and guessing would be dishonest.
function getCapability() {
  const config = getConfig()
  return {
    provider: NAME,
    kind: KIND,
    stage: 'backend',
    configured: config.configured,
    available: config.configured,
    serverSide: true,
    supports: { asr: config.configured, translation: config.configured },
    languages: [],
    languageNote: config.configured
      ? 'Language coverage depends on the Bhashini pipeline behind these credentials; it is not assumed here.'
      : 'Set the BHASHINI_* environment variables to enable this provider.',
    reason: config.configured
      ? 'Bhashini credentials are present in the environment.'
      : `Not configured. Missing: ${config.missing.join(', ') || 'BHASHINI credentials'}.`,
    notes: [
      'Bhashini is a Government of India (MeitY) language platform: audio submitted to it leaves this application.',
      'This provider has not been exercised in this environment.'
    ]
  }
}

class ProviderUnavailableError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ProviderUnavailableError'
    this.code = 'PROVIDER_UNAVAILABLE'
    this.provider = NAME
  }
}

let cachedPipeline = null

async function resolvePipeline(config) {
  if (config.inferenceApiKey && config.inferenceUrl) {
    return {
      callbackUrl: config.inferenceUrl,
      inferenceApiKey: config.inferenceApiKey,
      asrServiceId: config.asrServiceId,
      translationServiceId: config.translationServiceId
    }
  }
  if (cachedPipeline) return cachedPipeline

  // Documented ULCA step 1: request the models pipeline, which returns the inference
  // callback URL, its inference key and the per-task serviceIds.
  const response = await fetch(config.authUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', userID: config.userID, ulcaApiKey: config.ulcaApiKey },
    body: JSON.stringify({
      pipelineTasks: [{ taskType: 'asr' }, { taskType: 'translation' }],
      pipelineRequestConfig: config.pipelineId ? { pipelineId: config.pipelineId } : {}
    })
  })
  if (!response.ok) throw new Error(`Bhashini pipeline auth failed (HTTP ${response.status})`)
  const data = await response.json()
  const endpoint = data?.pipelineInferenceAPIEndPoint || {}
  const serviceIds = {}
  for (const entry of data?.pipelineResponseConfig || []) {
    const taskType = entry?.taskType
    const serviceId = entry?.config?.[0]?.serviceId
    if (taskType && serviceId) serviceIds[taskType] = serviceId
  }
  cachedPipeline = {
    callbackUrl: endpoint.callbackUrl,
    inferenceApiKey: endpoint.inferenceApiKey?.value,
    asrServiceId: config.asrServiceId || serviceIds.asr || '',
    translationServiceId: config.translationServiceId || serviceIds.translation || ''
  }
  if (!cachedPipeline.callbackUrl || !cachedPipeline.inferenceApiKey) {
    throw new Error('Bhashini pipeline response did not include an inference endpoint and key')
  }
  return cachedPipeline
}

async function callInference(pipeline, taskType, config, inputData) {
  const response = await fetch(pipeline.callbackUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: pipeline.inferenceApiKey, userID: getConfig().userID },
    body: JSON.stringify({ pipelineTasks: [{ taskType, config }], inputData })
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`Bhashini ${taskType} failed (HTTP ${response.status}): ${text.slice(0, 200)}`)
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Bhashini ${taskType} returned a non-JSON response`)
  }
}

// Real provider transcription. Throws when unconfigured - it never returns a fake transcript.
async function transcribe({ buffer, mimetype, language }) {
  const config = getConfig()
  if (!config.configured) throw new ProviderUnavailableError(`Bhashini is not configured (${config.missing.join(', ') || 'missing credentials'})`)
  const pipeline = await resolvePipeline(config)
  const result = await callInference(
    pipeline,
    'asr',
    { language: { sourceLanguage: language }, ...(pipeline.asrServiceId ? { serviceId: pipeline.asrServiceId } : {}) },
    { audio: [{ audioContent: Buffer.from(buffer).toString('base64') }] }
  )
  const output = Array.isArray(result?.output) ? result.output.find((entry) => entry?.source !== undefined) : null
  const transcript = typeof output?.source === 'string' ? output.source.trim() : ''
  if (!transcript) throw new Error('Bhashini returned no transcript')
  return { provider: NAME, capability: 'speech-to-text', kind: KIND, language, text: transcript, isFallback: false, audioMimeType: mimetype || null }
}

// Real provider translation, used to build Hindi copy from English when available.
async function translate({ text, source, target }) {
  const config = getConfig()
  if (!config.configured) throw new ProviderUnavailableError(`Bhashini is not configured (${config.missing.join(', ') || 'missing credentials'})`)
  const pipeline = await resolvePipeline(config)
  const result = await callInference(
    pipeline,
    'translation',
    { language: { sourceLanguage: source, targetLanguage: target }, ...(pipeline.translationServiceId ? { serviceId: pipeline.translationServiceId } : {}) },
    { input: [{ source: text }] }
  )
  const output = Array.isArray(result?.output) ? result.output.find((entry) => entry?.target !== undefined) : null
  const translated = typeof output?.target === 'string' ? output.target.trim() : ''
  if (!translated) throw new Error('Bhashini returned no translation')
  return { provider: NAME, capability: 'translation', kind: KIND, language: target, text: translated, isFallback: false }
}

module.exports = { NAME, KIND, ProviderUnavailableError, getCapability, getConfig, transcribe, translate }
