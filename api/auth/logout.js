'use strict'

const { authRequest, clearSessionCookies, cookies, handleError, method, send } = require('../../lib/server')

module.exports = async function logout(req, res) {
  if (!method(req, res, ['POST'])) return
  try {
    const token = cookies(req).ps_access
    if (token) await authRequest('logout', { method: 'POST', token }).catch(() => {})
    clearSessionCookies(req, res)
    return send(res, 200, { message: 'Signed out.' })
  } catch (error) { handleError(res, error) }
}