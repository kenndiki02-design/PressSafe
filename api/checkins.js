'use strict'

const { audit, body, dbRequest, handleError, method, requireUser, send } = require('../lib/server')

module.exports = async function checkins(req, res) {
  try {
    const user = await requireUser(req, res)
    if (!user) return
    if (req.method === 'GET') {
      const teamScope = req.query?.scope === 'organization' && ['EDITOR', 'ADMIN'].includes(user.role)
      if (req.query?.scope === 'organization' && !teamScope) return send(res, 403, { error: 'Organization check-in access is restricted to editors and admins.' })
      if (teamScope && user.role !== 'ADMIN' && !user.organization_id) return send(res, 403, { error: 'This account has no organization.' })
      const scope = teamScope ? user.role === 'ADMIN' ? '' : `organization_id=eq.${encodeURIComponent(user.organization_id)}&` : `user_id=eq.${encodeURIComponent(user.id)}&`
      const result = await dbRequest('checkin_timers', `${scope}status=eq.ACTIVE&select=id,user_id,organization_id,label,due_at,status,created_at&order=due_at.asc&limit=200`)
      return send(res, 200, { checkins: result.data || [] })
    }
    if (req.method === 'POST') {
      const input = await body(req)
      const minutes = Number(input.minutes || 60)
      const label = String(input.label || '').trim().slice(0, 120)
      if (!Number.isInteger(minutes) || minutes < 5 || minutes > 1440) return send(res, 400, { error: 'Check-in interval must be between 5 minutes and 24 hours.' })
      const dueAt = new Date(Date.now() + minutes * 60_000).toISOString()
      const result = await dbRequest('checkin_timers', '', { method: 'POST', prefer: 'return=representation', body: { user_id: user.id, organization_id: user.organization_id, label: label || null, due_at: dueAt } })
      const checkin = result.data?.[0]
      await audit(user, 'CHECKIN_STARTED', 'checkin_timer', checkin?.id)
      return send(res, 201, { checkin, alertingConfigured: false, warning: 'The timer is recorded, but no scheduled job or missed-check-in notification is configured.' })
    }
    if (req.method === 'PATCH') {
      const input = await body(req)
      const id = String(input.id || '')
      const action = String(input.action || '')
      if (!/^[0-9a-f-]{36}$/i.test(id) || !['check_in', 'cancel'].includes(action)) return send(res, 400, { error: 'Provide a valid timer ID and action.' })
      const result = await dbRequest('checkin_timers', `id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(user.id)}&status=eq.ACTIVE`, {
        method: 'PATCH', prefer: 'return=representation', body: { status: action === 'check_in' ? 'CHECKED_IN' : 'CANCELLED', checked_in_at: action === 'check_in' ? new Date().toISOString() : null },
      })
      const checkin = result.data?.[0]
      if (!checkin) return send(res, 404, { error: 'Active check-in not found.' })
      await audit(user, `CHECKIN_${action.toUpperCase()}`, 'checkin_timer', id)
      return send(res, 200, { checkin, alertingConfigured: false })
    }
    return method(req, res, ['GET', 'POST', 'PATCH'])
  } catch (error) { handleError(res, error) }
}