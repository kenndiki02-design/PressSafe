'use strict'

const { audit, body, dbRequest, handleError, method, requireUser, send } = require('../lib/server')

const reviewers = ['FACT_CHECKER', 'EDITOR', 'ADMIN']
const decisions = new Set(['VERIFIED', 'REQUIRES_FURTHER_REVIEW', 'UNVERIFIED'])

module.exports = async function reviews(req, res) {
  try {
    const user = await requireUser(req, res, reviewers)
    if (!user) return
    if (req.method === 'GET') {
      if (user.role !== 'ADMIN' && !user.organization_id) return send(res, 200, { reviews: [] })
      const scope = user.role === 'ADMIN' ? '' : `organization_id=eq.${encodeURIComponent(user.organization_id)}&`
      const result = await dbRequest('review_tasks', `${scope}select=id,request_id,assigned_to,status,decision,notes,priority,created_at,completed_at&order=priority.desc,created_at.asc&limit=100`)
      const tasks = result.data || []
      const requestIds = tasks.map((task) => task.request_id)
      let requests = []
      if (requestIds.length) {
        const requestResult = await dbRequest('verification_requests', `id=in.(${requestIds.map(encodeURIComponent).join(',')})&select=id,claim_text,input_type,topic,status,created_at`)
        requests = requestResult.data || []
      }
      return send(res, 200, { reviews: tasks.map((task) => ({ ...task, request: requests.find((record) => record.id === task.request_id) || null })) })
    }
    if (!method(req, res, ['GET', 'PATCH'])) return
    const input = await body(req)
    const id = String(input.id || '')
    const decision = String(input.decision || '').toUpperCase()
    const notes = String(input.notes || '').trim()
    if (!/^[0-9a-f-]{36}$/i.test(id) || !decisions.has(decision)) return send(res, 400, { error: 'Provide a valid task ID and review decision.' })
    if (notes.length > 8000) return send(res, 400, { error: 'Review notes must be under 8,000 characters.' })
    const scope = user.role === 'ADMIN' ? '' : `organization_id=eq.${encodeURIComponent(user.organization_id || '')}&`
    const updated = await dbRequest('review_tasks', `id=eq.${encodeURIComponent(id)}&${scope}select=id,request_id,status,decision,notes,assigned_to,organization_id`, {
      method: 'PATCH', prefer: 'return=representation',
      body: { assigned_to: user.id, status: decision === 'REQUIRES_FURTHER_REVIEW' ? 'IN_REVIEW' : 'COMPLETED', decision, notes: notes || null, completed_at: decision === 'REQUIRES_FURTHER_REVIEW' ? null : new Date().toISOString() },
    })
    const task = updated.data?.[0]
    if (!task) return send(res, 404, { error: 'Review task not found in your organization.' })
    await dbRequest('verification_requests', `id=eq.${encodeURIComponent(task.request_id)}&select=id`, { method: 'PATCH', prefer: 'return=minimal', body: { status: decision } })
    await audit(user, 'REVIEW_DECIDED', 'review_task', id, { decision })
    return send(res, 200, { task })
  } catch (error) { handleError(res, error) }
}