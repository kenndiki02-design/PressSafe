'use strict'

const { audit, body, dbRequest, handleError, method, requireUser, send } = require('../lib/server')

module.exports = async function notifications(req, res) {
  try {
    const user = await requireUser(req, res)
    if (!user) return
    if (req.method === 'GET') {
      const result = await dbRequest('notifications', `user_id=eq.${encodeURIComponent(user.id)}&select=id,category,title,message,read_at,created_at&order=created_at.desc&limit=100`)
      return send(res, 200, { notifications: result.data || [] })
    }
    if (req.method === 'PATCH') {
      const input = await body(req)
      const ids = Array.isArray(input.ids) ? input.ids.filter((id) => /^[0-9a-f-]{36}$/i.test(String(id))).slice(0, 100) : []
      if (!ids.length) return send(res, 400, { error: 'At least one valid notification ID is required.' })
      const result = await dbRequest('notifications', `id=in.(${ids.map(encodeURIComponent).join(',')})&user_id=eq.${encodeURIComponent(user.id)}&select=id`, {
        method: 'PATCH', prefer: 'return=representation', body: { read_at: new Date().toISOString() },
      })
      await audit(user, 'NOTIFICATIONS_MARKED_READ', 'notification', null, { count: result.data?.length || 0 })
      return send(res, 200, { updated: result.data?.length || 0 })
    }
    return method(req, res, ['GET', 'PATCH'])
  } catch (error) { handleError(res, error) }
}