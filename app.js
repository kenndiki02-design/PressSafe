(() => {
  'use strict'

  const root = document.getElementById('app')
  if (!root) return

  const roles = {
    JOURNALIST: { en: 'Journalist', sw: 'Mwandishi wa habari' },
    CITIZEN: { en: 'Citizen / student', sw: 'Mwananchi / mwanafunzi' },
    EDITOR: { en: 'Editor / newsroom', sw: 'Mhariri / chumba cha habari' },
    FACT_CHECKER: { en: 'Fact-checker', sw: 'Mkaguzi wa ukweli' },
    MEDIA_BODY: { en: 'Media body', sw: 'Chombo cha habari' },
    ANALYST: { en: 'Media body analyst', sw: 'Mchambuzi wa vyombo' },
    ADMIN: { en: 'Platform admin', sw: 'Msimamizi wa jukwaa' },
  }

  const copy = {
    en: {
      dashboard: 'Dashboard', verify: 'Verify a claim', vault: 'Evidence vault', safety: 'Safety center',
      training: 'Training', team: 'Newsroom', queue: 'Review queue', insights: 'Media insights', admin: 'Platform admin',
      billing: 'Billing & usage', settings: 'Privacy & settings', online: 'Online', offline: 'Offline',
      preview: 'Preview mode', demo: 'PROTOTYPE · NO LIVE SERVICES', signIn: 'Sign in',
    },
    sw: {
      dashboard: 'Dashibodi', verify: 'Thibitisha dai', vault: 'Hazina ya ushahidi', safety: 'Kituo cha usalama',
      training: 'Mafunzo', team: 'Chumba cha habari', queue: 'Foleni ya ukaguzi', insights: 'Takwimu za vyombo', admin: 'Usimamizi wa jukwaa',
      billing: 'Malipo na matumizi', settings: 'Faragha na mipangilio', online: 'Mtandaoni', offline: 'Nje ya mtandao',
      preview: 'Hali ya majaribio', demo: 'MFANO · HUDUMA HAIJAUNGANISHWA', signIn: 'Ingia',
    },
  }

  const navIcons = {
    dashboard: 'grid', verify: 'check', vault: 'vault', safety: 'shield', training: 'cap',
    team: 'team', queue: 'check', insights: 'bars', admin: 'admin', billing: 'card', settings: 'settings',
  }

  const state = {
    role: 'JOURNALIST',
    page: 'dashboard',
    locale: 'en',
    user: null,
    dashboardData: null,
    checkInUntil: null,
    checkInId: null,
    pendingFiles: [],
    verifiedItems: [
      { title: 'River crossing footage', source: 'Public social post · 2 hours ago', status: 'Requires review', kind: 'review' },
      { title: 'County water notice', source: 'County website · Yesterday', status: 'Awaiting sources', kind: 'active' },
      { title: 'Market fire image', source: 'Image submission · 14 Oct', status: 'Unverified', kind: 'unverified' },
    ],
    evidence: [],
    incidents: [],
    tasks: [
      { title: 'River crossing footage', topic: 'Climate & environment · 18 min ago', priority: 'High' },
      { title: 'County budget quotation', topic: 'Public policy · 46 min ago', priority: 'Normal' },
      { title: 'Market fire image', topic: 'Image provenance · 2 hours ago', priority: 'Normal' },
    ],
    completedLessons: new Set(),
  }

  const t = (key) => copy[state.locale][key] || copy.en[key] || key
  const icon = (name, className = 'icon') => `<svg class="${className}" aria-hidden="true"><use href="#i-${name}"></use></svg>`
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char])
  const roleName = (role = state.role) => roles[role]?.[state.locale] || roles.JOURNALIST[state.locale]

  async function api(path, options = {}) {
    const requestMethod = options.method || 'GET'
    const queueable = new Set(['/api/verification', '/api/incidents', '/api/cases', '/api/privacy', '/api/contacts', '/api/training', '/api/profile'])
    const canQueue = Boolean(options.body && options.queueable !== false && queueable.has(path) && state.user)
    const queueRequest = async () => {
      await queueOfflineRequest(path, requestMethod, options.body)
      return { queued: true, message: 'Encrypted on this device. It will sync after this account reconnects; no alert or review has been sent yet.' }
    }
    if (!navigator.onLine && options.body && options.queueable !== false && queueable.has(path)) {
      if (!state.user) throw new Error('Sign in before saving an encrypted offline draft.')
      return queueRequest()
    }
    if (!navigator.onLine) throw new Error('You are offline. This action is not safe to queue and was not sent.')
    let response
    try {
      response = await fetch(path, {
        method: requestMethod,
        headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
        body: options.body ? JSON.stringify(options.body) : undefined,
        credentials: 'same-origin',
        cache: 'no-store',
      })
    } catch (error) {
      if (canQueue) return queueRequest()
      throw new Error(`Request could not reach the server: ${error.message}`)
    }
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`)
    return result
  }

  const OFFLINE_DB = 'presssafe-private-drafts-v1'
  function offlineDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(OFFLINE_DB, 1)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('queue')) db.createObjectStore('queue', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('keys')) db.createObjectStore('keys')
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async function offlineKey(db) {
    const existing = await new Promise((resolve, reject) => {
      const request = db.transaction('keys', 'readonly').objectStore('keys').get('device-key')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    if (existing) return existing
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('keys', 'readwrite')
      transaction.objectStore('keys').put(key, 'device-key')
      transaction.oncomplete = resolve
      transaction.onerror = () => reject(transaction.error)
    })
    return key
  }

  async function queueOfflineRequest(path, method, body) {
    const db = await offlineDb()
    const key = await offlineKey(db)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const plaintext = new TextEncoder().encode(JSON.stringify(body))
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
    const record = { id: crypto.randomUUID(), ownerId: state.user.id, path, method, iv, ciphertext, createdAt: new Date().toISOString() }
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('queue', 'readwrite')
      transaction.objectStore('queue').put(record)
      transaction.oncomplete = resolve
      transaction.onerror = () => reject(transaction.error)
    })
    db.close()
  }

  async function syncOfflineQueue() {
    if (!state.user || !navigator.onLine) return
    let db
    try {
      db = await offlineDb()
      const key = await offlineKey(db)
      const records = await new Promise((resolve, reject) => {
        const request = db.transaction('queue', 'readonly').objectStore('queue').getAll()
        request.onsuccess = () => resolve(request.result.filter((item) => item.ownerId === state.user.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)))
        request.onerror = () => reject(request.error)
      })
      let synced = 0
      for (const record of records) {
        const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: record.iv }, key, record.ciphertext)
        const payload = JSON.parse(new TextDecoder().decode(plaintext))
        const result = await api(record.path, { method: record.method, body: payload, queueable: false })
        if (!result) break
        await new Promise((resolve, reject) => {
          const transaction = db.transaction('queue', 'readwrite')
          transaction.objectStore('queue').delete(record.id)
          transaction.oncomplete = resolve
          transaction.onerror = () => reject(transaction.error)
        })
        synced++
      }
      if (synced) {
        toast(`${synced} encrypted offline draft${synced === 1 ? '' : 's'} synced.`)
        await refreshDashboard()
      }
    } catch (error) { toast(`Offline sync paused: ${error.message}`, true) }
    finally { db?.close() }
  }

  async function refreshDashboard() {
    if (!state.user || !navigator.onLine) return
    try {
      const result = await api('/api/dashboard')
      state.user = result.user
      state.role = result.user.role
      state.dashboardData = result.data
      state.verifiedItems = (result.data.verifications || []).map((item) => ({
        title: item.claim_text,
        source: `${item.input_type} · ${new Date(item.created_at).toLocaleString()}`,
        status: item.status.replaceAll('_', ' ').toLowerCase(),
        kind: item.status === 'VERIFIED' ? 'verified' : item.status === 'UNVERIFIED' ? 'unverified' : 'review',
      }))
      state.tasks = (result.data.reviews || []).map((item) => ({
        id: item.id,
        requestId: item.request_id,
        title: item.request?.claim_text || 'Verification request',
        topic: item.request?.topic || 'Manual review',
        priority: item.priority > 0 ? 'High' : 'Normal',
      }))
      state.incidents = (result.data.incidents || []).map((item) => ({ ...item, type: item.incident_type, description: item.description || `${item.status} incident`, severity: item.severity }))
      state.contacts = result.data.contacts || []
      state.checkins = result.data.checkins || []
      state.trainingProgress = result.data.training || []
      if (state.role === 'ADMIN') {
        const organizations = await api('/api/organizations')
        state.organizations = organizations.organizations || []
      }
      state.checkInId = result.data.checkins?.[0]?.id || null
      state.checkInUntil = result.data.checkins?.[0]?.due_at ? Date.parse(result.data.checkins[0].due_at) : null
    } catch (error) {
      if (!/Sign in to continue/i.test(error.message)) toast(error.message, true)
    }
  }

  async function restoreSession() {
    if (!navigator.onLine) return
    try {
      const result = await api('/api/auth/me')
      state.user = result.user
      state.role = result.user.role
      state.locale = result.user.preferred_locale || state.locale
      await refreshDashboard()
    } catch { state.user = null }
    render()
  }

  async function loadPageData(page) {
    if (!state.user || !navigator.onLine) return
    try {
      if (page === 'verify') {
        const result = await api('/api/verification')
        state.verifiedItems = result.requests.map((item) => ({ title: item.claim_text, source: `${item.input_type} · ${new Date(item.created_at).toLocaleString()}`, status: item.status.replaceAll('_', ' ').toLowerCase(), kind: item.status === 'VERIFIED' ? 'verified' : item.status === 'UNVERIFIED' ? 'unverified' : 'review' }))
      } else if (page === 'safety') {
        const [incidents, checkins] = await Promise.all([api('/api/incidents'), api('/api/checkins')])
        state.incidents = incidents.incidents || []
        state.checkins = checkins.checkins || []
        state.checkInId = state.checkins[0]?.id || null
        state.checkInUntil = state.checkins[0]?.due_at ? Date.parse(state.checkins[0].due_at) : null
      } else if (page === 'vault') {
        const result = await api('/api/evidence')
        state.evidence = result.evidence || []
      } else if (page === 'queue') {
        const result = await api('/api/reviews')
        state.tasks = result.reviews.map((item) => ({ id: item.id, requestId: item.request_id, title: item.request?.claim_text || 'Verification request', topic: item.request?.topic || 'Manual review', priority: item.priority > 0 ? 'High' : 'Normal' }))
      } else if (page === 'team') {
        const [incidents, checkins, cases, reviews, members] = await Promise.all([
          api('/api/incidents'), api('/api/checkins?scope=organization'), api('/api/cases'), api('/api/reviews'), api('/api/dashboard'),
        ])
        state.dashboardData = { ...state.dashboardData, incidents: incidents.incidents || [], checkins: checkins.checkins || [], cases: cases.cases || [], reviews: reviews.reviews || [], members: members.data.members || [] }
      } else if (page === 'training') {
        const result = await api('/api/training')
        state.trainingModules = result.modules || []
        state.trainingProgress = result.progress || []
      } else if (page === 'admin' && state.role === 'ADMIN') {
        const [audit, privacy, summary] = await Promise.all([api('/api/admin/audit?limit=50'), api('/api/privacy'), api('/api/admin/summary')])
        state.auditLogs = audit.logs || []
        state.privacyRequests = privacy.requests || []
        state.adminSummary = summary
      }
    } catch (error) { toast(error.message, true) }
  }

  function toast(message, error = false) {
    const region = document.getElementById('toast-region')
    const item = document.createElement('div')
    item.className = `toast${error ? ' error' : ''}`
    item.textContent = message
    region.append(item)
    window.setTimeout(() => item.remove(), 4200)
  }

  function navItems() {
    const items = state.role === 'MEDIA_BODY'
      ? [['dashboard', t('dashboard')], ['insights', t('insights')], ['training', t('training')], ['settings', t('settings')]]
      : [['dashboard', t('dashboard')], ['verify', t('verify')], ['vault', t('vault')], ['safety', t('safety')], ['training', t('training')]]
    if (['EDITOR', 'ADMIN'].includes(state.role)) items.push(['team', t('team')])
    if (['FACT_CHECKER', 'EDITOR', 'ADMIN'].includes(state.role)) items.push(['queue', t('queue')])
    if (['ANALYST', 'MEDIA_BODY', 'ADMIN'].includes(state.role)) items.push(['insights', t('insights')])
    if (state.role === 'ADMIN') items.push(['admin', t('admin')])
    items.push(['billing', t('billing')], ['settings', t('settings')])
    return items
  }

  function renderNav(mobile = false) {
    return navItems().slice(0, mobile ? 5 : undefined).map(([page, label]) =>
      `<button class="nav-link ${state.page === page ? 'active' : ''}" data-page="${page}" ${state.page === page ? 'aria-current="page"' : ''}>${icon(navIcons[page])}<span>${esc(label)}</span></button>`
    ).join('')
  }

  function metric(label, value, note, symbol, tint = '') {
    return `<article class="metric"><div class="metric-top"><span>${esc(label)}</span><span class="metric-icon ${tint}">${icon(symbol)}</span></div><div class="metric-value">${esc(value)}</div><div class="metric-foot">${esc(note)}</div></article>`
  }

  function panel(title, body, options = {}) {
    return `<section class="panel ${options.className || ''}"><header class="panel-header"><div><h2 class="panel-title">${esc(title)}</h2>${options.caption ? `<div class="panel-caption">${esc(options.caption)}</div>` : ''}</div>${options.action || ''}</header><div class="panel-body">${body}</div></section>`
  }

  function badge(kind, value) { return `<span class="status status-${kind}">${esc(value)}</span>` }

  function heading(eyebrow, title, subtitle, actions = '') {
    return `<div class="page-heading"><div><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1><p class="page-subtitle">${esc(subtitle)}</p></div>${actions ? `<div class="heading-actions">${actions}</div>` : ''}</div>`
  }

  function prototypeNotice() {
    if (state.user) return '<div class="prototype-banner">'+icon('alert')+'<span><strong>LIVE ACCOUNT.</strong> Your identity and saved records load from the configured database. AI verification, encrypted evidence storage, SOS dispatch, and notifications require separate provider setup.</span></div>'
    return `<div class="prototype-banner">${icon('alert')}<span><strong>${esc(t('demo'))}.</strong> Sample workspace only. Preview role switching never grants account permissions.</span></div>`
  }

  function roleOptions() {
    return Object.entries(roles).filter(([key]) => !state.user || key === state.user.role).map(([key, label]) => `<option value="${key}" ${state.role === key ? 'selected' : ''}>${esc(label[state.locale])}</option>`).join('')
  }

  function table(items = state.verifiedItems) {
    const rows = items.map((item) => `<tr class="search-row" data-search="${esc(`${item.title} ${item.source}`.toLowerCase())}"><td>${esc(item.title)}</td><td>${esc(item.source)}</td><td>${badge(item.kind, item.status)}</td></tr>`).join('')
    return `<div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Claim / story</th><th>Source</th><th>Stage</th></tr></thead><tbody>${rows || '<tr><td colspan="3">No items yet.</td></tr>'}</tbody></table></div>`
  }

  function caseRows() {
    if (state.user) {
      const records = state.dashboardData?.cases || []
      if (!records.length) return '<div class="empty-state"><strong>No active cases</strong>Create a case to group story claims and evidence.</div>'
      return records.map((item) => `<div class="case-row"><span class="case-symbol">${icon('file')}</span><div class="row-main"><strong>${esc(item.title)}</strong><span>${esc(item.status)} · ${new Date(item.updated_at || item.created_at).toLocaleDateString()}</span></div></div>`).join('')
    }
    return '<div class="case-row"><span class="case-symbol">A</span><div class="row-main"><strong>Flood response updates</strong><span>6 claims · 4 evidence items · Updated today</span></div><span class="row-meta">4/6</span></div><div class="case-row"><span class="case-symbol">B</span><div class="row-main"><strong>County procurement file</strong><span>3 claims · Updated yesterday</span></div><span class="row-meta">2/3</span></div><div class="case-row"><span class="case-symbol">C</span><div class="row-main"><strong>Market fire reports</strong><span>2 claims · Updated 14 Oct</span></div><span class="row-meta">1/2</span></div>'
  }

  function taskRows() {
    if (!state.tasks.length) return '<div class="empty-state"><strong>No open review tasks</strong>New organization claims will appear here when submitted.</div>'
    return state.tasks.map((task, index) => `<div class="task-row"><span class="metric-icon ${task.priority === 'High' ? 'coral' : 'blue'}">${icon('check')}</span><div class="row-main"><strong>${esc(task.title)}</strong><span>${esc(task.topic)}</span></div><span class="status ${task.priority === 'High' ? 'status-unverified' : 'status-review'}">${esc(task.priority)}</span><button class="icon-button" data-task="${index}" aria-label="Open ${esc(task.title)}">${icon('arrow')}</button></div>`).join('')
  }

  function actionTiles(items) {
    return `<div class="action-grid">${items.map(([page, title, text, symbol]) => `<button class="action-tile" data-page="${page}"><span class="metric-icon">${icon(symbol)}</span><strong>${esc(title)}</strong><span>${esc(text)}</span></button>`).join('')}</div>`
  }

  function pageDashboard() {
    const citizen = state.role === 'CITIZEN'
    const editor = state.role === 'EDITOR'
    const checker = state.role === 'FACT_CHECKER'
    const analyst = state.role === 'ANALYST' || state.role === 'MEDIA_BODY'
    const admin = state.role === 'ADMIN'
    const title = citizen ? ['GUIDED MODE', 'Start with one small step', 'Plain-language tools and short lessons for community reporters.']
      : editor ? ['NEWSROOM DESK', `Welcome back, ${state.user?.full_name || 'Amina'}`, 'Publication checks and team safety at a glance.']
      : checker ? ['REVIEW DESK', 'Your verification queue', 'Prioritized claims waiting for careful human review.']
      : analyst || state.role === 'MEDIA_BODY' ? ['MEDIA BODY', 'Press safety overview', 'Anonymized trends and consent-based follow-up for your organization.']
      : admin ? ['SYSTEM OVERVIEW', 'Platform operations', 'Sample service-health and governance indicators.']
      : ['FIELD DESK', `Welcome back, ${state.user?.full_name || 'Amina'}`, 'Your workspace for verification, evidence, and field safety.']

    let metrics
    if (citizen) metrics = [metric('Checks this month', '2 / 5', 'Free preview allowance', 'check'), metric('Saved items', '3', 'Stored in this tab only', 'vault', 'blue'), metric('Lessons', `${state.completedLessons.size} / 6`, 'Guided learning path', 'cap', 'amber'), metric('Safety status', state.checkInUntil ? 'Active' : 'Ready', 'Local preview only', 'shield', 'coral')]
    else if (editor) metrics = [metric('Open reviews', state.user ? String(state.dashboardData?.reviews?.length || 0) : '08', state.user ? 'Organization records' : 'Across 4 sample stories', 'check'), metric('Staff accounts', state.user ? String(state.dashboardData?.members?.length || 0) : '12', state.user ? 'Visible organization members' : 'Sample roster', 'team', 'blue'), metric('Shared incidents', state.user ? String(state.dashboardData?.incidents?.length || 0) : '02', state.user ? 'Consent-based reports' : 'Sample data only', 'shield', 'coral'), metric('Monthly usage', state.user ? 'Unavailable' : '68%', state.user ? 'Usage metering not configured' : 'Newsroom plan · demo', 'card', 'amber')]
    else if (checker) metrics = [metric('Review tasks', String(state.tasks.length), state.user ? 'Organization review queue' : 'Preview queue', 'check'), metric('Completed this week', state.user ? 'Unavailable' : '18', state.user ? 'Turnaround analytics not configured' : 'Sample turnaround 42 min', 'clock', 'blue'), metric('Awaiting assignment', state.user ? 'Unavailable' : '11', state.user ? 'Assignment workflow not configured' : 'Across sample queue', 'team', 'amber'), metric('Decision agreement', state.user ? 'Unavailable' : '94%', state.user ? 'Quality analytics not configured' : 'Illustrative metric', 'bars', 'coral')]
    else if (analyst) metrics = [metric('Shared incidents', state.user ? String(state.dashboardData?.incidents?.length || 0) : '146', state.user ? 'Consent-based reports' : 'Anonymized sample data', 'shield', 'coral'), metric('Counties represented', state.user ? 'Unavailable' : '18', state.user ? 'Location aggregation not configured' : 'No live location data', 'bars'), metric('Claims reviewed', state.user ? String(state.dashboardData?.verifications?.length || 0) : '2.4k', state.user ? 'Recent accessible records' : 'Sample period · 30 days', 'check', 'blue'), metric('Climate-related', state.user ? 'Unavailable' : '31%', state.user ? 'Topic analytics not configured' : 'Share of sampled claims', 'vault', 'amber')]
    else if (admin) metrics = [metric('Active accounts', state.user ? String(state.adminSummary?.users ?? 0) : '1,284', state.user ? 'Exact database count' : 'Sample platform data', 'team'), metric('Organizations', state.user ? String(state.adminSummary?.organizations ?? 0) : '47', state.user ? 'Exact tenant count' : 'Sample organizations', 'team', 'blue'), metric('Audit records', state.user ? String(state.adminSummary?.auditRecords ?? 0) : '99.9%', state.user ? 'Durable events' : 'Illustrative health indicator', 'bars'), metric('Privacy requests', state.user ? String(state.adminSummary?.privacyRequests ?? 0) : '04', state.user ? 'Tracked requests' : 'Needs authorized review', 'settings', 'amber')]
    else metrics = [metric('Verifications', String(state.user ? state.dashboardData?.verifications?.length || 0 : state.verifiedItems.length + 9), state.user ? 'Saved account records' : '3 need human review', 'check'), metric('Evidence items', String(state.user ? state.dashboardData?.evidence?.length || 0 : state.evidence.length + 28), state.user ? 'Saved encrypted records' : 'Across 4 sample cases', 'vault', 'blue'), metric('Incidents', String(state.user ? state.dashboardData?.incidents?.length || 0 : state.incidents.length + 2), state.user ? 'Visible within account scope' : 'Private preview data', 'shield', 'coral'), metric('Training progress', state.user ? `${state.trainingProgress?.filter((item) => item.completed_at).length || 0} completed` : `${Math.min(100, 67 + state.completedLessons.size * 5)}%`, state.user ? 'Saved account progress' : '4 of 6 sample lessons', 'cap', 'amber')]

    const actions = citizen
      ? [['verify', 'Check a claim', 'Get a guided first look.', 'check'], ['vault', 'Save evidence', 'Record a local file digest.', 'vault'], ['safety', 'Get help', 'Open your safety plan.', 'shield']]
      : [['verify', 'Verify a claim', 'Review text, links, or media.', 'check'], ['vault', 'Evidence vault', 'Review safe evidence workflows.', 'vault'], ['safety', 'Report incident', 'Document a field concern.', 'shield']]
    const safeAction = `<button class="sos-button" data-action="sos">${icon('alert')} ${citizen ? 'Get help' : 'SOS'}</button>`

    if (checker) {
      return `${heading(...title, safeAction)}<div class="metrics">${metrics.join('')}</div><div class="content-grid"><div class="stack">${panel('Priority review tasks', `<div class="tag-row" style="margin-bottom:8px"><span class="tiny-tag">SORTED BY PRIORITY</span><span class="tiny-tag">SAMPLE QUEUE</span></div>${taskRows()}`, { caption: 'Escalated claims require a human decision' })}${panel('Review principles', '<div class="case-row"><span class="case-symbol">1</span><div class="row-main"><strong>Separate evidence from conclusion</strong><span>Record sources, context, and uncertainty.</span></div></div><div class="case-row"><span class="case-symbol">2</span><div class="row-main"><strong>Keep conflicting context</strong><span>Do not force a binary result.</span></div></div>')}</div><div class="stack">${panel('Reviewer workload', '<div class="usage-row"><span>Tasks assigned</span><strong>6 / 10</strong></div><div class="progress-line"><span style="width:60%"></span></div><div class="progress-caption"><span>Capacity used</span><span>60%</span></div><div class="callout warning">Queue counts and turnaround figures are illustrative.</div>')}${panel('Flagged media', '<div class="empty-state"><strong>No connected media database</strong>Known-manipulation records are not available in this frontend.</div>')}</div></div>`
    }
    if (analyst) {
      return `${heading(...title, '<button class="button-secondary" data-action="export">'+icon('download')+'Export sample</button>')}<div class="metrics">${metrics.join('')}</div><div class="content-grid">${panel('Incidents by county', charts(), { caption: '30-day aggregate sample · no personal identifiers' })}<div class="stack">${panel('Claim topics', topicChart())}${panel('Privacy boundary', '<div class="callout">Reporter identities and exact locations are withheld. Follow-up should require explicit consent.</div>')}</div></div>`
    }
    if (admin) {
      return `${heading(...title)}<div class="metrics">${metrics.join('')}</div><div class="content-grid"><div class="stack">${panel('Service overview', '<div class="case-row"><span class="metric-icon">●</span><div class="row-main"><strong>Static frontend</strong><span>Loaded in this browser</span></div><span class="status status-active">Available</span></div><div class="case-row"><span class="metric-icon blue">●</span><div class="row-main"><strong>Authentication and database</strong><span>Not included in this static app</span></div><span class="status status-review">Not connected</span></div><div class="case-row"><span class="metric-icon amber">●</span><div class="row-main"><strong>AI and safety integrations</strong><span>No provider credentials or server routes</span></div><span class="status status-review">Not connected</span></div>')}${panel('Audit history', '<div class="empty-state"><strong>No audit feed</strong>Administrative actions require a secured backend and authorization.</div>')}</div><div class="stack">${panel('Governance queue', '<div class="usage-row"><span>Data access requests</span><strong>04</strong></div><div class="usage-row"><span>Deletion requests</span><strong>02</strong></div><div class="usage-row"><span>Abuse reports</span><strong>07</strong></div>', { caption: 'Sample counts only' })}${panel('Security note', '<div class="callout warning">Do not enter API keys or personal data in this prototype.</div>')}</div></div>`
    }

    const primary = editor
      ? panel('Stories awaiting review', table(), { caption: 'Sample publication-readiness list', action: '<button class="text-link" data-page="queue">Open queue</button>' })
      : panel('Recent verification reports', table(), { caption: 'Sample records and local preview requests', action: '<button class="text-link" data-page="verify">View history</button>' })
    const side = citizen
      ? `<div class="stack">${panel('Continue learning', '<div class="lesson-row"><span class="case-symbol">01</span><div class="row-main"><strong>Check the source first</strong><span>5 min · Verification basics</span></div><button class="text-link" data-page="training">Start</button></div><div class="lesson-row"><span class="case-symbol">02</span><div class="row-main"><strong>Stay safer online</strong><span>8 min · Digital safety</span></div><button class="text-link" data-page="training">Start</button></div>')}${panel('Free preview', usagePanel('2 / 5', 40))}</div>`
      : editor
      ? `<div class="stack">${panel('Staff safety status', '<div class="usage-row"><span>Checked in</span><strong>09</strong></div><div class="usage-row"><span>Due soon</span><strong>03</strong></div><div class="usage-row"><span>Overdue</span><strong>01</strong></div><div class="callout warning" style="margin-top:12px">This preview cannot contact staff or dispatch emergency notifications.</div>')}${panel('Newsroom usage', usagePanel('68 / 100', 68))}</div>`
      : `<div class="stack">${panel('Active cases', caseRows(), { action: state.user ? '<button class="text-link" data-action="create-case">New case</button>' : '<button class="text-link" data-page="vault">Open</button>' })}${panel('Plan usage', usagePanel(state.user ? 'Unavailable' : '68 / 100', state.user ? 0 : 68))}</div>`
    const center = `<div class="stack">${actionTiles(actions)}<div class="safety-strip"><div class="safety-copy"><span class="safety-icon">${icon('clock')}</span><div><strong>${state.checkInUntil ? 'Check-in active' : 'No active check-in'}</strong><span>${state.checkInUntil ? 'Local countdown only; no missed alert will be sent.' : 'Set a timer before heading into the field.'}</span></div></div><button class="button-secondary" data-action="checkin">${state.checkInUntil ? 'Check in safe' : 'Start check-in'}</button></div>${primary}</div>`
    return `${heading(...title, safeAction)}<div class="metrics">${metrics.join('')}</div>${citizen ? '<div class="role-intro" style="margin-bottom:14px"><div><strong>One step at a time</strong><p>Start with a source, save useful records, and keep a trusted person informed. This preview cannot verify claims or send emergency alerts.</p></div><span class="tiny-tag">GUIDED MODE</span></div>' : ''}<div class="content-grid">${center}${side}</div><p class="footer-note">Dashboard figures and reports are sample data. No live verification, emergency response, notifications, or account storage is connected.</p>`
  }

  function usagePanel(label, amount) {
    return `<div class="usage-row"><span>Verification credits</span><strong>${label}</strong></div><div class="progress-line"><span style="width:${amount}%"></span></div><div class="progress-caption"><span>Sample plan period</span><span>${amount}%</span></div><button class="button-quiet" data-page="billing">View plan ${icon('arrow')}</button>`
  }

  async function exportReport() {
    if (!state.user) return toast('Sign in before exporting account records.', true)
    try {
      const [verificationResult, incidentResult] = await Promise.all([api('/api/verification'), api('/api/incidents')])
      const rows = [
        ['record_type', 'id', 'status', 'created_at', 'summary'],
        ...(verificationResult.requests || []).map((item) => ['verification', item.id, item.status, item.created_at, item.claim_text]),
        ...(incidentResult.incidents || []).map((item) => ['incident', item.id, item.status, item.created_at, item.description]),
      ]
      const csv = rows.map((row) => row.map((value) => {
        let cell = String(value ?? '').replace(/[\r\n]+/g, ' ')
        if (/^[=+\-@]/.test(cell)) cell = `'${cell}`
        return `"${cell.replaceAll('"', '""')}"`
      }).join(',')).join('\r\n')
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `presssafe-report-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
      toast('CSV exported from records visible to your account.')
    } catch (error) { toast(error.message, true) }
  }

  function charts() {
    return '<div class="chart-bars"><div class="chart-row"><span>Nairobi</span><div class="chart-track"><span style="width:92%"></span></div><strong>42</strong></div><div class="chart-row"><span>Mombasa</span><div class="chart-track"><span style="width:63%"></span></div><strong>29</strong></div><div class="chart-row"><span>Kisumu</span><div class="chart-track"><span style="width:48%"></span></div><strong>22</strong></div><div class="chart-row"><span>Nakuru</span><div class="chart-track"><span style="width:35%"></span></div><strong>16</strong></div><div class="chart-row"><span>Other counties</span><div class="chart-track"><span style="width:81%"></span></div><strong>37</strong></div></div>'
  }

  function topicChart() {
    return '<div class="chart-bars"><div class="chart-row"><span>Environment</span><div class="chart-track"><span style="width:74%"></span></div><strong>31%</strong></div><div class="chart-row"><span>Public safety</span><div class="chart-track"><span style="width:61%"></span></div><strong>26%</strong></div><div class="chart-row"><span>Public policy</span><div class="chart-track"><span style="width:45%"></span></div><strong>19%</strong></div><div class="chart-row"><span>Other</span><div class="chart-track"><span style="width:57%"></span></div><strong>24%</strong></div></div>'
  }

  function pageVerify() {
    const form = `<form id="verify-form"><div class="form-grid"><div class="field"><label for="input-type">Input type</label><select id="input-type" name="type"><option>Text claim</option><option>URL</option><option>Image</option><option>Video</option><option>Document</option></select></div><div class="field"><label for="claim-topic">Topic</label><select id="claim-topic" name="topic"><option>General</option><option>Climate & environment</option><option>Public safety</option><option>Public policy</option><option>Health</option></select></div><div class="field full"><label for="claim-text">Claim or context</label><textarea id="claim-text" name="claim" minlength="8" required placeholder="Paste a claim or describe where it appeared."></textarea><span class="field-hint">Avoid entering confidential source identities in this prototype.</span></div><div class="field full"><label for="claim-file">Attach reference media (optional)</label><input id="claim-file" name="file" type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"><span class="field-hint">The file is not uploaded. Only its name is shown in this tab.</span></div></div><div class="form-actions"><button class="button-primary" type="submit">Add to local review list ${icon('arrow')}</button></div></form>`
    return `${heading('CLAIM VERIFICATION', 'Check a claim', 'Organize claims for review. AI analysis, fact-check APIs, reverse image search, and media forensics are not connected.')}<div class="callout warning" style="margin-bottom:14px">No facts are checked here. Submitting a claim creates a temporary local record labeled “Not verified”.</div>${panel('New verification request', form, { caption: 'Text, URL, image, video, or document' })}<section class="panel full-panel"><header class="panel-header"><div><h2 class="panel-title">Verification history</h2><div class="panel-caption">Sample records and requests created in this tab</div></div><label class="search-box">${icon('search')}<input type="search" data-filter placeholder="Search reports" aria-label="Search reports"></label></header>${table()}</section>`
  }

  function pageVault() {
    const rows = state.evidence.length ? state.evidence.map((item) => {
      const name = item.file_name || item.name
      const hash = item.sha256_hash || item.hash
      return `<div class="case-row"><span class="case-symbol">${icon('file')}</span><div class="row-main"><strong>${esc(name)}</strong><span>SHA-256 ${esc(hash)} · ${item.encrypted ? 'Encrypted object' : 'Local preview'}</span></div>${item.id ? `<button class="button-secondary" data-action="download-evidence" data-evidence-id="${esc(item.id)}">Download</button>` : badge('review', 'Local')}</div>`
    }).join('') : `<div class="empty-state"><strong>${state.user ? 'No evidence uploaded' : 'Sign in to use the evidence vault'}</strong>${state.user ? 'Encrypted uploads appear here after their metadata is saved.' : 'Files and keys are never persisted in preview mode.'}</div>`
    return `${heading('EVIDENCE VAULT', 'Preserve your material', 'Files are encrypted in your browser before direct upload. Keep your passphrase safe; it is never sent to the server.','<button class="button-secondary" data-action="choose-file">'+icon('plus')+'Choose files</button>')}<div class="callout warning" style="margin-bottom:14px">Client encryption protects file content, but this prototype does not provide legal timestamp certification, verified custody signatures, or per-item sharing controls. Keep independent backups.</div><input id="evidence-files" type="file" multiple accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt" hidden>${panel(state.user ? 'Encrypted evidence records' : 'Evidence vault', `<div id="drop-zone" class="drop-zone">${icon('vault')}<strong>${state.user ? 'Drop files to encrypt and upload' : 'Sign in to upload encrypted evidence'}</strong><span>Encrypted in browser · up to 25 MB per file</span></div>${rows}`, { caption: state.user ? 'Private organization bucket · passphrase not recoverable by the server' : 'No file data is stored in preview mode' })}<div class="content-grid full-panel"><div class="stack">${panel('Chain of custody', '<div class="empty-state"><strong>Upload events are recorded</strong>Cryptographic signatures and independent trusted timestamping still require a configured audit service.</div>')}${panel('Source protection', '<div class="callout">The browser encrypts each file. Filenames and file metadata remain visible to authorized account administrators.</div>')}</div>${panel('Integrity certificate', '<div class="empty-state"><strong>Certificate export unavailable</strong>Legal certificates require trusted timestamps and a verified custody-signing service.</div>')}</div>`
  }

  function pageSafety() {
    const incidents = state.incidents.length ? state.incidents.map((item) => `<div class="case-row"><span class="safety-icon">${icon('alert')}</span><div class="row-main"><strong>${esc(item.type)} · ${esc(item.severity)}</strong><span>${esc(item.description)} · Saved in this tab only</span></div>${badge('review', 'Local')}</div>`).join('') : '<div class="empty-state"><strong>No incident reports in this tab</strong>Submissions are not sent to an editor, newsroom, or support team.</div>'
    const form = `<form id="incident-form"><div class="form-grid"><div class="field"><label for="incident-type">Incident type</label><select id="incident-type" name="type"><option>Threat</option><option>Harassment</option><option>Physical attack</option><option>Arrest / detention</option><option>Equipment seizure</option><option>Online abuse / doxxing</option><option>Legal action</option><option>Other</option></select></div><div class="field"><label for="incident-severity">Severity</label><select id="incident-severity" name="severity"><option>Medium</option><option>Low</option><option>High</option><option>Critical</option></select></div><div class="field full"><label for="incident-description">What happened?</label><textarea id="incident-description" name="description" minlength="8" required placeholder="Enter only what is safe to put in a prototype."></textarea></div><div class="field"><label for="incident-location">Location (optional)</label><input id="incident-location" name="location" maxlength="120" placeholder="County or general area"></div><div class="field"><label for="incident-share">Sharing preference</label><select id="incident-share" name="share"><option value="no">Keep private</option><option value="yes">I consent to newsroom sharing (preview only)</option></select></div></div><div class="form-actions"><button class="button-primary" type="submit">Save local preview</button></div></form>`
    return `${heading('JOURNALIST SAFETY', 'Safety center', 'Review trusted contacts, check-in status, and personal incident notes. Notifications and emergency services are not configured.','<button class="sos-button" data-action="sos">'+icon('alert')+'SOS preview</button>')}<div class="callout danger" style="margin-bottom:14px"><strong>Emergency notice:</strong> SOS does not notify anyone. If you are in immediate danger, use a trusted channel to contact local emergency services.</div><div class="content-grid"><div class="stack">${panel('Check-in timer', `<div class="safety-strip"><div class="safety-copy"><span class="safety-icon">${icon('clock')}</span><div><strong id="checkin-status">${state.checkInUntil ? 'Check-in active' : 'No active check-in'}</strong><span>Timer works only while this tab is open; it never sends missed-check-in alerts.</span></div></div><button class="button-secondary" data-action="checkin">${state.checkInUntil ? 'Check in safe' : 'Start 60-minute timer'}</button></div>`, { caption: 'No background monitoring' })}${panel('Report an incident', form, { caption: 'Saved only in the current browser tab' })}${panel('Incident timeline', incidents)}</div><div class="stack">${panel('Trusted contacts', '<div class="contact-row"><span class="avatar">JM</span><div class="row-main"><strong>Editor · sample contact</strong><span>Contact details are not stored or notified.</span></div></div><div class="contact-row"><span class="avatar">AK</span><div class="row-main"><strong>Trusted person · sample contact</strong><span>No call or message has been sent.</span></div></div><button class="button-secondary" data-action="contacts">Manage contacts</button>', { caption: 'Example labels only; not real contacts' })}${panel('Field safety checklist', '<div class="lesson-row"><span class="case-symbol">01</span><div class="row-main"><strong>Agree on a check-in time</strong><span>Share an assignment plan with a trusted editor.</span></div></div><div class="lesson-row"><span class="case-symbol">02</span><div class="row-main"><strong>Choose a safe contact method</strong><span>Plan a backup route before travel.</span></div></div><div class="lesson-row"><span class="case-symbol">03</span><div class="row-main"><strong>Protect source details</strong><span>Limit sensitive information on devices.</span></div></div>')}</div></div>`
  }

  function pageTraining() {
    const sampleLessons = [
      { id: 'source', title_en: 'Trace a claim to its original source', title_sw: 'Fuatilia dai hadi chanzo chake', duration_minutes: 5 },
      { id: 'media', title_en: 'Read image context and metadata', title_sw: 'Chunguza muktadha na metadata ya picha', duration_minutes: 8 },
      { id: 'environment', title_en: 'Verify environmental claims', title_sw: 'Thibitisha madai ya mazingira', duration_minutes: 10 },
      { id: 'device', title_en: 'Protect a source on a shared device', title_sw: 'Linda chanzo kwenye kifaa cha pamoja', duration_minutes: 8 },
      { id: 'ethics', title_en: 'Consent and responsible reporting', title_sw: 'Idhini na kuripoti kwa uwajibikaji', duration_minutes: 6 },
      { id: 'field', title_en: 'Plan a safer assignment', title_sw: 'Panga kazi salama zaidi', duration_minutes: 7 },
    ]
    const lessons = state.user ? (state.trainingModules || []) : sampleLessons
    const completed = state.user ? new Set((state.trainingProgress || []).filter((item) => item.completed_at).map((item) => item.module_id)) : state.completedLessons
    const rows = lessons.map((item, i) => {
      const title = state.locale === 'sw' ? item.title_sw : item.title_en
      return `<div class="lesson-row"><span class="case-symbol">${String(i + 1).padStart(2, '0')}</span><div class="row-main"><strong>${esc(title)}</strong><span>${esc(item.duration_minutes)} min · ${state.user ? 'Published module' : 'Preview outline'}</span></div>${completed.has(item.id) ? badge('verified', 'Done') : `<button class="button-compact" data-lesson="${esc(item.id)}" data-lesson-title="${esc(title)}" data-lesson-content="${esc(JSON.stringify(item.content_json || {}))}">Open lesson</button>`}</div>`
    }).join('') || '<div class="empty-state"><strong>No published modules</strong>Your organization has not published any training modules.</div>'
    const progress = lessons.length ? Math.round(completed.size / lessons.length * 100) : 0
    return `${heading('LEARNING', 'Training library', 'Short, practical lessons for verification, digital security, and reporting ethics.')}<div class="metrics">${metric('Started', `${state.completedLessons.size} / 6`, 'Progress in this tab', 'cap')}${metric('Topics', '3', 'Verification · safety · ethics', 'check', 'blue')}${metric('Next lesson', '5 min', 'Trace the original source', 'clock', 'amber')}${metric('Certificate', '—', 'No saved completion record', 'file', 'coral')}</div><div class="content-grid"><div class="stack">${panel('Learning path', rows)}${panel('Lesson note', '<div class="callout warning">Training items are outlines, not approved safety guidance. Have a qualified newsroom or media-safety trainer review content before operational use.</div>')}</div>${panel('Your progress', `<div class="progress-caption"><span>Learning path</span><strong>${progress}%</strong></div><div class="progress-line"><span style="width:${progress}%"></span></div><p class="footer-note">Progress resets when this browser tab closes.</p>`)}</div>`
  }

  function pageQueue() {
    const pending = state.user ? state.tasks.filter((task) => task.status !== 'COMPLETED').length : 11
    const priority = state.user ? state.tasks.filter((task) => task.priority === 'High').length : 2
    const reviewWorkspace = state.selectedTask !== undefined && state.tasks[state.selectedTask]
      ? `<div class="callout warning" style="margin-bottom:12px">Human review is required. AI scores are not a verdict.</div><p><strong>${esc(state.tasks[state.selectedTask].title)}</strong></p><button class="button-primary" data-action="decision">Record human decision</button>`
      : ''
    const stats = [
      metric('Pending tasks', String(pending), state.user ? 'Organization queue' : 'Preview count', 'clock', 'amber'),
      metric('Visible tasks', String(state.tasks.length), state.user ? 'Server-assigned records' : 'Sample task list', 'team'),
      metric('High priority', String(priority), state.user ? 'Priority label from task' : 'Illustrative only', 'alert', 'coral'),
      metric('Completed today', state.user ? 'Unavailable' : '07', state.user ? 'Throughput metric not configured' : 'Sample count', 'check', 'blue'),
    ].join('')
    return `${heading('HUMAN REVIEW', 'Fact-checking queue', state.user ? 'Review claims assigned to your organization. Save a decision with notes.' : 'Preview queue. Sign in with an invited fact-checker or editor account to access live tasks.')}<div class="metrics">${stats}</div><div class="content-grid"><div class="stack">${panel('Review tasks', `<div class="toolbar"><span class="tiny-tag">PRIORITY: HIGH TO LOW</span><label class="search-box">${icon('search')}<input type="search" data-filter placeholder="Search tasks" aria-label="Search tasks"></label></div><div class="panel-body">${taskRows()}</div>`, { caption: 'A human reviewer makes the final decision' })}${reviewWorkspace}</div>${panel('Review standards', '<div class="case-row"><span class="case-symbol">A</span><div class="row-main"><strong>Check primary sources</strong><span>Record source and publication date.</span></div></div><div class="case-row"><span class="case-symbol">B</span><div class="row-main"><strong>Preserve uncertainty</strong><span>Escalate conflicting or incomplete evidence.</span></div></div><div class="case-row"><span class="case-symbol">C</span><div class="row-main"><strong>Use three supported outcomes</strong><span>Verified · Further review · Unverified</span></div></div>')}</div>`
  }

  function pageTeam() {
    const members = state.dashboardData?.members || []
    const checkins = state.dashboardData?.checkins || []
    const incidents = state.dashboardData?.incidents || []
    const reviews = state.dashboardData?.reviews || []
    const memberRows = members.map((member) => `<div class="case-row"><span class="avatar">${esc(member.full_name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase())}</span><div class="row-main"><strong>${esc(member.full_name)}</strong><span>${esc(member.email)} · ${esc(member.role.replaceAll('_', ' ').toLowerCase())}</span></div>${badge(member.is_active ? 'active' : 'unverified', member.is_active ? 'Active' : 'Inactive')}</div>`).join('') || '<div class="empty-state"><strong>No organization members found</strong>Invite colleagues to populate this team workspace.</div>'
    const incidentRows = incidents.map((incident) => `<div class="case-row"><span class="safety-icon">${icon('alert')}</span><div class="row-main"><strong>${esc(incident.incident_type.replaceAll('_', ' '))} · ${esc(incident.severity)}</strong><span>Consent shared · ${new Date(incident.created_at).toLocaleDateString()}</span></div>${badge('review', incident.status)}</div>`).join('') || '<div class="empty-state"><strong>No consent-shared incidents</strong>Private reports are not included in this newsroom view.</div>'
    const overdue = checkins.filter((item) => Date.parse(item.due_at) < Date.now()).length
    return `${heading('NEWSROOM', 'Team overview', 'Organization members, review tasks, and consent-shared incidents. Check-in alerts still require a configured scheduler.')}<div class="metrics">${metric('Active cases', String(state.dashboardData?.cases?.length || 0), 'Visible organization cases', 'file')}${metric('Open reviews', String(reviews.length), 'Organization queue', 'check', 'amber')}${metric('Team members', String(members.length), 'Loaded organization members', 'team', 'blue')}${metric('Overdue check-ins', String(overdue), 'Status only · no alerts dispatched', 'shield', 'coral')}</div><div class="content-grid"><div class="stack">${panel('Publication readiness', table(), { caption: 'Saved claims for review', action: '<button class="text-link" data-page="queue">Review queue</button>' })}${panel('Shared incident reports', incidentRows, { caption: 'Only reports with explicit sharing consent' })}</div><div class="stack">${panel('Staff safety', checkins.map((item) => `<div class="case-row"><span class="case-symbol">${icon('clock')}</span><div class="row-main"><strong>${esc(members.find((member) => member.id === item.user_id)?.full_name || 'Team member')}</strong><span>${esc(item.label || 'Field check-in')} · due ${new Date(item.due_at).toLocaleString()}</span></div>${badge(Date.parse(item.due_at) < Date.now() ? 'unverified' : 'active', Date.parse(item.due_at) < Date.now() ? 'Overdue' : 'Active')}</div>`).join('') || '<div class="empty-state"><strong>No active team timers</strong>Members can start their own check-in from Safety Center.</div>', { caption: 'No automated escalation is configured' })}${panel('Membership', memberRows, { caption: 'Organization-scoped profiles' })}</div></div>`
  }

  function pageInsights() {
    if (state.user) {
      const incidents = state.dashboardData?.incidents || []
      const claims = state.dashboardData?.verifications || []
      const incidentCounts = new Map()
      for (const incident of incidents) incidentCounts.set(incident.incident_type, (incidentCounts.get(incident.incident_type) || 0) + 1)
      const claimCounts = new Map()
      for (const claim of claims) claimCounts.set(claim.topic || 'Other', (claimCounts.get(claim.topic || 'Other') || 0) + 1)
      const maxIncident = Math.max(1, ...incidentCounts.values())
      const incidentBars = [...incidentCounts].map(([label, count]) => `<div class="chart-row"><span>${esc(label.replaceAll('_', ' ').toLowerCase())}</span><div class="chart-track"><span style="width:${Math.round(count / maxIncident * 100)}%"></span></div><strong>${count}</strong></div>`).join('') || '<div class="empty-state"><strong>No consented incident data</strong>Aggregate reporting appears when reporters consent to share.</div>'
      const maxClaim = Math.max(1, ...claimCounts.values())
      const claimBars = [...claimCounts].map(([label, count]) => `<div class="chart-row"><span>${esc(label)}</span><div class="chart-track"><span style="width:${Math.round(count / maxClaim * 100)}%"></span></div><strong>${count}</strong></div>`).join('') || '<div class="empty-state"><strong>No claim trend data</strong>Aggregate topics appear after review records are available.</div>'
      return `${heading('ANONYMIZED INSIGHTS', 'Media body dashboard', 'Counts are based only on consented incident reports and accessible claim topics. No reporter names, descriptions, or exact locations are returned.','<button class="button-secondary" data-action="export">'+icon('download')+'Export CSV</button>')}<div class="metrics">${metric('Consented incidents', String(incidents.length), 'Visible in your organization', 'shield', 'coral')}${metric('Claims in recent records', String(claims.length), 'Topic only; no claim text', 'check', 'blue')}${metric('County heatmap', 'Unavailable', 'County aggregation not configured', 'bars')}${metric('Climate trends', 'Unavailable', 'Validated taxonomy not configured', 'vault', 'amber')}</div><div class="content-grid">${panel('Incidents by type', incidentBars, { caption: 'Consent-filtered organization records' })}${panel('Claim topics', claimBars, { caption: 'No claim text or reporter identifiers' })}</div>`
    }
    return `${heading('ANONYMIZED INSIGHTS', 'Media body dashboard', 'Explore aggregate safety and misinformation trends. All figures below are illustrative and contain no real reporter data.','<button class="button-secondary" data-action="export">'+icon('download')+'Export sample</button>')}<div class="metrics">${metric('Incidents · 30 days', '146', 'Illustrative sample', 'shield', 'coral')}${metric('Counties represented', '18', 'No exact locations', 'bars')}${metric('Claims checked', '2,408', 'Illustrative sample', 'check', 'blue')}${metric('Climate claims', '31%', 'Sample topic share', 'vault', 'amber')}</div><div class="content-grid">${panel('Incident trend · sample', '<div class="line-chart" aria-label="Illustrative 12-week incident volume chart">'+[28,38,34,52,45,63,54,69,60,78,67,86].map((height) => `<span style="height:${height}%"></span>`).join('')+'</div><p class="footer-note">Illustrative aggregate chart; no live data or locations.</p>')}${panel('Incidents by county', charts(), { caption: 'Aggregate sample values' })}</div><div class="content-grid full-panel">${panel('Claim topics', topicChart())}${panel('Privacy safeguard', '<div class="callout">Only consented case follow-up should reveal case details. Personal identifiers and exact locations are withheld.</div>')}</div>`
  }

  function pageAdmin() {
    const summary = state.adminSummary
    const auditRows = (state.auditLogs || []).map((item) => `<div class="case-row"><span class="case-symbol">${icon('clock')}</span><div class="row-main"><strong>${esc(item.action)}</strong><span>${esc(item.resource_type || 'system')} · ${new Date(item.created_at).toLocaleString()}</span></div></div>`).join('') || '<div class="empty-state"><strong>No audit records yet</strong>System events will appear here after authenticated actions.</div>'
    const privacyRows = (state.privacyRequests || []).map((item) => `<div class="case-row"><span class="case-symbol">${icon('settings')}</span><div class="row-main"><strong>${esc(item.request_type)} · ${esc(item.status)}</strong><span>${esc(item.user_id)} · ${new Date(item.created_at).toLocaleDateString()}</span></div><button class="button-compact" data-action="review-privacy" data-request-id="${esc(item.id)}">Review</button></div>`).join('') || '<div class="empty-state"><strong>No privacy requests</strong>Requests will appear here when users submit them.</div>'
    const accounts = summary ? String(summary.users) : '1,284'
    const organizations = summary ? String(summary.organizations) : '47'
    const privacyCount = summary ? String(summary.privacyRequests) : '04'
    const systemState = state.user ? 'Connected' : 'Preview only'
    return `${heading('PLATFORM GOVERNANCE', 'Administration', state.user ? 'Manage organizations, invites, audit events, and privacy requests.' : 'Admin dashboard preview. Sign in with an invited admin account to access live controls.')}<div class="metrics">${metric('User accounts', accounts, state.user ? 'Exact database count' : 'Sample count', 'team')}${metric('Organizations', organizations, state.user ? 'Exact tenant count' : 'Sample count', 'team', 'blue')}${metric('Privacy requests', privacyCount, state.user ? 'Pending review' : 'Sample queue', 'settings', 'amber')}${metric('SOS events', summary ? String(summary.sosEvents) : '02', state.user ? 'Recorded events; no dispatch metric' : 'Sample only', 'alert', 'coral')}</div><div class="content-grid"><div class="stack">${panel('System components', `<div class="case-row"><span class="metric-icon">●</span><div class="row-main"><strong>Static frontend</strong><span>Loaded in this browser</span></div>${badge('active', 'Available')}</div><div class="case-row"><span class="metric-icon blue">●</span><div class="row-main"><strong>Supabase identity/database</strong><span>${esc(systemState)} · role-scoped server API</span></div>${badge(state.user ? 'active' : 'review', systemState)}</div><div class="case-row"><span class="metric-icon amber">●</span><div class="row-main"><strong>AI, SMS, evidence storage</strong><span>External providers are not configured</span></div>${badge('review', 'Unavailable')}</div>`, { caption: 'Live status requires successful API configuration' })}${panel('Audit history', auditRows, { caption: 'Latest 50 records · admin only' })}</div><div class="stack">${panel('Privacy request queue', privacyRows, { caption: 'Requests require human review and fulfillment' })}${panel('Security note', '<div class="callout warning">Admin access is invite-only. Keep Supabase service credentials on the server and rotate them if exposed.</div>')}</div></div>`
  }

  function pageBilling() {
    return `${heading('ACCOUNT', 'Billing and usage', 'Plan and usage information is sample data. Subscriptions, invoices, and API keys are not connected.')}<div class="content-grid"><div class="stack">${panel('Current plan', '<div class="role-intro"><div><strong>Newsroom · Preview</strong><p>Illustrative plan. No payment details are stored and no charges can be made from this screen.</p></div><span class="tiny-tag">DEMO</span></div>'+usagePanel('68 / 100', 68)+'<div class="form-actions"><button class="button-secondary" data-action="upgrade">Compare plans</button></div>')}${panel('Invoices', '<div class="empty-state"><strong>No invoices</strong>Billing provider integration is not configured.</div>')}</div>${panel('Usage breakdown', '<div class="usage-row"><span>Claim checks</span><strong>68</strong></div><div class="usage-row"><span>Evidence storage</span><strong>1.8 GB</strong></div><div class="usage-row"><span>Team seats</span><strong>12 / 20</strong></div><div class="usage-row"><span>API requests</span><strong>—</strong></div>')}</div>`
  }

  function pageSettings() {
    return `${heading('ACCOUNT & PRIVACY', 'Settings and privacy', 'Interface preferences are saved to your account when signed in.')}<div class="content-grid"><div class="stack">${panel('Interface', `<div class="field"><label for="settings-language">Language</label><select id="settings-language"><option value="en" ${state.locale === 'en' ? 'selected' : ''}>English</option><option value="sw" ${state.locale === 'sw' ? 'selected' : ''}>Kiswahili</option></select></div><div class="field" style="margin-top:12px"><label for="settings-mode">Display mode</label><select id="settings-mode"><option value="false" ${!state.user?.simplified_mode ? 'selected' : ''}>Standard</option><option value="true" ${state.user?.simplified_mode ? 'selected' : ''}>Simplified</option></select></div>`, { caption: state.user ? 'Preferences are account-backed' : 'Preview preferences apply in this tab' })}${panel('Security', '<div class="case-row"><span class="case-symbol">2F</span><div class="row-main"><strong>Two-factor authentication</strong><span>Setup and recovery flows are not configured.</span></div>'+badge('review', 'Unavailable')+'</div><div class="case-row"><span class="case-symbol">S</span><div class="row-main"><strong>Active sessions</strong><span>Session management endpoint is not configured.</span></div>'+badge('review', 'Unavailable')+'</div>')}</div><div class="stack">${panel('Privacy rights', '<div class="callout warning">A privacy request is tracked for human review; it does not instantly export or delete data.</div><p class="footer-note">A responsible administrator must verify identity and fulfill requests under the Data Protection Act 2019.</p><button class="button-secondary" data-action="privacy">Request data access / deletion</button>')}${panel('Consent', '<div class="empty-state"><strong>Account consent recorded at registration</strong>Consent version history requires administrator configuration.</div>')}</div></div>`
  }

  const pages = { dashboard: pageDashboard, verify: pageVerify, vault: pageVault, safety: pageSafety, training: pageTraining, queue: pageQueue, team: pageTeam, insights: pageInsights, admin: pageAdmin, billing: pageBilling, settings: pageSettings }

  function organizationToolbar() {
    if (state.role === 'ADMIN') return '<div class="heading-actions" style="margin:0 0 14px"><button class="button-secondary" data-action="organizations">Manage organizations</button><button class="button-primary" data-action="invite-user">Create organization invite</button></div>'
    if (state.role === 'EDITOR') return '<div class="heading-actions" style="margin:0 0 14px"><button class="button-secondary" data-action="invite-user">Invite newsroom member</button></div>'
    return ''
  }

  function render() {
    const renderer = pages[state.page] || pageDashboard
    const navText = t(state.page) || t('dashboard')
    root.className = 'app-shell'
    root.classList.toggle('simplified-mode', Boolean(state.user?.simplified_mode))
    document.documentElement.lang = state.locale
    root.innerHTML = `<aside class="sidebar"><a href="#dashboard" class="brand" data-page="dashboard"><span class="brand-symbol small">${icon('mark')}</span><span><span class="brand-name">PressSafe</span><span class="brand-caption">Field desk · Kenya</span></span></a><div class="workspace-label">PROTOTYPE WORKSPACE</div><nav class="nav-list" aria-label="Main navigation">${renderNav()}</nav><div class="nav-divider"></div><div class="sidebar-bottom"><div class="offline-chip ${navigator.onLine ? '' : 'offline'}" id="network-chip"><span class="online-dot"></span><span id="network-label">${navigator.onLine ? t('online') : t('offline')} · local only</span></div><div class="side-user"><span class="avatar">AM</span><div><div class="side-user-name">Amina M.</div><div class="side-user-role">${esc(roleName())} · preview</div></div><button data-action="signin" aria-label="Sign in" title="Sign in">${icon('lock')}</button></div></div></aside><div class="main-column"><header class="topbar"><div class="topbar-left"><div class="mobile-brand"><span class="brand-symbol small">${icon('mark')}</span>PressSafe</div><span class="topbar-note"><strong>${esc(navText)}</strong> · ${esc(roleName())}</span><span class="preview-label">${esc(t('preview'))}</span></div><div class="topbar-actions"><select class="role-select" id="role-select" aria-label="Preview dashboard role">${roleOptions()}</select><button class="language-button" data-action="locale" aria-label="Switch interface language">${state.locale === 'en' ? 'SW' : 'EN'}</button><button class="icon-button" data-action="notifications" aria-label="Notifications" title="Notifications">${icon('bell')}</button><button class="button-primary" data-action="signin">${esc(t('signIn'))}</button></div></header><section class="content">${prototypeNotice()}${organizationToolbar()}${renderer()}</section></div><nav class="mobile-nav" aria-label="Mobile navigation">${renderNav(true)}</nav>`
    const displayName = state.user?.full_name || 'Amina M.'
    const initials = displayName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()
    root.querySelector('.workspace-label').textContent = state.user ? (state.user.organization_id ? 'ORGANIZATION WORKSPACE' : 'YOUR WORKSPACE') : 'PREVIEW WORKSPACE'
    root.querySelector('.side-user-name').textContent = displayName
    root.querySelector('.side-user-role').textContent = state.user ? `${roleName()} · ${state.user.email}` : `${roleName()} · preview`
    root.querySelector('.side-user .avatar').textContent = initials
    root.querySelector('.side-user button').dataset.action = state.user ? 'logout' : 'signin'
    root.querySelector('.side-user button').title = state.user ? 'Sign out' : 'Sign in'
    root.querySelector('.side-user button').setAttribute('aria-label', state.user ? 'Sign out' : 'Sign in')
    root.querySelector('.preview-label').textContent = state.user ? 'SIGNED IN' : t('preview')
    root.querySelector('.topbar-actions .button-primary').dataset.action = state.user ? 'logout' : 'signin'
    root.querySelector('.topbar-actions .button-primary').textContent = state.user ? 'Sign out' : t('signIn')
    root.querySelector('#role-select').disabled = Boolean(state.user)
    const networkLabel = root.querySelector('#network-label')
    networkLabel.textContent = `${navigator.onLine ? t('online') : t('offline')} · ${state.user ? 'account data' : 'preview'}`
    bindAfterRender()
  }

  function bindAfterRender() {
    const fileInput = document.getElementById('evidence-files')
    if (fileInput) fileInput.addEventListener('change', onFiles)
    const dropZone = document.getElementById('drop-zone')
    if (dropZone) {
      dropZone.addEventListener('dragover', (event) => { event.preventDefault(); dropZone.classList.add('dragging') })
      dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragging'))
      dropZone.addEventListener('drop', (event) => {
        event.preventDefault()
        dropZone.classList.remove('dragging')
        onFiles({ target: { files: event.dataTransfer.files } })
      })
    }
    const language = document.getElementById('settings-language')
    if (language) language.addEventListener('change', async (event) => {
      state.locale = event.target.value
      if (state.user) {
        try {
          const result = await api('/api/profile', { method: 'PATCH', body: { preferred_locale: state.locale } })
          toast(result.queued ? result.message : 'Language preference saved to your account.')
        } catch (error) { toast(error.message, true) }
      }
      render()
    })
    const filter = root.querySelector('[data-filter]')
    if (filter) filter.addEventListener('input', () => {
      const query = filter.value.toLowerCase()
      root.querySelectorAll('.search-row').forEach((row) => { row.hidden = !row.dataset.search.includes(query) })
    })
  }

  function openDialog(title, body, options = {}) {
    const existing = document.getElementById('app-dialog')
    if (existing) existing.remove()
    const dialog = document.createElement('dialog')
    dialog.id = 'app-dialog'
    dialog.setAttribute('aria-labelledby', 'dialog-title')
    dialog.innerHTML = `<header class="dialog-head"><div><h2 id="dialog-title">${esc(title)}</h2><p>${esc(options.subtitle || '')}</p></div><button class="dialog-close" data-action="close-dialog" aria-label="Close dialog">${icon('close')}</button></header><div class="dialog-body">${body}</div>`
    document.body.append(dialog)
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close() })
    dialog.addEventListener('click', async (event) => {
      const action = event.target.closest('[data-action]')?.dataset.action
      if (action === 'close-dialog') dialog.close()
      if (action === 'auth-register') { dialog.close(); showAccountDialog('register') }
      if (action === 'auth-login') { dialog.close(); showAccountDialog('login') }
      if (action === 'copy-invite') {
        const code = dialog.querySelector('#issued-invite-code')?.value
        if (code && navigator.clipboard) navigator.clipboard.writeText(code).then(() => toast('Invite code copied.')).catch(() => toast('Select and copy the invite code manually.'))
      }
      if (action === 'remove-contact') {
        const contactId = event.target.closest('[data-contact-id]')?.dataset.contactId
        if (contactId) removeContact(contactId)
      }
      if (action === 'mark-notification') {
        const notificationId = event.target.closest('[data-notification-id]')?.dataset.notificationId
        if (notificationId) markNotificationRead(notificationId)
      }
      if (action === 'complete-lesson') {
        const id = event.target.closest('[data-lesson-id]')?.dataset.lessonId
        dialog.close()
        if (id) await completeLesson(id)
      }
    })
    dialog.addEventListener('submit', async (event) => {
      event.preventDefault()
      if (event.target.id === 'account-login-form') await submitLogin(event.target)
      else if (event.target.id === 'account-register-form') await submitRegistration(event.target)
      else if (event.target.id === 'contact-form') await submitContact(event.target)
      else if (event.target.id === 'sos-form') await submitSos(event.target)
      else if (event.target.id === 'review-form') await submitReview(event.target)
      else if (event.target.id === 'organization-form') await submitOrganization(event.target)
      else if (event.target.id === 'invite-form') await submitInvite(event.target)
      else if (event.target.id === 'case-form') await submitCase(event.target)
      else if (event.target.id === 'privacy-form') await submitPrivacy(event.target)
      else if (event.target.id === 'privacy-review-form') await submitPrivacyReview(event.target)
      else if (event.target.id === 'evidence-passphrase-form') await submitEvidenceUploads(event.target)
      else if (event.target.id === 'evidence-download-form') await submitEvidenceDownload(event.target)
    })
    dialog.addEventListener('close', () => dialog.remove(), { once: true })
    dialog.showModal()
    return dialog
  }

  async function onFiles(event) {
    const files = [...event.target.files]
    if (!state.user) return toast('Sign in before choosing evidence files.', true)
    state.pendingFiles = files.filter((file) => file.size > 0 && file.size <= 25 * 1024 * 1024 - 16)
    if (state.pendingFiles.length !== files.length) toast('Files must be between 1 byte and 25 MB after encryption.', true)
    if (!state.pendingFiles.length) return
    openDialog('Encrypt evidence files', `<form id="evidence-passphrase-form"><p>${state.pendingFiles.length} file(s) will be encrypted in this browser before upload.</p><div class="field"><label for="evidence-passphrase">Encryption passphrase</label><input id="evidence-passphrase" name="passphrase" type="password" minlength="12" autocomplete="new-password" required><span class="field-hint">Use a unique passphrase of at least 12 characters. It is never sent or stored; losing it makes the files unrecoverable.</span></div><div class="form-actions"><button class="button-primary" type="submit">Encrypt and upload</button><button class="button-secondary" type="button" data-action="close-dialog">Cancel</button></div></form>`, { subtitle: 'Only ciphertext is uploaded to your private organization bucket.' })
  }

  async function deriveEvidenceKey(passphrase, salt) {
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey'])
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
  }

  async function submitEvidenceUploads(form) {
    const submit = form.querySelector('[type="submit"]')
    const passphrase = form.elements.passphrase.value
    if (passphrase.length < 12) return toast('Passphrase must contain at least 12 characters.', true)
    submit.disabled = true
    try {
      for (const file of state.pendingFiles) {
        const salt = crypto.getRandomValues(new Uint8Array(16))
        const iv = crypto.getRandomValues(new Uint8Array(12))
        const key = await deriveEvidenceKey(passphrase, salt)
        const plaintext = await file.arrayBuffer()
        const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
        const hashBuffer = await crypto.subtle.digest('SHA-256', ciphertext)
        const sha256Hash = [...new Uint8Array(hashBuffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
        const metadata = { iv: toBase64(iv), salt: toBase64(salt), algorithm: 'AES-GCM', kdf: 'PBKDF2-SHA-256', iterations: 310000 }
        const prepared = await api('/api/evidence', { method: 'POST', body: { phase: 'prepare', fileName: file.name, mimeType: file.type || 'application/octet-stream', sizeBytes: file.size, sha256Hash, encrypted: true } })
        const uploadUrl = new URL(prepared.uploadUrl)
        if (!uploadUrl.searchParams.has('token')) uploadUrl.searchParams.set('token', prepared.uploadToken)
        const upload = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream', 'x-upsert': 'false' }, body: ciphertext })
        if (!upload.ok) throw new Error(`Encrypted upload failed for ${file.name} (${upload.status}).`)
        await api('/api/evidence', { method: 'POST', body: { phase: 'complete', objectKey: prepared.objectKey, fileName: file.name, mimeType: file.type || 'application/octet-stream', sizeBytes: file.size, sha256Hash, encryptionMetadata: metadata } })
      }
      state.pendingFiles = []
      document.getElementById('app-dialog')?.close()
      await loadPageData('vault')
      render()
      toast('Evidence encrypted in the browser and uploaded as ciphertext.')
    } catch (error) { toast(error.message, true) }
    finally { submit.disabled = false; form.elements.passphrase.value = '' }
  }

  function toBase64(bytes) {
    return btoa(String.fromCharCode(...new Uint8Array(bytes)))
  }

  function fromBase64(value) {
    return Uint8Array.from(atob(value), (char) => char.charCodeAt(0))
  }

  async function submitEvidenceDownload(form) {
    const id = form.elements.evidenceId.value
    const item = state.evidence.find((record) => record.id === id)
    const passphrase = form.elements.passphrase.value
    if (!item || !item.encryption_metadata) return toast('Encryption metadata is unavailable for this evidence record.', true)
    try {
      const signed = await api('/api/evidence', { method: 'POST', body: { phase: 'download', id } })
      const response = await fetch(signed.url)
      if (!response.ok) throw new Error('Encrypted file download failed.')
      const ciphertext = await response.arrayBuffer()
      const metadata = item.encryption_metadata
      const key = await deriveEvidenceKey(passphrase, fromBase64(metadata.salt))
      const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(metadata.iv) }, key, ciphertext)
      const actualHash = await crypto.subtle.digest('SHA-256', ciphertext)
      const hash = [...new Uint8Array(actualHash)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
      if (hash !== item.sha256_hash) throw new Error('Ciphertext integrity check failed.')
      const blobUrl = URL.createObjectURL(new Blob([plaintext], { type: item.mime_type }))
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = item.file_name
      link.click()
      URL.revokeObjectURL(blobUrl)
      document.getElementById('app-dialog')?.close()
      toast('Evidence integrity check passed and the file was decrypted in this browser.')
    } catch (error) { toast(`Could not decrypt file. Check the passphrase. ${error.message}`, true) }
    finally { form.elements.passphrase.value = '' }
  }

  async function startCheckIn() {
    if (!state.user) return toast('Sign in before creating an account-backed check-in.', true)
    try {
      if (state.checkInId) {
        await api('/api/checkins', { method: 'PATCH', body: { id: state.checkInId, action: 'check_in' } })
        toast('Check-in recorded. No missed-check-in notification is configured.')
      } else {
        const result = await api('/api/checkins', { method: 'POST', body: { minutes: 60, label: 'Field assignment' } })
        toast(result.warning)
      }
      await refreshDashboard()
      render()
    } catch (error) { toast(error.message, true) }
  }

  function showEmergencyDialog() {
    if (!state.user) return showAccountDialog('login')
    const body = '<div class="callout danger" style="margin-bottom:12px"><strong>Recording an SOS does not notify anyone.</strong> There is no SMS/email dispatcher configured. If you are in immediate danger, use a trusted channel to contact local emergency services.</div><form id="sos-form"><div class="field"><label for="sos-message">Optional message</label><textarea id="sos-message" name="message" maxlength="500" placeholder="Brief note for a future configured response team"></textarea></div><label class="notice-inline"><input id="sos-share-location" name="shareLocation" type="checkbox"> Share my current location with my organization if I grant browser access</label><div class="form-actions"><button class="button-danger" type="submit">Record SOS event</button><button class="button-secondary" type="button" data-action="close-dialog">Cancel</button></div></form>'
    openDialog('Record an SOS event', body, { subtitle: 'Your request will be saved to your account only. It will not dispatch responders.' })
  }

  function showDecisionDialog() {
    const task = state.tasks[state.selectedTask]
    if (!task?.id) return toast('This task is not an assigned server record.', true)
    const body = `<p><strong>${esc(task.title)}</strong></p><form id="review-form"><input type="hidden" name="taskId" value="${esc(task.id)}"><div class="field"><label for="review-decision">Decision</label><select id="review-decision" name="decision"><option value="VERIFIED">Verified</option><option value="REQUIRES_FURTHER_REVIEW">Requires further review</option><option value="UNVERIFIED">Unverified</option></select></div><div class="field"><label for="review-notes">Review notes</label><textarea id="review-notes" name="notes" maxlength="8000" placeholder="Record sources and reasoning for this decision"></textarea></div><div class="form-actions"><button class="button-primary" type="submit">Save review decision</button></div></form>`
    openDialog('Submit human review', body, { subtitle: 'This decision is saved to the organization review record.' })
  }

  function showSignInDialog() {
    const body = `<div class="dialog-message">Static prototype only. Sign-in and account creation are not connected to an authentication service.</div><form><div class="field"><label for="demo-email">Email address</label><input id="demo-email" type="email" autocomplete="email" required></div><div class="field"><label for="demo-password">Password</label><input id="demo-password" type="password" autocomplete="current-password" required minlength="8"></div><button class="button-primary" type="submit" style="width:100%">Sign in preview</button></form><hr style="margin:18px 0;border:0;border-top:1px solid var(--line)"><form><div class="field"><label for="new-name">Full name</label><input id="new-name" required minlength="2" autocomplete="name"></div><div class="field"><label for="new-email">Email address</label><input id="new-email" type="email" required autocomplete="email"></div><div class="field"><label for="new-password">Create password</label><input id="new-password" type="password" required minlength="8" autocomplete="new-password"></div><label class="notice-inline"><input type="checkbox" required> I have read the privacy notice and consent to processing my account details.</label><div class="form-actions"><button class="button-secondary" type="submit">Create account preview</button></div></form>`
    openDialog('Sign in or create an account', body, { subtitle: 'No information entered here is saved or transmitted.' })
  }

  function showAccountDialog(mode = 'login') {
    const login = mode === 'login'
    const body = login
      ? `<form id="account-login-form"><div id="auth-feedback" class="dialog-message" hidden></div><div class="field"><label for="account-email">Email address</label><input id="account-email" name="email" type="email" autocomplete="username" required></div><div class="field"><label for="account-password">Password</label><input id="account-password" name="password" type="password" autocomplete="current-password" required minlength="12"></div><button class="button-primary" type="submit" style="width:100%">Sign in</button><div class="form-actions"><button class="button-quiet" type="button" data-action="auth-register">Create a journalist, media body, or admin account</button></div></form>`
      : `<form id="account-register-form"><div id="auth-feedback" class="dialog-message" hidden></div><div class="field"><label for="register-role">Account type</label><select id="register-role" name="role"><option value="JOURNALIST">Journalist</option><option value="EDITOR">Editor</option><option value="FACT_CHECKER">Fact-checker</option><option value="MEDIA_BODY">Media body administrator</option><option value="ADMIN">Platform administrator</option></select></div><div class="field"><label for="register-fullname">Full name</label><input id="register-fullname" name="fullName" autocomplete="name" minlength="2" maxlength="160" required></div><div class="field"><label for="register-email">Work email</label><input id="register-email" name="email" type="email" autocomplete="email" required></div><div class="field"><label for="register-password">Password</label><input id="register-password" name="password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required><span class="field-hint">Use at least 12 characters.</span></div><div class="field" id="organization-field" hidden><label for="register-organization">Organization name</label><input id="register-organization" name="organizationName" maxlength="160"></div><div class="field" id="invite-field" hidden><label for="register-invite">Organization invite code</label><input id="register-invite" name="inviteCode" autocomplete="off"><span class="field-hint">Ask your organization administrator for an invite code. Admin accounts require a platform invite.</span></div><label class="notice-inline"><input name="consent" type="checkbox" required> I have read the privacy notice and consent to account data processing.</label><div class="form-actions"><button class="button-primary" type="submit">Create account</button><button class="button-quiet" type="button" data-action="auth-login">Back to sign in</button></div></form>`
    const dialog = openDialog(login ? 'Sign in to PressSafe' : 'Create your PressSafe account', body, { subtitle: login ? 'Your account role and organization determine the workspace you can access.' : 'Media-body and admin accounts require organization-issued invitation codes.' })
    const roleField = dialog.querySelector('#register-role')
    if (roleField) roleField.addEventListener('change', () => {
      const needsInvite = ['EDITOR', 'FACT_CHECKER', 'MEDIA_BODY', 'ADMIN'].includes(roleField.value)
      dialog.querySelector('#organization-field').hidden = true
      dialog.querySelector('#register-organization').required = false
      dialog.querySelector('#invite-field').hidden = false
      dialog.querySelector('#register-invite').required = needsInvite
    })
    return dialog
  }

  function authFeedback(form, message) {
    const feedback = form.querySelector('#auth-feedback')
    feedback.textContent = message
    feedback.hidden = false
  }

  async function submitLogin(form) {
    const button = form.querySelector('[type="submit"]')
    button.disabled = true
    try {
      const result = await api('/api/auth/login', { method: 'POST', body: Object.fromEntries(new FormData(form)) })
      state.user = result.user
      state.role = result.user.role
      state.locale = result.user.preferred_locale || state.locale
      state.page = 'dashboard'
      document.getElementById('app-dialog')?.close()
      await refreshDashboard()
      render()
      toast(`Signed in as ${result.user.full_name}.`)
    } catch (error) { authFeedback(form, error.message) }
    finally { button.disabled = false }
  }

  async function submitRegistration(form) {
    const button = form.querySelector('[type="submit"]')
    const values = Object.fromEntries(new FormData(form))
    values.consent = form.elements.consent.checked
    values.locale = state.locale
    button.disabled = true
    try {
      const result = await api('/api/auth/register', { method: 'POST', body: values })
      document.getElementById('app-dialog')?.close()
      if (result.user && !result.requiresEmailConfirmation) {
        state.user = result.user
        state.role = result.user.role
        state.page = 'dashboard'
        await refreshDashboard()
        render()
        toast(`Account created for ${result.user.full_name}.`)
      } else {
        toast('Registration saved. Verify your email before signing in.')
        showAccountDialog('login')
      }
    } catch (error) { authFeedback(form, error.message) }
    finally { button.disabled = false }
  }

  async function signOut() {
    try { await api('/api/auth/logout', { method: 'POST' }) }
    catch (error) { toast(error.message, true); return }
    state.user = null
    state.dashboardData = null
    state.role = 'JOURNALIST'
    state.page = 'dashboard'
    render()
  }

  async function showContactsDialog() {
    if (!state.user) return toast('Sign in to manage trusted contacts.', true)
    try {
      const result = await api('/api/contacts')
      const rows = (result.contacts || []).map((contact) => `<div class="contact-row"><span class="avatar">${esc(contact.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase())}</span><div class="row-main"><strong>${esc(contact.name)}</strong><span>${esc(contact.email || contact.phone)} · alerts not configured</span></div><button class="button-danger" data-action="remove-contact" data-contact-id="${esc(contact.id)}">Remove</button></div>`).join('') || '<div class="empty-state"><strong>No trusted contacts saved</strong>Add a contact below. No alert will be sent until a notification provider is configured.</div>'
      const body = `${rows}<hr style="margin:16px 0;border:0;border-top:1px solid var(--line)"><form id="contact-form"><div class="field"><label for="contact-name">Contact name</label><input id="contact-name" name="name" minlength="2" maxlength="160" required></div><div class="field"><label for="contact-email">Email (optional)</label><input id="contact-email" name="email" type="email" autocomplete="email"></div><div class="field"><label for="contact-phone">Phone (optional)</label><input id="contact-phone" name="phone" type="tel" autocomplete="tel"></div><div class="form-actions"><button class="button-primary" type="submit">Save trusted contact</button></div></form><div class="callout warning" style="margin-top:12px">This saves contact details to your account. SOS email/SMS delivery is not configured.</div>`
      openDialog('Trusted contacts', body, { subtitle: 'Only use contacts who have agreed to be listed.' })
    } catch (error) { toast(error.message, true) }
  }

  async function showNotificationsDialog() {
    if (!state.user) return toast('Sign in to view account notifications.', true)
    try {
      const result = await api('/api/notifications')
      const notifications = result.notifications || []
      const rows = notifications.map((item) => `<div class="case-row"><span class="case-symbol">${icon('bell')}</span><div class="row-main"><strong>${esc(item.title)}</strong><span>${esc(item.message)} · ${new Date(item.created_at).toLocaleString()}</span></div>${item.read_at ? badge('active', 'Read') : `<button class="button-compact" data-action="mark-notification" data-notification-id="${esc(item.id)}">Mark read</button>`}</div>`).join('') || '<div class="empty-state"><strong>No notifications</strong>In-app updates will appear here when generated.</div>'
      openDialog('Notifications', rows, { subtitle: `${notifications.filter((item) => !item.read_at).length} unread · email and SMS delivery are separate integrations.` })
    } catch (error) { toast(error.message, true) }
  }

  async function markNotificationRead(id) {
    try {
      await api('/api/notifications', { method: 'PATCH', body: { ids: [id] } })
      document.getElementById('app-dialog')?.close()
      await showNotificationsDialog()
    } catch (error) { toast(error.message, true) }
  }

  function showEvidenceDownloadDialog(id) {
    const item = state.evidence.find((record) => record.id === id)
    if (!item) return toast('Evidence record is not loaded. Refresh the vault and try again.', true)
    const body = `<form id="evidence-download-form"><input type="hidden" name="evidenceId" value="${esc(id)}"><p>Decrypt <strong>${esc(item.file_name)}</strong> in this browser.</p><div class="field"><label for="download-passphrase">Encryption passphrase</label><input id="download-passphrase" name="passphrase" type="password" autocomplete="current-password" required></div><div class="form-actions"><button class="button-primary" type="submit">Download and decrypt</button></div></form>`
    openDialog('Decrypt evidence', body, { subtitle: 'The passphrase is used locally and is never sent to the server.' })
  }

  async function submitContact(form) {
    const values = Object.fromEntries(new FormData(form))
    try {
      const result = await api('/api/contacts', { method: 'POST', body: values })
      document.getElementById('app-dialog')?.close()
      if (result.queued) toast('Trusted contact encrypted and queued for sync. No notifications have been sent.')
      else {
        toast('Trusted contact saved to your account. Notifications are not configured.')
        await showContactsDialog()
      }
    } catch (error) { toast(error.message, true) }
  }

  async function removeContact(id) {
    try {
      await api(`/api/contacts?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      document.getElementById('app-dialog')?.close()
      await showContactsDialog()
      toast('Trusted contact removed.')
    } catch (error) { toast(error.message, true) }
  }

  async function showOrganizationsDialog() {
    if (state.user?.role !== 'ADMIN') return toast('Platform admin access is required.', true)
    try {
      const result = await api('/api/organizations')
      const rows = result.organizations.map((org) => `<div class="case-row"><span class="case-symbol">${icon('team')}</span><div class="row-main"><strong>${esc(org.name)}</strong><span>${esc(org.org_type)} · ${esc(org.country)}</span></div></div>`).join('') || '<div class="empty-state"><strong>No organizations created</strong>Create an organization to issue member invitations.</div>'
      const body = `<div>${rows}</div><hr style="margin:16px 0;border:0;border-top:1px solid var(--line)"><form id="organization-form"><div class="field"><label for="org-name">Organization name</label><input id="org-name" name="name" minlength="2" maxlength="160" required></div><div class="field"><label for="org-type">Organization type</label><select id="org-type" name="type"><option value="NEWSROOM">Newsroom</option><option value="MEDIA_BODY">Media body</option><option value="ACADEMIC">Academic</option><option value="INDEPENDENT">Independent</option></select></div><div class="field"><label for="org-country">Country code</label><input id="org-country" name="country" value="KE" minlength="2" maxlength="2" required></div><div class="form-actions"><button class="button-primary" type="submit">Create organization</button></div></form>`
      openDialog('Organization management', body, { subtitle: 'Create a tenant, then issue role-scoped invites to its members.' })
    } catch (error) { toast(error.message, true) }
  }

  async function showInviteDialog() {
    if (!['ADMIN', 'EDITOR'].includes(state.user?.role)) return toast('Organization admin access is required to invite members.', true)
    try {
      const organizations = state.user.role === 'ADMIN' ? await api('/api/organizations') : { organizations: [] }
      if (state.user.role === 'ADMIN' && !organizations.organizations.length) return toast('Create an organization before issuing invitations.', true)
      const orgField = state.user.role === 'ADMIN' ? `<div class="field"><label for="invite-organization">Organization</label><select id="invite-organization" name="organizationId" required>${organizations.organizations.map((org) => `<option value="${esc(org.id)}">${esc(org.name)}</option>`).join('')}</select></div>` : ''
      const rolesHtml = state.user.role === 'ADMIN' ? '<option value="JOURNALIST">Journalist</option><option value="EDITOR">Editor</option><option value="FACT_CHECKER">Fact-checker</option><option value="MEDIA_BODY">Media-body administrator</option>' : '<option value="JOURNALIST">Journalist</option><option value="EDITOR">Editor</option><option value="FACT_CHECKER">Fact-checker</option>'
      openDialog('Create organization invite', `<form id="invite-form">${orgField}<div class="field"><label for="invite-role">Role to grant</label><select id="invite-role" name="role">${rolesHtml}</select></div><div class="field"><label for="invite-uses">Maximum uses</label><input id="invite-uses" name="maxUses" type="number" min="1" max="500" value="1" required></div><div class="field"><label for="invite-expiry">Expires in days</label><input id="invite-expiry" name="expiresDays" type="number" min="1" max="30" value="7" required></div><div class="form-actions"><button class="button-primary" type="submit">Issue invite</button></div></form>`, { subtitle: 'Invite codes are shown once and stored as hashes.' })
    } catch (error) { toast(error.message, true) }
  }

  async function submitOrganization(form) {
    try {
      const organization = await api('/api/organizations', { method: 'POST', body: Object.fromEntries(new FormData(form)) })
      document.getElementById('app-dialog')?.close()
      toast(`Created ${organization.organization.name}.`)
      await showOrganizationsDialog()
    } catch (error) { toast(error.message, true) }
  }

  async function submitInvite(form) {
    try {
      const result = await api('/api/organizations/invites', { method: 'POST', body: Object.fromEntries(new FormData(form)) })
      document.getElementById('app-dialog')?.close()
      openDialog('Invite created', `<div class="callout warning" style="margin-bottom:12px">${esc(result.warning)}</div><div class="field"><label for="issued-invite-code">${esc(result.invite.role)} invite code</label><input id="issued-invite-code" value="${esc(result.inviteCode)}" readonly></div><div class="form-actions"><button class="button-secondary" data-action="copy-invite">Copy code</button></div>`, { subtitle: `Expires ${new Date(result.invite.expires_at).toLocaleString()}.` })
    } catch (error) { toast(error.message, true) }
  }

  function showCreateCaseDialog() {
    if (!state.user) return toast('Sign in before creating account cases.', true)
    openDialog('Create a case', '<form id="case-form"><div class="field"><label for="case-title">Story or case title</label><input id="case-title" name="title" minlength="2" maxlength="200" required></div><div class="field"><label for="case-description">Description</label><textarea id="case-description" name="description" maxlength="4000"></textarea></div><div class="form-actions"><button class="button-primary" type="submit">Create case</button></div></form>', { subtitle: 'Cases are visible only to you and authorized members of your organization.' })
  }

  async function submitCase(form) {
    try {
      const result = await api('/api/cases', { method: 'POST', body: Object.fromEntries(new FormData(form)) })
      if (result.queued) { document.getElementById('app-dialog')?.close(); return toast(result.message) }
      document.getElementById('app-dialog')?.close()
      await refreshDashboard()
      render()
      toast(`Created case: ${result.case.title}`)
    } catch (error) { toast(error.message, true) }
  }

  function showPrivacyDialog() {
    if (!state.user) return toast('Sign in before creating a privacy request.', true)
    const body = '<form id="privacy-form"><div class="field"><label for="privacy-type">Request type</label><select id="privacy-type" name="type"><option value="ACCESS">Access my data</option><option value="CORRECTION">Correct my data</option><option value="PORTABILITY">Export a copy</option><option value="DELETION">Delete my account and data</option></select></div><div class="field"><label for="privacy-details">Additional details (optional)</label><textarea id="privacy-details" name="details" maxlength="4000"></textarea></div><div class="callout warning" style="margin-bottom:12px">This submits a tracked request for an administrator to review; it does not immediately export or delete data.</div><div class="form-actions"><button class="button-primary" type="submit">Submit privacy request</button></div></form>'
    openDialog('Privacy request', body, { subtitle: 'A request receipt will be saved to your account.' })
  }

  async function submitPrivacy(form) {
    try {
      const result = await api('/api/privacy', { method: 'POST', body: Object.fromEntries(new FormData(form)) })
      document.getElementById('app-dialog')?.close()
      toast(result.message)
    } catch (error) { toast(error.message, true) }
  }

  function showPrivacyReviewDialog(id) {
    if (state.user?.role !== 'ADMIN') return toast('Platform admin access is required.', true)
    const request = (state.privacyRequests || []).find((item) => item.id === id)
    if (!request) return toast('Privacy request could not be found.', true)
    const body = `<form id="privacy-review-form"><input type="hidden" name="id" value="${esc(id)}"><p><strong>${esc(request.request_type)}</strong> · submitted ${new Date(request.created_at).toLocaleString()}</p><div class="field"><label for="privacy-status">Review status</label><select id="privacy-status" name="status"><option value="IN_REVIEW">In review</option><option value="COMPLETED">Completed</option><option value="REJECTED">Rejected</option></select></div><div class="callout warning" style="margin-bottom:12px">This records a decision. It does not automatically export or delete the user's data.</div><button class="button-primary" type="submit">Save review status</button></form>`
    openDialog('Review privacy request', body, { subtitle: `Request ${id}` })
  }

  async function submitPrivacyReview(form) {
    try {
      await api('/api/privacy', { method: 'PATCH', body: Object.fromEntries(new FormData(form)) })
      document.getElementById('app-dialog')?.close()
      await loadPageData('admin')
      render()
      toast('Privacy request status updated and audited.')
    } catch (error) { toast(error.message, true) }
  }

  async function submitSos(form) {
    const shareLocation = form.elements.shareLocation.checked
    const payload = { message: form.elements.message.value, shareLocation }
    if (shareLocation) {
      if (!navigator.geolocation) return toast('This browser does not provide location access.', true)
      try {
        const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }))
        payload.latitude = position.coords.latitude
        payload.longitude = position.coords.longitude
      } catch { return toast('Location was not shared. Change the choice or allow browser location access.', true) }
    }
    try {
      const result = await api('/api/sos', { method: 'POST', body: payload })
      document.getElementById('app-dialog')?.close()
      toast(result.warning, true)
      await refreshDashboard()
    } catch (error) { toast(error.message, true) }
  }

  async function submitReview(form) {
    const values = Object.fromEntries(new FormData(form))
    try {
      await api('/api/reviews', { method: 'PATCH', body: { id: values.taskId, decision: values.decision, notes: values.notes } })
      document.getElementById('app-dialog')?.close()
      await refreshDashboard()
      await loadPageData('queue')
      render()
      toast('Review decision saved to the organization record.')
    } catch (error) { toast(error.message, true) }
  }

  async function completeLesson(moduleId) {
    if (state.user) {
      try {
        const result = await api('/api/training', { method: 'POST', body: { moduleId, completed: true } })
        if (result.queued) { toast(result.message); return }
        await loadPageData('training')
        toast('Training progress saved to your account.')
      } catch (error) { toast(error.message, true) }
    } else {
      state.completedLessons.add(moduleId)
      toast('Preview progress updated in this tab only.')
    }
    state.page = 'training'
    render()
  }

  root.addEventListener('click', async (event) => {
    const pageButton = event.target.closest('[data-page]')
    if (pageButton) {
      event.preventDefault()
      state.page = pageButton.dataset.page
      state.selectedTask = undefined
      await loadPageData(state.page)
      render()
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const task = event.target.closest('[data-task]')
    if (task) { state.selectedTask = Number(task.dataset.task); render(); return }
    const lesson = event.target.closest('[data-lesson]')
    if (lesson) {
      openDialog('Lesson preview', `<div class="role-intro"><div><strong>${esc(lesson.closest('.lesson-row').querySelector('.row-main strong').textContent)}</strong><p>This lesson is an outline. Have a qualified trainer review guidance before using it operationally.</p></div></div><div class="form-actions"><button class="button-primary" data-action="complete-lesson" data-lesson-id="${esc(lesson.dataset.lesson)}">Mark preview complete</button></div>`)
      return
    }
    const action = event.target.closest('[data-action]')?.dataset.action
    if (!action) return
    if (action === 'locale') {
      state.locale = state.locale === 'en' ? 'sw' : 'en'
      if (state.user) {
        try {
          const result = await api('/api/profile', { method: 'PATCH', body: { preferred_locale: state.locale } })
          toast(result.queued ? result.message : 'Language preference saved to your account.')
        } catch (error) { toast(error.message, true) }
      }
      render()
    }
    else if (action === 'sos') showEmergencyDialog()
    else if (action === 'signin') showAccountDialog('login')
    else if (action === 'logout') await signOut()
    else if (action === 'organizations') await showOrganizationsDialog()
    else if (action === 'invite-user') await showInviteDialog()
    else if (action === 'create-case') showCreateCaseDialog()
    else if (action === 'checkin') startCheckIn()
    else if (action === 'choose-file') document.getElementById('evidence-files')?.click()
    else if (action === 'download-evidence') showEvidenceDownloadDialog(event.target.closest('[data-evidence-id]').dataset.evidenceId)
    else if (action === 'notifications') await showNotificationsDialog()
    else if (action === 'contacts') await showContactsDialog()
    else if (action === 'decision') showDecisionDialog()
    else if (action === 'export') exportReport()
    else if (action === 'upgrade') toast('Billing is not connected; no subscription was changed.')
    else if (action === 'privacy') showPrivacyDialog()
    else if (action === 'review-privacy') showPrivacyReviewDialog(event.target.closest('[data-request-id]').dataset.requestId)
    else if (action === 'close-dialog') document.getElementById('app-dialog')?.close()
    else if (action === 'complete-lesson') {
      const id = event.target.closest('[data-lesson-id]')?.dataset.lessonId
      if (id) state.completedLessons.add(id)
      document.getElementById('app-dialog')?.close()
      state.page = 'training'
      render()
      toast('Progress updated in this tab only.')
    }
  })

  root.addEventListener('change', async (event) => {
    if (event.target.id === 'role-select') { state.role = event.target.value; state.page = 'dashboard'; render() }
    if (event.target.id === 'settings-mode') {
      const simplifiedMode = event.target.value === 'true'
      if (state.user) {
        try {
          const result = await api('/api/profile', { method: 'PATCH', body: { simplified_mode: simplifiedMode } })
          state.user.simplified_mode = simplifiedMode
          toast(result.queued ? result.message : 'Simplified mode preference saved.')
        } catch (error) { toast(error.message, true) }
      } else toast('Simplified mode is a preview preference only.')
    }
  })

  root.addEventListener('submit', async (event) => {
    if (event.target.id === 'account-login-form') {
      event.preventDefault()
      await submitLogin(event.target)
      return
    }
    if (event.target.id === 'account-register-form') {
      event.preventDefault()
      await submitRegistration(event.target)
      return
    }
    if (event.target.id === 'verify-form') {
      event.preventDefault()
      const data = new FormData(event.target)
      const claim = String(data.get('claim') || '').trim()
      const file = data.get('file')
      if (file?.size) return toast('File analysis is unavailable until encrypted evidence storage is configured.', true)
      const typeMap = { 'Text claim': 'TEXT', URL: 'URL', Image: 'IMAGE', Video: 'VIDEO', Document: 'DOCUMENT' }
      try {
        const result = await api('/api/verification', { method: 'POST', body: { claimText: claim, inputType: typeMap[data.get('type')] || 'TEXT', topic: data.get('topic') } })
        await refreshDashboard()
        render()
        toast(result.message)
      } catch (error) { toast(error.message, true) }
    }
    if (event.target.id === 'incident-form') {
      event.preventDefault()
      const data = new FormData(event.target)
      const type = String(data.get('type')).toUpperCase().replaceAll(' / ', '_').replaceAll(' ', '_').replaceAll('&', 'AND')
      try {
        const result = await api('/api/incidents', { method: 'POST', body: { type, severity: data.get('severity'), description: data.get('description'), location: data.get('location'), consentToShare: data.get('share') === 'yes' } })
        await refreshDashboard()
        render()
        toast(result.message)
      } catch (error) { toast(error.message, true) }
    }
  })

  function updateNetwork() {
    const chip = document.getElementById('network-chip')
    const label = document.getElementById('network-label')
    if (chip && label) {
      chip.classList.toggle('offline', !navigator.onLine)
      label.textContent = `${navigator.onLine ? t('online') : t('offline')} · local only`
    }
  }
  window.addEventListener('online', updateNetwork)
  window.addEventListener('offline', updateNetwork)
  window.addEventListener('online', syncOfflineQueue)

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}), { once: true })
  }

  render()
  restoreSession()
})()