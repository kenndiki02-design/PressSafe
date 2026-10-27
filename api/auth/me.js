'use strict'

const { handleError, method, requireUser, send } = require('../../lib/server')

module.exports = async function me(req, res) {
  if (!method(req, res, ['GET'])) return
  try {
    const user = await requireUser(req, res)
    if (user) send(res, 200, { user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, organization_id: user.organization_id, preferred_locale: user.preferred_locale, simplified_mode: user.simplified_mode, consented_at: user.consented_at } })
  } catch (error) { handleError(res, error) }
}