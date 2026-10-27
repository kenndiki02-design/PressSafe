'use strict'

const { audit, body, dbRequest, handleError, method, requireUser, send } = require('../lib/server')

const requestTypes = new Set(['ACCESS', 'CORRECTION', 'DELETION', 'PORTABILITY'])

module.exports = async function privacy(req, res) {
  try {
    const user = await requireUser(req, res)
    if (!user) return
    if (req.method === 'GET') {
      const filter = user.role === 'ADMIN' ? '' : `user_id=eq.${encodeURIComponent(user.id)}&`
      const result = await dbRequest('privacy_requests', `${filter}select=id,user_id,organization_id,request_type,details,status,created_at,resolved_at&order=created_at.desc&limit=100`)
      return send(res, 200, { requests: result.data || [] })
    }
    if (req.method === 'PATCH') {
      const admin = user.role === 'ADMIN'
      if (!admin) return send(res, 403, { error: 'Platform admin access is required to resolve privacy requests.' })
      const input = await body(req)
      const id = String(input.id || '')
      const status = String(input.status || '').toUpperCase()
      if (!/^[0-9a-f-]{36}$/i.test(id) || !['IN_REVIEW', 'COMPLETED', 'REJECTED'].includes(status)) return send(res, 400, { error: 'Provide a valid request ID and resolution status.' })
      const result = await dbRequest('privacy_requests', `id=eq.${encodeURIComponent(id)}&select=id,user_id,request_type,status`, {
        method: 'PATCH', prefer: 'return=representation',
        body: { status, resolved_at: status === 'COMPLETED' || status === 'REJECTED' ? new Date().toISOString() : null, resolved_by: user.id },
      })
      const request = result.data?.[0]
      if (!request) return send(res, 404, { error: 'Privacy request not found.' })
      await audit(user, 'PRIVACY_REQUEST_UPDATED', 'privacy_request', id, { status })
      return send(res, 200, { request })
    }
    if (!method(req, res, ['GET', 'POST', 'PATCH'])) return
    const input = await body(req)
    const requestType = String(input.type || '').toUpperCase()
    const details = String(input.details || '').trim()
    if (!requestTypes.has(requestType)) return send(res, 400, { error: 'Choose access, correction, deletion, or portability.' })
    if (details.length > 4000) return send(res, 400, { error: 'Details must be under 4,000 characters.' })
    const result = await dbRequest('privacy_requests', '', {
      method: 'POST', prefer: 'return=representation',
      body: { user_id: user.id, organization_id: user.organization_id, request_type: requestType, details: details || null },
    })
    const request = result.data?.[0]
    if (!request) throw new Error('Privacy request was not returned.')
    await audit(user, 'PRIVACY_REQUEST_SUBMITTED', 'privacy_request', request.id, { type: requestType })
    return send(res, 201, { request, message: 'Privacy request recorded. A responsible administrator must review and fulfill it.' })
  } catch (error) { handleError(res, error) }
}