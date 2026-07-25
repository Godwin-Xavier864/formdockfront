/**
 * EmailVerification.jsx
 * Email verification page for verifying user email addresses
 */
import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../config'

export function EmailVerification() {
  const [token, setToken] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    // Try to get token from URL params
    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get('token')
    if (urlToken) {
      setToken(urlToken)
    }
  }, [])

  async function verifyEmail(event) {
    if (event) event.preventDefault()
    if (!token.trim()) {
      setError('Verification token is required')
      return
    }

    setBusy(true)
    setStatus('')
    setError('')

    try {
      const resp = await fetch(
        `${API_BASE_URL}/api/auth/email/verify/?token=${encodeURIComponent(token)}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      const text = await resp.text()
      let data = null
      try {
        data = text ? JSON.parse(text) : null
      } catch {
        data = text
      }

      if (!resp.ok) {
        setError(`${resp.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`)
      } else {
        setStatus('Email verified successfully!')
        setResult({
          success: true,
          message: 'Your email has been verified.',
          data: data,
        })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="email-verification">
      <section className="panel">
        <article className="card form-grid" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <h1>Email Verification</h1>

          <label>
            Verification Token
            <textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your verification token here"
              rows={4}
            />
          </label>

          <p className="text-muted">
            Enter the verification token from your email.
          </p>

          <div className="actions">
            <button
              onClick={verifyEmail}
              disabled={busy || !token.trim()}
              style={{ width: '100%' }}
            >
              {busy ? 'Verifying...' : 'Verify Email'}
            </button>
          </div>

          {status && <p className="status">{status}</p>}
          {error && <p className="error">{error}</p>}

          {result && (
            <div className="verification-result">
              <h3>✓ Verification Successful</h3>
              <p>Your email address has been verified.</p>
              <p>
                <a href="/login">Go to login</a>
              </p>
            </div>
          )}
        </article>
      </section>
    </div>
  )
}
