'use strict'

const { audit, body, createEvidenceUpload, dbRequest, handleError, method, requireUser, scopedFilter, send } = require('../lib/server')

const MAX_FILE_SIZE = 25 * 1024 * 1024
const HASH_PATTERN = /^[a-f0-9]{64}$/

async function signedDownload(user, objectKey) {
  const canAccessOrganization = user.organization_id && ['EDITOR', 'FACT_CHECKER', 'MEDIA_BODY'].includes(user.role)
  if (user.role !== 'ADMIN' && !canAccessOrganization && !objectKey.startsWith(`${user.id}/`)) {
    const error = new Error('Evidence item not found in your account.')
    error.status = 404
    throw error
  }
  const { config } = require('../lib/server')
  const settings = config()
  const bucket = process.env.SUPABASE_EVIDENCE_BUCKET || 'presssafe-evidence'
  const encoded = objectKey.split('/').map(encodeURIComponent).join('/')
  const response = await fetch(`${settings.url}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${encoded}`, {
    method: 'POST',
    headers: { apikey: settings.anonKey, Authorization: `Bearer ${settings.serviceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: 60 }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || !(result.signedURL || result.signedUrl)) {
    const error = new Error(result.message || 'Evidence download is unavailable.')
    error.status = 503
    throw error
  }
  const path = result.signedURL || result.signedUrl
  return path.startsWith('http') ? path : `${settings.url}/storage/v1${path}`
}

module.exports = async function evidence(req, res) {
  try {
    const user = await requireUser(req, res)
    if (!user) return
    if (user.role === 'MEDIA_BODY') return send(res, 403, { error: 'Media-body analytics cannot access source evidence.' })
    if (req.method === 'GET') {
      const filter = scopedFilter(user, 'uploaded_by')
      const result = await dbRequest('evidence_items', `${filter ? `${filter}&` : ''}select=id,uploaded_by,organization_id,case_id,object_key,file_name,sha256_hash,encrypted,encryption_metadata,size_bytes,mime_type,created_at&order=created_at.desc&limit=100`)
      const items = (result.data || []).map(({ object_key, ...item }) => ({ ...item, hasDownload: Boolean(object_key) }))
      return send(res, 200, { evidence: items })
    }
    if (!method(req, res, ['GET', 'POST'])) return
    const input = await body(req)
    if (input.phase === 'download') {
      const id = String(input.id || '')
      if (!/^[0-9a-f-]{36}$/i.test(id)) return send(res, 400, { error: 'A valid evidence ID is required.' })
      const scope = user.role === 'ADMIN' ? '' : user.organization_id && ['EDITOR', 'FACT_CHECKER', 'MEDIA_BODY'].includes(user.role)
        ? `organization_id=eq.${encodeURIComponent(user.organization_id)}&`
        : `uploaded_by=eq.${encodeURIComponent(user.id)}&`
      const found = await dbRequest('evidence_items', `id=eq.${encodeURIComponent(id)}&${scope}select=id,uploaded_by,object_key`)
      const item = found.data?.[0]
      if (!item || (user.role === 'JOURNALIST' && item.uploaded_by !== user.id)) return send(res, 404, { error: 'Evidence item not found.' })
      const url = await signedDownload(user, item.object_key)
      return send(res, 200, { url, expiresIn: 60 })
    }
    if (input.phase === 'prepare') {
      const fileName = String(input.fileName || '').trim().slice(0, 240)
      const mimeType = String(input.mimeType || 'application/octet-stream').slice(0, 120)
      const sizeBytes = Number(input.sizeBytes)
      if (!fileName || !Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_FILE_SIZE) return send(res, 400, { error: 'File must be between 1 byte and 25 MB.' })
      if (input.encrypted !== true || !HASH_PATTERN.test(String(input.sha256Hash || ''))) return send(res, 400, { error: 'Client-encrypted payload and its SHA-256 digest are required.' })
      const signed = await createEvidenceUpload(user)
      return send(res, 200, { uploadUrl: signed.uploadUrl, uploadToken: signed.token, bucket: signed.bucket, objectKey: signed.objectKey })
    }
    if (input.phase === 'complete') {
      const objectKey = String(input.objectKey || '')
      const fileName = String(input.fileName || '').trim().slice(0, 240)
      const mimeType = String(input.mimeType || 'application/octet-stream').slice(0, 120)
      const sizeBytes = Number(input.sizeBytes)
      const hash = String(input.sha256Hash || '').toLowerCase()
      const encryptionMetadata = input.encryptionMetadata
      if (!objectKey.startsWith(`${user.id}/`) || objectKey.includes('..')) return send(res, 403, { error: 'Evidence object key is not scoped to this user.' })
      if (!fileName || !Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_FILE_SIZE || !HASH_PATTERN.test(hash)) return send(res, 400, { error: 'Invalid evidence metadata.' })
      if (!encryptionMetadata || typeof encryptionMetadata.iv !== 'string' || typeof encryptionMetadata.salt !== 'string' || encryptionMetadata.algorithm !== 'AES-GCM') return send(res, 400, { error: 'Encryption metadata is incomplete.' })
      const result = await dbRequest('evidence_items', '', {
        method: 'POST', prefer: 'return=representation',
        body: { uploaded_by: user.id, organization_id: user.organization_id, object_key: objectKey, file_name: fileName, sha256_hash: hash, encrypted: true, encryption_metadata: encryptionMetadata, size_bytes: sizeBytes, mime_type: mimeType },
      })
      const item = result.data?.[0]
      if (!item) throw new Error('Evidence metadata was not returned.')
      await audit(user, 'ENCRYPTED_EVIDENCE_UPLOADED', 'evidence_item', item.id, { sha256: hash, sizeBytes })
      return send(res, 201, { evidence: { ...item, object_key: undefined }, message: 'Encrypted evidence metadata saved.' })
    }
    return send(res, 400, { error: 'Choose a supported evidence upload phase.' })
  } catch (error) { handleError(res, error) }
}