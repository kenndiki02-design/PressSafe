'use strict'

const { audit, body, dbRequest, handleError, method, requireUser, send } = require('../lib/server')

module.exports = async function training(req, res) {
  try {
    const user = await requireUser(req, res)
    if (!user) return
    if (req.method === 'GET') {
      const [modules, progress] = await Promise.all([
        dbRequest('training_modules', 'published=eq.true&select=id,slug,title_en,title_sw,content_json,duration_minutes&order=title_en.asc'),
        dbRequest('training_progress', `user_id=eq.${encodeURIComponent(user.id)}&select=id,module_id,completed_at,score`),
      ])
      return send(res, 200, { modules: modules.data || [], progress: progress.data || [] })
    }
    if (!method(req, res, ['GET', 'POST'])) return
    const input = await body(req)
    const moduleId = String(input.moduleId || '')
    if (!/^[0-9a-f-]{36}$/i.test(moduleId)) return send(res, 400, { error: 'A valid module ID is required.' })
    const completedAt = input.completed === true ? new Date().toISOString() : null
    const result = await dbRequest('training_progress', 'on_conflict=user_id,module_id', {
      method: 'POST', prefer: 'resolution=merge-duplicates,return=representation',
      body: { user_id: user.id, module_id: moduleId, completed_at: completedAt, score: Number.isInteger(input.score) ? Math.max(0, Math.min(100, input.score)) : null },
    })
    const progress = result.data?.[0]
    await audit(user, 'TRAINING_PROGRESS_UPDATED', 'training_module', moduleId)
    return send(res, 200, { progress })
  } catch (error) { handleError(res, error) }
}