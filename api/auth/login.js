'use strict'

const { authRequest, body, dbRequest, handleError, method, send, setSessionCookies } = require('../../lib/server')

module.exports = async function login(req, res) {
  if (!method(req, res, ['POST'])) return
  try {
    const input = await body(req)
    const email = String(input.email || '').trim().toLowerCase()
    const password = String(input.password || '')
    if (!email || !password) return send(res, 400, { error: 'Email and password are required.' })

    const session = await authRequest('token?grant_type=password', { method: 'POST', body: { email, password } })
    if (!session.user?.id) return send(res, 401, { error: 'Email or password is incorrect.' })
    if (!session.user.email_confirmed_at) return send(res, 403, { error: 'Verify your email address before signing in.' })

    const profileResult = await dbRequest('profiles', `id=eq.${encodeURIComponent(session.user.id)}&select=id,email,full_name,role,organization_id,preferred_locale,simplified_mode,consented_at,is_active`)
    const profile = profileResult.data?.[0]
    if (!profile || !profile.is_active) return send(res, 403, { error: 'This account is inactive or its profile is unavailable.' })

    setSessionCookies(req, res, session)
    return send(res, 200, { user: profile })
  } catch (error) {
    if ([400, 401].includes(error.status)) return send(res, 401, { error: 'Email or password is incorrect.' })
    handleError(res, error)
  }
}