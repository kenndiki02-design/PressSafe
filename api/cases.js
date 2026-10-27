'use strict'

const { audit, body, dbRequest, handleError, method, requireUser, send } = require('../lib/server')

module.exports = async function cases(req, res) {
  try {
    const user = await requireUser(req, res)
    if (!user) return
    if (req.method === 'GET') {
      const filter = user.role === 'ADMIN' ? '' : user.organization_id && ['EDITOR', 'FACT_CHECKER'].includes(user.role)
        ? `organization_id=eq.${encodeURIComponent(user.organization_id)}`
        : `owner_id=eq.${encodeURIComponent(user.id)}`
      const result = await dbRequest('cases', `${filter ? `${filter}&` : ''}select=id,organization_id,owner_id,title,description,status,created_at,updated_at&order=updated_at.desc&limit=100`)
      return send(res, 200, { cases: result.data || [] })
    }
    if (!method(req, res, ['GET', 'POST'])) return
    const input = await body(req)
    const title = String(input.title || '').trim()
    const description = String(input.description || '').trim()
    if (title.length < 2 || title.length > 200) return send(res, 400, { error: 'Case title must be between 2 and 200 characters.' })
    if (description.length > 4000) return send(res, 400, { error: 'Case description must be under 4,000 characters.' })
    const result = await dbRequest('cases', '', { method: 'POST', prefer: 'return=representation', body: { owner_id: user.id, organization_id: user.organization_id, title, description: description || null } })
    const record = result.data?.[0]
    if (!record) throw new Error('Case was not returned.')
    await audit(user, 'CASE_CREATED', 'case', record.id)
    return send(res, 201, { case: record })
  } catch (error) { handleError(res, error) }
}