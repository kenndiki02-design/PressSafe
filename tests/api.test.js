'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const endpoints = [
  require('../api/auth/me'),
  require('../api/dashboard'),
  require('../api/verification'),
  require('../api/cases'),
  require('../api/incidents'),
  require('../api/evidence'),
  require('../api/contacts'),
  require('../api/checkins'),
  require('../api/sos'),
  require('../api/reviews'),
  require('../api/training'),
  require('../api/privacy'),
  require('../api/notifications'),
  require('../api/organizations'),
  require('../api/organizations/invites'),
  require('../api/admin/audit'),
  require('../api/admin/summary'),
]

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    payload: undefined,
    setHeader(name, value) { this.headers[name] = value },
    end(value) { this.payload = value ? JSON.parse(value) : undefined },
  }
}

async function invoke(handler, method = 'GET', body = undefined, headers = {}) {
  const req = { method, body, headers, query: {} }
  const res = mockResponse()
  await handler(req, res)
  return res
}

test('all protected API endpoints reject anonymous requests', async (context) => {
  for (const handler of endpoints) {
    await context.test(handler.name || 'endpoint', async () => {
      const response = await invoke(handler)
      assert.equal(response.statusCode, 401)
      assert.match(response.payload.error, /sign in/i)
      assert.equal(response.headers['Cache-Control'], 'no-store')
    })
  }
})

test('login reports missing Supabase setup instead of accepting credentials locally', async () => {
  const login = require('../api/auth/login')
  const response = await invoke(login, 'POST', { email: 'person@example.org', password: 'a-strong-password-123' })
  assert.equal(response.statusCode, 503)
  assert.match(response.payload.error, /Supabase is not configured/i)
})

test('registration reports missing Supabase setup instead of creating a fake account', async () => {
  const register = require('../api/auth/register')
  const response = await invoke(register, 'POST', {
    fullName: 'Sample User',
    email: 'person@example.org',
    password: 'a-strong-password-123',
    role: 'JOURNALIST',
    consent: true,
  })
  assert.equal(response.statusCode, 503)
  assert.match(response.payload.error, /Supabase is not configured/i)
})

test('unsupported methods return 405 and advertise allowed methods', async () => {
  const logout = require('../api/auth/logout')
  const response = await invoke(logout, 'GET')
  assert.equal(response.statusCode, 405)
  assert.equal(response.headers.Allow, 'POST')
})

test('registration rejects public admin role without invitation', async () => {
  const register = require('../api/auth/register')
  const response = await invoke(register, 'POST', {
    fullName: 'Sample Admin',
    email: 'admin@example.org',
    password: 'a-strong-password-123',
    role: 'ADMIN',
    consent: true,
  })
  assert.equal(response.statusCode, 403)
  assert.match(response.payload.error, /invite/i)
})
