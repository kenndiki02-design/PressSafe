(() => {
  'use strict'

  const feedback = document.getElementById('auth-feedback')
  const setFeedback = (message, success = false) => {
    feedback.textContent = message
    feedback.classList.toggle('success', success)
    feedback.hidden = false
  }
  const send = async (path, values) => {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store',
      body: JSON.stringify(values),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`)
    return result
  }

  const login = document.getElementById('login-form')
  if (login) login.addEventListener('submit', async (event) => {
    event.preventDefault()
    const button = login.querySelector('[type="submit"]')
    button.disabled = true
    try {
      const result = await send('/api/auth/login', Object.fromEntries(new FormData(login)))
      setFeedback(`Signed in as ${result.user.full_name}. Opening your ${result.user.role.toLowerCase().replaceAll('_', ' ')} workspace…`, true)
      location.assign('./index.html')
    } catch (error) { setFeedback(error.message) }
    finally { button.disabled = false }
  })

  const register = document.getElementById('register-form')
  if (register) {
    const role = document.getElementById('role')
    const organization = document.getElementById('organization')
    const invite = document.getElementById('invite')
    const syncFields = () => {
      const needsInvite = ['EDITOR', 'FACT_CHECKER', 'MEDIA_BODY', 'ADMIN'].includes(role.value)
      document.getElementById('invite-field').hidden = false
      invite.required = needsInvite
      document.getElementById('organization-field').hidden = true
      organization.required = false
    }
    role.addEventListener('change', syncFields)
    syncFields()

    register.addEventListener('submit', async (event) => {
      event.preventDefault()
      const button = register.querySelector('[type="submit"]')
      const values = Object.fromEntries(new FormData(register))
      values.consent = register.elements.consent.checked
      values.locale = document.documentElement.lang === 'sw' ? 'sw' : 'en'
      button.disabled = true
      try {
        const result = await send('/api/auth/register', values)
        if (result.user && !result.requiresEmailConfirmation) {
          setFeedback(`Account created for ${result.user.full_name}. Opening your registered dashboard…`, true)
          location.assign('./index.html')
        } else {
          register.reset()
          setFeedback('Account created. Verify your email, then sign in.', true)
        }
      } catch (error) { setFeedback(error.message) }
      finally { button.disabled = false }
    })
  }
})()
