'use strict'

const { audit, body, dbRequest, handleError, method, requireUser, send } = require('../lib/server')

module.exports = async function profile(req, res) {
  try {
    const user = await requireUser(req, res)
    if (!user) return
    if (req.method === 'GET') {
      return send(res, 200, { user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, organization_id: user.organization_id, preferred_locale: user.preferred_locale, simplified_mode: user.simplified_mode, consented_at: user.consented_at } })
    }
    if (!method(req, res, ['GET', 'PATCH'])) return
    const input = await body(req)
    const changes = {}
    if (input.preferred_locale !== undefined) {
      if (!['en', 'sw'].includes(input.preferred_locale)) return send(res, 400, { error: 'Choose English or Kiswahili.' })
      changes.preferred_locale = input.preferred_locale
    }
    if (input.simplified_mode !== undefined) {
      if (typeof input.simplified_mode !== 'boolean') return send(res, 400, { error: 'Simplified mode must be true or false.' })
      changes.simplified_mode = input.simplified_mode
    }
    if (!Object.keys(changes).length) return send(res, 400, { error: 'No supported profile preferences were provided.' })
    const updated = await dbRequest('profiles', `id=eq.${encodeURIComponent(user.id)}&select=id,email,full_name,role,organization_id,preferred_locale,simplified_mode,consented_at`, {
      method: 'PATCH', prefer: 'return=representation', body: changes,
    })
    const result = updated.data?.[0]
    if (!result) return send(res, 404, { error: 'Profile not found.' })
    await audit(user, 'PROFILE_PREFERENCES_UPDATED', 'profile', user.id, changes)
    return send(res, 200, { user: result })
  } catch (error) { handleError(res, error) }
}
