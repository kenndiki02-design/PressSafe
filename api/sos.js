'use strict'

const { audit, body, dbRequest, handleError, method, requireUser, send } = require('../lib/server')

module.exports = async function sos(req, res) {
  if (!method(req, res, ['GET', 'POST'])) return
  try {
    const user = await requireUser(req, res)
    if (!user) return
    if (req.method === 'GET') {
      const result = await dbRequest('sos_events', `user_id=eq.${encodeURIComponent(user.id)}&select=id,message,location_shared,status,created_at&order=created_at.desc&limit=50`)
      return send(res, 200, { events: result.data || [] })
    }
    const input = await body(req)
    const message = String(input.message || '').trim().slice(0, 500)
    const shareLocation = input.shareLocation === true
    const latitude = shareLocation && Number.isFinite(Number(input.latitude)) ? Number(input.latitude) : null
    const longitude = shareLocation && Number.isFinite(Number(input.longitude)) ? Number(input.longitude) : null
    if (shareLocation && (latitude === null || longitude === null || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)) {
      return send(res, 400, { error: 'Valid coordinates are required when you choose to share location.' })
    }
    const result = await dbRequest('sos_events', '', {
      method: 'POST', prefer: 'return=representation',
      body: { user_id: user.id, organization_id: user.organization_id, message: message || null, latitude, longitude, location_shared: shareLocation },
    })
    const event = result.data?.[0]
    if (!event) throw new Error('SOS event was not returned.')
    await audit(user, 'SOS_RECORDED', 'sos_event', event.id, { locationShared: shareLocation })
    return send(res, 202, { event, notificationDispatched: false, warning: 'SOS was recorded, but no contact or emergency service was notified. Configure and test a delivery provider before relying on alerts.' })
  } catch (error) { handleError(res, error) }
}