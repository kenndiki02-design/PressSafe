'use strict'

const { audit, body, dbRequest, handleError, method, notifyOrganization, requireUser, send } = require('../lib/server')

const incidentTypes = new Set(['THREAT', 'HARASSMENT', 'PHYSICAL_ATTACK', 'ARREST_DETENTION', 'EQUIPMENT_SEIZURE', 'ONLINE_ABUSE_DOXXING', 'LEGAL_ACTION', 'OTHER'])
const severities = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])

module.exports = async function incidents(req, res) {
  try {
    const user = await requireUser(req, res)
    if (!user) return
    if (req.method === 'POST' && !['JOURNALIST', 'EDITOR', 'ADMIN'].includes(user.role)) return send(res, 403, { error: 'Your role cannot submit journalist incident reports.' })
    if (req.method === 'GET') {
      const isMediaBody = user.role === 'MEDIA_BODY'
      const filter = user.role === 'ADMIN' ? '' : user.organization_id && ['EDITOR', 'FACT_CHECKER', 'MEDIA_BODY'].includes(user.role)
        ? `organization_id=eq.${encodeURIComponent(user.organization_id)}&consent_to_share=eq.true`
        : `reported_by=eq.${encodeURIComponent(user.id)}`
      const columns = isMediaBody ? 'id,incident_type,severity,occurred_at,status,created_at' : 'id,reported_by,organization_id,incident_type,severity,occurred_at,location_text,description,status,consent_to_share,created_at'
      const result = await dbRequest('incidents', `${filter ? `${filter}&` : ''}select=${columns}&order=created_at.desc&limit=100`)
      return send(res, 200, { incidents: result.data || [] })
    }
    if (!method(req, res, ['GET', 'POST'])) return
    const input = await body(req)
    const incidentType = String(input.type || '').toUpperCase()
    const severity = String(input.severity || 'MEDIUM').toUpperCase()
    const description = String(input.description || '').trim()
    const locationText = String(input.location || '').trim()
    if (!incidentTypes.has(incidentType)) return send(res, 400, { error: 'Choose a supported incident type.' })
    if (!severities.has(severity)) return send(res, 400, { error: 'Choose a supported severity.' })
    if (description.length < 8 || description.length > 12000) return send(res, 400, { error: 'Description must be between 8 and 12,000 characters.' })
    if (locationText.length > 240) return send(res, 400, { error: 'Location must be under 240 characters.' })
    const result = await dbRequest('incidents', '', {
      method: 'POST', prefer: 'return=representation',
      body: { reported_by: user.id, organization_id: user.organization_id, incident_type: incidentType, severity, description, location_text: locationText || null, consent_to_share: input.consentToShare === true, status: 'SUBMITTED' },
    })
    const incident = result.data?.[0]
    if (!incident) throw new Error('Incident was not returned.')
    await audit(user, 'INCIDENT_REPORTED', 'incident', incident.id, { severity })
    if (incident.consent_to_share) await notifyOrganization(user.organization_id, ['EDITOR'], user.id, 'SAFETY', 'Shared safety report submitted', 'A journalist consented to share a safety report with the newsroom.')
    return send(res, 201, { incident, message: 'Incident securely recorded. No emergency contact or external service was notified.' })
  } catch (error) { handleError(res, error) }
}