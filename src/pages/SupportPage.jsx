/**
 * SupportPage.jsx
 * Support message submission and viewing
 */
import { useState, useEffect } from 'react'
import { apiClient } from '../services/apiClient'

export function SupportPage({ accessToken }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ subject: '', message: '' })

  // Load support messages
  useEffect(() => {
    async function loadMessages() {
      try {
        const { response, data } = await apiClient.listSupportMessages(accessToken)
        if (!response.ok) {
          setError('Failed to load support messages')
          return
        }
        const list = Array.isArray(data) ? data : data.results || []
        setMessages(list)
        setError('')
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadMessages()
  }, [accessToken])

  // Handle submit
  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.subject.trim() || !form.message.trim()) {
      setError('Please fill in all fields')
      return
    }

    try {
      setError('')
      const { response, data } = await apiClient.createSupportMessage(accessToken, {
        subject: form.subject,
        message: form.message,
      })

      if (!response.ok) {
        setError('Failed to submit support message')
        return
      }

      setMessages([data, ...messages])
      setForm({ subject: '', message: '' })
      setShowForm(false)
      setStatus('✓ Support message sent')
      setTimeout(() => setStatus(''), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>Support</h1>

      {status && <div style={{ backgroundColor: '#c8e6c9', color: '#2e7d32', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>{status}</div>}

      {error && <div style={{ backgroundColor: '#ffcdd2', color: '#c62828', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>{error}</div>}

      {!showForm && (
        <button onClick={() => setShowForm(true)} style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', marginBottom: '20px', cursor: 'pointer' }}>
          Send Support Message
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '20px', marginBottom: '30px', backgroundColor: '#f5f5f5' }}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Subject *</label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              required
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Message *</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minHeight: '150px', fontFamily: 'monospace' }}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Send
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 20px', backgroundColor: '#f5f5f5', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div>
        <h2>Your Support Messages</h2>
        {loading ? (
          <p>Loading messages...</p>
        ) : messages.length === 0 ? (
          <p style={{ color: '#999' }}>No support messages</p>
        ) : (
          <div>
            {messages.map((msg) => (
              <div key={msg.id} style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '15px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                  <h3 style={{ margin: 0 }}>{msg.subject}</h3>
                  <small style={{ color: '#999' }}>{new Date(msg.created_at).toLocaleString()}</small>
                </div>
                <p style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>{msg.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
