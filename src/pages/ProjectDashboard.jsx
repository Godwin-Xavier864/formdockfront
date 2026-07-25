/**
 * ProjectDashboard.jsx
 * Main project management dashboard with all tabs
 */
import { useState, useEffect } from 'react'
import { apiClient } from '../services/apiClient'

export function ProjectDashboard({ projectId, accessToken, navigate }) {
  const [tab, setTab] = useState('overview')
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  // Overview state
  const [overview, setOverview] = useState(null)

  // Enquiries state
  const [enquiries, setEnquiries] = useState([])
  const [enquiryFilters, setEnquiryFilters] = useState({ category: '', search: '' })

  // FAQ state
  const [faqChats, setFaqChats] = useState([])
  const [, setFaqConfig] = useState(null)
  const [faqConfigForm, setFaqConfigForm] = useState({})
  const [faqAskForm, setFaqAskForm] = useState({ question: '', include_collections: false })
  const [faqAskResult, setFaqAskResult] = useState(null)
  const [faqChatFilters] = useState({ blocked: '', search: '' })

  // Analytics state
  const [analytics, setAnalytics] = useState(null)

  // Billing state
  const [billing, setBilling] = useState(null)
  const [showBillingForm, setShowBillingForm] = useState(false)
  const [billingForm, setBillingForm] = useState({ plan_id: '', client_request_id: '' })

  // Collections (CMS) state
  const [collections, setCollections] = useState([])
  const [selectedCollectionId, setSelectedCollectionId] = useState('')
  const [newCollectionName, setNewCollectionName] = useState('')
  const [collectionEntries, setCollectionEntries] = useState([])
  const [entryLimit, setEntryLimit] = useState('20')
  const [showNewEntry, setShowNewEntry] = useState(false)
  const [newEntryData, setNewEntryData] = useState('{}')

  // Load project
  useEffect(() => {
    async function load() {
      try {
        const { response, data } = await apiClient.getProject(accessToken, projectId)
        if (!response.ok) {
          setError('Failed to load project')
          return
        }
        setProject(data)
        setError('')
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId, accessToken])

  // Load tab data
  useEffect(() => {
    if (!project) return

    setLoading(true)
    setError('')

    async function loadTabData() {
      try {
        if (tab === 'overview') {
          const { response, data } = await apiClient.getProjectOverview(accessToken, projectId)
          if (response.ok) setOverview(data)
        } else if (tab === 'enquiries') {
          const { response, data } = await apiClient.listEnquiries(accessToken, projectId, enquiryFilters)
          if (response.ok) setEnquiries(Array.isArray(data) ? data : data.results || [])
        } else if (tab === 'faq') {
          const configRes = await apiClient.getFaqConfig(accessToken, projectId)
          if (configRes.response.ok) {
            setFaqConfig(configRes.data)
            setFaqConfigForm(configRes.data || {})
          }
          const chatsRes = await apiClient.listFaqChats(accessToken, projectId, faqChatFilters)
          if (chatsRes.response.ok) setFaqChats(Array.isArray(chatsRes.data) ? chatsRes.data : chatsRes.data.results || [])
        } else if (tab === 'cms') {
          const { response, data } = await apiClient.listCollections(accessToken, projectId)
          if (response.ok) {
            const list = Array.isArray(data) ? data : data.results || []
            setCollections(list)
            if (!selectedCollectionId && list.length > 0) {
              setSelectedCollectionId(list[0].id)
            }
          }
        } else if (tab === 'analytics') {
          // Fetch enquiries and faq chats to build analytics
          const [enquiriesRes, faqRes] = await Promise.all([
            apiClient.listEnquiries(accessToken, projectId, {}),
            apiClient.listFaqChats(accessToken, projectId, {})
          ])
          
          if (enquiriesRes.response.ok && faqRes.response.ok) {
            const enquiries = Array.isArray(enquiriesRes.data) ? enquiriesRes.data : enquiriesRes.data.results || []
            const faqChats = Array.isArray(faqRes.data) ? faqRes.data : faqRes.data.results || []
            
            // Build analytics from raw data
            const analyticsData = buildAnalyticsFromData(enquiries, faqChats)
            console.log('Analytics data built:', analyticsData)
            setAnalytics(analyticsData)
          } else {
            console.error('Failed to fetch analytics data')
            setError('Failed to load analytics data')
          }
        } else if (tab === 'billing') {
          const { response, data } = await apiClient.getBillingOverview(accessToken, projectId)
          if (response.ok) setBilling(data)
        }
      } catch (err) {
        setError(err.message)
        console.error('Tab loading error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadTabData()
  }, [tab, project, projectId, accessToken, enquiryFilters, faqChatFilters, selectedCollectionId])

  // Load collection entries when selected
  useEffect(() => {
    if (tab !== 'cms' || !selectedCollectionId) return

    async function loadEntries() {
      try {
        const { response, data } = await apiClient.listEntries(accessToken, projectId, selectedCollectionId, {
          limit: parseInt(entryLimit) || 20,
        })
        if (response.ok) {
          setCollectionEntries(Array.isArray(data) ? data : data.results || [])
        }
      } catch (err) {
        setError(err.message)
      }
    }

    loadEntries()
  }, [selectedCollectionId, entryLimit, projectId, accessToken, tab])

  // API Key rotation
  async function handleRotateKey(type) {
    try {
      setError('')
      const res =
        type === 'form' ? await apiClient.rotateProjectKey(accessToken, projectId) : await apiClient.rotateProjectFaqKey(accessToken, projectId)

      if (!res.response.ok) {
        setError('Failed to rotate key')
        return
      }
      setStatus('✓ API key rotated successfully')
      // Reload project to get new key
      const { response, data } = await apiClient.getProject(accessToken, projectId)
      if (response.ok) setProject(data)
    } catch (err) {
      setError(err.message)
    }
  }

  // FAQ Config update
  async function handleUpdateFaqConfig() {
    try {
      setError('')
      const { response, data } = await apiClient.updateFaqConfig(accessToken, projectId, faqConfigForm)
      if (!response.ok) {
        setError('Failed to update FAQ config')
        return
      }
      setFaqConfig(data)
      setStatus('✓ FAQ config updated')
    } catch (err) {
      setError(err.message)
    }
  }

  // FAQ Ask
  async function handleFaqAsk() {
    try {
      setError('')
      if (!faqAskForm.question.trim()) {
        setError('Please enter a question')
        return
      }
      const { response, data } = await apiClient.projectFaqAsk(accessToken, projectId, faqAskForm)
      if (!response.ok) {
        setError('Failed to ask FAQ')
        return
      }
      setFaqAskResult(data)
      setStatus('✓ FAQ answer generated')
    } catch (err) {
      setError(err.message)
    }
  }

  // Create collection
  async function handleCreateCollection() {
    try {
      setError('')
      if (!newCollectionName.trim()) {
        setError('Please enter collection name')
        return
      }
      const { response, data } = await apiClient.createCollection(accessToken, projectId, {
        name: newCollectionName,
      })
      if (!response.ok) {
        setError('Failed to create collection')
        return
      }
      setCollections([...collections, data])
      setNewCollectionName('')
      setStatus('✓ Collection created')
    } catch (err) {
      setError(err.message)
    }
  }

  // Delete collection
  async function handleDeleteCollection(collectionId) {
    if (!confirm('Delete this collection?')) return
    try {
      setError('')
      const { response } = await apiClient.deleteCollection(accessToken, projectId, collectionId)
      if (!response.ok) {
        setError('Failed to delete collection')
        return
      }
      setCollections(collections.filter((c) => c.id !== collectionId))
      if (selectedCollectionId === collectionId) {
        setSelectedCollectionId('')
        setCollectionEntries([])
      }
      setStatus('✓ Collection deleted')
    } catch (err) {
      setError(err.message)
    }
  }

  // Add entry
  async function handleAddEntry() {
    try {
      setError('')
      if (!selectedCollectionId) {
        setError('Please select a collection')
        return
      }
      let data = {}
      try {
        data = JSON.parse(newEntryData)
      } catch {
        setError('Invalid JSON for entry data')
        return
      }
      const { response, data: newEntry } = await apiClient.createEntry(accessToken, projectId, selectedCollectionId, {
        data,
      })
      if (!response.ok) {
        setError('Failed to add entry')
        return
      }
      setCollectionEntries([newEntry, ...collectionEntries])
      setNewEntryData('{}')
      setShowNewEntry(false)
      setStatus('✓ Entry added')
    } catch (err) {
      setError(err.message)
    }
  }

  // Delete entry
  async function handleDeleteEntry(entryId) {
    if (!confirm('Delete this entry?')) return
    try {
      setError('')
      const { response } = await apiClient.deleteEntry(accessToken, projectId, selectedCollectionId, entryId)
      if (!response.ok) {
        setError('Failed to delete entry')
        return
      }
      setCollectionEntries(collectionEntries.filter((e) => e.id !== entryId))
      setStatus('✓ Entry deleted')
    } catch (err) {
      setError(err.message)
    }
  }

  // Build analytics from enquiries and FAQ chat data
  function buildAnalyticsFromData(enquiries, faqChats) {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    
    // Summary counts
    const totalEnquiries = enquiries.length
    const lockedEnquiries = enquiries.filter(e => e.is_locked).length
    const spamCount = enquiries.filter(e => e.category === 'spam').length
    const todayEnquiries = enquiries.filter(e => new Date(e.created_at) >= today).length
    const monthEnquiries = enquiries.filter(e => new Date(e.created_at) >= monthStart).length
    
    const totalFaqChats = faqChats.length
    const blockedFaqChats = faqChats.filter(c => c.is_blocked_by_quota).length
    const todayFaqChats = faqChats.filter(c => !c.is_blocked_by_quota && new Date(c.created_at) >= today).length
    const monthFaqChats = faqChats.filter(c => !c.is_blocked_by_quota && new Date(c.created_at) >= monthStart).length
    
    // Category breakdown
    const categoryMap = {}
    enquiries.forEach(e => {
      const cat = e.category || 'general'
      categoryMap[cat] = (categoryMap[cat] || 0) + 1
    })
    
    // Hourly distribution
    const hourlyMap = {}
    for (let h = 0; h < 24; h++) hourlyMap[String(h)] = 0
    enquiries.forEach(e => {
      const hour = new Date(e.created_at).getHours()
      hourlyMap[String(hour)] = (hourlyMap[String(hour)] || 0) + 1
    })
    const peakHourEntry = Object.entries(hourlyMap).reduce((max, [h, count]) => 
      count > max[1] ? [h, count] : max, ['0', 0])
    const peakHour = peakHourEntry[1] > 0 ? String(peakHourEntry[0]).padStart(2, '0') + ':00' : 'N/A'
    const peakHourCount = peakHourEntry[1]
    
    // Country/IP tracking
    const ipSet = new Set()
    enquiries.forEach(e => {
      if (e.ip_address) ipSet.add(e.ip_address)
    })
    
    // Per-day trend (last 30 days)
    const perDayLabels = []
    const perDayCounts = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      const dayEnd = new Date(dayStart.getTime() + 86400000)
      const count = enquiries.filter(e => {
        const eDate = new Date(e.created_at)
        return eDate >= dayStart && eDate < dayEnd
      }).length
      perDayLabels.push(d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }))
      perDayCounts.push(count)
    }
    
    // Per-month trend (last 12 months)
    const perMonthLabels = []
    const perMonthCounts = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now)
      d.setMonth(d.getMonth() - i)
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      const count = enquiries.filter(e => {
        const eDate = new Date(e.created_at)
        return eDate >= monthStart && eDate <= monthEnd
      }).length
      perMonthLabels.push(d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit' }))
      perMonthCounts.push(count)
    }
    
    return {
      summary: {
        total_enquiries: totalEnquiries,
        today_enquiries: todayEnquiries,
        month_enquiries: monthEnquiries,
        locked_enquiries: lockedEnquiries,
        spam_count: spamCount,
        total_faq_chats: totalFaqChats,
        today_faq_chats: todayFaqChats,
        month_faq_chats: monthFaqChats,
        blocked_faq_chats: blockedFaqChats,
        unique_ip_addresses: ipSet.size,
      },
      per_day: { labels: perDayLabels, counts: perDayCounts },
      per_month: { labels: perMonthLabels, counts: perMonthCounts },
      category_counts: categoryMap,
      hourly_distribution: hourlyMap,
      peak_hour: peakHour,
      peak_hour_count: peakHourCount,
      engagement: {
        enquiries_to_faq_ratio: totalFaqChats > 0 ? Number((totalEnquiries / totalFaqChats).toFixed(2)) : 0,
        faq_block_rate: (blockedFaqChats + monthFaqChats) > 0 ? Number(((blockedFaqChats / (blockedFaqChats + monthFaqChats)) * 100).toFixed(2)) : 0,
      },
      generated_at: now.toISOString(),
    }
  }

  if (loading && !project) {
    return <div style={{ padding: '20px' }}>Loading project...</div>
  }

  if (!project) {
    return <div style={{ padding: '20px', color: 'red' }}>Project not found</div>
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => navigate('/projects')} style={{ marginRight: '10px' }}>
          ← Back to Projects
        </button>
        <h1>{project.name}</h1>
        {status && <div style={{ color: 'green', marginBottom: '10px' }}>{status}</div>}
        {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
        {['overview', 'enquiries', 'faq', 'cms', 'analytics', 'billing'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 16px',
              backgroundColor: tab === t ? '#4CAF50' : '#f0f0f0',
              color: tab === t ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && overview && (
        <div>
          <h2>Project Overview</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '20px' }}>
            <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '4px' }}>
              <h3>Locked Enquiries</h3>
              <p style={{ fontSize: '24px', margin: '10px 0' }}>{overview.locked_enquiry_count || 0}</p>
            </div>
            <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '4px' }}>
              <h3>FAQ Chats Today</h3>
              <p style={{ fontSize: '24px', margin: '10px 0' }}>{overview.faq_today_count || 0}</p>
            </div>
            <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '4px' }}>
              <h3>Global FAQ Chats Today</h3>
              <p style={{ fontSize: '24px', margin: '10px 0' }}>{overview.global_today_count || 0}</p>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3>API Keys</h3>
            <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '4px', marginBottom: '10px' }}>
              <p>
                <strong>Form API Key:</strong> {project.public_api_key || 'N/A'}
                <button onClick={() => handleRotateKey('form')} style={{ marginLeft: '10px' }}>
                  Rotate
                </button>
              </p>
            </div>
            <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '4px' }}>
              <p>
                <strong>FAQ API Key:</strong> {project.faq_public_api_key || 'N/A'}
                <button onClick={() => handleRotateKey('faq')} style={{ marginLeft: '10px' }}>
                  Rotate
                </button>
              </p>
            </div>
          </div>

          {overview.recent_enquiries && (
            <div>
              <h3>Recent Enquiries</h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {overview.recent_enquiries.slice(0, 5).map((e) => (
                  <li key={e.id} style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                    <strong>{e.category}</strong> - {new Date(e.created_at).toLocaleString()}
                    {!e.is_locked && <pre style={{ marginTop: '5px', fontSize: '12px' }}>{JSON.stringify(e.raw_payload, null, 2)}</pre>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ENQUIRIES TAB */}
      {tab === 'enquiries' && (
        <div>
          <h2>Enquiries</h2>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search..."
              value={enquiryFilters.search}
              onChange={(e) => setEnquiryFilters({ ...enquiryFilters, search: e.target.value })}
              style={{ padding: '8px', marginRight: '10px', width: '200px' }}
            />
            <select value={enquiryFilters.category} onChange={(e) => setEnquiryFilters({ ...enquiryFilters, category: e.target.value })} style={{ padding: '8px' }}>
              <option value="">All Categories</option>
              <option value="general">General</option>
              <option value="spam">Spam</option>
            </select>
          </div>

          {/* Pending Enquiries Section */}
          {enquiries.some((e) => e.status === 'pending') && (
            <div style={{ border: '2px solid #ff9800', backgroundColor: '#fff3e0', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#f57c00' }}>⏳ Pending Submissions</h3>
              <p style={{ margin: '0 0 15px 0', color: '#666', fontSize: '14px' }}>
                These submissions are being processed and will appear in the list shortly.
              </p>
              <div>
                {enquiries
                  .filter((e) => e.status === 'pending')
                  .map((e) => {
                    const payload = e.raw_payload || e.payload || {}
                    const fields = payload.fields || {}
                    const fullName = fields.full_name || e.submitter_name || 'Unknown'
                    const email = fields.email || e.submitter_email || 'N/A'
                    const subject = fields.subject || 'No subject'
                    const message = fields.message || 'No message'
                    
                    return (
                      <div key={e.id} style={{ border: '1px solid #ffe0b2', padding: '15px', marginBottom: '10px', borderRadius: '4px', backgroundColor: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #ffe0b2', paddingBottom: '10px' }}>
                          <div>
                            <strong style={{ color: '#f57c00', fontSize: '15px' }}>PENDING SUBMISSION</strong>
                            <div style={{ fontSize: '13px', color: '#999', marginTop: '4px' }}>
                              📧 {email} | 🌐 {e.ip_address}
                            </div>
                          </div>
                          <small style={{ color: '#999' }}>{new Date(e.created_at).toLocaleString()}</small>
                        </div>
                        
                        <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                          <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #f0e6d2' }}>
                            <strong style={{ color: '#333' }}>👤 From:</strong>
                            <span style={{ marginLeft: '8px', color: '#555' }}>{fullName}</span>
                          </div>
                          
                          <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #f0e6d2' }}>
                            <strong style={{ color: '#333' }}>📌 Subject:</strong>
                            <span style={{ marginLeft: '8px', color: '#555', fontWeight: '500' }}>{subject}</span>
                          </div>
                          
                          <div style={{ marginBottom: '0' }}>
                            <strong style={{ color: '#333', display: 'block', marginBottom: '8px' }}>💬 Message:</strong>
                            <div style={{ backgroundColor: '#fffbf0', padding: '12px', borderLeft: '4px solid #ff9800', borderRadius: '3px', color: '#333' }}>
                              <p style={{ margin: '0', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.6' }}>{message}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Processed Enquiries Section */}
          <div>
            <h3>Processed Enquiries ({enquiries.filter((e) => e.status !== 'pending').length})</h3>
            {enquiries.filter((e) => e.status !== 'pending').length === 0 ? (
              <p style={{ color: '#999' }}>No processed enquiries</p>
            ) : (
              <div>
                {enquiries
                  .filter((e) => e.status !== 'pending')
                  .map((e) => {
                    const payload = e.raw_payload || e.payload || {}
                    const fields = payload.fields || {}
                    const fullName = fields.full_name || e.submitter_name || 'Unknown'
                    const email = fields.email || e.submitter_email || 'N/A'
                    const subject = fields.subject || 'No subject'
                    const message = fields.message || 'No message'
                    
                    return (
                      <div key={e.id} style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '10px', borderRadius: '4px', backgroundColor: '#fafafa' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #e0e0e0', paddingBottom: '10px' }}>
                          <div>
                            <strong style={{ fontSize: '15px', color: '#333' }}>✓ PROCESSED</strong>
                            <div style={{ fontSize: '13px', color: '#999', marginTop: '4px' }}>
                              📧 {email} | 🌐 {e.ip_address}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '13px', backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '4px 10px', borderRadius: '3px', fontWeight: '500' }}>
                              {e.category || 'General'}
                            </span>
                            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                              {new Date(e.created_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        
                        {!e.is_locked ? (
                          <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                            <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #e0e0e0' }}>
                              <strong style={{ color: '#333' }}>👤 From:</strong>
                              <span style={{ marginLeft: '8px', color: '#555' }}>{fullName}</span>
                            </div>
                            
                            <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #e0e0e0' }}>
                              <strong style={{ color: '#333' }}>📌 Subject:</strong>
                              <span style={{ marginLeft: '8px', color: '#555', fontWeight: '500' }}>{subject}</span>
                            </div>
                            
                            <div style={{ marginBottom: '0' }}>
                              <strong style={{ color: '#333', display: 'block', marginBottom: '8px' }}>💬 Message:</strong>
                              <div style={{ backgroundColor: '#f5f5f5', padding: '12px', borderLeft: '4px solid #4CAF50', borderRadius: '3px', color: '#333' }}>
                                <p style={{ margin: '0', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.6' }}>{message}</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div style={{ color: '#d32f2f', fontWeight: '500' }}>🔒 This submission is locked</div>
                        )}
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FAQ TAB */}
      {tab === 'faq' && (
        <div>
          <h2>FAQ Configuration & Chat</h2>

          <div style={{ marginBottom: '30px', border: '1px solid #ddd', padding: '20px', borderRadius: '4px' }}>
            <h3>FAQ Configuration</h3>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Site Name</label>
              <input
                type="text"
                value={faqConfigForm.site_name || ''}
                onChange={(e) => setFaqConfigForm({ ...faqConfigForm, site_name: e.target.value })}
                style={{ width: '100%', maxWidth: '500px', padding: '8px' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Business Summary</label>
              <textarea
                value={faqConfigForm.business_summary || ''}
                onChange={(e) => setFaqConfigForm({ ...faqConfigForm, business_summary: e.target.value })}
                style={{ width: '100%', maxWidth: '500px', padding: '8px', minHeight: '80px' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Support Email</label>
              <input
                type="email"
                value={faqConfigForm.support_email || ''}
                onChange={(e) => setFaqConfigForm({ ...faqConfigForm, support_email: e.target.value })}
                style={{ width: '100%', maxWidth: '500px', padding: '8px' }}
              />
            </div>
            <button onClick={handleUpdateFaqConfig} style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}>
              Save FAQ Config
            </button>
          </div>

          <div style={{ marginBottom: '20px', border: '1px solid #ddd', padding: '20px', borderRadius: '4px' }}>
            <h3>Ask FAQ (Test)</h3>
            <div style={{ marginBottom: '15px' }}>
              <input
                type="text"
                placeholder="Ask a question..."
                value={faqAskForm.question}
                onChange={(e) => setFaqAskForm({ ...faqAskForm, question: e.target.value })}
                style={{ width: '100%', maxWidth: '500px', padding: '8px', marginBottom: '10px' }}
              />
              <label style={{ display: 'block', marginBottom: '10px' }}>
                <input
                  type="checkbox"
                  checked={faqAskForm.include_collections || false}
                  onChange={(e) => setFaqAskForm({ ...faqAskForm, include_collections: e.target.checked })}
                />
                Include Collections Context
              </label>
              <button onClick={handleFaqAsk} style={{ padding: '8px 16px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px' }}>
                Generate Answer
              </button>
            </div>
            {faqAskResult && (
              <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '4px', marginTop: '15px' }}>
                <p>
                  <strong>Answer:</strong>
                </p>
                <p>{faqAskResult.answer}</p>
              </div>
            )}
          </div>

          <div>
            <h3>Recent Chat Messages</h3>
            {faqChats.map((chat) => (
              <div key={chat.id} style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '10px', borderRadius: '4px' }}>
                <p>
                  <strong>Q:</strong> {chat.question}
                </p>
                <p>
                  <strong>A:</strong> {chat.answer}
                </p>
                <small>{new Date(chat.created_at).toLocaleString()}</small>
              </div>
            ))}
            {faqChats.length === 0 && <p>No chat messages</p>}
          </div>
        </div>
      )}

      {/* CMS TAB */}
      {tab === 'cms' && (
        <div>
          <h2>Collections & Content Management</h2>

          <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
            <input type="text" placeholder="New collection name..." value={newCollectionName} onChange={(e) => setNewCollectionName(e.target.value)} style={{ padding: '8px', flex: 1 }} />
            <button onClick={handleCreateCollection} style={{ padding: '8px 16px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}>
              Create Collection
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '20px' }}>
            {/* Collections list */}
            <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '15px', maxHeight: '500px', overflowY: 'auto' }}>
              <h3>Collections</h3>
              {collections.map((col) => (
                <div
                  key={col.id}
                  onClick={() => setSelectedCollectionId(col.id)}
                  style={{
                    padding: '10px',
                    cursor: 'pointer',
                    backgroundColor: selectedCollectionId === col.id ? '#e3f2fd' : 'transparent',
                    borderRadius: '4px',
                    marginBottom: '5px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>{col.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteCollection(col.id)
                    }}
                    style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '2px' }}
                  >
                    Delete
                  </button>
                </div>
              ))}
              {collections.length === 0 && <p style={{ color: '#999' }}>No collections</p>}
            </div>

            {/* Collection entries */}
            <div>
              {selectedCollectionId && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3>Entries</h3>
                    <button onClick={() => setShowNewEntry(!showNewEntry)} style={{ padding: '8px 16px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px' }}>
                      {showNewEntry ? 'Cancel' : 'Add Entry'}
                    </button>
                  </div>

                  {showNewEntry && (
                    <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '4px', marginBottom: '15px', backgroundColor: '#f5f5f5' }}>
                      <textarea value={newEntryData} onChange={(e) => setNewEntryData(e.target.value)} style={{ width: '100%', padding: '8px', minHeight: '150px', fontFamily: 'monospace' }} />
                      <button onClick={handleAddEntry} style={{ marginTop: '10px', padding: '8px 16px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}>
                        Save Entry
                      </button>
                    </div>
                  )}

                  <div>
                    <label style={{ marginRight: '10px' }}>
                      Limit:
                      <select value={entryLimit} onChange={(e) => setEntryLimit(e.target.value)} style={{ padding: '4px', marginLeft: '5px' }}>
                        <option>10</option>
                        <option>20</option>
                        <option>50</option>
                        <option>100</option>
                      </select>
                    </label>
                  </div>

                  {collectionEntries.map((entry) => (
                    <div key={entry.id} style={{ border: '1px solid #ddd', padding: '15px', marginTop: '10px', borderRadius: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <pre style={{ margin: 0, fontSize: '12px', flex: 1, backgroundColor: '#f5f5f5', padding: '10px', overflowX: 'auto' }}>{JSON.stringify(entry.data, null, 2)}</pre>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '2px', marginLeft: '10px' }}
                        >
                          Delete
                        </button>
                      </div>
                      <small style={{ color: '#999' }}>{new Date(entry.created_at).toLocaleString()}</small>
                    </div>
                  ))}
                  {collectionEntries.length === 0 && <p style={{ color: '#999' }}>No entries</p>}
                </div>
              )}
              {!selectedCollectionId && <p style={{ color: '#999' }}>Select a collection to view entries</p>}
            </div>
          </div>
        </div>
      )}

      {/* ANALYTICS TAB */}
      {tab === 'analytics' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Analytics Dashboard</h2>
            <button
              onClick={() => {
                setTab(null)
                setTimeout(() => setTab('analytics'), 100)
              }}
              style={{ padding: '8px 16px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              ♻️ Refresh
            </button>
          </div>
          
          {loading && <div style={{ padding: '20px', color: '#666' }}>Loading analytics...</div>}
          
          {analytics && !loading ? (
            <div>
              {analytics.error && (
                <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '15px', borderRadius: '4px', marginBottom: '20px', border: '1px solid #ef5350' }}>
                  <strong>⚠️ Analytics Error:</strong> {analytics.message}
                </div>
              )}
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
                <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Total Enquiries</h4>
                  <p style={{ fontSize: '32px', margin: '0', color: '#4CAF50', fontWeight: 'bold' }}>{analytics.summary?.total_enquiries || 0}</p>
                  <small style={{ color: '#999' }}>Form submissions</small>
                </div>
                <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>This Month</h4>
                  <p style={{ fontSize: '32px', margin: '0', color: '#2196F3', fontWeight: 'bold' }}>{analytics.summary?.month_enquiries || 0}</p>
                  <small style={{ color: '#999' }}>Submissions this month</small>
                </div>
                <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Today</h4>
                  <p style={{ fontSize: '32px', margin: '0', color: '#FF9800', fontWeight: 'bold' }}>{analytics.summary?.today_enquiries || 0}</p>
                  <small style={{ color: '#999' }}>Submissions today</small>
                </div>
                <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Locked</h4>
                  <p style={{ fontSize: '32px', margin: '0', color: '#f44336', fontWeight: 'bold' }}>{analytics.summary?.locked_enquiries || 0}</p>
                  <small style={{ color: '#999' }}>Quota exceeded</small>
                </div>
                <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>FAQ Chats</h4>
                  <p style={{ fontSize: '32px', margin: '0', color: '#9C27B0', fontWeight: 'bold' }}>{analytics.summary?.total_faq_chats || 0}</p>
                  <small style={{ color: '#999' }}>Total chats</small>
                </div>
                <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Peak Hour</h4>
                  <p style={{ fontSize: '32px', margin: '0', color: '#00BCD4', fontWeight: 'bold' }}>{analytics.peak_hour || 'N/A'}</p>
                  <small style={{ color: '#999', display: 'block' }}>{analytics.peak_hour_count || 0} submissions</small>
                </div>
              </div>

              {/* Engagement Metrics */}
              <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '4px', marginBottom: '30px', backgroundColor: '#fafafa' }}>
                <h3>Engagement Metrics</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                  <div>
                    <p><strong>Unique IP Addresses:</strong> {analytics.summary?.unique_ip_addresses || 0}</p>
                    <p><strong>Spam Count:</strong> {analytics.summary?.spam_count || 0}</p>
                  </div>
                  <div>
                    <p><strong>Enquiry to FAQ Ratio:</strong> {analytics.engagement?.enquiries_to_faq_ratio || 0}</p>
                    <p><strong>FAQ Block Rate:</strong> {analytics.engagement?.faq_block_rate || 0}%</p>
                  </div>
                  <div>
                    <p><strong>Avg FAQ Response Length:</strong> {analytics.avg_faq_response_length || 0} chars</p>
                    <p><strong>Paywalled:</strong> {analytics.paywalled ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>

              {/* Category Distribution */}
              {Object.keys(analytics.category_counts || {}).length > 0 && (
                <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '4px', marginBottom: '30px' }}>
                  <h3>Enquiries by Category</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    {Object.entries(analytics.category_counts).map(([category, count]) => (
                      <div key={category} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                        <span><strong>{category || 'General'}</strong></span>
                        <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hourly Distribution */}
              {Object.keys(analytics.hourly_distribution || {}).length > 0 && (
                <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '4px', marginBottom: '30px' }}>
                  <h3>Hourly Distribution</h3>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end', height: '200px', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
                    {Array.from({ length: 24 }).map((_, hour) => {
                      const count = analytics.hourly_distribution?.[String(hour)] || 0
                      const maxCount = Math.max(...Object.values(analytics.hourly_distribution || {}), 1)
                      const height = (count / maxCount) * 150
                      const peakHour = parseInt(analytics.peak_hour?.split(':')[0] || -1)
                      return (
                        <div
                          key={hour}
                          style={{
                            width: '30px',
                            height: height > 0 ? height : '2px',
                            backgroundColor: hour === peakHour ? '#f44336' : '#2196F3',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'all 0.2s',
                          }}
                          title={`${hour.toString().padStart(2, '0')}:00 - ${count} submissions`}
                        />
                      )
                    })}
                  </div>
                  <p style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>Red bar = peak hour</p>
                </div>
              )}

              {/* Top Countries */}
              {Object.keys(analytics.country_counts || {}).length > 0 && (
                <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '4px', marginBottom: '30px' }}>
                  <h3>Top Countries/Regions</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '10px' }}>
                    {Object.entries(analytics.country_counts)
                      .slice(0, 10)
                      .map(([country, count], idx) => (
                        <div key={country} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                          <span><strong>{idx + 1}.</strong> {country || 'Unknown'}</span>
                          <div style={{ flex: 1, height: '20px', backgroundColor: '#e0e0e0', borderRadius: '2px', margin: '0 10px', overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                backgroundColor: '#4CAF50',
                                width: `${(count / Math.max(...Object.values(analytics.country_counts))) * 100}%`,
                              }}
                            />
                          </div>
                          <span style={{ fontWeight: 'bold', minWidth: '30px', textAlign: 'right' }}>{count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Daily Trend */}
              {analytics.per_day?.labels?.length > 0 && (
                <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '4px', marginBottom: '30px' }}>
                  <h3>Daily Submissions (Last 30 Days)</h3>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '200px', borderBottom: '1px solid #ddd', paddingBottom: '10px', overflowX: 'auto' }}>
                    {analytics.per_day.counts.map((count, idx) => {
                      const maxCount = Math.max(...analytics.per_day.counts, 1)
                      const height = (count / maxCount) * 150
                      return (
                        <div
                          key={idx}
                          style={{
                            flex: '0 0 calc(100% / 30)',
                            height: height > 0 ? height : '2px',
                            backgroundColor: '#2196F3',
                            borderRadius: '2px',
                            cursor: 'pointer',
                          }}
                          title={`${analytics.per_day.labels[idx]}: ${count} submissions`}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Monthly Trend */}
              {analytics.per_month?.labels?.length > 0 && (
                <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '4px', marginBottom: '20px' }}>
                  <h3>Monthly Trend (Last 12 Months)</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                    {analytics.per_month.labels.map((label, idx) => (
                      <div key={idx} style={{ textAlign: 'center', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                        <strong>{label}</strong>
                        <p style={{ fontSize: '24px', margin: '10px 0', color: '#4CAF50' }}>{analytics.per_month.counts[idx]}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ fontSize: '12px', color: '#999', marginTop: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                <p>Last updated: {analytics.generated_at ? new Date(analytics.generated_at).toLocaleString() : 'N/A'}</p>
              </div>
            </div>
          ) : (
            <p style={{ color: '#d32f2f' }}>
              {error ? `Error: ${error}` : 'No analytics data available. Make sure you have form submissions or FAQ chats.'}
            </p>
          )}
        </div>
      )}

      {/* BILLING TAB */}
      {tab === 'billing' && (
        <div>
          <h2>Billing & Subscription</h2>
          {billing ? (
            <div>
              <div style={{ marginBottom: '20px', border: '1px solid #ddd', padding: '20px', borderRadius: '4px' }}>
                <h3>Current Subscription</h3>
                <p>
                  <strong>Status:</strong> {billing.subscription?.status}
                </p>
                <p>
                  <strong>Plan:</strong> {billing.subscription?.plan_name || 'Free'}
                </p>
                {billing.subscription?.is_active && (
                  <p>
                    <strong>Valid until:</strong> {new Date(billing.subscription.current_period_end).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h3>Available Plans</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
                  {billing.plans &&
                    billing.plans.map((plan) => (
                      <div key={plan.id} style={{ border: '2px solid #ddd', padding: '20px', borderRadius: '4px', backgroundColor: billing.subscription?.plan_id === plan.id ? '#e8f5e9' : 'white' }}>
                        <h4>{plan.name}</h4>
                        <p style={{ fontSize: '24px', color: '#4CAF50', marginBottom: '10px' }}>₹{plan.price_inr}/month</p>
                        <ul style={{ marginBottom: '15px' }}>
                          <li>Form Submissions: {plan.monthly_quota || 'Unlimited'}</li>
                          <li>FAQ Chats: {plan.monthly_chat_quota || 'Unlimited'}</li>
                          <li>Period: {plan.period_days} days</li>
                        </ul>
                        {billing.subscription?.plan_id !== plan.id && (
                          <button onClick={() => setShowBillingForm(true)} style={{ padding: '8px 16px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', width: '100%' }}>
                            Subscribe to {plan.name}
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {showBillingForm && (
                <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '4px', backgroundColor: '#f5f5f5' }}>
                  <h3>Subscribe to Plan</h3>
                  <select value={billingForm.plan_id} onChange={(e) => setBillingForm({ ...billingForm, plan_id: e.target.value })} style={{ padding: '8px', marginRight: '10px', width: '200px' }}>
                    <option value="">Select a plan</option>
                    {billing.plans &&
                      billing.plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} - ₹{plan.price_inr}
                        </option>
                      ))}
                  </select>
                  <button onClick={() => setShowBillingForm(false)} style={{ padding: '8px 16px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <p style={{ color: '#999', marginTop: '10px' }}>Note: Razorpay integration required for payments</p>
                </div>
              )}
            </div>
          ) : (
            <p>No billing data available</p>
          )}
        </div>
      )}
    </div>
  )
}
