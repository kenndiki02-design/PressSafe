'use strict'

const { dbRequest, handleError, method, requireUser, scopedFilter, send } = require('../lib/server')

module.exports = async function dashboard(req, res) {
  if (!method(req, res, ['GET'])) return
  try {
    const user = await requireUser(req, res)
    if (!user) return
    const verificationScope = scopedFilter(user, 'submitted_by')
    const evidenceScope = scopedFilter(user, 'uploaded_by')
    const verificationColumns = user.role === 'MEDIA_BODY'
      ? 'topic,status,created_at'
      : 'id,claim_text,input_type,topic,status,created_at'
    const profileFilter = user.role === 'ADMIN' ? '' : user.organization_id ? `organization_id=eq.${encodeURIComponent(user.organization_id)}` : `id=eq.${encodeURIComponent(user.id)}`
    const incidentFilter = user.role === 'ADMIN' ? '' : user.organization_id && ['EDITOR', 'FACT_CHECKER', 'MEDIA_BODY'].includes(user.role) ? `organization_id=eq.${encodeURIComponent(user.organization_id)}&consent_to_share=eq.true` : `reported_by=eq.${encodeURIComponent(user.id)}`
    const incidentColumns = user.role === 'MEDIA_BODY' ? 'id,incident_type,severity,status,created_at' : 'id,reported_by,organization_id,incident_type,severity,created_at,location_text,description,status,consent_to_share'
    const checkinFilter = user.role === 'ADMIN' ? '' : user.role === 'EDITOR' && user.organization_id
      ? `organization_id=eq.${encodeURIComponent(user.organization_id)}&`
      : `user_id=eq.${encodeURIComponent(user.id)}&`
    const [verifications, cases, evidence, incidents, reviews, training, contacts, checkins, members] = await Promise.all([
      dbRequest('verification_requests', `${verificationScope ? `${verificationScope}&` : ''}select=${verificationColumns}&order=created_at.desc&limit=10`),
      dbRequest('cases', `${user.role === 'ADMIN' ? '' : user.organization_id && ['EDITOR', 'FACT_CHECKER'].includes(user.role) ? `organization_id=eq.${encodeURIComponent(user.organization_id)}&` : `owner_id=eq.${encodeURIComponent(user.id)}&`}select=id,title,status,created_at&order=created_at.desc&limit=10`),
      user.role === 'MEDIA_BODY'
        ? Promise.resolve({ data: [] })
        : dbRequest('evidence_items', `${evidenceScope ? `${evidenceScope}&` : ''}select=id,file_name,sha256_hash,size_bytes,created_at&order=created_at.desc&limit=10`),
      dbRequest('incidents', `${incidentFilter ? `${incidentFilter}&` : ''}select=${incidentColumns}&order=created_at.desc&limit=10`),
      ['ADMIN', 'EDITOR', 'FACT_CHECKER'].includes(user.role) && (user.role === 'ADMIN' || user.organization_id)
        ? dbRequest('review_tasks', `${user.role === 'ADMIN' ? '' : `organization_id=eq.${encodeURIComponent(user.organization_id)}&`}select=id,status,priority,created_at&order=priority.desc,created_at.asc&limit=10`)
        : Promise.resolve({ data: [] }),
      dbRequest('training_progress', `user_id=eq.${encodeURIComponent(user.id)}&select=id,module_id,completed_at,score`),
      dbRequest('trusted_contacts', `user_id=eq.${encodeURIComponent(user.id)}&select=id,name,email,phone,notify_on_sos,notify_on_missed_checkin`),
      dbRequest('checkin_timers', `${checkinFilter}status=eq.ACTIVE&select=id,user_id,label,due_at,status&order=due_at.asc&limit=200`),
      ['ADMIN', 'EDITOR'].includes(user.role) && (user.role === 'ADMIN' || user.organization_id) ? dbRequest('profiles', `${profileFilter}&select=id,full_name,email,role,is_active,created_at&order=created_at.desc&limit=100`) : Promise.resolve({ data: [] }),
    ])
    send(res, 200, {
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, organization_id: user.organization_id, preferred_locale: user.preferred_locale, simplified_mode: user.simplified_mode },
      data: {
        verifications: verifications.data || [], cases: cases.data || [], evidence: evidence.data || [],
        incidents: incidents.data || [], reviews: reviews.data || [], training: training.data || [],
        contacts: contacts.data || [], checkins: checkins.data || [], members: members.data || [],
      },
    })
  } catch (error) { handleError(res, error) }
}