/**
 * PublicFormSubmit.jsx
 * Public form submission interface for gathering enquiries
 */
import { useState } from 'react'
import { API_BASE_URL } from '../config'

export function PublicFormSubmit() {
  const [apiKey, setApiKey] = useState('')
  const [formFields, setFormFields] = useState([
    { name: 'name', value: '' },
    { name: 'email', value: '' },
    { name: 'message', value: '' },
  ])
  const [customFields, setCustomFields] = useState([])
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldValue, setNewFieldValue] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function updateField(index, value) {
    const updated = [...formFields]
    updated[index].value = value
    setFormFields(updated)
  }

  function addCustomField() {
    if (!newFieldName.trim()) {
      setError('Field name is required')
      return
    }
    setCustomFields([...customFields, { name: newFieldName, value: newFieldValue }])
    setNewFieldName('')
    setNewFieldValue('')
    setError('')
  }

  function removeCustomField(index) {
    setCustomFields(customFields.filter((_, i) => i !== index))
  }

  function updateCustomField(index, key, value) {
    const updated = [...customFields]
    updated[index][key] = value
    setCustomFields(updated)
  }

  async function submitForm(event) {
    event.preventDefault()
    if (!apiKey.trim()) {
      setError('API key is required')
      return
    }

    setBusy(true)
    setStatus('')
    setError('')

    try {
      const fields = {}
      for (const field of formFields) {
        if (field.value.trim()) fields[field.name] = field.value
      }
      for (const field of customFields) {
        if (field.value.trim()) fields[field.name] = field.value
      }

      if (!Object.keys(fields).length) {
        setError('Please fill in at least one field')
        setBusy(false)
        return
      }

      const payload = {
        project_api_key: apiKey,
        fields,
        metadata: {
          page_url: window.location.href,
          referrer: document.referrer,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        },
      }

      const resp = await fetch(`${API_BASE_URL}/api/forms/submit/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!resp.ok) {
        setError('Failed to submit form. Please check your API key.')
      } else {
        setStatus('✓ Thank you! Your enquiry has been received.')
        setFormFields([
          { name: 'name', value: '' },
          { name: 'email', value: '' },
          { name: 'message', value: '' },
        ])
        setCustomFields([])
        setTimeout(() => setStatus(''), 5000)
      }
    } catch {
      setError('Unable to submit form. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="public-form-submit">
      <section className="panel">
        <h1>Submit Enquiry</h1>
        <p>Send us your question or inquiry and our team will respond shortly.</p>

        <div className="grid-two">
          <form onSubmit={submitForm} className="card form-grid">
            <h3>Your Information</h3>
            
            <label>
              API Key
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your project API key"
                required
              />
            </label>

            {formFields.map((field, index) => (
              <label key={field.name}>
                {field.name.charAt(0).toUpperCase() + field.name.slice(1)}
                {field.name === 'message' ? (
                  <textarea
                    value={field.value}
                    onChange={(e) => updateField(index, e.target.value)}
                    rows={4}
                  />
                ) : (
                  <input
                    type={field.name === 'email' ? 'email' : 'text'}
                    value={field.value}
                    onChange={(e) => updateField(index, e.target.value)}
                  />
                )}
              </label>
            ))}

            {customFields.length > 0 && (
              <>
                <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #ddd' }} />
                <h3>Additional Fields</h3>
                {customFields.map((field, index) => (
                  <div key={`custom-${index}`} className="field-grid">
                    <label>
                      {field.name}
                      <input
                        value={field.value}
                        onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeCustomField(index)}
                      className="btn-danger"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </>
            )}

            <div className="field-grid">
              <label>
                Add Field (Optional)
                <input
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="Field name"
                />
              </label>
              <button type="button" onClick={addCustomField}>Add</button>
            </div>

            <div className="actions">
              <button type="submit" disabled={busy}>
                {busy ? 'Submitting...' : 'Submit Enquiry'}
              </button>
            </div>
          </form>

          <article className="card">
            <h3>Status</h3>
            {status && <p className="status">{status}</p>}
            {error && <p className="error">{error}</p>}
            
            {!status && !error && (
              <div style={{ color: '#666', fontSize: '0.9rem', lineHeight: '1.6' }}>
                <p>✓ Your enquiry will be received by our team</p>
                <p>✓ We'll respond within one business day</p>
                <p>✓ Your information is secure and private</p>
              </div>
            )}
          </article>
        </div>
      </section>
    </div>
  )
}
