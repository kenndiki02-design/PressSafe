'use strict'

const { audit, body, dbRequest, handleError, method, notifyOrganization, requireUser, scopedFilter, send } = require('../lib/server')

const types = new Set(['TEXT', 'URL', 'IMAGE', 'VIDEO', 'DOCUMENT'])

module.exports = async function verification(req, res) {
  try {
    const user = await requireUser(req, res)
    if (!user) return
    if (req.method === 'GET') {
      if (user.role === 'MEDIA_BODY') {
        if (!user.organization_id) return send(res, 200, { count: 0, byTopic: [], byStatus: [] })
        const result = await dbRequest('verification_requests', `organization_id=eq.${encodeURIComponent(user.organization_id)}&select=topic,status&limit=1000`)
        const byTopic = new Map()
        const byStatus = new Map()
        for (const record of result.data || []) {
          byTopic.set(record.topic, (byTopic.get(record.topic) || 0) + 1)
          byStatus.set(record.status, (byStatus.get(record.status) || 0) + 1)
        }
        return send(res, 200, { count: result.data?.length || 0, byTopic: [...byTopic].map(([topic, count]) => ({ topic, count })), byStatus: [...byStatus].map(([status, count]) => ({ status, count })) })
      }
      if (!['JOURNALIST', 'EDITOR', 'FACT_CHECKER', 'ADMIN'].includes(user.role)) return send(res, 403, { error: 'Your role cannot view claim records.' })
      const filter = scopedFilter(user, 'submitted_by')
      const result = await dbRequest('verification_requests', `${filter ? `${filter}&` : ''}select=id,submitted_by,organization_id,case_id,input_type,claim_text,topic,status,created_at,updated_at&order=created_at.desc&limit=100`)
      return send(res, 200, { requests: result.data || [] })
    }
    if (!method(req, res, ['GET', 'POST'])) return
    if (!['JOURNALIST', 'EDITOR', 'FACT_CHECKER', 'ADMIN'].includes(user.role)) return send(res, 403, { error: 'Your role cannot submit claim records.' })
    const input = await body(req)
    const claimText = String(input.claimText || '').trim()
    const inputType = String(input.inputType || 'TEXT').toUpperCase()
    const topic = String(input.topic || 'General').trim().slice(0, 100)
    if (!types.has(inputType)) return send(res, 400, { error: 'Unsupported verification input type.' })
    if (claimText.length < 8 || claimText.length > 12000) return send(res, 400, { error: 'Claim text must be between 8 and 12,000 characters.' })
    if (input.caseId) {
      const caseResult = await dbRequest('cases', `id=eq.${encodeURIComponent(input.caseId)}&select=id,owner_id,organization_id`)
      const record = caseResult.data?.[0]
      if (!record || (record.owner_id !== user.id && (!user.organization_id || record.organization_id !== user.organization_id))) return send(res, 404, { error: 'Case not found.' })
    }
    const result = await dbRequest('verification_requests', '', {
      method: 'POST', prefer: 'return=representation',
      body: { submitted_by: user.id, organization_id: user.organization_id, case_id: input.caseId || null, input_type: inputType, claim_text: claimText, topic, status: 'PENDING' },
    })
    const request = result.data?.[0]
    if (!request) throw new Error('Verification request was not returned.')
    await dbRequest('review_tasks', '', {
      method: 'POST', prefer: 'return=minimal',
      body: { request_id: request.id, organization_id: user.organization_id, status: 'PENDING', priority: topic.toLowerCase().includes('climate') ? 1 : 0 },
    })
    await audit(user, 'VERIFICATION_SUBMITTED', 'verification_request', request.id)
    await notifyOrganization(user.organization_id, ['FACT_CHECKER', 'EDITOR'], user.id, 'VERIFICATION', 'New claim needs review', 'A journalist submitted a claim for manual review.')
    return send(res, 201, { request, message: 'Claim saved as pending. No fact-checking provider is configured, so no factual assessment was made.' })
  } catch (error) { handleError(res, error) }
}