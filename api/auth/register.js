'use strict'

const { adminAuthRequest, audit, authRequest, body, dbRequest, handleError, method, send, setSessionCookies } = require('../../lib/server')
const { createHash } = require('node:crypto')

const allowedRoles = new Set(['JOURNALIST', 'EDITOR', 'FACT_CHECKER', 'MEDIA_BODY', 'ADMIN'])

function safeEqual(left, right) {
  const crypto = require('node:crypto')
  const a = Buffer.from(String(left || ''))
  const b = Buffer.from(String(right || ''))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

module.exports = async function register(req, res) {
  if (!method(req, res, ['POST'])) return
  try {
    const input = await body(req)
    const fullName = String(input.fullName || '').trim()
    const email = String(input.email || '').trim().toLowerCase()
    const password = String(input.password || '')
    const role = String(input.role || 'JOURNALIST')
    const locale = input.locale === 'sw' ? 'sw' : 'en'

    if (fullName.length < 2 || fullName.length > 160) return send(res, 400, { error: 'Enter a name between 2 and 160 characters.' })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return send(res, 400, { error: 'Enter a valid email address.' })
    if (password.length < 12 || password.length > 128) return send(res, 400, { error: 'Password must be 12 to 128 characters.' })
    if (!allowedRoles.has(role)) return send(res, 400, { error: 'Choose a supported account type.' })
    if (input.consent !== true) return send(res, 400, { error: 'Consent is required before creating an account.' })

    const adminCode = process.env.ADMIN_INVITE_CODE
    if (role === 'ADMIN' && (!adminCode || !safeEqual(input.inviteCode, adminCode))) {
      return send(res, 403, { error: 'Admin registration requires a valid organization invite.' })
    }

    const organizationInviteRequired = ['EDITOR', 'FACT_CHECKER', 'MEDIA_BODY'].includes(role)
    if (organizationInviteRequired && String(input.inviteCode || '').length < 16) {
      return send(res, 403, { error: 'This account type requires an organization-issued invite.' })
    }
    let organization = null
    if (role === 'MEDIA_BODY') {
      if (String(input.inviteCode || '').length < 16) return send(res, 403, { error: 'Media-body registration requires a valid organization invite.' })
    }

    const signup = await authRequest('signup', {
      method: 'POST',
      body: { email, password, data: { full_name: fullName, role } },
    })
    const authUser = signup.user || signup
    if (!authUser.id) throw new Error('The identity provider did not return a user identifier.')

    try {
      if (organizationInviteRequired || (role === 'JOURNALIST' && input.inviteCode)) {
        const inviteHash = createHash('sha256').update(String(input.inviteCode)).digest('hex')
        const redeemed = await dbRequest('rpc/redeem_org_invite', '', { method: 'POST', body: { p_invite_hash: inviteHash, p_role: role } })
        const invite = redeemed.data?.[0]
        if (!invite?.org_id) {
          const error = new Error('This organization invite is invalid, expired, exhausted, or for a different account type.')
          error.status = 403
          throw error
        }
        organization = { id: invite.org_id }
        if (role === 'MEDIA_BODY') {
          const organizationResult = await dbRequest('organizations', `id=eq.${encodeURIComponent(organization.id)}&select=id,org_type`)
          if (organizationResult.data?.[0]?.org_type !== 'MEDIA_BODY') {
            const error = new Error('This invite is not for a media-body organization.')
            error.status = 403
            throw error
          }
        }
      }
      const createdProfile = await dbRequest('profiles', '', {
        method: 'POST',
        prefer: 'return=representation',
        body: {
          id: authUser.id,
          email,
          full_name: fullName,
          role,
          organization_id: organization?.id || null,
          preferred_locale: locale,
          consented_at: new Date().toISOString(),
        },
      })
      const profile = createdProfile.data?.[0]
      if (!profile) throw new Error('Profile creation failed.')

      if (signup.access_token && signup.refresh_token) {
        setSessionCookies(req, res, signup)
        await audit(profile, 'ACCOUNT_REGISTERED', 'profile', profile.id)
        return send(res, 201, { message: 'Account created.', requiresEmailConfirmation: false, user: profile })
      }
      await audit(profile, 'ACCOUNT_REGISTERED', 'profile', profile.id)
      return send(res, 201, { message: 'Account created. Verify your email before signing in.', requiresEmailConfirmation: true, user: profile })
    } catch (error) {
      await adminAuthRequest(`users/${encodeURIComponent(authUser.id)}`, { method: 'DELETE' }).catch(() => {})
      throw error
    }
  } catch (error) { handleError(res, error) }
}