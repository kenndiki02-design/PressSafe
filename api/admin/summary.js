'use strict'

const { dbRequest, handleError, method, requireUser, send } = require('../../lib/server')

async function count(table) {
  const result = await dbRequest(table, 'select=id', { prefer: 'count=exact', range: '0-0' })
  const contentRange = result.headers.get('content-range') || ''
  const total = Number(contentRange.split('/').pop())
  return Number.isFinite(total) ? total : 0
}

module.exports = async function adminSummary(req, res) {
  if (!method(req, res, ['GET'])) return
  try {
    const user = await requireUser(req, res, ['ADMIN'])
    if (!user) return
    const [users, organizations, verifications, incidents, sosEvents, privacyRequests, auditRecords] = await Promise.all([
      count('profiles'), count('organizations'), count('verification_requests'), count('incidents'),
      count('sos_events'), count('privacy_requests'), count('audit_logs'),
    ])
    return send(res, 200, { users, organizations, verifications, incidents, sosEvents, privacyRequests, auditRecords })
  } catch (error) { handleError(res, error) }
}