import { useState } from 'react'

function asList(data) {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.results)) return data.results
  return []
}

function buildQuery(params) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === '' || value === null || value === undefined) return
    search.set(key, String(value))
  })
  const query = search.toString()
  return query ? `?${query}` : ''
}

function prettyJson(value) {
  if (value === null || value === undefined) return ''
  return JSON.stringify(value, null, 2)
}

function parseJsonField(value, label, fallback = {}) {
  if (!value.trim()) return fallback
  try {
    return JSON.parse(value)
  } catch {
    throw new Error(`Invalid JSON for ${label}.`)
  }
}

function projectPath(projectId, suffix = '') {
  const base = `/api/v1/projects/${projectId}/`
  return suffix ? `${base}${suffix}` : base
}

function collectionPath(projectId, collectionId, suffix = '') {
  const base = `/api/v1/projects/${projectId}/collections/${collectionId}/`
  return suffix ? `${base}${suffix}` : base
}

function splitDomains(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function AdvancedApiPanel({
  apiRequest,
  withBusy,
  busy,
  projects,
  selectedProject,
  selectedProjectId,
  onProjectSelectionChange,
  onProjectsRefresh,
}) {
  const [emailVerifyToken, setEmailVerifyToken] = useState('')
  const [forceDelete, setForceDelete] = useState(false)
  const [forceDeleteMode, setForceDeleteMode] = useState('query')
  const [projectPatch, setProjectPatch] = useState({ name: '', allowed_domains: '' })
  const [enquiryFilter, setEnquiryFilter] = useState({ category: '', search: '' })
  const [faqChatsFilter, setFaqChatsFilter] = useState({ blocked: '', search: '' })
  const [faqAskForm, setFaqAskForm] = useState({ question: '', include_collections: false })
  const [billingOrderForm, setBillingOrderForm] = useState({ plan_id: '', client_request_id: '' })
  const [billingVerifyForm, setBillingVerifyForm] = useState({
    payment_id: '',
    razorpay_order_id: '',
    razorpay_payment_id: '',
    razorpay_signature: '',
  })
  const [cms, setCms] = useState({
    collection_name: '',
    selected_collection_id: '',
    rename_collection: '',
    entry_limit: '20',
    entry_create_data: '{\n  "title": "Refund Policy",\n  "answer": "7 days refund available."\n}',
    entry_update_id: '',
    entry_update_data: '{\n  "title": "Refund Policy",\n  "answer": "Refund window is 7 days."\n}',
  })
  const [quickEntries, setQuickEntries] = useState([{ title: '', data: '' }])
  const [publicForm, setPublicForm] = useState({
    project_api_key: '',
    fields: '{\n  "name": "Jane Doe",\n  "email": "jane@example.com",\n  "message": "Hello there"\n}',
    metadata: '{\n  "page_url": "https://example.com/contact",\n  "referrer": "https://example.com",\n  "user_agent": "Mozilla/5.0"\n}',
    versioned: false,
  })
  const [publicFaq, setPublicFaq] = useState({
    faq_api_key: '',
    question: '',
    include_collections: false,
    metadata: '{\n  "page_url": "https://example.com/faq",\n  "user_agent": "Mozilla/5.0"\n}',
    versioned: false,
  })
  const [publicCms, setPublicCms] = useState({
    collection_slug: '',
    project_api_key: '',
    limit: '20',
    page_url: '',
    versioned: false,
  })

  const [outputs, setOutputs] = useState({
    email_verify: null,
    delete_me: null,
    overview: null,
    billing: null,
    analytics: null,
    enquiries: [],
    faq_chats: [],
    faq_ask: null,
    billing_order: null,
    billing_verify: null,
    collections: [],
    collection_detail: null,
    entries: [],
    public_form: null,
    public_faq: null,
    public_cms: null,
  })

  function requireProjectId() {
    if (!selectedProjectId) throw new Error('Select an active project first.')
    return selectedProjectId
  }

  function setOutput(key, value) {
    setOutputs((prev) => ({ ...prev, [key]: value }))
  }

  function fillProjectPatch() {
    if (!selectedProject) return
    setProjectPatch({
      name: selectedProject.name || '',
      allowed_domains: Array.isArray(selectedProject.allowed_domains)
        ? selectedProject.allowed_domains.join(', ')
        : '',
    })
  }

  function addQuickEntryRow() {
    setQuickEntries((prev) => [...prev, { title: '', data: '' }])
  }

  function removeQuickEntryRow(index) {
    setQuickEntries((prev) => {
      if (prev.length === 1) return prev
      return prev.filter((_, idx) => idx !== index)
    })
  }

  function updateQuickEntryRow(index, key, value) {
    setQuickEntries((prev) => prev.map((row, idx) => (idx === index ? { ...row, [key]: value } : row)))
  }

  async function callEmailVerify(event) {
    event.preventDefault()
    await withBusy(async () => {
      const query = buildQuery({ token: emailVerifyToken.trim() })
      const data = await apiRequest(`/api/auth/email/verify/${query}`, { auth: false })
      setOutput('email_verify', data)
    }, 'Email verify endpoint called.')
  }

  async function callDeleteMe(event) {
    event.preventDefault()
    const ok = window.confirm('Delete account endpoint will be called. Continue?')
    if (!ok) return
    await withBusy(async () => {
      const query = forceDelete && forceDeleteMode === 'query' ? buildQuery({ force_delete: true }) : ''
      const path = `/api/v1/me/${query}`
      const body = forceDelete && forceDeleteMode === 'body' ? { force_delete: true } : undefined
      const data = await apiRequest(path, { method: 'DELETE', body })
      setOutput('delete_me', data || { success: true })
    }, 'Delete account endpoint called.')
  }

  async function callPatchProject(event) {
    event.preventDefault()
    const projectId = requireProjectId()
    await withBusy(async () => {
      await apiRequest(projectPath(projectId), {
        method: 'PATCH',
        body: {
          name: projectPatch.name,
          allowed_domains: splitDomains(projectPatch.allowed_domains),
        },
      })
      await onProjectsRefresh()
    }, 'Project updated.')
  }

  async function callDeleteProject() {
    const projectId = requireProjectId()
    const ok = window.confirm('Delete this project?')
    if (!ok) return
    await withBusy(async () => {
      await apiRequest(projectPath(projectId), { method: 'DELETE' })
      onProjectSelectionChange('')
      await onProjectsRefresh()
    }, 'Project deleted.')
  }

  async function loadProjectData(kind) {
    const projectId = requireProjectId()
    const suffixMap = {
      overview: 'overview/',
      billing: 'billing/',
      analytics: 'analytics/',
    }
    const suffix = suffixMap[kind]
    if (!suffix) return
    await withBusy(async () => {
      const data = await apiRequest(projectPath(projectId, suffix))
      setOutput(kind, data)
    }, `${kind} loaded.`)
  }

  async function callEnquiries(event) {
    event.preventDefault()
    const projectId = requireProjectId()
    await withBusy(async () => {
      const query = buildQuery({
        category: enquiryFilter.category,
        search: enquiryFilter.search.trim(),
      })
      const data = await apiRequest(`${projectPath(projectId, 'enquiries/')}${query}`)
      setOutput('enquiries', asList(data))
    }, 'Enquiries loaded.')
  }

  async function callFaqChats(event) {
    event.preventDefault()
    const projectId = requireProjectId()
    await withBusy(async () => {
      const query = buildQuery({
        blocked: faqChatsFilter.blocked,
        search: faqChatsFilter.search.trim(),
      })
      const data = await apiRequest(`${projectPath(projectId, 'faq-chats/')}${query}`)
      setOutput('faq_chats', asList(data))
    }, 'FAQ chats loaded.')
  }

  async function callFaqAsk(event) {
    event.preventDefault()
    const projectId = requireProjectId()
    await withBusy(async () => {
      const data = await apiRequest(projectPath(projectId, 'faq/ask/'), {
        method: 'POST',
        body: faqAskForm,
      })
      setOutput('faq_ask', data)
    }, 'Project FAQ ask endpoint called.')
  }

  async function callBillingOrder(event) {
    event.preventDefault()
    const projectId = requireProjectId()
    await withBusy(async () => {
      const body = { plan_id: billingOrderForm.plan_id }
      if (billingOrderForm.client_request_id.trim()) {
        body.client_request_id = billingOrderForm.client_request_id.trim()
      }
      const data = await apiRequest(projectPath(projectId, 'billing/order/'), { method: 'POST', body })
      setOutput('billing_order', data)
    }, 'Billing order endpoint called.')
  }

  async function callBillingVerify(event) {
    event.preventDefault()
    const projectId = requireProjectId()
    await withBusy(async () => {
      const data = await apiRequest(projectPath(projectId, 'billing/verify/'), {
        method: 'POST',
        body: billingVerifyForm,
      })
      setOutput('billing_verify', data)
    }, 'Billing verify endpoint called.')
  }

  async function callCollectionsList() {
    const projectId = requireProjectId()
    await withBusy(async () => {
      const data = await apiRequest(projectPath(projectId, 'collections/'))
      const list = asList(data)
      setOutput('collections', list)
      if (!cms.selected_collection_id && list.length) {
        setCms((prev) => ({ ...prev, selected_collection_id: list[0].id }))
      }
    }, 'Collections loaded.')
  }

  async function callCollectionCreate(event) {
    event.preventDefault()
    const projectId = requireProjectId()
    await withBusy(async () => {
      await apiRequest(projectPath(projectId, 'collections/'), {
        method: 'POST',
        body: { name: cms.collection_name.trim() },
      })
      setCms((prev) => ({ ...prev, collection_name: '' }))
      await callCollectionsList()
    }, 'Collection create endpoint called.')
  }

  async function callCollectionDetail() {
    const projectId = requireProjectId()
    if (!cms.selected_collection_id) throw new Error('Select a collection first.')
    await withBusy(async () => {
      const data = await apiRequest(collectionPath(projectId, cms.selected_collection_id))
      setOutput('collection_detail', data)
      setCms((prev) => ({ ...prev, rename_collection: data?.name || '' }))
    }, 'Collection detail loaded.')
  }

  async function callCollectionRename(event) {
    event.preventDefault()
    const projectId = requireProjectId()
    if (!cms.selected_collection_id) throw new Error('Select a collection first.')
    await withBusy(async () => {
      const data = await apiRequest(collectionPath(projectId, cms.selected_collection_id), {
        method: 'PATCH',
        body: { name: cms.rename_collection.trim() },
      })
      setOutput('collection_detail', data)
      await callCollectionsList()
    }, 'Collection rename endpoint called.')
  }

  async function callCollectionDelete() {
    const projectId = requireProjectId()
    if (!cms.selected_collection_id) throw new Error('Select a collection first.')
    const ok = window.confirm('Delete selected collection?')
    if (!ok) return
    await withBusy(async () => {
      await apiRequest(collectionPath(projectId, cms.selected_collection_id), { method: 'DELETE' })
      setOutput('collection_detail', null)
      setOutput('entries', [])
      setCms((prev) => ({ ...prev, selected_collection_id: '' }))
      await callCollectionsList()
    }, 'Collection delete endpoint called.')
  }

  async function callEntriesList(event) {
    if (event) event.preventDefault()
    const projectId = requireProjectId()
    if (!cms.selected_collection_id) throw new Error('Select a collection first.')
    await withBusy(async () => {
      const query = buildQuery({ limit: cms.entry_limit || '20' })
      const data = await apiRequest(`${collectionPath(projectId, cms.selected_collection_id, 'entries/')}${query}`)
      setOutput('entries', asList(data))
    }, 'Entries loaded.')
  }

  async function callEntryCreate(event) {
    event.preventDefault()
    const projectId = requireProjectId()
    if (!cms.selected_collection_id) throw new Error('Select a collection first.')
    await withBusy(async () => {
      const parsed = parseJsonField(cms.entry_create_data, 'entry create data')
      await apiRequest(collectionPath(projectId, cms.selected_collection_id, 'entries/'), {
        method: 'POST',
        body: { data: parsed },
      })
      await callEntriesList()
    }, 'Entry create endpoint called.')
  }

  async function callQuickEntryCreate(event) {
    event.preventDefault()
    const projectId = requireProjectId()
    if (!cms.selected_collection_id) throw new Error('Select a collection first.')
    const rows = quickEntries
      .map((row) => ({
        title: row.title.trim(),
        data: row.data.trim(),
      }))
      .filter((row) => row.title || row.data)
    if (!rows.length) throw new Error('Add at least one title/data row.')
    await withBusy(async () => {
      for (const row of rows) {
        await apiRequest(collectionPath(projectId, cms.selected_collection_id, 'entries/'), {
          method: 'POST',
          body: {
            data: {
              title: row.title,
              data: row.data,
            },
          },
        })
      }
      const query = buildQuery({ limit: cms.entry_limit || '20' })
      const refreshed = await apiRequest(`${collectionPath(projectId, cms.selected_collection_id, 'entries/')}${query}`)
      setOutput('entries', asList(refreshed))
      setQuickEntries([{ title: '', data: '' }])
    }, `${rows.length} entries created.`)
  }

  async function callEntryUpdate(event) {
    event.preventDefault()
    const projectId = requireProjectId()
    if (!cms.selected_collection_id) throw new Error('Select a collection first.')
    if (!cms.entry_update_id.trim()) throw new Error('Entry UUID is required.')
    await withBusy(async () => {
      const parsed = parseJsonField(cms.entry_update_data, 'entry update data')
      await apiRequest(collectionPath(projectId, cms.selected_collection_id, `entries/${cms.entry_update_id.trim()}/`), {
        method: 'PATCH',
        body: { data: parsed },
      })
      await callEntriesList()
    }, 'Entry update endpoint called.')
  }

  async function callEntryDelete() {
    const projectId = requireProjectId()
    if (!cms.selected_collection_id) throw new Error('Select a collection first.')
    if (!cms.entry_update_id.trim()) throw new Error('Entry UUID is required.')
    const ok = window.confirm('Delete selected entry?')
    if (!ok) return
    await withBusy(async () => {
      await apiRequest(collectionPath(projectId, cms.selected_collection_id, `entries/${cms.entry_update_id.trim()}/`), {
        method: 'DELETE',
      })
      await callEntriesList()
    }, 'Entry delete endpoint called.')
  }

  async function callPublicForm(event) {
    event.preventDefault()
    await withBusy(async () => {
      const fields = parseJsonField(publicForm.fields, 'public form fields')
      const metadata = parseJsonField(publicForm.metadata, 'public form metadata')
      const data = await apiRequest(publicForm.versioned ? '/api/v1/public/forms/submit/' : '/api/forms/submit/', {
        method: 'POST',
        auth: false,
        body: {
          project_api_key: publicForm.project_api_key.trim(),
          fields,
          metadata,
        },
      })
      setOutput('public_form', data)
    }, 'Public form endpoint called.')
  }

  async function callPublicFaq(event) {
    event.preventDefault()
    await withBusy(async () => {
      const metadata = parseJsonField(publicFaq.metadata, 'public faq metadata')
      const data = await apiRequest(publicFaq.versioned ? '/api/v1/public/faq/chat/' : '/api/faq/chat/', {
        method: 'POST',
        auth: false,
        body: {
          faq_api_key: publicFaq.faq_api_key.trim(),
          question: publicFaq.question,
          include_collections: publicFaq.include_collections,
          metadata,
        },
      })
      setOutput('public_faq', data)
    }, 'Public FAQ endpoint called.')
  }

  async function callPublicCms(event) {
    event.preventDefault()
    await withBusy(async () => {
      const base = publicCms.versioned
        ? `/api/v1/public/collections/${encodeURIComponent(publicCms.collection_slug.trim())}/`
        : `/api/collections/public/${encodeURIComponent(publicCms.collection_slug.trim())}/`
      const query = buildQuery({
        project_api_key: publicCms.project_api_key.trim(),
        limit: publicCms.limit || '20',
        page_url: publicCms.page_url.trim(),
      })
      const data = await apiRequest(`${base}${query}`, { auth: false })
      setOutput('public_cms', data)
    }, 'Public CMS read endpoint called.')
  }

  return (
    <section className="panel">
      <div className="grid-two">
        <article className="card">
          <h3>Advanced Endpoints</h3>
          <p className="empty">This tab adds the API features from API.txt that were missing in the app.</p>
          <label>
            Active Project
            <select
              value={selectedProjectId}
              onChange={(event) => onProjectSelectionChange(event.target.value)}
              disabled={busy}
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <div className="actions">
            <button type="button" onClick={onProjectsRefresh} disabled={busy}>
              Refresh Projects
            </button>
            <button type="button" onClick={fillProjectPatch} disabled={!selectedProjectId || busy}>
              Load Project Into Patch Form
            </button>
          </div>
        </article>

        <article className="card">
          <h3>Account APIs</h3>
          <form onSubmit={callEmailVerify} className="form-grid">
            <label>
              Email Verify Token
              <input
                value={emailVerifyToken}
                onChange={(event) => setEmailVerifyToken(event.target.value)}
                placeholder="token"
                required
              />
            </label>
            <button type="submit" disabled={busy}>
              Call `/api/auth/email/verify/`
            </button>
          </form>
          <form onSubmit={callDeleteMe} className="form-grid">
            <label>
              <input
                type="checkbox"
                checked={forceDelete}
                onChange={(event) => setForceDelete(event.target.checked)}
              />
              force_delete=true
            </label>
            {forceDelete && (
              <label>
                Force Delete Mode
                <select value={forceDeleteMode} onChange={(event) => setForceDeleteMode(event.target.value)}>
                  <option value="query">Query param: /api/v1/me/?force_delete=true</option>
                  <option value="body">Body: {"{ \"force_delete\": true }"}</option>
                </select>
              </label>
            )}
            <button type="submit" disabled={busy}>
              Call DELETE /api/v1/me/
            </button>
          </form>
          <label>
            Account Response
            <textarea
              rows={8}
              readOnly
              value={prettyJson({ email_verify: outputs.email_verify, delete_me: outputs.delete_me })}
            />
          </label>
        </article>
      </div>

      <div className="grid-two">
        <article className="card">
          <h3>Project Management APIs</h3>
          <form onSubmit={callPatchProject} className="form-grid">
            <label>
              Name
              <input
                value={projectPatch.name}
                onChange={(event) => setProjectPatch((prev) => ({ ...prev, name: event.target.value }))}
              />
            </label>
            <label>
              Allowed Domains (comma-separated)
              <input
                value={projectPatch.allowed_domains}
                onChange={(event) =>
                  setProjectPatch((prev) => ({ ...prev, allowed_domains: event.target.value }))
                }
              />
            </label>
            <div className="actions">
              <button type="submit" disabled={!selectedProjectId || busy}>
                PATCH /api/v1/projects/:project_id/
              </button>
              <button type="button" onClick={callDeleteProject} disabled={!selectedProjectId || busy}>
                DELETE /api/v1/projects/:project_id/
              </button>
            </div>
          </form>
        </article>

        <article className="card">
          <h3>Project Read APIs</h3>
          <div className="actions">
            <button type="button" onClick={() => loadProjectData('overview')} disabled={!selectedProjectId || busy}>
              Overview
            </button>
            <button type="button" onClick={() => loadProjectData('billing')} disabled={!selectedProjectId || busy}>
              Billing
            </button>
            <button type="button" onClick={() => loadProjectData('analytics')} disabled={!selectedProjectId || busy}>
              Analytics
            </button>
          </div>
          <label>
            Overview
            <textarea rows={6} readOnly value={prettyJson(outputs.overview)} />
          </label>
          <label>
            Billing
            <textarea rows={6} readOnly value={prettyJson(outputs.billing)} />
          </label>
          <label>
            Analytics
            <textarea rows={6} readOnly value={prettyJson(outputs.analytics)} />
          </label>
        </article>
      </div>

      <div className="grid-two">
        <article className="card">
          <h3>Enquiries and FAQ Chats APIs</h3>
          <form onSubmit={callEnquiries} className="form-grid">
            <label>
              Category
              <select
                value={enquiryFilter.category}
                onChange={(event) => setEnquiryFilter((prev) => ({ ...prev, category: event.target.value }))}
              >
                <option value="">All</option>
                <option value="spam">spam</option>
                <option value="enquiry">enquiry</option>
                <option value="job">job</option>
                <option value="support">support</option>
              </select>
            </label>
            <label>
              Search
              <input
                value={enquiryFilter.search}
                onChange={(event) => setEnquiryFilter((prev) => ({ ...prev, search: event.target.value }))}
              />
            </label>
            <button type="submit" disabled={!selectedProjectId || busy}>
              GET /api/v1/projects/:project_id/enquiries/
            </button>
          </form>
          <form onSubmit={callFaqChats} className="form-grid">
            <label>
              Blocked
              <select
                value={faqChatsFilter.blocked}
                onChange={(event) => setFaqChatsFilter((prev) => ({ ...prev, blocked: event.target.value }))}
              >
                <option value="">All</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </label>
            <label>
              Search
              <input
                value={faqChatsFilter.search}
                onChange={(event) => setFaqChatsFilter((prev) => ({ ...prev, search: event.target.value }))}
              />
            </label>
            <button type="submit" disabled={!selectedProjectId || busy}>
              GET /api/v1/projects/:project_id/faq-chats/
            </button>
          </form>
          <label>
            Enquiries
            <textarea rows={8} readOnly value={prettyJson(outputs.enquiries)} />
          </label>
          <label>
            FAQ Chats
            <textarea rows={8} readOnly value={prettyJson(outputs.faq_chats)} />
          </label>
        </article>

        <article className="card">
          <h3>Billing and FAQ Ask APIs</h3>
          <form onSubmit={callBillingOrder} className="form-grid">
            <label>
              plan_id
              <input
                value={billingOrderForm.plan_id}
                onChange={(event) => setBillingOrderForm((prev) => ({ ...prev, plan_id: event.target.value }))}
                required
              />
            </label>
            <label>
              client_request_id
              <input
                value={billingOrderForm.client_request_id}
                onChange={(event) =>
                  setBillingOrderForm((prev) => ({ ...prev, client_request_id: event.target.value }))
                }
              />
            </label>
            <button type="submit" disabled={!selectedProjectId || busy}>
              POST /api/v1/projects/:project_id/billing/order/
            </button>
          </form>
          <form onSubmit={callBillingVerify} className="form-grid">
            <label>
              payment_id
              <input
                value={billingVerifyForm.payment_id}
                onChange={(event) => setBillingVerifyForm((prev) => ({ ...prev, payment_id: event.target.value }))}
                required
              />
            </label>
            <label>
              razorpay_order_id
              <input
                value={billingVerifyForm.razorpay_order_id}
                onChange={(event) =>
                  setBillingVerifyForm((prev) => ({ ...prev, razorpay_order_id: event.target.value }))
                }
                required
              />
            </label>
            <label>
              razorpay_payment_id
              <input
                value={billingVerifyForm.razorpay_payment_id}
                onChange={(event) =>
                  setBillingVerifyForm((prev) => ({ ...prev, razorpay_payment_id: event.target.value }))
                }
                required
              />
            </label>
            <label>
              razorpay_signature
              <input
                value={billingVerifyForm.razorpay_signature}
                onChange={(event) =>
                  setBillingVerifyForm((prev) => ({ ...prev, razorpay_signature: event.target.value }))
                }
                required
              />
            </label>
            <button type="submit" disabled={!selectedProjectId || busy}>
              POST /api/v1/projects/:project_id/billing/verify/
            </button>
          </form>
          <form onSubmit={callFaqAsk} className="form-grid">
            <label>
              Question
              <textarea
                rows={3}
                value={faqAskForm.question}
                onChange={(event) => setFaqAskForm((prev) => ({ ...prev, question: event.target.value }))}
                required
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={faqAskForm.include_collections}
                onChange={(event) =>
                  setFaqAskForm((prev) => ({ ...prev, include_collections: event.target.checked }))
                }
              />
              include_collections
            </label>
            <button type="submit" disabled={!selectedProjectId || busy}>
              POST /api/v1/projects/:project_id/faq/ask/
            </button>
          </form>
          <label>
            Billing/Faq Responses
            <textarea
              rows={8}
              readOnly
              value={prettyJson({
                billing_order: outputs.billing_order,
                billing_verify: outputs.billing_verify,
                faq_ask: outputs.faq_ask,
              })}
            />
          </label>
        </article>
      </div>

      <div className="grid-two">
        <article className="card">
          <h3>Mini CMS (Authenticated)</h3>
          <div className="actions">
            <button type="button" onClick={callCollectionsList} disabled={!selectedProjectId || busy}>
              List Collections
            </button>
            <button type="button" onClick={callCollectionDetail} disabled={!cms.selected_collection_id || busy}>
              Collection Detail
            </button>
            <button type="button" onClick={callCollectionDelete} disabled={!cms.selected_collection_id || busy}>
              Delete Collection
            </button>
          </div>
          <label>
            Selected Collection
            <select
              value={cms.selected_collection_id}
              onChange={(event) => setCms((prev) => ({ ...prev, selected_collection_id: event.target.value }))}
            >
              <option value="">Select collection</option>
              {outputs.collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
          </label>
          <form onSubmit={callCollectionCreate} className="form-grid">
            <label>
              New Collection Name
              <input
                value={cms.collection_name}
                onChange={(event) => setCms((prev) => ({ ...prev, collection_name: event.target.value }))}
                required
              />
            </label>
              <button type="submit" disabled={!selectedProjectId || busy}>
                POST /api/v1/projects/:project_id/collections/
              </button>
          </form>
          <form onSubmit={callCollectionRename} className="form-grid">
            <label>
              Rename Collection
              <input
                value={cms.rename_collection}
                onChange={(event) => setCms((prev) => ({ ...prev, rename_collection: event.target.value }))}
                required
              />
            </label>
              <button type="submit" disabled={!cms.selected_collection_id || busy}>
                PATCH /api/v1/projects/:project_id/collections/:collection_id/
              </button>
          </form>
          <label>
            Collection Detail
            <textarea rows={8} readOnly value={prettyJson(outputs.collection_detail)} />
          </label>
        </article>

        <article className="card">
          <h3>CMS Entries APIs</h3>
          <form onSubmit={callQuickEntryCreate} className="form-grid">
            <h4>Quick Add Multiple Entries</h4>
            {quickEntries.map((row, idx) => (
              <div key={`quick-row-${idx}`} className="card">
                <label>
                  Title
                  <input
                    value={row.title}
                    onChange={(event) => updateQuickEntryRow(idx, 'title', event.target.value)}
                    placeholder="Refund Policy"
                  />
                </label>
                <label>
                  Data
                  <textarea
                    rows={3}
                    value={row.data}
                    onChange={(event) => updateQuickEntryRow(idx, 'data', event.target.value)}
                    placeholder="7 days refund available."
                  />
                </label>
                <button type="button" onClick={() => removeQuickEntryRow(idx)} disabled={quickEntries.length === 1}>
                  Remove Row
                </button>
              </div>
            ))}
            <div className="actions">
              <button type="button" onClick={addQuickEntryRow}>
                Add More
              </button>
              <button type="submit" disabled={!cms.selected_collection_id || busy}>
                Save All Rows
              </button>
            </div>
          </form>
          <form onSubmit={callEntriesList} className="form-grid">
            <label>
              Limit
              <input
                value={cms.entry_limit}
                onChange={(event) => setCms((prev) => ({ ...prev, entry_limit: event.target.value }))}
              />
            </label>
            <button type="submit" disabled={!cms.selected_collection_id || busy}>
              GET /api/v1/projects/:project_id/collections/:collection_id/entries/?limit=20
            </button>
          </form>
          <form onSubmit={callEntryCreate} className="form-grid">
            <label>
              Create Entry JSON (data)
              <textarea
                rows={6}
                value={cms.entry_create_data}
                onChange={(event) => setCms((prev) => ({ ...prev, entry_create_data: event.target.value }))}
              />
            </label>
            <button type="submit" disabled={!cms.selected_collection_id || busy}>
              POST /api/v1/projects/:project_id/collections/:collection_id/entries/
            </button>
          </form>
          <form onSubmit={callEntryUpdate} className="form-grid">
            <label>
              Entry UUID
              <input
                value={cms.entry_update_id}
                onChange={(event) => setCms((prev) => ({ ...prev, entry_update_id: event.target.value }))}
                required
              />
            </label>
            <label>
              Update Entry JSON (data)
              <textarea
                rows={6}
                value={cms.entry_update_data}
                onChange={(event) => setCms((prev) => ({ ...prev, entry_update_data: event.target.value }))}
              />
            </label>
            <div className="actions">
                <button type="submit" disabled={!cms.selected_collection_id || busy}>
                  PATCH /api/v1/projects/:project_id/collections/:collection_id/entries/:entry_id/
                </button>
                <button type="button" onClick={callEntryDelete} disabled={!cms.selected_collection_id || busy}>
                  DELETE /api/v1/projects/:project_id/collections/:collection_id/entries/:entry_id/
                </button>
            </div>
          </form>
          <label>
            Entries
            <textarea rows={8} readOnly value={prettyJson(outputs.entries)} />
          </label>
        </article>
      </div>

      <div className="grid-two">
        <article className="card">
          <h3>Public Form and FAQ APIs</h3>
          <form onSubmit={callPublicForm} className="form-grid">
            <label>
              project_api_key
              <input
                value={publicForm.project_api_key}
                onChange={(event) => setPublicForm((prev) => ({ ...prev, project_api_key: event.target.value }))}
                required
              />
            </label>
            <label>
              fields JSON
              <textarea
                rows={5}
                value={publicForm.fields}
                onChange={(event) => setPublicForm((prev) => ({ ...prev, fields: event.target.value }))}
              />
            </label>
            <label>
              metadata JSON
              <textarea
                rows={5}
                value={publicForm.metadata}
                onChange={(event) => setPublicForm((prev) => ({ ...prev, metadata: event.target.value }))}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={publicForm.versioned}
                onChange={(event) => setPublicForm((prev) => ({ ...prev, versioned: event.target.checked }))}
              />
              Use /api/v1/public/forms/submit/
            </label>
            <button type="submit" disabled={busy}>
              Call Public Form Endpoint
            </button>
          </form>

          <form onSubmit={callPublicFaq} className="form-grid">
            <label>
              faq_api_key
              <input
                value={publicFaq.faq_api_key}
                onChange={(event) => setPublicFaq((prev) => ({ ...prev, faq_api_key: event.target.value }))}
                required
              />
            </label>
            <label>
              Question
              <textarea
                rows={3}
                value={publicFaq.question}
                onChange={(event) => setPublicFaq((prev) => ({ ...prev, question: event.target.value }))}
                required
              />
            </label>
            <label>
              metadata JSON
              <textarea
                rows={4}
                value={publicFaq.metadata}
                onChange={(event) => setPublicFaq((prev) => ({ ...prev, metadata: event.target.value }))}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={publicFaq.include_collections}
                onChange={(event) =>
                  setPublicFaq((prev) => ({ ...prev, include_collections: event.target.checked }))
                }
              />
              include_collections
            </label>
            <label>
              <input
                type="checkbox"
                checked={publicFaq.versioned}
                onChange={(event) => setPublicFaq((prev) => ({ ...prev, versioned: event.target.checked }))}
              />
              Use /api/v1/public/faq/chat/
            </label>
            <button type="submit" disabled={busy}>
              Call Public FAQ Endpoint
            </button>
          </form>
          <label>
            Public Form/FAQ Responses
            <textarea
              rows={10}
              readOnly
              value={prettyJson({ public_form: outputs.public_form, public_faq: outputs.public_faq })}
            />
          </label>
        </article>

        <article className="card">
          <h3>Public CMS Read API</h3>
          <form onSubmit={callPublicCms} className="form-grid">
            <label>
              collection_slug
              <input
                value={publicCms.collection_slug}
                onChange={(event) => setPublicCms((prev) => ({ ...prev, collection_slug: event.target.value }))}
                required
              />
            </label>
            <label>
              project_api_key
              <input
                value={publicCms.project_api_key}
                onChange={(event) => setPublicCms((prev) => ({ ...prev, project_api_key: event.target.value }))}
                required
              />
            </label>
            <label>
              limit
              <input
                value={publicCms.limit}
                onChange={(event) => setPublicCms((prev) => ({ ...prev, limit: event.target.value }))}
              />
            </label>
            <label>
              page_url
              <input
                value={publicCms.page_url}
                onChange={(event) => setPublicCms((prev) => ({ ...prev, page_url: event.target.value }))}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={publicCms.versioned}
                onChange={(event) => setPublicCms((prev) => ({ ...prev, versioned: event.target.checked }))}
              />
              Use /api/v1/public/collections/:slug/
            </label>
            <button type="submit" disabled={busy}>
              Call Public CMS Endpoint
            </button>
          </form>
          <label>
            Public CMS Response
            <textarea rows={12} readOnly value={prettyJson(outputs.public_cms)} />
          </label>
        </article>
      </div>
    </section>
  )
}

export default AdvancedApiPanel
