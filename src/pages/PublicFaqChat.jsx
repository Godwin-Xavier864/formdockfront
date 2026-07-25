/**
 * PublicFaqChat.jsx
 * Public FAQ chatbot interface for visitor queries
 */
import { useState } from 'react'
import { API_BASE_URL } from '../config'

export function PublicFaqChat() {
  const [apiKey, setApiKey] = useState('')
  const [question, setQuestion] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [answer, setAnswer] = useState('')
  const [chatHistory, setChatHistory] = useState([])

  async function askQuestion(event) {
    event.preventDefault()
    if (!apiKey.trim()) {
      setError('FAQ API key is required')
      return
    }
    if (!question.trim()) {
      setError('Question is required')
      return
    }

    setBusy(true)
    setStatus('')
    setError('')
    setAnswer('')

    try {
      const payload = {
        faq_api_key: apiKey,
        question: question.trim(),
        metadata: {
          page_url: window.location.href,
          user_agent: navigator.userAgent,
        },
      }

      const resp = await fetch(`${API_BASE_URL}/api/faq/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await resp.json()

      if (!resp.ok) {
        setError('Failed to get answer. Please check your API key.')
      } else {
        setAnswer(data.answer || 'No answer available.')
        setChatHistory([
          ...chatHistory,
          {
            question: question.trim(),
            answer: data.answer,
            timestamp: new Date().toLocaleTimeString(),
          },
        ])
        setQuestion('')
        setStatus('✓ Answer received')
        setTimeout(() => setStatus(''), 3000)
      }
    } catch {
      setError('Unable to get answer. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="public-faq-chat">
      <section className="panel">
        <h1>FAQ Chatbot</h1>
        <p>Ask your questions and our AI chatbot will provide instant answers.</p>

        <div className="grid-two">
          <form onSubmit={askQuestion} className="card form-grid">
            <h3>Ask a Question</h3>
            
            <label>
              API Key
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your FAQ API key"
                required
              />
            </label>

            <label>
              Question
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What would you like to know?"
                rows={4}
                required
              />
            </label>

            <div className="actions">
              <button type="submit" disabled={busy}>
                {busy ? 'Thinking...' : 'Ask Question'}
              </button>
              <button
                type="button"
                onClick={() => setChatHistory([])}
                className="btn-secondary"
              >
                Clear History
              </button>
            </div>
          </form>

          <article className="card">
            <h3>Response</h3>
            {status && <p className="status">{status}</p>}
            {error && <p className="error">{error}</p>}

            {answer && (
              <div className="faq-answer">
                <h4>Answer:</h4>
                <p>{answer}</p>
              </div>
            )}

            {!status && !error && !answer && (
              <div style={{ color: '#666', fontSize: '0.9rem', lineHeight: '1.6' }}>
                <p>✓ Get instant answers 24/7</p>
                <p>✓ Powered by AI</p>
                <p>✓ Accurate & helpful responses</p>
              </div>
            )}
          </article>
        </div>

        {chatHistory.length > 0 && (
          <section className="card">
            <h3>Chat History</h3>
            <ul className="list-clean">
              {chatHistory.map((msg, idx) => (
                <li key={idx} className="list-item chat-item">
                  <div className="chat-question">
                    <strong>Q: {msg.question}</strong>
                    <small>{msg.timestamp}</small>
                  </div>
                  <div className="chat-answer">
                    <strong>A: {msg.answer}</strong>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </section>
    </div>
  )
}
