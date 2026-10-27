(() => {
  'use strict'

  const root = document.getElementById('app')
  if (!root) return

  const icons = {
    mark: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3 19 6v5c0 4.7-2.8 8.1-7 10-4.2-1.9-7-5.3-7-10V6l7-3Z" stroke="currentColor" stroke-width="1.8"/><path d="m8.5 12 2.2 2.2 4.8-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    dashboard: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.7"/><rect x="14" y="3" width="7" height="5" rx="1.5" stroke="currentColor" stroke-width="1.7"/><rect x="14" y="11" width="7" height="10" rx="1.5" stroke="currentColor" stroke-width="1.7"/><rect x="3" y="14" width="8" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/></svg>',
    verify: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" stroke-width="1.7"/><path d="m16 16 4.5 4.5M7.8 10.8l2 2 4-4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    vault: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="15" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M3 9h18M8 5V3h8v2M12 13v4m-2-2h4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    safety: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3 20 6v5c0 5-3.3 8.2-8 10-4.7-1.8-8-5-8-10V6l8-3Z" stroke="currentColor" stroke-width="1.7"/><path d="M12 8v5m0 3h.01" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
    training: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m3 8 9-5 9 5-9 5-9-5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M6 10v5c3.5 3 8.5 3 12 0v-5M21 8v7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    team: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="9" cy="8" r="3" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 20v-1.5A5.5 5.5 0 0 1 9 13h1a5.5 5.5 0 0 1 5.5 5.5V20M16 5.5a3 3 0 0 1 0 5.8m2 2a4.5 4.5 0 0 1 2.5 4V20" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    insights: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 20V10m5 10V4m5 16v-7m5 7V7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M2 21h20" stroke="currentColor" stroke-width="1.5"/></svg>',
    admin: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3 20 7v5c0 4.5-3.1 7.4-8 9-4.9-1.6-8-4.5-8-9V7l8-4Z" stroke="currentColor" stroke-width="1.7"/><path d="M9 12h6m-3-3v6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    billing: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M3 10h18m-14 5h4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7"/><path d="m19.4 15 .1.1 1.1.9-1.5 2.6-1.4-.5a7.8 7.8 0 0 1-1.7 1l-.2 1.5h-3l-.2-1.5a7.8 7.8 0 0 1-1.7-1l-1.4.5L8 16l1.1-.9A7 7 0 0 1 9 13.2l-1.3-.8 1.5-2.6 1.4.5a7.8 7.8 0 0 1 1.7-1l.2-1.5h3l.2 1.5a7.8 7.8 0 0 1 1.7 1l1.4-.5 1.5 2.6-1.2.8a7 7 0 0 1-.7 1.8Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" stroke-width="1.7"/><path d="m16 16 4.5 4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14m-7-7h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m12 3 10 18H2L12 3Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 9v5m0 3h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10l-7-7Z" stroke="currentColor" stroke-width="1.7"/><path d="M13 3v7h7m-11 4h6m-6 4h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 5v2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 17v3h16v-3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  }

  const roles = {
    JOURNALIST: { en: 'Journalist', sw: 'Mwandishi wa Habari' },
    CITIZEN: { en: 'Citizen / Student', sw: 'Mwananchi / Mwanafunzi' },
    EDITOR: { en: 'Editor / Newsroom', sw: 'Mhariri / Chumba cha Habari' },
    FACT_CHECKER: { en: 'Fact-checker', sw: 'Mkaguzi wa Ukweli' },
    ANALYST: { en: 'Media body analyst', sw: 'Mchambuzi wa Vyombo' },
    ADMIN: { en: 'Platform admin', sw: 'Msimamizi wa Jukwaa' },
  }
  const strings = {
    en: {
      dashboard: 'Dashboard', verify: 'Verify a claim', vault: 'Evidence vault', safety: 'Safety center',
      training: 'Training', team: 'Newsroom', queue: 'Review queue', insights: 'Media insights', admin: 'Platform admin',
      billing: 'Billing & usage', settings: 'Privacy & settings', login: 'Sign in', logout: 'Sign out', preview: 'Preview role',
      demo: 'DEMO DATA', overview: 'Your secure field desk', online: 'Online', offline: 'Offline',
    },
    sw: {
      dashboard: 'Dashibodi', verify: 'Thibitisha dai', vault: 'Hazina ya ushahidi', safety: 'Kituo cha usalama',
      training: 'Mafunzo', team: 'Chumba cha habari', queue: 'Foleni ya ukaguzi', insights: 'Takwimu za vyombo', admin: 'Usimamizi wa jukwaa',
      billing: 'Malipo na matumizi', settings: 'Faragha na mipangilio', login: 'Ingia', logout: 'Toka', preview: 'Hakiki jukumu',
      demo: 'DATA YA MFANO', overview: 'Nafasi yako salama ya kazi', online: 'Mtandaoni', offline: 'Nje ya mtandao',
    },
  }

  const state = {
    role: 'JOURNALIST',
    page: 'dashboard',
    locale: 'en',
    user: null,
    selectedTask: null,
    verifications: [
      { title: 'Video of the river crossing', source: 'Public social post · 2 hours ago', status: 'Requires review', kind: 'review' },
      { title: 'County water notice', source: 'Press release · Yesterday', status: 'Verified', kind: 'verified' },
      { title: 'Image from the market fire', source: 'Image · 14 Oct 2026', status: 'Unverified', kind: 'unverified' },
    ],
    evidence: [],
    incidents: [],
    tasks: [
      { title: 'River crossing footage', topic: 'Climate & environment · 18 min ago', priority: 'High', status: 'Needs review' },
      { title: 'County budget quotation', topic: 'Public policy · 46 min ago', priority: 'Normal', status: 'Assigned to you' },
      { title: 'Market fire image', topic: 'Image provenance · 2 hours ago', priority: 'Normal', status: 'Needs review' },
    ],
    checkIn: false,
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character])
  }

  function t(key) { return strings[state.locale][key] || strings.en[key] || key }
  function icon(name) { return icons[name] || icons.file }
  function roleName(role = state.role) { return roles[role]?.[state.locale] || roles.JOURNALIST[state.locale] }
  function renderRoleOptions() {
    return Object.entries(roles).map(([key, name]) =>
      `<option value="${key}" ${state.role === key ? 'selected' : ''}>${name[state.locale]}</option>`
    ).join('')
  }
  function toast(message, error = false) {
    const region = document.getElementById('toast-region')
    if (!region) return
    const item = document.createElement('div')
    item.className = `toast${error ? ' error' : ''}`
    item.textContent = message
    region.append(item)
    window.setTimeout(() => item.remove(), 4200)
  }

  function navItems() {
    const items = [
      ['dashboard', t('dashboard'), 'dashboard'], ['verify', t('verify'), 'verify'],
      ['vault', t('vault'), 'vault'], ['safety', t('safety'), 'safety'],
      ['training', t('training'), 'training'],
    ]
    if (state.role === 'EDITOR' || state.role === 'ADMIN') items.push(['team', t('team'), 'team'])
    if (state.role === 'FACT_CHECKER' || state.role === 'EDITOR' || state.role === 'ADMIN') items.push(['queue', t('queue'), 'verify'])
    if (state.role === 'ANALYST' || state.role === 'ADMIN') items.push(['insights', t('insights'), 'insights'])
    if (state.role === 'ADMIN') items.push(['admin', t('admin'), 'admin'])
    items.push(['billing', t('billing'), 'billing'], ['settings', t('settings'), 'settings'])
    return items
  }

  function renderNav(mobile = false) {
    return navItems().slice(0, mobile ? 5 : undefined).map(([page, label, symbol]) =>
      `<button class="nav-link ${state.page === page ? 'active' : ''}" data-page="${page}" ${state.page === page ? 'aria-current="page"' : ''}>${icon(symbol)}<span>${esc(label)}</span></button>`
    ).join('')
  }

  function metric(label, value, foot, symbol, tint = '') {
    return `<article class="metric"><div class="metric-top"><span>${esc(label)}</span><span class="metric-icon ${tint}">${icon(symbol)}</span></div><div class="metric-value">${esc(value)}</div><div class="metric-foot">${esc(foot)}</div></article>`
  }

  function panel(title, body, options = {}) {
    return `<section class="panel ${options.className || ''}"><header class="panel-header"><div><h2 class="panel-title">${esc(title)}</h2>${options.caption ? `<div class="panel-caption">${esc(options.caption)}</div>` : ''}</div>${options.action || ''}</header><div class="panel-body">${body}</div></section>`
  }

  function statusBadge(kind, label) { return `<span class="status status-${kind}">${esc(label)}</span>` }

  function pageHeading(eyebrow, title, subtitle, actions = '') {
    return `<div class="page-heading"><div><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1><p class="page-subtitle">${esc(subtitle)}</p></div>${actions ? `<div class="heading-actions">${actions}</div>` : ''}</div>`
  }

  function notice() {
    return `<div class="demo-notice">${icon('alert')}<span><strong>${t('demo')}.</strong> Sample workspace only. Verification, SOS delivery, uploads, alerts and reporting are not connected to production services.</span></div>`
  }

  function pageDashboard() {
    const citizen = state.role === 'CITIZEN'
    const editor = state.role === 'EDITOR'
    const checker = state.role === 'FACT_CHECKER'
    const analyst = state.role === 'ANALYST'
    const admin = state.role === 'ADMIN'
    const heading = citizen ? ['GUIDED MODE', 'Start with one small step', 'Plain-language tools and short lessons for community reporters.']
      : editor ? ['NEWSROOM DESK', 'Good morning, Amina', 'Publication checks and team safety at a glance.']
      : checker ? ['REVIEW DESK', 'Your verification queue', 'Prioritized claims waiting for careful human review.']
      : analyst ? ['MEDIA BODY', 'Press safety overview', 'Anonymized sample trends. No reporter-level data is shown.']
      : admin ? ['SYSTEM OVERVIEW', 'Platform operations', 'Sample service health and governance indicators.']
      : ['FIELD DESK', `Welcome back${state.user?.name ? `, ${state.user.name.split(' ')[0]}` : ', Amina'}`, 'Your secure workspace for verification, evidence, and field safety.']

    let quickActions = citizen
      ? [['verify', 'Check a claim', 'Get a plain-language first look.', 'verify'], ['vault', 'Save evidence', 'Keep a record in this browser preview.', 'vault'], ['safety', 'Get help', 'Open your safety center.', 'safety']]
      : [['verify', 'Verify a claim', 'Review text, links, or media.', 'verify'], ['vault', 'Save evidence', 'Organize a case record.', 'vault'], ['safety', 'Report incident', 'Document a field safety concern.', 'safety']]

    let metrics = citizen
      ? [metric('Checks this month', '2 / 5', 'Free preview allowance', 'verify'), metric('Saved items', '3', 'Stored in this demo', 'vault', 'blue'), metric('Lessons', '2 / 6', 'Guided learning path', 'training', 'amber'), metric('Safety status', 'Ready', 'Check-in not active', 'safety', 'coral')]
      : editor
      ? [metric('Open reviews', '08', 'Across 4 active stories', 'verify'), metric('Staff on assignment', '12', '3 check-ins due soon', 'team', 'blue'), metric('Shared incidents', '02', 'Requires newsroom follow-up', 'safety', 'coral'), metric('Monthly usage', '68%', 'Newsroom plan · demo', 'billing', 'amber')]
      : checker
      ? [metric('Assigned to you', '06', '2 high priority', 'verify'), metric('Completed this week', '18', 'Median turnaround 42 min', 'clock', 'blue'), metric('Awaiting assignment', '11', 'Across all reviewers', 'team', 'amber'), metric('Decision agreement', '94%', 'Sample quality metric', 'insights', 'coral')]
      : analyst
      ? [metric('Incidents this month', '146', 'Anonymized sample data', 'safety', 'coral'), metric('Counties represented', '18', 'No live location data', 'insights'), metric('Claims reviewed', '2.4k', 'Sample period · 30 days', 'verify', 'blue'), metric('Climate-related', '31%', 'Share of sampled claims', 'vault', 'amber')]
      : admin
      ? [metric('Active accounts', '1,284', 'Sample platform data', 'team'), metric('Organizations', '47', 'Across 5 subscription tiers', 'team', 'blue'), metric('API availability', '99.9%', 'Illustrative health indicator', 'insights'), metric('Open privacy requests', '04', 'Needs authorized review', 'settings', 'amber')]
      : [metric('Verifications', '12', '3 need a human review', 'verify'), metric('Evidence items', '28', 'Across 4 active cases', 'vault', 'blue'), metric('Open incidents', '02', 'Private to your account', 'safety', 'coral'), metric('Training progress', '67%', '4 of 6 lessons complete', 'training', 'amber')]

    const actions = quickActions.map(([page, title, description, symbol]) =>
      `<button class="action-tile" data-page="${page}"><span class="metric-icon">${icon(symbol)}</span><strong>${esc(title)}</strong><span>${esc(description)}</span></button>`
    ).join('')

    let primaryBody
    let sideBody
    if (checker) {
      primaryBody = panel('Priority review tasks', `<div class="tag-row" style="margin-bottom:8px"><span class="tiny-tag">SORTED BY PRIORITY</span><span class="tiny-tag">DEMO QUEUE</span></div>${taskRows()}`, { caption: 'Claims escalated for human review' })
      sideBody = `<div class="stack">${panel('Reviewer workload', '<div class="usage-row"><span>Assigned tasks</span><strong>6 / 10</strong></div><div class="progress-line"><span style="width:60%"></span></div><div class="progress-caption"><span>Capacity used</span><span>60%</span></div><div class="callout">Performance and accuracy figures are sample data, not an assessment of an actual reviewer.</div>', { caption: 'Sample this week' })}${panel('Review principles', '<div class="case-row"><span class="case-symbol">1</span><div class="row-main"><strong>Separate evidence from conclusion</strong><span>Record sources and uncertainty.</span></div></div><div class="case-row"><span class="case-symbol">2</span><div class="row-main"><strong>Preserve conflicting context</strong><span>Do not force a binary result.</span></div></div>')}</div>`
    } else if (analyst) {
      primaryBody = panel('Incidents by county', '<div class="chart-bars"><div class="chart-row"><span>Nairobi</span><div class="chart-track"><span style="width:92%"></span></div><strong>42</strong></div><div class="chart-row"><span>Mombasa</span><div class="chart-track"><span style="width:63%"></span></div><strong>29</strong></div><div class="chart-row"><span>Kisumu</span><div class="chart-track"><span style="width:48%"></span></div><strong>22</strong></div><div class="chart-row"><span>Nakuru</span><div class="chart-track"><span style="width:35%"></span></div><strong>16</strong></div><div class="chart-row"><span>Other</span><div class="chart-track"><span style="width:81%"></span></div><strong>37</strong></div></div>', { caption: '30-day anonymized sample · no personal identifiers' })
      sideBody = `<div class="stack">${panel('Topics being checked', '<div class="chart-bars"><div class="chart-row"><span>Environment</span><div class="chart-track"><span style="width:74%"></span></div><strong>31%</strong></div><div class="chart-row"><span>Public safety</span><div class="chart-track"><span style="width:61%"></span></div><strong>26%</strong></div><div class="chart-row"><span>Public policy</span><div class="chart-track"><span style="width:45%"></span></div><strong>19%</strong></div><div class="chart-row"><span>Other</span><div class="chart-track"><span style="width:57%"></span></div><strong>24%</strong></div></div>')}${panel('Privacy boundary', '<div class="callout">Reporter identities and exact locations are withheld in this sample view. Case follow-up requires explicit consent.</div>')}</div>`
    } else if (admin) {
      primaryBody = panel('Service health', '<div class="case-row"><span class="metric-icon">●</span><div class="row-main"><strong>Web application</strong><span>Responding normally · sample</span></div><span class="status status-verified">Operational</span></div><div class="case-row"><span class="metric-icon blue">●</span><div class="row-main"><strong>Database</strong><span>Connection status not live</span></div><span class="status status-review">Unverified</span></div><div class="case-row"><span class="metric-icon amber">●</span><div class="row-main"><strong>Email delivery</strong><span>SMTP settings required</span></div><span class="status status-review">Configure</span></div>', { caption: 'Illustrative status; live monitoring not connected' })
      sideBody = `<div class="stack">${panel('Governance queue', '<div class="usage-row"><span>Data requests</span><strong>04</strong></div><div class="usage-row"><span>Security alerts</span><strong>02</strong></div><div class="usage-row"><span>Abuse reports</span><strong>07</strong></div>', { caption: 'Sample counts only' })}${panel('Audit trail', '<div class="empty-state"><strong>No live audit feed</strong>Audit API and admin authorization are not implemented.</div>')}</div>`
    } else if (editor) {
      primaryBody = panel('Stories awaiting review', verificationTable(), { caption: 'Publication readiness · sample records', action: '<button class="text-link" data-page="queue">Open review queue</button>' })
      sideBody = `<div class="stack">${panel('Team safety status', '<div class="usage-row"><span>Checked in</span><strong>09</strong></div><div class="usage-row"><span>Due soon</span><strong>03</strong></div><div class="usage-row"><span>Overdue</span><strong>01</strong></div><div class="callout warning" style="margin-top:12px">This preview does not contact staff or dispatch emergency notifications.</div>')}${panel('Newsroom usage', '<div class="usage-row"><span>Verification credits</span><strong>68 / 100</strong></div><div class="progress-line"><span style="width:68%"></span></div><div class="progress-caption"><span>Current billing period</span><span>68%</span></div><button class="button-secondary" data-page="billing">View plan and usage</button>')}</div>`
    } else {
      primaryBody = panel('Recent verification reports', verificationTable(), { caption: 'Latest activity in this demo workspace', action: '<button class="text-link" data-page="verify">View history</button>' })
      sideBody = `<div class="stack">${panel(citizen ? 'Continue learning' : 'Active cases', citizen ? '<div class="lesson-row"><span class="case-symbol">01</span><div class="row-main"><strong>Check the source first</strong><span>5 min · Verification basics</span></div><button class="text-link" data-page="training">Start</button></div><div class="lesson-row"><span class="case-symbol">02</span><div class="row-main"><strong>Stay safer online</strong><span>8 min · Digital safety</span></div><button class="text-link" data-page="training">Start</button></div>' : '<div class="case-row"><span class="case-symbol">A</span><div class="row-main"><strong>Flood response updates</strong><span>6 claims · Updated today</span></div><span class="row-meta">4/6</span></div><div class="case-row"><span class="case-symbol">B</span><div class="row-main"><strong>County procurement file</strong><span>3 evidence items · 13 Oct</span></div><span class="row-meta">2/3</span></div><div class="case-row"><span class="case-symbol">C</span><div class="row-main"><strong>Market fire reports</strong><span>2 claims · 12 Oct</span></div><span class="row-meta">1/2</span></div>', { action: '<button class="text-link" data-page="vault">Open</button>' })}${panel(citizen ? 'Free preview' : 'Plan usage', `<div class="usage-row"><span>${citizen ? 'Checks used' : 'Monthly verification use'}</span><strong>${citizen ? '2 / 5' : '68 / 100'}</strong></div><div class="progress-line"><span style="width:${citizen ? '40' : '68'}%"></span></div><div class="progress-caption"><span>${citizen ? 'Sample free tier' : 'Newsroom plan · sample'}</span><span>${citizen ? '40%' : '68%'}</span></div><button class="button-quiet" data-page="billing">View usage ${icon('arrow')}</button>`)}</div>`
    }

    if (citizen) {
      return `${pageHeading(...heading, '<button class="sos-button" data-action="sos">'+icon('alert')+'Get help</button>')}<div class="role-intro"><div><strong>One step at a time</strong><p>Start with a source, save useful records, and keep a trusted person informed. This preview cannot verify claims or send emergency alerts.</p></div><span class="tiny-tag">GUIDED MODE</span></div><div class="metrics" style="margin-top:14px">${metrics.join('')}</div><div class="action-grid">${actions}</div><div class="content-grid"><div class="stack">${primaryBody}</div>${sideBody}</div>`
    }

    return `${pageHeading(...heading, '<button class="button-secondary" data-page="safety">'+icon('clock')+'Check-in</button><button class="sos-button" data-action="sos">'+icon('alert')+'SOS</button>')}<div class="metrics">${metrics.join('')}</div><div class="content-grid"><div class="stack"><div class="action-grid">${actions}</div><div class="safety-strip"><div class="safety-copy"><span class="safety-icon">${icon('clock')}</span><div><strong>${state.checkIn ? 'Check-in active · due in 58 min' : 'No active check-in'}</strong><span>${state.checkIn ? 'Local preview timer only. No missed-check-in alert will be sent.' : 'Set a timer before heading into the field.'}</span></div></div><button class="button-secondary" data-action="checkin">${state.checkIn ? 'Check in safe' : 'Start check-in'}</button></div>${primaryBody}</div>${sideBody}</div><p class="footer-note">Dashboard figures and activity are sample data. No live emergency response, notifications, or verification service is connected.</p>`
  }

  function verificationTable() {
    const rows = state.verifications.map((item) => `<tr class="search-row" data-search="${esc(item.title.toLowerCase())}"><td>${esc(item.title)}</td><td>${esc(item.source)}</td><td>${statusBadge(item.kind, item.status)}</td></tr>`).join('')
    return `<div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Claim / item</th><th>Source</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>`
  }

  function taskRows() {
    return state.tasks.map((task, index) => `<div class="task-row"><span class="metric-icon ${task.priority === 'High' ? 'coral' : 'blue'}">${icon('verify')}</span><div class="row-main"><strong>${esc(task.title)}</strong><span>${esc(task.topic)} · ${esc(task.status)}</span></div><span class="status ${task.priority === 'High' ? 'status-unverified' : 'status-review'}">${esc(task.priority)}</span><button class="icon-button" data-task="${index}" aria-label="Open ${esc(task.title)}">${icon('arrow')}</button></div>`).join('')
  }

  function pageVerify() {
    const rows = state.verifications.map((item) => `<tr class="search-row" data-search="${esc(`${item.title} ${item.source}`.toLowerCase())}"><td>${esc(item.title)}</td><td>${esc(item.source)}</td><td>${statusBadge(item.kind, item.status)}</td></tr>`).join('')
    const form = `<form id="verify-form"><div class="form-grid"><div class="field"><label for="input-type">Input type</label><select id="input-type" name="type"><option>Text claim</option><option>URL</option><option>Image</option><option>Video</option><option>Document</option></select></div><div class="field"><label for="verify-topic">Topic (optional)</label><select id="verify-topic" name="topic"><option>General</option><option>Climate & environment</option><option>Public safety</option><option>Public policy</option></select></div><div class="field full"><label for="claim">Claim or context</label><textarea id="claim" name="claim" required minlength="8" placeholder="Paste the claim or describe the media and where it appeared."></textarea><span class="field-hint">Do not include confidential source identities in this demo form.</span></div></div><div class="form-actions"><button class="button-primary" type="submit">Submit for preview ${icon('arrow')}</button></div></form>`
    return `${pageHeading('CLAIM VERIFICATION', 'Check a claim', 'Organize claims for review. The live AI, external fact-check APIs, and media forensics integrations are not connected.')}<div class="callout warning" style="margin-bottom:14px">This is a user-interface preview. Submissions stay in page memory and receive no factual assessment.</div>${panel('New verification request', form, { caption: 'Text, URL, image, video, or document' })}<section class="panel full-panel"><header class="panel-header"><div><h2 class="panel-title">Verification history</h2><div class="panel-caption">Sample records and requests created in this tab</div></div><label class="search-box">${icon('search')}<input type="search" data-filter placeholder="Search reports" aria-label="Search reports"></label></header><div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Claim / item</th><th>Source</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></section>`
  }

  function pageVault() {
    const evidenceRows = state.evidence.length ? state.evidence.map((item) => `<div class="case-row"><span class="case-symbol">${icon('file')}</span><div class="row-main"><strong>${esc(item.name)}</strong><span>SHA-256 ${esc(item.hash)} · Preview only, not uploaded</span></div><span class="status status-review">Local</span></div>`).join('') : '<div class="empty-state"><strong>No local preview items yet</strong>Select a file to calculate a browser-side SHA-256 digest. The file will not leave this device.</div>'
    return `${pageHeading('EVIDENCE VAULT', 'Preserve your material', 'A private browser preview for organizing evidence. This workspace has no storage service, encryption passphrase flow, or chain-of-custody backend.','<button class="button-secondary" data-action="choose-file">'+icon('plus')+'Choose files</button>')}<div class="callout danger" style="margin-bottom:14px">Do not use this preview to preserve sensitive or time-critical evidence. No upload, encryption-at-rest, timestamping, access control, or legal certificate is provided.</div><input id="evidence-file" type="file" multiple accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt" hidden>${panel('Evidence in this browser session', evidenceRows, { caption: 'Files are not uploaded or persisted' })}<div class="content-grid full-panel"><div class="stack">${panel('Chain of custody', '<div class="empty-state"><strong>No verified custody events</strong>Immutable custody logging requires the server-side evidence API, which is not yet available.</div>')}${panel('Source protection', '<div class="callout">Avoid uploading source-identifying materials to an unconfigured service. Metadata stripping and per-item permissions are not active.</div>')}</div>${panel('Integrity certificate', '<div class="empty-state"><strong>No certificate available</strong>Certificate export depends on trusted timestamps and server-verified custody records.</div>')}</div>`
  }

  function pageSafety() {
    const incidentList = state.incidents.length ? state.incidents.map((item) => `<div class="case-row"><span class="safety-icon">${icon('alert')}</span><div class="row-main"><strong>${esc(item.type)} · ${esc(item.severity)}</strong><span>${esc(item.description)} · Saved in this tab only</span></div><span class="status status-review">Local</span></div>`).join('') : '<div class="empty-state"><strong>No incident reports in this tab</strong>Submitted preview reports are not sent to an editor, newsroom, or support team.</div>'
    const form = `<form id="incident-form"><div class="form-grid"><div class="field"><label for="incident-type">Incident type</label><select name="type" id="incident-type"><option>Threat</option><option>Harassment</option><option>Physical attack</option><option>Arrest / detention</option><option>Equipment seizure</option><option>Online abuse / doxxing</option><option>Legal action</option><option>Other</option></select></div><div class="field"><label for="incident-severity">Severity</label><select name="severity" id="incident-severity"><option>Medium</option><option>Low</option><option>High</option><option>Critical</option></select></div><div class="field full"><label for="incident-description">What happened?</label><textarea id="incident-description" name="description" required minlength="8" placeholder="Record only what is safe to enter in this demo."></textarea></div></div><div class="form-actions"><button class="button-primary" type="submit">Save local preview</button></div></form>`
    return `${pageHeading('JOURNALIST SAFETY', 'Safety center', 'Review trusted contacts, check-in status, and incident records. Emergency services and contact notifications are not configured.','<button class="sos-button" data-action="sos">'+icon('alert')+'SOS preview</button>')}<div class="callout danger" style="margin-bottom:14px"><strong>Emergency notice:</strong> SOS is not connected and will not notify anyone. If you are in immediate danger, contact local emergency services using a trusted channel.</div><div class="content-grid"><div class="stack">${panel('Check-in timer', `<div class="safety-strip"><div class="safety-copy"><span class="safety-icon">${icon('clock')}</span><div><strong>${state.checkIn ? 'Check-in active · due in 58 min' : 'No active check-in'}</strong><span>Timer is only a local interface state. Missed check-ins do not trigger alerts.</span></div></div><button class="button-secondary" data-action="checkin">${state.checkIn ? 'Check in safe' : 'Start 60-minute timer'}</button></div>`, { caption: 'No background monitoring' })}${panel('Report an incident', form, { caption: 'Saved only in the current browser tab' })}${panel('Incident timeline', incidentList)}</div><div class="stack">${panel('Trusted contacts', '<div class="contact-row"><span class="avatar">JM</span><div class="row-main"><strong>Joseph Mwangi · Editor</strong><span>Contact details hidden in this sample</span></div><span class="status status-review">Demo</span></div><div class="contact-row"><span class="avatar">AK</span><div class="row-main"><strong>Asha Kamau · Trusted contact</strong><span>No notifications configured</span></div><span class="status status-review">Demo</span></div><button class="button-secondary" data-action="contact">Manage contacts</button>', { caption: 'Sample contacts, not real people' })}${panel('Field safety checklist', '<div class="lesson-row"><span class="case-symbol">01</span><div class="row-main"><strong>Share an assignment plan</strong><span>Agree on a check-in time with your editor.</span></div></div><div class="lesson-row"><span class="case-symbol">02</span><div class="row-main"><strong>Keep a backup route</strong><span>Choose a safe contact method before travel.</span></div></div><div class="lesson-row"><span class="case-symbol">03</span><div class="row-main"><strong>Protect source details</strong><span>Limit sensitive information on your device.</span></div></div>')}</div></div>`
  }

  function pageTraining() {
    return `${pageHeading('LEARNING', 'Training library', 'Short, practical lessons for verification, digital security, and reporting ethics.')}<div class="metrics">${metric('Started', '4 / 6', 'Sample progress', 'training')}${metric('Completed', '2', 'Across three topics', 'verify', 'blue')}${metric('Next lesson', '7 min', 'Check the original source', 'clock', 'amber')}${metric('Certificate', '—', 'Completion records unavailable', 'file', 'coral')}</div><div class="content-grid"><div class="stack">${panel('Verification basics', '<div class="lesson-row"><span class="case-symbol">01</span><div class="row-main"><strong>Trace a claim to its original source</strong><span>5 min · Beginner · Sample content</span></div><button class="button-secondary" data-action="lesson">Open</button></div><div class="lesson-row"><span class="case-symbol">02</span><div class="row-main"><strong>Read image context and metadata</strong><span>8 min · Beginner · Sample content</span></div><button class="button-secondary" data-action="lesson">Open</button></div><div class="lesson-row"><span class="case-symbol">03</span><div class="row-main"><strong>Verify environmental claims</strong><span>10 min · Intermediate · Sample content</span></div><button class="button-secondary" data-action="lesson">Open</button></div>')}${panel('Safety and ethics', '<div class="lesson-row"><span class="case-symbol">04</span><div class="row-main"><strong>Protect a source on a shared device</strong><span>8 min · Digital safety</span></div><button class="button-secondary" data-action="lesson">Open</button></div><div class="lesson-row"><span class="case-symbol">05</span><div class="row-main"><strong>Consent and responsible reporting</strong><span>6 min · Ethics</span></div><button class="button-secondary" data-action="lesson">Open</button></div>')}</div>${panel('Your progress', '<div class="progress-caption"><span>Learning path</span><strong>33%</strong></div><div class="progress-line"><span style="width:33%"></span></div><p class="footer-note">Progress is sample data and is not saved to an account.</p><div class="callout">Training content has not been reviewed or published by a newsroom or media body.</div>')}</div>`
  }

  function pageQueue() {
    return `${pageHeading('HUMAN REVIEW', 'Fact-checking queue', 'A sample queue for reviewers. Assignment, deadlines, decision history, and source integrations are not connected.')}<div class="metrics">${metric('Awaiting assignment', '11', 'Sample queue count', 'clock', 'amber')}${metric('Assigned to you', String(state.tasks.length), 'In this preview', 'team')}${metric('High priority', '02', 'Illustrative only', 'alert', 'coral')}${metric('Completed today', '07', 'Sample count', 'verify', 'blue')}</div><div class="content-grid"><div class="stack">${panel('Review tasks', `<div class="toolbar"><div class="toolbar-left"><span class="tiny-tag">PRIORITY: HIGH TO LOW</span></div><label class="search-box">${icon('search')}<input type="search" data-filter placeholder="Search tasks" aria-label="Search tasks"></label></div><div class="panel-body">${taskRows()}</div>`, { caption: 'Manual review is essential; model output is not a verdict' })}${state.selectedTask !== null ? panel('Review workspace', `<div class="callout warning" style="margin-bottom:12px">Sample claim details only. Do not treat this as a factual assessment.</div><p><strong>${esc(state.tasks[state.selectedTask]?.title || 'Selected task')}</strong></p><div class="field"><label for="review-notes">Reviewer notes</label><textarea id="review-notes" placeholder="Add source notes in this local preview"></textarea></div><div class="form-actions"><button class="button-secondary" data-action="decision">Requires further review</button><button class="button-primary" data-action="decision">Save preview decision</button></div>`) : ''}</div>${panel('Review standards', '<div class="case-row"><span class="case-symbol">A</span><div class="row-main"><strong>Check primary sources</strong><span>Record the source and publication date.</span></div></div><div class="case-row"><span class="case-symbol">B</span><div class="row-main"><strong>Preserve uncertainty</strong><span>Escalate conflicting or incomplete evidence.</span></div></div><div class="case-row"><span class="case-symbol">C</span><div class="row-main"><strong>Use three supported outcomes</strong><span>Verified · Further review · Unverified</span></div></div>')}</div>`
  }

  function pageTeam() {
    return `${pageHeading('NEWSROOM', 'Team overview', 'Coordinate story checks and staff safety. Member management, role assignment, and live check-in alerts are not connected.')}<div class="metrics">${metric('Active stories', '08', 'Sample team view', 'file')}${metric('Reviews pending', '12', 'Across the newsroom', 'verify', 'amber')}${metric('Staff on assignment', '12', 'Sample roster', 'team', 'blue')}${metric('Overdue check-ins', '01', 'Not a live alert', 'safety', 'coral')}</div><div class="content-grid"><div class="stack">${panel('Publication readiness', verificationTable(), { caption: 'Sample story-level claims', action: '<button class="text-link" data-page="queue">Review queue</button>' })}${panel('Shared incident reports', '<div class="callout warning">Shared reports require explicit reporter consent. This preview contains no real incident details.</div><div class="empty-state"><strong>No connected team reports</strong>Incident sharing and newsroom follow-up APIs are not implemented.</div>')}</div><div class="stack">${panel('Staff safety', '<div class="usage-row"><span>Checked in</span><strong>09</strong></div><div class="usage-row"><span>Due soon</span><strong>03</strong></div><div class="usage-row"><span>Overdue</span><strong>01</strong></div><button class="button-secondary" data-page="safety">Open safety center</button>', { caption: 'Illustrative team data' })}${panel('Team membership', '<div class="empty-state"><strong>No live member directory</strong>Organization membership and role assignment need authorized backend routes.</div>')}</div></div>`
  }

  function pageInsights() {
    return `${pageHeading('ANONYMIZED INSIGHTS', 'Media body dashboard', 'Explore aggregate safety and misinformation trends. All figures below are illustrative and contain no real reporter data.','<button class="button-secondary" data-action="export">'+icon('download')+'Export sample</button>')}<div class="metrics">${metric('Incidents · 30 days', '146', 'Illustrative sample', 'safety', 'coral')}${metric('Counties represented', '18', 'No exact locations', 'insights')}${metric('Claims checked', '2,408', 'Illustrative sample', 'verify', 'blue')}${metric('Climate claims', '31%', 'Sample topic share', 'vault', 'amber')}</div><div class="content-grid">${panel('Incidents by county', '<div class="chart-bars"><div class="chart-row"><span>Nairobi</span><div class="chart-track"><span style="width:92%"></span></div><strong>42</strong></div><div class="chart-row"><span>Mombasa</span><div class="chart-track"><span style="width:63%"></span></div><strong>29</strong></div><div class="chart-row"><span>Kisumu</span><div class="chart-track"><span style="width:48%"></span></div><strong>22</strong></div><div class="chart-row"><span>Nakuru</span><div class="chart-track"><span style="width:35%"></span></div><strong>16</strong></div><div class="chart-row"><span>Other counties</span><div class="chart-track"><span style="width:81%"></span></div><strong>37</strong></div></div>', { caption: 'Aggregated, sample values only' })}<div class="stack">${panel('Claim topics', '<div class="chart-bars"><div class="chart-row"><span>Environment</span><div class="chart-track"><span style="width:74%"></span></div><strong>31%</strong></div><div class="chart-row"><span>Public safety</span><div class="chart-track"><span style="width:61%"></span></div><strong>26%</strong></div><div class="chart-row"><span>Public policy</span><div class="chart-track"><span style="width:45%"></span></div><strong>19%</strong></div></div>')}${panel('Privacy safeguard', '<div class="callout">Only consented case follow-up should reveal case details. No map points or personal identifiers appear in this preview.</div>')}</div></div>`
  }

  function pageAdmin() {
    return `${pageHeading('PLATFORM GOVERNANCE', 'Administration', 'Operational controls shown here are previews only. No user management, content moderation, billing, or audit APIs are connected.')}<div class="metrics">${metric('User accounts', '1,284', 'Sample count', 'team')}${metric('Organizations', '47', 'Sample count', 'team', 'blue')}${metric('Open privacy requests', '04', 'Requires secure workflow', 'settings', 'amber')}${metric('Security alerts', '02', 'No live monitoring', 'alert', 'coral')}</div><div class="content-grid"><div class="stack">${panel('System components', '<div class="case-row"><span class="metric-icon">●</span><div class="row-main"><strong>Web application</strong><span>UI loaded in this session</span></div><span class="status status-active">Available</span></div><div class="case-row"><span class="metric-icon blue">●</span><div class="row-main"><strong>Database connection</strong><span>Live health check not implemented</span></div><span class="status status-review">Unknown</span></div><div class="case-row"><span class="metric-icon amber">●</span><div class="row-main"><strong>AI and fact-check APIs</strong><span>External providers not configured here</span></div><span class="status status-review">Not connected</span></div>')}${panel('Audit log', '<div class="empty-state"><strong>No live audit viewer</strong>Audit records exist in the schema, but protected query and retention workflows are not implemented.</div>')}</div><div class="stack">${panel('Governance queue', '<div class="usage-row"><span>Data access requests</span><strong>04</strong></div><div class="usage-row"><span>Deletion requests</span><strong>02</strong></div><div class="usage-row"><span>Abuse reports</span><strong>07</strong></div><button class="button-secondary" data-page="settings">Open privacy settings</button>')}${panel('API and billing', '<div class="callout warning">Do not create or display API keys in this demo. Secure key issuance, revocation, and usage controls require backend implementation.</div>')}</div></div>`
  }

  function pageBilling() {
    return `${pageHeading('ACCOUNT', 'Billing and usage', 'Plan and usage information is sample data. Subscription management, invoices, and API keys are not connected.')}<div class="content-grid"><div class="stack">${panel('Current plan', '<div class="role-intro"><div><strong>Newsroom · Preview</strong><p>Illustrative plan. No payment method is stored and no charges can be made from this screen.</p></div><span class="tiny-tag">DEMO</span></div><div class="usage-row" style="margin-top:16px"><span>Verification credits</span><strong>68 / 100</strong></div><div class="progress-line"><span style="width:68%"></span></div><div class="progress-caption"><span>Current period</span><span>68%</span></div><div class="form-actions"><button class="button-secondary" data-action="upgrade">Compare plans</button></div>')}${panel('Invoices', '<div class="empty-state"><strong>No invoices</strong>Billing provider integration is not configured.</div>')}</div>${panel('Usage breakdown', '<div class="usage-row"><span>Claim checks</span><strong>68</strong></div><div class="usage-row"><span>Evidence storage</span><strong>1.8 GB</strong></div><div class="usage-row"><span>Team seats</span><strong>12 / 20</strong></div><div class="usage-row"><span>API requests</span><strong>—</strong></div>')}</div>`
  }

  function pageSettings() {
    return `${pageHeading('ACCOUNT & PRIVACY', 'Settings and privacy', 'Manage interface preferences in this browser. Account security and legal data requests need server-side workflows.')}<div class="content-grid"><div class="stack">${panel('Interface', `<div class="field"><label for="settings-language">Language</label><select id="settings-language"><option value="en" ${state.locale === 'en' ? 'selected' : ''}>English</option><option value="sw" ${state.locale === 'sw' ? 'selected' : ''}>Kiswahili</option></select></div><div class="field" style="margin-top:12px"><label for="settings-mode">Display mode</label><select id="settings-mode"><option>Standard</option><option>Simplified preview</option></select></div>`, { caption: 'Saved for this browser session' })}${panel('Security', '<div class="case-row"><span class="case-symbol">2F</span><div class="row-main"><strong>Two-factor authentication</strong><span>Login API can verify a code; setup flow is not available.</span></div><span class="status status-review">Not configured</span></div><div class="case-row"><span class="case-symbol">S</span><div class="row-main"><strong>Active sessions</strong><span>Session management screen not connected.</span></div><span class="status status-review">Unavailable</span></div>')}</div><div class="stack">${panel('Privacy rights', '<div class="callout warning">Do not enter sensitive personal data into this preview. Data export, correction, and deletion requests are not connected to a privacy officer workflow.</div><p class="footer-note">The production service must define retention, consent, access controls, and a Data Protection Act 2019 process before collecting real incident or evidence data.</p><button class="button-secondary" data-action="privacy">Request data access / deletion</button>')}${panel('Consent', '<div class="empty-state"><strong>No live consent record</strong>The consent API needs to be tied to a visible, versioned privacy notice before use.</div>')}</div></div>`
  }

  const pageRenderers = {
    dashboard: pageDashboard, verify: pageVerify, vault: pageVault, safety: pageSafety,
    training: pageTraining, queue: pageQueue, team: pageTeam, insights: pageInsights,
    admin: pageAdmin, billing: pageBilling, settings: pageSettings,
  }

  function authDialog() {
    return `<dialog id="auth-dialog" aria-labelledby="auth-title"><form method="dialog"><header class="dialog-head"><div><h2 id="auth-title">Sign in to PressSafe</h2><p>Secure access to an account. Preview role switching never changes account permissions.</p></div><button class="dialog-close" value="cancel" aria-label="Close">${icon('close')}</button></header></form><div class="dialog-body"><div id="auth-message" class="dialog-message" role="alert" hidden></div><form id="login-form"><div class="field"><label for="login-email">Email address</label><input id="login-email" type="email" name="email" autocomplete="username" required></div><div class="field"><label for="login-password">Password</label><input id="login-password" type="password" name="password" autocomplete="current-password" required></div><div class="field" id="totp-field" hidden><label for="login-totp">Authenticator or recovery code</label><input id="login-totp" name="totpCode" inputmode="numeric" autocomplete="one-time-code"></div><button class="button-primary" type="submit" style="width:100%">Sign in</button></form><form id="register-form" hidden><div class="field"><label for="register-name">Full name</label><input id="register-name" name="name" autocomplete="name" minlength="2" required></div><div class="field"><label for="register-email">Email address</label><input id="register-email" type="email" name="email" autocomplete="email" required></div><div class="field"><label for="register-password">Password</label><input id="register-password" type="password" name="password" autocomplete="new-password" minlength="8" maxlength="128" required></div><button class="button-primary" type="submit" style="width:100%">Create journalist account</button></form><div class="dialog-switch"><span id="auth-switch-copy">New to PressSafe?</span> <button type="button" data-action="switch-auth">Create an account</button></div></div></dialog>`
  }

  function render() {
    const currentText = t(state.page) || 'Dashboard'
    const username = state.user?.name || 'Amina N.'
    const initials = username.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()
    const renderer = pageRenderers[state.page] || pageDashboard
    root.className = 'app-shell'
    root.innerHTML = `<aside class="sidebar"><a href="#dashboard" class="brand" data-page="dashboard"><span class="brand-mark">${icon('mark')}</span><span><span class="brand-name">PressSafe</span><span class="brand-caption">Field desk · Kenya</span></span></a><div class="workspace-label">${state.user ? 'YOUR WORKSPACE' : 'DEMO WORKSPACE'}</div><nav class="nav-list" aria-label="Main navigation">${renderNav()}</nav><div class="nav-divider"></div><div class="sidebar-bottom"><div class="offline-chip"><span class="online-dot" id="network-dot"></span><span id="network-label">${navigator.onLine ? t('online') : t('offline')} · local preview</span></div><div class="side-user"><span class="avatar">${esc(initials)}</span><div><div class="side-user-name">${esc(username)}</div><div class="side-user-role">${esc(roleName())}${state.user ? '' : ' · preview'}</div></div><button data-action="${state.user ? 'logout' : 'login'}" aria-label="${state.user ? t('logout') : t('login')}" title="${state.user ? t('logout') : t('login')}">${icon(state.user ? 'close' : 'lock')}</button></div></div></aside><div class="main-column"><header class="topbar"><div class="topbar-left"><div class="mobile-brand"><span class="brand-mark">${icon('mark')}</span>PressSafe</div><span class="topbar-note"><strong>${esc(currentText)}</strong> · ${esc(roles[state.role][state.locale])}</span><span class="preview-label">${state.user ? 'ACCOUNT' : t('preview')}</span></div><div class="topbar-actions"><select class="select-role" id="role-select" aria-label="${esc(t('preview'))}" ${state.user ? 'disabled title="Role comes from your account"' : ''}>${renderRoleOptions()}</select><button class="language-button" data-action="locale" aria-label="Switch language">${state.locale === 'en' ? 'SW' : 'EN'}</button><button class="icon-button" data-action="notifications" aria-label="Notifications" title="Notifications">${icon('bell')}</button>${state.user ? `<button class="signin-button" data-action="logout">${t('logout')}</button>` : `<button class="signin-button" data-action="login">${t('login')}</button>`}</div></header><section class="content">${notice()}${renderer()}</section></div><nav class="mobile-nav" aria-label="Mobile navigation">${renderNav(true)}</nav><div id="toast-region" class="toast-region" aria-live="polite"></div>${authDialog()}`
    bindAfterRender()
  }

  function bindAfterRender() {
    const fileInput = document.getElementById('evidence-file')
    if (fileInput) fileInput.addEventListener('change', handleFiles)
    const settingsLanguage = document.getElementById('settings-language')
    if (settingsLanguage) settingsLanguage.addEventListener('change', (event) => {
      state.locale = event.target.value
      render()
    })
    const filter = root.querySelector('[data-filter]')
    if (filter) filter.addEventListener('input', () => {
      const query = filter.value.toLowerCase()
      root.querySelectorAll('.search-row').forEach((row) => {
        row.hidden = !row.dataset.search.includes(query)
      })
    })
    const auth = document.getElementById('auth-dialog')
    if (auth) {
      auth.addEventListener('click', (event) => {
        if (event.target === auth) auth.close()
      })
      auth.querySelector('#login-form').addEventListener('submit', login)
      auth.querySelector('#register-form').addEventListener('submit', register)
    }
  }

  function showAuth(mode = 'login') {
    const dialog = document.getElementById('auth-dialog')
    const loginForm = document.getElementById('login-form')
    const registerForm = document.getElementById('register-form')
    const title = document.getElementById('auth-title')
    const copy = document.getElementById('auth-switch-copy')
    const toggle = dialog.querySelector('[data-action="switch-auth"]')
    const message = document.getElementById('auth-message')
    message.hidden = true
    document.getElementById('totp-field').hidden = true
    loginForm.hidden = mode !== 'login'
    registerForm.hidden = mode !== 'register'
    title.textContent = mode === 'login' ? 'Sign in to PressSafe' : 'Create a journalist account'
    copy.textContent = mode === 'login' ? 'New to PressSafe?' : 'Already registered?'
    toggle.textContent = mode === 'login' ? 'Create an account' : 'Sign in'
    if (!dialog.open) dialog.showModal()
  }

  function showAuthMessage(text, error = true) {
    const message = document.getElementById('auth-message')
    message.textContent = text
    message.hidden = false
    message.style.color = error ? 'var(--coral)' : 'var(--green)'
  }

  async function login(event) {
    event.preventDefault()
    const form = event.currentTarget
    const data = Object.fromEntries(new FormData(form).entries())
    const button = form.querySelector('button[type="submit"]')
    button.disabled = true
    button.textContent = 'Signing in…'
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      })
      const result = await response.json()
      if (result.error === 'TOTP_REQUIRED') {
        document.getElementById('totp-field').hidden = false
        showAuthMessage('Enter your authenticator code and submit again.', false)
        return
      }
      if (!response.ok) {
        const messages = {
          EMAIL_NOT_VERIFIED: 'Verify your email address before signing in.',
          'Invalid email or password': 'Email or password is not correct.',
          'Authentication is not configured': 'Sign-in is unavailable: the server secret is not configured.',
        }
        throw new Error(messages[result.error] || result.error || 'Sign-in failed.')
      }
      state.user = result.user
      state.role = result.user.role in roles ? result.user.role : 'JOURNALIST'
      state.page = 'dashboard'
      document.getElementById('auth-dialog').close()
      render()
      toast(`Signed in as ${result.user.name}.`)
    } catch (error) {
      showAuthMessage(error.message || 'Unable to reach the sign-in service.')
    } finally {
      button.disabled = false
      button.textContent = 'Sign in'
    }
  }

  async function register(event) {
    event.preventDefault()
    const form = event.currentTarget
    const data = Object.fromEntries(new FormData(form).entries())
    const button = form.querySelector('button[type="submit"]')
    button.disabled = true
    button.textContent = 'Creating account…'
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error === 'Email already registered' ? 'This email is already registered.' : 'Account creation failed. Check your details and try again.')
      form.reset()
      showAuth('login')
      showAuthMessage('Account created. Check your email for the verification link before signing in.', false)
    } catch (error) {
      showAuthMessage(error.message || 'Unable to reach the account service.')
    } finally {
      button.disabled = false
      button.textContent = 'Create journalist account'
    }
  }

  async function logout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }) } catch { /* local display still signs out */ }
    state.user = null
    state.role = 'JOURNALIST'
    state.page = 'dashboard'
    render()
    toast('Signed out of this browser session.')
  }

  async function handleFiles(event) {
    const files = [...event.target.files]
    for (const file of files) {
      if (file.size > 50 * 1024 * 1024) {
        toast(`${file.name}: select a file smaller than 50 MB for this local preview.`, true)
        continue
      }
      try {
        const bytes = await file.arrayBuffer()
        const digest = await crypto.subtle.digest('SHA-256', bytes)
        const hash = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('')
        state.evidence.unshift({ name: file.name, hash })
      } catch {
        toast('Browser SHA-256 is unavailable. Use a secure browser context.', true)
      }
    }
    render()
    if (files.length) toast('Digest calculated in this browser. No file was uploaded or encrypted.')
  }

  root.addEventListener('click', async (event) => {
    const pageButton = event.target.closest('[data-page]')
    if (pageButton) {
      event.preventDefault()
      state.page = pageButton.dataset.page
      render()
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const roleSelect = event.target.closest('#role-select')
    if (roleSelect) return
    const task = event.target.closest('[data-task]')
    if (task) {
      state.selectedTask = Number(task.dataset.task)
      render()
      return
    }
    const action = event.target.closest('[data-action]')?.dataset.action
    if (!action) return
    if (action === 'login') showAuth('login')
    else if (action === 'logout') await logout()
    else if (action === 'switch-auth') showAuth(document.getElementById('register-form').hidden ? 'register' : 'login')
    else if (action === 'locale') { state.locale = state.locale === 'en' ? 'sw' : 'en'; render() }
    else if (action === 'sos') toast('Preview only: no SOS alert was sent and no contact was notified.', true)
    else if (action === 'checkin') { state.checkIn = !state.checkIn; render(); toast(state.checkIn ? 'Preview timer started. No missed-check-in alert will be sent.' : 'Check-in recorded in this tab only.') }
    else if (action === 'choose-file') document.getElementById('evidence-file')?.click()
    else if (action === 'notifications') toast('There are no connected notifications in this preview.')
    else if (action === 'contact') toast('Trusted contact management is not connected.')
    else if (action === 'lesson') toast('Training lesson content is sample material and progress is not saved.')
    else if (action === 'decision') toast('Review decisions are not saved or sent to a reviewer.')
    else if (action === 'export') toast('This is sample data; no report was downloaded.')
    else if (action === 'upgrade') toast('Billing provider is not configured; no subscription was changed.')
    else if (action === 'privacy') toast('Privacy request workflow is not connected. No request was submitted.', true)
  })

  root.addEventListener('change', (event) => {
    if (event.target.id === 'role-select' && !state.user) {
      state.role = event.target.value
      state.page = 'dashboard'
      state.selectedTask = null
      render()
    }
    if (event.target.id === 'settings-mode') toast('Simplified mode is a visual preview only.')
  })

  root.addEventListener('submit', (event) => {
    if (event.target.id === 'verify-form') {
      event.preventDefault()
      const data = new FormData(event.target)
      const claim = String(data.get('claim') || '').trim()
      if (!claim) return
      state.verifications.unshift({ title: claim.slice(0, 64), source: `${data.get('type')} · Just now`, status: 'Requires review', kind: 'review' })
      render()
      toast('Saved as a local preview request. No fact-checking was performed.')
    }
    if (event.target.id === 'incident-form') {
      event.preventDefault()
      const data = new FormData(event.target)
      state.incidents.unshift({ type: data.get('type'), severity: data.get('severity'), description: String(data.get('description') || '').trim().slice(0, 100) })
      render()
      toast('Saved only in this browser tab. No newsroom or emergency contact was notified.', true)
    }
  })

  window.addEventListener('online', () => {
    const label = document.getElementById('network-label')
    if (label) label.textContent = `${t('online')} · local preview`
  })
  window.addEventListener('offline', () => {
    const label = document.getElementById('network-label')
    if (label) label.textContent = `${t('offline')} · local preview`
  })

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        toast('Offline shell could not be installed in this browser.')
      })
    }, { once: true })
  }

  render()
})()