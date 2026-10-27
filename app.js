(() => {
  'use strict'

  const root = document.getElementById('app')
  if (!root) return

  const roles = {
    JOURNALIST: { en: 'Journalist', sw: 'Mwandishi wa habari' },
    CITIZEN: { en: 'Citizen / student', sw: 'Mwananchi / mwanafunzi' },
    EDITOR: { en: 'Editor / newsroom', sw: 'Mhariri / chumba cha habari' },
    FACT_CHECKER: { en: 'Fact-checker', sw: 'Mkaguzi wa ukweli' },
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
    checkInUntil: null,
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

  function toast(message, error = false) {
    const region = document.getElementById('toast-region')
    const item = document.createElement('div')
    item.className = `toast${error ? ' error' : ''}`
    item.textContent = message
    region.append(item)
    window.setTimeout(() => item.remove(), 4200)
  }

  function navItems() {
    const items = [
      ['dashboard', t('dashboard')], ['verify', t('verify')], ['vault', t('vault')],
      ['safety', t('safety')], ['training', t('training')],
    ]
    if (['EDITOR', 'ADMIN'].includes(state.role)) items.push(['team', t('team')])
    if (['FACT_CHECKER', 'EDITOR', 'ADMIN'].includes(state.role)) items.push(['queue', t('queue')])
    if (['ANALYST', 'ADMIN'].includes(state.role)) items.push(['insights', t('insights')])
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
    return `<div class="prototype-banner">${icon('alert')}<span><strong>${esc(t('demo'))}.</strong> Sample workspace only. This static prototype does not assess facts, upload files, preserve evidence, contact people, or provide emergency response.</span></div>`
  }

  function roleOptions() {
    return Object.entries(roles).map(([key, label]) => `<option value="${key}" ${state.role === key ? 'selected' : ''}>${esc(label[state.locale])}</option>`).join('')
  }

  function table(items = state.verifiedItems) {
    const rows = items.map((item) => `<tr class="search-row" data-search="${esc(`${item.title} ${item.source}`.toLowerCase())}"><td>${esc(item.title)}</td><td>${esc(item.source)}</td><td>${badge(item.kind, item.status)}</td></tr>`).join('')
    return `<div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Claim / story</th><th>Source</th><th>Stage</th></tr></thead><tbody>${rows || '<tr><td colspan="3">No items yet.</td></tr>'}</tbody></table></div>`
  }

  function caseRows() {
    return '<div class="case-row"><span class="case-symbol">A</span><div class="row-main"><strong>Flood response updates</strong><span>6 claims · 4 evidence items · Updated today</span></div><span class="row-meta">4/6</span></div><div class="case-row"><span class="case-symbol">B</span><div class="row-main"><strong>County procurement file</strong><span>3 claims · Updated yesterday</span></div><span class="row-meta">2/3</span></div><div class="case-row"><span class="case-symbol">C</span><div class="row-main"><strong>Market fire reports</strong><span>2 claims · Updated 14 Oct</span></div><span class="row-meta">1/2</span></div>'
  }

  function taskRows() {
    return state.tasks.map((task, index) => `<div class="task-row"><span class="metric-icon ${task.priority === 'High' ? 'coral' : 'blue'}">${icon('check')}</span><div class="row-main"><strong>${esc(task.title)}</strong><span>${esc(task.topic)}</span></div><span class="status ${task.priority === 'High' ? 'status-unverified' : 'status-review'}">${esc(task.priority)}</span><button class="icon-button" data-task="${index}" aria-label="Open ${esc(task.title)}">${icon('arrow')}</button></div>`).join('')
  }

  function actionTiles(items) {
    return `<div class="action-grid">${items.map(([page, title, text, symbol]) => `<button class="action-tile" data-page="${page}"><span class="metric-icon">${icon(symbol)}</span><strong>${esc(title)}</strong><span>${esc(text)}</span></button>`).join('')}</div>`
  }

  function pageDashboard() {
    const citizen = state.role === 'CITIZEN'
    const editor = state.role === 'EDITOR'
    const checker = state.role === 'FACT_CHECKER'
    const analyst = state.role === 'ANALYST'
    const admin = state.role === 'ADMIN'
    const title = citizen ? ['GUIDED MODE', 'Start with one small step', 'Plain-language tools and short lessons for community reporters.']
      : editor ? ['NEWSROOM DESK', 'Good morning, Amina', 'Publication checks and team safety at a glance.']
      : checker ? ['REVIEW DESK', 'Your verification queue', 'Prioritized claims waiting for careful human review.']
      : analyst ? ['MEDIA BODY', 'Press safety overview', 'Anonymized sample trends. No reporter-level data is shown.']
      : admin ? ['SYSTEM OVERVIEW', 'Platform operations', 'Sample service-health and governance indicators.']
      : ['FIELD DESK', 'Welcome back, Amina', 'Your secure workspace for verification, evidence, and field safety.']

    let metrics
    if (citizen) metrics = [metric('Checks this month', '2 / 5', 'Free preview allowance', 'check'), metric('Saved items', '3', 'Stored in this tab only', 'vault', 'blue'), metric('Lessons', `${state.completedLessons.size} / 6`, 'Guided learning path', 'cap', 'amber'), metric('Safety status', state.checkInUntil ? 'Active' : 'Ready', 'Local preview only', 'shield', 'coral')]
    else if (editor) metrics = [metric('Open reviews', '08', 'Across 4 sample stories', 'check'), metric('Staff on assignment', '12', '3 check-ins due soon', 'team', 'blue'), metric('Shared incidents', '02', 'Sample data only', 'shield', 'coral'), metric('Monthly usage', '68%', 'Newsroom plan · demo', 'card', 'amber')]
    else if (checker) metrics = [metric('Assigned to you', String(state.tasks.length), '2 high priority', 'check'), metric('Completed this week', '18', 'Sample turnaround 42 min', 'clock', 'blue'), metric('Awaiting assignment', '11', 'Across sample queue', 'team', 'amber'), metric('Decision agreement', '94%', 'Illustrative metric', 'bars', 'coral')]
    else if (analyst) metrics = [metric('Incidents this month', '146', 'Anonymized sample data', 'shield', 'coral'), metric('Counties represented', '18', 'No live location data', 'bars'), metric('Claims reviewed', '2.4k', 'Sample period · 30 days', 'check', 'blue'), metric('Climate-related', '31%', 'Share of sampled claims', 'vault', 'amber')]
    else if (admin) metrics = [metric('Active accounts', '1,284', 'Sample platform data', 'team'), metric('Organizations', '47', 'Sample organizations', 'team', 'blue'), metric('API availability', '99.9%', 'Illustrative health indicator', 'bars'), metric('Privacy requests', '04', 'Needs authorized review', 'settings', 'amber')]
    else metrics = [metric('Verifications', String(state.verifiedItems.length + 9), '3 need human review', 'check'), metric('Evidence items', String(state.evidence.length + 28), 'Across 4 sample cases', 'vault', 'blue'), metric('Open incidents', String(state.incidents.length + 2), 'Private preview data', 'shield', 'coral'), metric('Training progress', `${Math.min(100, 67 + state.completedLessons.size * 5)}%`, '4 of 6 sample lessons', 'cap', 'amber')]

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
      : `<div class="stack">${panel('Active cases', caseRows(), { action: '<button class="text-link" data-page="vault">Open</button>' })}${panel('Plan usage', usagePanel('68 / 100', 68))}</div>`
    const center = `<div class="stack">${actionTiles(actions)}<div class="safety-strip"><div class="safety-copy"><span class="safety-icon">${icon('clock')}</span><div><strong>${state.checkInUntil ? 'Check-in active' : 'No active check-in'}</strong><span>${state.checkInUntil ? 'Local countdown only; no missed alert will be sent.' : 'Set a timer before heading into the field.'}</span></div></div><button class="button-secondary" data-action="checkin">${state.checkInUntil ? 'Check in safe' : 'Start check-in'}</button></div>${primary}</div>`
    return `${heading(...title, safeAction)}<div class="metrics">${metrics.join('')}</div>${citizen ? '<div class="role-intro" style="margin-bottom:14px"><div><strong>One step at a time</strong><p>Start with a source, save useful records, and keep a trusted person informed. This preview cannot verify claims or send emergency alerts.</p></div><span class="tiny-tag">GUIDED MODE</span></div>' : ''}<div class="content-grid">${center}${side}</div><p class="footer-note">Dashboard figures and reports are sample data. No live verification, emergency response, notifications, or account storage is connected.</p>`
  }

  function usagePanel(label, amount) {
    return `<div class="usage-row"><span>Verification credits</span><strong>${label}</strong></div><div class="progress-line"><span style="width:${amount}%"></span></div><div class="progress-caption"><span>Sample plan period</span><span>${amount}%</span></div><button class="button-quiet" data-page="billing">View plan ${icon('arrow')}</button>`
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
    const rows = state.evidence.length ? state.evidence.map((item) => `<div class="case-row"><span class="case-symbol">${icon('file')}</span><div class="row-main"><strong>${esc(item.name)}</strong><span>SHA-256 ${esc(item.hash)} · Preview only, not uploaded</span></div>${badge('review', 'Local')}</div>`).join('') : '<div class="empty-state"><strong>No local preview items yet</strong>Choose a file to compute a browser-side SHA-256 digest. The file itself will not leave this device.</div>'
    return `${heading('EVIDENCE VAULT', 'Preserve your material', 'A private browser preview for organizing evidence. There is no storage service, encryption passphrase flow, or custody backend.','<button class="button-secondary" data-action="choose-file">'+icon('plus')+'Choose files</button>')}<div class="callout danger" style="margin-bottom:14px">Do not use this prototype to preserve sensitive or time-critical evidence. No upload, encrypted storage, trusted timestamp, access control, or legal certificate is provided.</div><input id="evidence-files" type="file" multiple accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt" hidden>${panel('Evidence in this browser tab', `<div id="drop-zone" class="drop-zone">${icon('vault')}<strong>Drop evidence files here</strong><span>Or choose files above · up to 25 MB per file</span></div>${rows}`, { caption: 'File digests only; nothing is uploaded or persisted' })}<div class="content-grid full-panel"><div class="stack">${panel('Chain of custody', '<div class="empty-state"><strong>No verified custody events</strong>Integrity checks and custody records need a trusted server.</div>')}${panel('Source protection', '<div class="callout">Metadata stripping and per-item permissions are not active. Avoid sharing source-identifying materials here.</div>')}</div>${panel('Integrity certificate', '<div class="empty-state"><strong>No certificate available</strong>Export requires trusted timestamps and server-verified custody records.</div>')}</div>`
  }

  function pageSafety() {
    const incidents = state.incidents.length ? state.incidents.map((item) => `<div class="case-row"><span class="safety-icon">${icon('alert')}</span><div class="row-main"><strong>${esc(item.type)} · ${esc(item.severity)}</strong><span>${esc(item.description)} · Saved in this tab only</span></div>${badge('review', 'Local')}</div>`).join('') : '<div class="empty-state"><strong>No incident reports in this tab</strong>Submissions are not sent to an editor, newsroom, or support team.</div>'
    const form = `<form id="incident-form"><div class="form-grid"><div class="field"><label for="incident-type">Incident type</label><select id="incident-type" name="type"><option>Threat</option><option>Harassment</option><option>Physical attack</option><option>Arrest / detention</option><option>Equipment seizure</option><option>Online abuse / doxxing</option><option>Legal action</option><option>Other</option></select></div><div class="field"><label for="incident-severity">Severity</label><select id="incident-severity" name="severity"><option>Medium</option><option>Low</option><option>High</option><option>Critical</option></select></div><div class="field full"><label for="incident-description">What happened?</label><textarea id="incident-description" name="description" minlength="8" required placeholder="Enter only what is safe to put in a prototype."></textarea></div><div class="field"><label for="incident-location">Location (optional)</label><input id="incident-location" name="location" maxlength="120" placeholder="County or general area"></div><div class="field"><label for="incident-share">Sharing preference</label><select id="incident-share" name="share"><option value="no">Keep private</option><option value="yes">I consent to newsroom sharing (preview only)</option></select></div></div><div class="form-actions"><button class="button-primary" type="submit">Save local preview</button></div></form>`
    return `${heading('JOURNALIST SAFETY', 'Safety center', 'Review trusted contacts, check-in status, and personal incident notes. Notifications and emergency services are not configured.','<button class="sos-button" data-action="sos">'+icon('alert')+'SOS preview</button>')}<div class="callout danger" style="margin-bottom:14px"><strong>Emergency notice:</strong> SOS does not notify anyone. If you are in immediate danger, use a trusted channel to contact local emergency services.</div><div class="content-grid"><div class="stack">${panel('Check-in timer', `<div class="safety-strip"><div class="safety-copy"><span class="safety-icon">${icon('clock')}</span><div><strong id="checkin-status">${state.checkInUntil ? 'Check-in active' : 'No active check-in'}</strong><span>Timer works only while this tab is open; it never sends missed-check-in alerts.</span></div></div><button class="button-secondary" data-action="checkin">${state.checkInUntil ? 'Check in safe' : 'Start 60-minute timer'}</button></div>`, { caption: 'No background monitoring' })}${panel('Report an incident', form, { caption: 'Saved only in the current browser tab' })}${panel('Incident timeline', incidents)}</div><div class="stack">${panel('Trusted contacts', '<div class="contact-row"><span class="avatar">JM</span><div class="row-main"><strong>Editor · sample contact</strong><span>Contact details are not stored or notified.</span></div></div><div class="contact-row"><span class="avatar">AK</span><div class="row-main"><strong>Trusted person · sample contact</strong><span>No call or message has been sent.</span></div></div><button class="button-secondary" data-action="contacts">Manage contacts</button>', { caption: 'Example labels only; not real contacts' })}${panel('Field safety checklist', '<div class="lesson-row"><span class="case-symbol">01</span><div class="row-main"><strong>Agree on a check-in time</strong><span>Share an assignment plan with a trusted editor.</span></div></div><div class="lesson-row"><span class="case-symbol">02</span><div class="row-main"><strong>Choose a safe contact method</strong><span>Plan a backup route before travel.</span></div></div><div class="lesson-row"><span class="case-symbol">03</span><div class="row-main"><strong>Protect source details</strong><span>Limit sensitive information on devices.</span></div></div>')}</div></div>`
  }

  function pageTraining() {
    const lessons = [
      ['source', 'Trace a claim to its original source', '5 min · Verification basics'],
      ['media', 'Read image context and metadata', '8 min · Digital verification'],
      ['environment', 'Verify environmental claims', '10 min · Climate and environment'],
      ['device', 'Protect a source on a shared device', '8 min · Digital security'],
      ['ethics', 'Consent and responsible reporting', '6 min · Reporting ethics'],
      ['field', 'Plan a safer assignment', '7 min · Field safety'],
    ]
    const rows = lessons.map(([id, title, detail], i) => `<div class="lesson-row"><span class="case-symbol">${String(i + 1).padStart(2, '0')}</span><div class="row-main"><strong>${esc(title)}</strong><span>${esc(detail)} · Prototype outline</span></div>${state.completedLessons.has(id) ? badge('verified', 'Done') : `<button class="button-compact" data-lesson="${id}">Open lesson</button>`}</div>`).join('')
    const progress = Math.round(state.completedLessons.size / lessons.length * 100)
    return `${heading('LEARNING', 'Training library', 'Short, practical lessons for verification, digital security, and reporting ethics.')}<div class="metrics">${metric('Started', `${state.completedLessons.size} / 6`, 'Progress in this tab', 'cap')}${metric('Topics', '3', 'Verification · safety · ethics', 'check', 'blue')}${metric('Next lesson', '5 min', 'Trace the original source', 'clock', 'amber')}${metric('Certificate', '—', 'No saved completion record', 'file', 'coral')}</div><div class="content-grid"><div class="stack">${panel('Learning path', rows)}${panel('Lesson note', '<div class="callout warning">Training items are outlines, not approved safety guidance. Have a qualified newsroom or media-safety trainer review content before operational use.</div>')}</div>${panel('Your progress', `<div class="progress-caption"><span>Learning path</span><strong>${progress}%</strong></div><div class="progress-line"><span style="width:${progress}%"></span></div><p class="footer-note">Progress resets when this browser tab closes.</p>`)}</div>`
  }

  function pageQueue() {
    return `${heading('HUMAN REVIEW', 'Fact-checking queue', 'Review workspace preview. Assignment, deadlines, decision history, and source integrations are not connected.')}<div class="metrics">${metric('Awaiting assignment', '11', 'Sample queue count', 'clock', 'amber')}${metric('Assigned to you', String(state.tasks.length), 'Sample task list', 'team')}${metric('High priority', '02', 'Illustrative only', 'alert', 'coral')}${metric('Completed today', '07', 'Sample count', 'check', 'blue')}</div><div class="content-grid"><div class="stack">${panel('Review tasks', `<div class="toolbar"><span class="tiny-tag">PRIORITY: HIGH TO LOW</span><label class="search-box">${icon('search')}<input type="search" data-filter placeholder="Search tasks" aria-label="Search tasks"></label></div><div class="panel-body">${taskRows()}</div>`, { caption: 'A human reviewer should make the final decision' })}${state.selectedTask !== undefined ? panel('Review workspace', `<div class="callout warning" style="margin-bottom:12px">Sample claim only. This screen does not provide a factual assessment.</div><p><strong>${esc(state.tasks[state.selectedTask]?.title || 'Selected task')}</strong></p><div class="field"><label for="review-notes">Review notes</label><textarea id="review-notes" placeholder="Notes remain in this page only"></textarea></div><div class="form-actions"><button class="button-secondary" data-action="decision">Requires further review</button><button class="button-primary" data-action="decision">Save preview decision</button></div>`) : ''}</div>${panel('Review standards', '<div class="case-row"><span class="case-symbol">A</span><div class="row-main"><strong>Check primary sources</strong><span>Record source and publication date.</span></div></div><div class="case-row"><span class="case-symbol">B</span><div class="row-main"><strong>Preserve uncertainty</strong><span>Escalate conflicting or incomplete evidence.</span></div></div><div class="case-row"><span class="case-symbol">C</span><div class="row-main"><strong>Use three supported outcomes</strong><span>Verified · Further review · Unverified</span></div></div>')}</div>`
  }

  function pageTeam() {
    return `${heading('NEWSROOM', 'Team overview', 'Coordinate story checks and staff safety. Member management, role assignment, and check-in alerts are not connected.')}<div class="metrics">${metric('Active stories', '08', 'Sample team view', 'file')}${metric('Reviews pending', '12', 'Across the newsroom', 'check', 'amber')}${metric('Staff on assignment', '12', 'Sample roster', 'team', 'blue')}${metric('Overdue check-ins', '01', 'Not a live alert', 'shield', 'coral')}</div><div class="content-grid"><div class="stack">${panel('Publication readiness', table(), { caption: 'Sample story-level claims', action: '<button class="text-link" data-page="queue">Review queue</button>' })}${panel('Shared incident reports', '<div class="callout warning">Incident sharing requires explicit reporter consent. No real reports appear in this preview.</div><div class="empty-state"><strong>No connected team reports</strong>Newsroom sharing and follow-up are not implemented.</div>')}</div><div class="stack">${panel('Staff safety', '<div class="usage-row"><span>Checked in</span><strong>09</strong></div><div class="usage-row"><span>Due soon</span><strong>03</strong></div><div class="usage-row"><span>Overdue</span><strong>01</strong></div><button class="button-secondary" data-page="safety">Open safety center</button>', { caption: 'Illustrative team data' })}${panel('Membership', '<div class="empty-state"><strong>No live member directory</strong>Organization membership and role assignment need a protected backend.</div>')}</div></div>`
  }

  function pageInsights() {
    return `${heading('ANONYMIZED INSIGHTS', 'Media body dashboard', 'Explore aggregate safety and misinformation trends. All figures below are illustrative and contain no real reporter data.','<button class="button-secondary" data-action="export">'+icon('download')+'Export sample</button>')}<div class="metrics">${metric('Incidents · 30 days', '146', 'Illustrative sample', 'shield', 'coral')}${metric('Counties represented', '18', 'No exact locations', 'bars')}${metric('Claims checked', '2,408', 'Illustrative sample', 'check', 'blue')}${metric('Climate claims', '31%', 'Sample topic share', 'vault', 'amber')}</div><div class="content-grid">${panel('Incident trend · sample', '<div class="line-chart" aria-label="Illustrative 12-week incident volume chart">'+[28,38,34,52,45,63,54,69,60,78,67,86].map((height) => `<span style="height:${height}%"></span>`).join('')+'</div><p class="footer-note">Illustrative aggregate chart; no live data or locations.</p>')}${panel('Incidents by county', charts(), { caption: 'Aggregate sample values' })}</div><div class="content-grid full-panel">${panel('Claim topics', topicChart())}${panel('Privacy safeguard', '<div class="callout">Only consented case follow-up should reveal case details. Personal identifiers and exact locations are withheld.</div>')}</div>`
  }

  function pageAdmin() {
    return `${heading('PLATFORM GOVERNANCE', 'Administration', 'Administrative controls are previews only. No user management, content moderation, billing, or audit API is connected.')}<div class="metrics">${metric('User accounts', '1,284', 'Sample count', 'team')}${metric('Organizations', '47', 'Sample count', 'team', 'blue')}${metric('Privacy requests', '04', 'Requires secure workflow', 'settings', 'amber')}${metric('Security alerts', '02', 'No live monitoring', 'alert', 'coral')}</div><div class="content-grid"><div class="stack">${panel('System components', '<div class="case-row"><span class="metric-icon">●</span><div class="row-main"><strong>Static frontend</strong><span>Loaded in this browser</span></div>'+badge('active', 'Available')+'</div><div class="case-row"><span class="metric-icon blue">●</span><div class="row-main"><strong>Authentication and database</strong><span>Not included in this static version</span></div>'+badge('review', 'Not connected')+'</div><div class="case-row"><span class="metric-icon amber">●</span><div class="row-main"><strong>AI and fact-check integrations</strong><span>No provider credentials or server routes</span></div>'+badge('review', 'Not connected')+'</div>')}${panel('Audit history', '<div class="empty-state"><strong>No audit feed</strong>Administrative actions require a secured backend and authorization.</div>')}</div><div class="stack">${panel('Governance queue', '<div class="usage-row"><span>Data access requests</span><strong>04</strong></div><div class="usage-row"><span>Deletion requests</span><strong>02</strong></div><div class="usage-row"><span>Abuse reports</span><strong>07</strong></div>', { caption: 'Sample counts only' })}${panel('Security note', '<div class="callout warning">Do not enter API keys or personal data in this prototype.</div>')}</div></div>`
  }

  function pageBilling() {
    return `${heading('ACCOUNT', 'Billing and usage', 'Plan and usage information is sample data. Subscriptions, invoices, and API keys are not connected.')}<div class="content-grid"><div class="stack">${panel('Current plan', '<div class="role-intro"><div><strong>Newsroom · Preview</strong><p>Illustrative plan. No payment details are stored and no charges can be made from this screen.</p></div><span class="tiny-tag">DEMO</span></div>'+usagePanel('68 / 100', 68)+'<div class="form-actions"><button class="button-secondary" data-action="upgrade">Compare plans</button></div>')}${panel('Invoices', '<div class="empty-state"><strong>No invoices</strong>Billing provider integration is not configured.</div>')}</div>${panel('Usage breakdown', '<div class="usage-row"><span>Claim checks</span><strong>68</strong></div><div class="usage-row"><span>Evidence storage</span><strong>1.8 GB</strong></div><div class="usage-row"><span>Team seats</span><strong>12 / 20</strong></div><div class="usage-row"><span>API requests</span><strong>—</strong></div>')}</div>`
  }

  function pageSettings() {
    return `${heading('ACCOUNT & PRIVACY', 'Settings and privacy', 'Interface preferences are kept in page memory. Account security and legal data requests need server-side workflows.')}<div class="content-grid"><div class="stack">${panel('Interface', `<div class="field"><label for="settings-language">Language</label><select id="settings-language"><option value="en" ${state.locale === 'en' ? 'selected' : ''}>English</option><option value="sw" ${state.locale === 'sw' ? 'selected' : ''}>Kiswahili</option></select></div><div class="field" style="margin-top:12px"><label for="settings-mode">Display mode</label><select id="settings-mode"><option>Standard</option><option>Simplified preview</option></select></div>`, { caption: 'Changes apply in this tab' })}${panel('Security', '<div class="case-row"><span class="case-symbol">2F</span><div class="row-main"><strong>Two-factor authentication</strong><span>No account security service in this static app.</span></div>'+badge('review', 'Unavailable')+'</div><div class="case-row"><span class="case-symbol">S</span><div class="row-main"><strong>Active sessions</strong><span>Session management is not connected.</span></div>'+badge('review', 'Unavailable')+'</div>')}</div><div class="stack">${panel('Privacy rights', '<div class="callout warning">Do not enter sensitive personal data into this prototype. Data export, correction, and deletion are not connected to a privacy workflow.</div><p class="footer-note">Before collecting real evidence or incident data, the service needs retention policies, consent controls, secure access, and a Data Protection Act 2019 process.</p><button class="button-secondary" data-action="privacy">Request data access / deletion</button>')}${panel('Consent', '<div class="empty-state"><strong>No live consent record</strong>A versioned privacy notice and consent service are not included.</div>')}</div></div>`
  }

  const pages = { dashboard: pageDashboard, verify: pageVerify, vault: pageVault, safety: pageSafety, training: pageTraining, queue: pageQueue, team: pageTeam, insights: pageInsights, admin: pageAdmin, billing: pageBilling, settings: pageSettings }

  function render() {
    const renderer = pages[state.page] || pageDashboard
    const navText = t(state.page) || t('dashboard')
    root.className = 'app-shell'
    root.innerHTML = `<aside class="sidebar"><a href="#dashboard" class="brand" data-page="dashboard"><span class="brand-symbol small">${icon('mark')}</span><span><span class="brand-name">PressSafe</span><span class="brand-caption">Field desk · Kenya</span></span></a><div class="workspace-label">PROTOTYPE WORKSPACE</div><nav class="nav-list" aria-label="Main navigation">${renderNav()}</nav><div class="nav-divider"></div><div class="sidebar-bottom"><div class="offline-chip ${navigator.onLine ? '' : 'offline'}" id="network-chip"><span class="online-dot"></span><span id="network-label">${navigator.onLine ? t('online') : t('offline')} · local only</span></div><div class="side-user"><span class="avatar">AM</span><div><div class="side-user-name">Amina M.</div><div class="side-user-role">${esc(roleName())} · preview</div></div><button data-action="signin" aria-label="Sign in" title="Sign in">${icon('lock')}</button></div></div></aside><div class="main-column"><header class="topbar"><div class="topbar-left"><div class="mobile-brand"><span class="brand-symbol small">${icon('mark')}</span>PressSafe</div><span class="topbar-note"><strong>${esc(navText)}</strong> · ${esc(roleName())}</span><span class="preview-label">${esc(t('preview'))}</span></div><div class="topbar-actions"><select class="role-select" id="role-select" aria-label="Preview dashboard role">${roleOptions()}</select><button class="language-button" data-action="locale" aria-label="Switch interface language">${state.locale === 'en' ? 'SW' : 'EN'}</button><button class="icon-button" data-action="notifications" aria-label="Notifications" title="Notifications">${icon('bell')}</button><button class="button-primary" data-action="signin">${esc(t('signIn'))}</button></div></header><section class="content">${prototypeNotice()}${renderer()}</section></div><nav class="mobile-nav" aria-label="Mobile navigation">${renderNav(true)}</nav>`
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
    if (language) language.addEventListener('change', (event) => { state.locale = event.target.value; render() })
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
    dialog.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]')?.dataset.action
      if (action === 'close-dialog') dialog.close()
      if (action === 'complete-lesson') {
        const id = event.target.closest('[data-lesson-id]')?.dataset.lessonId
        if (id) state.completedLessons.add(id)
        dialog.close()
        state.page = 'training'
        render()
        toast('Progress updated in this tab only.')
      }
    })
    dialog.addEventListener('submit', (event) => {
      event.preventDefault()
      toast('This is a static prototype. No credentials were sent and no account was created.')
      event.target.reset()
    })
    dialog.addEventListener('close', () => dialog.remove(), { once: true })
    dialog.showModal()
    return dialog
  }

  async function onFiles(event) {
    const files = [...event.target.files]
    for (const file of files) {
      if (file.size > 25 * 1024 * 1024) { toast(`${file.name}: prototype limit is 25 MB.`, true); continue }
      try {
        const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
        const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
        state.evidence.unshift({ name: file.name, size: file.size, hash })
      } catch { toast('Browser SHA-256 is unavailable. Use a secure browser context.', true) }
    }
    const page = state.page
    render()
    if (files.length) toast('Browser-side digest calculated. The file was not uploaded or encrypted.')
    if (page !== 'vault') state.page = page
  }

  function startCheckIn() {
    if (state.checkInUntil) {
      state.checkInUntil = null
      toast('Check-in recorded in this tab only. No contact was notified.')
    } else {
      state.checkInUntil = Date.now() + 60 * 60 * 1000
      toast('Preview timer started. No missed-check-in alert will be sent.')
    }
    render()
  }

  function showEmergencyDialog() {
    openDialog('SOS is not connected', '<div class="callout danger" style="margin-bottom:12px"><strong>This button cannot contact anyone.</strong> No location is collected or shared, and no alert is sent by this prototype.</div><p>If you are in immediate danger, use a trusted channel to contact local emergency services or a trusted person.</p><div class="form-actions"><button class="button-primary" data-action="close-dialog">Understood</button></div>', { subtitle: 'Emergency response is not available in this prototype.' })
  }

  function showSignInDialog() {
    const body = `<div class="dialog-message">Static prototype only. Sign-in and account creation are not connected to an authentication service.</div><form><div class="field"><label for="demo-email">Email address</label><input id="demo-email" type="email" autocomplete="email" required></div><div class="field"><label for="demo-password">Password</label><input id="demo-password" type="password" autocomplete="current-password" required minlength="8"></div><button class="button-primary" type="submit" style="width:100%">Sign in preview</button></form><hr style="margin:18px 0;border:0;border-top:1px solid var(--line)"><form><div class="field"><label for="new-name">Full name</label><input id="new-name" required minlength="2" autocomplete="name"></div><div class="field"><label for="new-email">Email address</label><input id="new-email" type="email" required autocomplete="email"></div><div class="field"><label for="new-password">Create password</label><input id="new-password" type="password" required minlength="8" autocomplete="new-password"></div><label class="notice-inline"><input type="checkbox" required> I have read the privacy notice and consent to processing my account details.</label><div class="form-actions"><button class="button-secondary" type="submit">Create account preview</button></div></form>`
    openDialog('Sign in or create an account', body, { subtitle: 'No information entered here is saved or transmitted.' })
  }

  root.addEventListener('click', (event) => {
    const pageButton = event.target.closest('[data-page]')
    if (pageButton) {
      event.preventDefault()
      state.page = pageButton.dataset.page
      state.selectedTask = undefined
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
    if (action === 'locale') { state.locale = state.locale === 'en' ? 'sw' : 'en'; render() }
    else if (action === 'sos') showEmergencyDialog()
    else if (action === 'signin') showSignInDialog()
    else if (action === 'checkin') startCheckIn()
    else if (action === 'choose-file') document.getElementById('evidence-files')?.click()
    else if (action === 'notifications') toast('Notifications are not connected in this static prototype.')
    else if (action === 'contacts') toast('Trusted contact management and delivery are not connected.')
    else if (action === 'decision') toast('Review decisions are not saved or sent to a reviewer.')
    else if (action === 'export') toast('Sample data only; no real report was generated.')
    else if (action === 'upgrade') toast('Billing is not connected; no subscription was changed.')
    else if (action === 'privacy') toast('Privacy request workflow is not connected. No request was submitted.', true)
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

  root.addEventListener('change', (event) => {
    if (event.target.id === 'role-select') { state.role = event.target.value; state.page = 'dashboard'; render() }
    if (event.target.id === 'settings-mode') toast('Simplified mode is a visual preview only.')
  })

  root.addEventListener('submit', (event) => {
    if (event.target.id === 'verify-form') {
      event.preventDefault()
      const data = new FormData(event.target)
      const claim = String(data.get('claim') || '').trim()
      state.verifiedItems.unshift({ title: claim.slice(0, 75), source: `${data.get('type')} · Just now`, status: 'Not verified · local only', kind: 'review' })
      render()
      toast('Local record added. No source check or factual assessment was performed.')
    }
    if (event.target.id === 'incident-form') {
      event.preventDefault()
      const data = new FormData(event.target)
      state.incidents.unshift({ type: data.get('type'), severity: data.get('severity'), description: String(data.get('description') || '').trim().slice(0, 100) })
      render()
      toast('Saved only in this tab. No newsroom or emergency contact was notified.', true)
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

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}), { once: true })
  }

  render()
})()