/**
 * FormRewriteTool.jsx
 * AI-powered form rewriting tool using Groq
 */
import { useState, useEffect } from 'react'
import { API_BASE_URL, REWRITE_USAGE_KEY, ACCESS_TOKEN_KEY, SELECTED_PROJECT_ID_KEY } from '../config'

export function FormRewriteTool() {
  const [htmlInput, setHtmlInput] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [usageCount, setUsageCount] = useState(0)

  useEffect(() => {
    // Load usage count from localStorage on mount
    const saved = parseInt(localStorage.getItem(REWRITE_USAGE_KEY) || '0')
    setUsageCount(saved)
  }, [])

  async function rewriteForm(event) {
    event.preventDefault()
    
    // Get token from localStorage
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!accessToken) {
      setError('You must be logged in to use this feature')
      return
    }
    
    // Get project ID from localStorage
    const projectId = localStorage.getItem(SELECTED_PROJECT_ID_KEY)
    if (!projectId) {
      setError('Please select a project first')
      return
    }
    
    if (!htmlInput.trim()) {
      setError('HTML input is required')
      return
    }

    // Check usage quota
    if (usageCount >= 2) {
      setError('You have reached your maximum rewrite attempts (2 per user).')
      return
    }

    setBusy(true)
    setStatus('')
    setError('')

    try {
      const payload = {
        project_id: projectId,
        html_input: htmlInput.trim(),
      }

      const resp = await fetch(`${API_BASE_URL}/api/v1/tools/form-rewrite/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await resp.json()

      if (!resp.ok) {
        setError(`${resp.status}: ${JSON.stringify(data)}`)
        setResult(null)
      } else {
        // Increment usage count and save to localStorage
        const newCount = usageCount + 1
        setUsageCount(newCount)
        localStorage.setItem(REWRITE_USAGE_KEY, String(newCount))
        
        setStatus('Form rewritten successfully!')
        setResult(data)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function downloadRewrittenHtml() {
    if (!result?.rewritten_html) return
    const element = document.createElement('a')
    element.setAttribute(
      'href',
      'data:text/html;charset=utf-8,' + encodeURIComponent(result.rewritten_html)
    )
    element.setAttribute('download', 'rewritten-form.html')
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const remainingUses = Math.max(0, 2 - usageCount)
  const quotaExhausted = usageCount >= 2

  return (
    <div className="form-rewrite-tool">
      <section className="panel">
        <h1>Form AI Rewrite Tool</h1>
        <p>Rewrite HTML forms using AI-powered suggestions.</p>

        <div className="grid-two">
          <form onSubmit={rewriteForm} className="card form-grid">
            <h3>Rewrite Form</h3>

            <label>
              HTML Form
              <textarea
                value={htmlInput}
                onChange={(e) => setHtmlInput(e.target.value)}
                placeholder={`<!DOCTYPE html>
<html>
<body>
  <form>
    <input type="text" name="name" />
    <input type="submit" value="Submit" />
  </form>
</body>
</html>`}
                rows={10}
                required
              />
            </label>

            <div style={{ padding: '12px', backgroundColor: '#f0f4f8', borderRadius: '6px', marginBottom: '12px' }}>
              <strong style={{ fontSize: '0.95rem' }}>Remaining Uses: {remainingUses}/2</strong>
              {quotaExhausted && (
                <p style={{ color: '#d32f2f', marginTop: '6px', fontSize: '0.9rem' }}>
                  You have reached your maximum rewrite attempts. Please try again later.
                </p>
              )}
            </div>

            <div className="actions">
              <button type="submit" disabled={busy || quotaExhausted}>
                {busy ? 'Rewriting...' : quotaExhausted ? 'Quota Exceeded' : 'Rewrite Form'}
              </button>
            </div>

            {status && <p className="status">{status}</p>}
            {error && <p className="error">{error}</p>}
          </form>

          <article className="card form-grid">
            <h3>Result</h3>

            {result && (
              <div>
                <label>
                  Rewritten HTML
                  <textarea
                    readOnly
                    value={result.rewritten_html || ''}
                    rows={12}
                  />
                </label>

                <div className="actions">
                  <button onClick={downloadRewrittenHtml} className="btn-secondary">
                    Download HTML
                  </button>
                  <button
                    onClick={() => {
                      setHtmlInput(result.rewritten_html || '')
                      setResult(null)
                    }}
                    className="btn-secondary"
                  >
                    Use as Input
                  </button>
                </div>
              </div>
            )}

            {!result && (
              <div style={{ color: '#666', fontSize: '0.9rem', lineHeight: '1.6' }}>
                <p>✓ AI-powered form improvement</p>
                <p>✓ Powered by Groq LLM</p>
                <p>✓ 2 rewrites per user</p>
              </div>
            )}
          </article>
        </div>
      </section>
    </div>
  )
}
