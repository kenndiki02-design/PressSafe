'use strict'

const MAX_BODY_BYTES = 1024 * 1024
const ACCESS_COOKIE = 'ps_access'
const REFRESH_COOKIE = 'ps_refresh'

function config() {
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anonKey || !serviceKey) {
    const error = new Error('Supabase is not configured for this deployment.')
    error.status = 503
    throw error
  }
  return { url: url.replace(/\/$/, ''), anonKey, serviceKey }
}

function send(res, status, payload, headers = {}) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  for (const [name, value] of Object.entries(headers)) res.setHeader(name, value)
  res.end(JSON.stringify(payload))
}

function method(req, res, allowed) {
  if (allowed.includes(req.method)) return true
  send(res, 405, { error: 'Method not allowed.' }, { Allow: allowed.join(', ') })
  return false
}

async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body
  const chunks = []
  let length = 0
  for await (const chunk of req) {
    length += chunk.length
    if (length > MAX_BODY_BYTES) {
      const error = new Error('Request body is too large.')
      error.status = 413
      throw error
    }
    chunks.push(chunk)
  }
  if (!length) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    const error = new Error('Request body must be valid JSON.')
    error.status = 400
    throw error
  }
}

function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map((part) => {
    const separator = part.indexOf('=')
    if (separator < 0) return ['', '']
    return [part.slice(0, separator).trim(), decodeURIComponent(part.slice(separator + 1).trim())]
  }).filter(([name]) => name))
}

function cookieHeader(req, name, value, maxAge) {
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
}

function setSessionCookies(req, res, session) {
  const expires = Math.min(Number(session.expires_in) || 3600, 3600)
  res.setHeader('Set-Cookie', [
    cookieHeader(req, ACCESS_COOKIE, session.access_token, expires),
    cookieHeader(req, REFRESH_COOKIE, session.refresh_token, 60 * 60 * 24 * 30),
  ])
}

function clearSessionCookies(req, res) {
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''
  res.setHeader('Set-Cookie', [
    `${ACCESS_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
    `${REFRESH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
  ])
}

async function authRequest(path, options = {}) {
  const settings = config()
  const response = await fetch(`${settings.url}/auth/v1/${path}`, {
    method: options.method || 'GET',
    headers: {
      apikey: settings.anonKey,
      Authorization: `Bearer ${options.token || settings.anonKey}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(result.msg || result.message || result.error_description || result.error || 'Authentication request failed.')
    error.status = response.status
    throw error
  }
  return result
}

async function adminAuthRequest(path, options = {}) {
  const settings = config()
  const response = await fetch(`${settings.url}/auth/v1/admin/${path}`, {
    method: options.method || 'GET',
    headers: {
      apikey: settings.anonKey,
      Authorization: `Bearer ${settings.serviceKey}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(result.msg || result.message || result.error_description || 'Account administration failed.')
    error.status = response.status
    throw error
  }
  return result
}

async function dbRequest(table, query = '', options = {}) {
  const settings = config()
  const response = await fetch(`${settings.url}/rest/v1/${table}${query ? `?${query}` : ''}`, {
    method: options.method || 'GET',
    headers: {
      apikey: settings.anonKey,
      Authorization: `Bearer ${settings.serviceKey}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.prefer ? { Prefer: options.prefer } : {}),
      ...(options.range ? { Range: options.range } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  })
  const text = await response.text()
  let result
  try { result = text ? JSON.parse(text) : null } catch { result = text }
  if (!response.ok) {
    const error = new Error(result?.message || result?.details || 'Database request failed.')
    error.status = response.status >= 500 ? 502 : response.status
    throw error
  }
  return { data: result, headers: response.headers }
}

async function createEvidenceUpload(user) {
  const settings = config()
  const bucket = process.env.SUPABASE_EVIDENCE_BUCKET || 'presssafe-evidence'
  const objectKey = `${user.id}/${require('node:crypto').randomUUID()}.bin`
  const path = objectKey.split('/').map(encodeURIComponent).join('/')
  const response = await fetch(`${settings.url}/storage/v1/object/upload/sign/${encodeURIComponent(bucket)}/${path}`, {
    method: 'POST',
    headers: { apikey: settings.anonKey, Authorization: `Bearer ${settings.serviceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ upsert: false }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.token) {
    const error = new Error(result.message || 'Evidence storage is not configured.')
    error.status = response.status === 404 ? 503 : response.status
    throw error
  }
  const signedPath = result.signedURL || result.signedUrl
  const uploadUrl = signedPath.startsWith('http') ? signedPath : `${settings.url}/storage/v1${signedPath}`
  return { bucket, objectKey, uploadUrl, token: result.token }
}

async function currentUser(req, res) {
  const sessionCookies = cookies(req)
  let token = sessionCookies[ACCESS_COOKIE]
  if (!token) return null
  let authUser
  try {
    authUser = await authRequest('user', { token })
  } catch (error) {
    const refresh = sessionCookies[REFRESH_COOKIE]
    if (!refresh || error.status !== 401) return null
    try {
      const session = await authRequest('token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: refresh } })
      setSessionCookies(req, res, session)
      token = session.access_token
      authUser = session.user || await authRequest('user', { token })
    } catch { return null }
  }
  const profileResult = await dbRequest('profiles', `id=eq.${encodeURIComponent(authUser.id)}&select=id,full_name,email,role,organization_id,simplified_mode,preferred_locale,consented_at,is_active`)
  const profile = profileResult.data?.[0]
  return profile?.is_active ? { ...profile, authUser, token } : null
}
async function requireUser(req, res, allowedRoles = null) {
  let user
  try { user = await currentUser(req, res) } catch (error) {
    send(res, error.status || 503, { error: error.status === 503 ? error.message : 'Unable to verify your account.' })
    return null
  }
  if (!user) {
    send(res, 401, { error: 'Sign in to continue.' })
    return null
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    send(res, 403, { error: 'Your account does not have permission for this action.' })
    return null
  }
  return user
}

function scopedFilter(user, column = 'user_id') {
  if (user.role === 'ADMIN') return ''
  if (['EDITOR', 'FACT_CHECKER', 'MEDIA_BODY'].includes(user.role) && user.organization_id) {
    return `organization_id=eq.${encodeURIComponent(user.organization_id)}`
  }
  return `${column}=eq.${encodeURIComponent(user.id)}`
}

async function audit(user, action, resourceType, resourceId, metadata = {}) {
  await dbRequest('audit_logs', '', {
    method: 'POST',
    prefer: 'return=minimal',
    body: { actor_id: user?.id || null, organization_id: user?.organization_id || null, action, resource_type: resourceType, resource_id: resourceId || null, metadata },
  })
}

async function notifyUsers(userIds, organizationId, category, title, message) {
  const ids = [...new Set(userIds)].filter((id) => typeof id === 'string')
  if (!ids.length) return
  await dbRequest('notifications', '', {
    method: 'POST',
    prefer: 'return=minimal',
    body: ids.map((userId) => ({ user_id: userId, organization_id: organizationId || null, category, title, message })),
  })
}

async function notifyOrganization(organizationId, roles, excludeUserId, category, title, message) {
  if (!organizationId || !roles.length) return
  const result = await dbRequest('profiles', `organization_id=eq.${encodeURIComponent(organizationId)}&role=in.(${roles.join(',')})&is_active=eq.true&select=id&limit=200`)
  const ids = (result.data || []).map((profile) => profile.id).filter((id) => id !== excludeUserId)
  await notifyUsers(ids, organizationId, category, title, message)
}

function handleError(res, error) {
  const status = error.status || 500
  send(res, status, { error: status === 503 ? error.message : status >= 500 ? 'Service temporarily unavailable.' : error.message })
}

module.exports = {
  ACCESS_COOKIE,
  adminAuthRequest,
  audit,
  authRequest,
  body,
  clearSessionCookies,
  config,
  cookies,
  createEvidenceUpload,
  currentUser,
  dbRequest,
  handleError,
  method,
  requireUser,
  scopedFilter,
  send,
  setSessionCookies,
  notifyOrganization,
  notifyUsers,
}