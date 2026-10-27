'use strict'

const { dbRequest, handleError, method, requireUser, send } = require('../../lib/server')

module.exports = async function auditLogs(req, res) {
  if (!method(req, res, ['GET'])) return
  try {
    const user = await requireUser(req, res, ['ADMIN'])
    if (!user) return
    const limit = Math.max(1, Math.min(Number(req.query?.limit) || 50, 200))
    const offset = Math.max(0, Math.min(Number(req.query?.offset) || 0, 10000))
    const result = await dbRequest('audit_logs', `select=id,actor_id,organization_id,action,resource_type,resource_id,metadata,created_at&order=created_at.desc&limit=${limit}&offset=${offset}`)
    return send(res, 200, { logs: result.data || [], limit, offset })
  } catch (error) { handleError(res, error) }
}