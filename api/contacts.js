'use strict'

const { audit, body, dbRequest, handleError, method, requireUser, send } = require('../lib/server')

module.exports = async function contacts(req, res) {
  try {
    const user = await requireUser(req, res)
    if (!user) return
    if (req.method === 'GET') {
      const result = await dbRequest('trusted_contacts', `user_id=eq.${encodeURIComponent(user.id)}&select=id,name,email,phone,notify_on_sos,notify_on_missed_checkin,created_at&order=created_at.asc`)
      return send(res, 200, { contacts: result.data || [] })
    }
    if (req.method === 'POST') {
      const input = await body(req)
      const name = String(input.name || '').trim()
      const email = String(input.email || '').trim().toLowerCase()
      const phone = String(input.phone || '').trim()
      if (name.length < 2 || name.length > 160) return send(res, 400, { error: 'Contact name must be between 2 and 160 characters.' })
      if (!email && !phone) return send(res, 400, { error: 'Enter an email or phone number.' })
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return send(res, 400, { error: 'Enter a valid contact email.' })
      const result = await dbRequest('trusted_contacts', '', { method: 'POST', prefer: 'return=representation', body: { user_id: user.id, name, email: email || null, phone: phone || null, notify_on_sos: input.notifyOnSos !== false, notify_on_missed_checkin: input.notifyOnMissedCheckin !== false } })
      const contact = result.data?.[0]
      await audit(user, 'TRUSTED_CONTACT_ADDED', 'trusted_contact', contact?.id)
      return send(res, 201, { contact })
    }
    if (req.method === 'DELETE') {
      const contactId = String(req.query?.id || '')
      if (!/^[0-9a-f-]{36}$/i.test(contactId)) return send(res, 400, { error: 'A valid contact ID is required.' })
      await dbRequest('trusted_contacts', `id=eq.${encodeURIComponent(contactId)}&user_id=eq.${encodeURIComponent(user.id)}`, { method: 'DELETE', prefer: 'return=minimal' })
      await audit(user, 'TRUSTED_CONTACT_REMOVED', 'trusted_contact', contactId)
      return send(res, 200, { message: 'Contact removed.' })
    }
    return method(req, res, ['GET', 'POST', 'DELETE'])
  } catch (error) { handleError(res, error) }
}