/**
 * PublicCmsReader.jsx
 * Public interface for reading CMS collections
 */
import { useState } from 'react'
import { API_BASE_URL } from '../config'

export function PublicCmsReader() {
  const [apiKey, setApiKey] = useState('')
  const [collectionSlug, setCollectionSlug] = useState('')
  const [limit, setLimit] = useState('20')
  const [page, setPage] = useState('1')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [response, setResponse] = useState(null)
  const [entries, setEntries] = useState([])

  async function loadCollection(event) {
    event.preventDefault()
    if (!apiKey.trim()) {
      setError('API key is required')
      return
    }
    if (!collectionSlug.trim()) {
      setError('Collection slug is required')
      return
    }

    setBusy(true)
    setStatus('')
    setError('')

    try {
      const params = new URLSearchParams({
        project_api_key: apiKey,
        page_url: window.location.href,
        limit: limit || '20',
        page: page || '1',
      })

      const resp = await fetch(
        `${API_BASE_URL}/api/collections/public/${collectionSlug}/?${params}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      const data = await resp.json()

      if (!resp.ok) {
        setError(`${resp.status}: ${JSON.stringify(data)}`)
        setResponse(data)
        setEntries([])
      } else {
        setStatus('Collection loaded successfully!')
        setResponse(data)
        setEntries(data.entries || [])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="public-cms-reader">
      <section className="panel">
        <h1>CMS Collection Reader</h1>
        <p>Browse and display content from your CMS collections.</p>

        <div className="grid-two">
          <form onSubmit={loadCollection} className="card form-grid">
            <h3>Load Collection</h3>
            <label>
              API Key
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your project API key"
                required
              />
            </label>
            <label>
              Collection Slug
              <input
                value={collectionSlug}
                onChange={(e) => setCollectionSlug(e.target.value)}
                placeholder="e.g. faq_items, blog_posts"
                required
              />
            </label>

            <h3>Pagination</h3>
            <div className="field-grid">
              <label>
                Limit
                <input
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  type="number"
                  min="1"
                  max="100"
                />
              </label>
              <label>
                Page
                <input
                  value={page}
                  onChange={(e) => setPage(e.target.value)}
                  type="number"
                  min="1"
                />
              </label>
            </div>

            <div className="actions">
              <button type="submit" disabled={busy}>
                {busy ? 'Loading...' : 'Load Collection'}
              </button>
            </div>
          </form>

          <article className="card">
            <h3>Collection Info</h3>
            {status && <p className="status">{status}</p>}
            {error && <p className="error">{error}</p>}

            {response?.collection && (
              <dl className="kv-list">
                <div>
                  <dt>Name</dt>
                  <dd>{response.collection.name}</dd>
                </div>
                <div>
                  <dt>Slug</dt>
                  <dd>{response.collection.slug}</dd>
                </div>
                <div>
                  <dt>Entries Loaded</dt>
                  <dd>{entries.length}</dd>
                </div>
                <div>
                  <dt>Per Page</dt>
                  <dd>{response.limit}</dd>
                </div>
              </dl>
            )}

            {!status && !error && !response && (
              <div style={{ color: '#666', fontSize: '0.9rem', lineHeight: '1.6' }}>
                <p>✓ Load your CMS collections</p>
                <p>✓ Paginate results</p>
                <p>✓ Display structured content</p>
              </div>
            )}
          </article>
        </div>

        {entries.length > 0 && (
          <section className="card">
            <h3>Entries ({entries.length})</h3>
            <div className="entries-grid">
              {entries.map((entry, idx) => (
                <article key={entry.id || idx} className="entry-card">
                  <small className="muted">ID: {entry.id?.substring(0, 8)}</small>
                  <h4>Fields</h4>
                  <dl className="entry-fields">
                    {Object.entries(entry.data || {}).map(([key, value]) => (
                      <div key={key}>
                        <dt>{key}</dt>
                        <dd>
                          {typeof value === 'string' ? (
                            value
                          ) : (
                            <code>{JSON.stringify(value)}</code>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <small className="muted">
                    Created: {entry.created_at ? new Date(entry.created_at).toLocaleString() : 'N/A'}
                  </small>
                </article>
              ))}
            </div>
          </section>
        )}

        {response && !entries.length && (
          <section className="card">
            <p className="empty">No entries found in this collection.</p>
          </section>
        )}
      </section>
    </div>
  )
}
