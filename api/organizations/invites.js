'use strict'

const { createHash, randomBytes } = require('node:crypto')
const { audit, body, dbRequest, handleError, method, requireUser, send } = require('../../lib/server')

const roles = new Set(['JOURNALIST', 'EDITOR', 'FACT_CHECKER', 'MEDIA_BODY'])

module.exports = async function invites(req, res) {
  try {
    const user = await requireUser(req, res, ['ADMIN', 'EDITOR'])
    if (!user) return
    if (user.role !== 'ADMIN' && !user.organization_id) return send(res, 403, { error: 'Your account is not associated with an organization.' })
    const orgFilter = user.role === 'ADMIN' ? '' : `organization_id=eq.${encodeURIComponent(user.organization_id)}&`

    if (req.method === 'GET') {
      const result = await dbRequest('organization_invites', `${orgFilter}select=id,organization_id,invite_role,max_uses,uses,expires_at,created_at&order=created_at.desc&limit=100`)
      return send(res, 200, { invites: result.data || [] })
    }
    if (!method(req, res, ['GET', 'POST'])) return
    const input = await body(req)
    const role = String(input.role || 'JOURNALIST').toUpperCase()
    const organizationId = user.role === 'ADMIN' ? String(input.organizationId || '') : user.organization_id
    const maxUses = Number(input.maxUses || 1)
    const expiresDays = Number(input.expiresDays || 7)
    if (!roles.has(role)) return send(res, 400, { error: 'Invites may grant journalist, editor, fact-checker, or media-body roles.' })
    if (user.role !== 'ADMIN' && role === 'MEDIA_BODY') return send(res, 403, { error: 'Only a platform admin may invite another media-body administrator.' })
    if (!/^[0-9a-f-]{36}$/i.test(organizationId)) return send(res, 400, { error: 'A valid organization is required.' })
    if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 500) return send(res, 400, { error: 'Invite use limit must be from 1 to 500.' })
    if (!Number.isInteger(expiresDays) || expiresDays < 1 || expiresDays > 30) return send(res, 400, { error: 'Invite expiry must be from 1 to 30 days.' })

    const organization = await dbRequest('organizations', `id=eq.${encodeURIComponent(organizationId)}&select=id,org_type`)
    if (!organization.data?.length) return send(res, 404, { error: 'Organization not found.' })
    if (role === 'MEDIA_BODY' && organization.data[0].org_type !== 'MEDIA_BODY') return send(res, 400, { error: 'Media-body admin invites must belong to a media-body organization.' })
    const inviteCode = randomBytes(24).toString('base64url')
    const inviteHash = createHash('sha256').update(inviteCode).digest('hex')
    const expiresAt = new Date(Date.now() + expiresDays * 86400_000).toISOString()
    const result = await dbRequest('organization_invites', '', {
      method: 'POST', prefer: 'return=representation',
      body: { organization_id: organizationId, invite_hash: inviteHash, invite_role: role, max_uses: maxUses, expires_at: expiresAt, created_by: user.id },
    })
    const invite = result.data?.[0]
    if (!invite) throw new Error('Invite was not returned.')
    await audit(user, 'ORGANIZATION_INVITE_CREATED', 'organization_invite', invite.id, { role, maxUses })
    return send(res, 201, { invite: { id: invite.id, organization_id: organizationId, role, expires_at: expiresAt, max_uses: maxUses }, inviteCode, warning: 'Copy this invite code now. It cannot be retrieved again.' })
  } catch (error) { handleError(res, error) }
}