'use strict'

const { audit, body, dbRequest, handleError, method, requireUser, send } = require('../lib/server')

module.exports = async function organizations(req, res) {
  try {
    const user = await requireUser(req, res)
    if (!user) return
    if (req.method === 'GET') {
      const filter = user.role === 'ADMIN' ? '' : user.organization_id ? `id=eq.${encodeURIComponent(user.organization_id)}&` : null
      if (filter === null) return send(res, 200, { organizations: [] })
      const result = await dbRequest('organizations', `${filter}select=id,name,org_type,country,created_at&order=name.asc&limit=200`)
      return send(res, 200, { organizations: result.data || [] })
    }
    if (!method(req, res, ['GET', 'POST'])) return
    if (user.role !== 'ADMIN') return send(res, 403, { error: 'Only a platform administrator can create organizations.' })
    const input = await body(req)
    const name = String(input.name || '').trim()
    const type = String(input.type || 'NEWSROOM').toUpperCase()
    const country = String(input.country || 'KE').trim().toUpperCase()
    if (name.length < 2 || name.length > 160) return send(res, 400, { error: 'Organization name must be between 2 and 160 characters.' })
    if (!['NEWSROOM', 'MEDIA_BODY', 'ACADEMIC', 'INDEPENDENT'].includes(type)) return send(res, 400, { error: 'Choose a supported organization type.' })
    if (!/^[A-Z]{2}$/.test(country)) return send(res, 400, { error: 'Country must be a two-letter ISO code.' })
    const result = await dbRequest('organizations', '', { method: 'POST', prefer: 'return=representation', body: { name, org_type: type, country } })
    const organization = result.data?.[0]
    if (!organization) throw new Error('Organization was not returned.')
    await audit(user, 'ORGANIZATION_CREATED', 'organization', organization.id)
    return send(res, 201, { organization })
  } catch (error) { handleError(res, error) }
}