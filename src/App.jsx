import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import ColorBends from './ColorBends'
import ShinyText from './ShinyText'
import { apiClient } from './services/apiClient'
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from './config'

function parseError(data) {
  if (!data) return 'Request failed'
  if (typeof data === 'string') return data
  if (typeof data.detail === 'string') {
    if (data.detail === 'Given token not valid for any token type' || data.code === 'token_not_valid') {
      return 'Session expired. Please log in again.'
    }
    return data.detail
  }
  const firstKey = Object.keys(data)[0]
  if (firstKey && Array.isArray(data[firstKey]) && data[firstKey].length) {
    return `${firstKey}: ${data[firstKey][0]}`
  }
  return JSON.stringify(data)
}

function asList(data) {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.results)) return data.results
  return []
}

function initialFaqConfig() {
  return {
    site_name: '',
    business_summary: '',
    key_points: '',
    support_email: '',
    support_phone: '',
    business_hours: '',
    tone: '',
    faqs_text: '',
    extra_context: '',
  }
}

function maskKey(value) {
  if (!value) return 'Not available'
  if (value.length < 12) return value
  return `${value.slice(0, 8)}...${value.slice(-6)}`
}

function formatFieldValue(value) {
  if (value === null || value === undefined || value === '') return 'N/A'
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return Object.entries(value).map(([k, v]) => `${k}: ${String(v)}`).join(' | ')
  return String(value)
}

function ensureRazorpayLoaded() {
  if (window.Razorpay) return Promise.resolve()
  const existing = document.querySelector('script[data-razorpay-checkout="true"]')
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay checkout script.')), { once: true })
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.dataset.razorpayCheckout = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout script.'))
    document.body.appendChild(script)
  })
}

function App() {
  const [screen, setScreen] = useState('login')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const [accessToken, setAccessToken] = useState(localStorage.getItem(ACCESS_TOKEN_KEY) || '')
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem(REFRESH_TOKEN_KEY) || '')

  const [me, setMe] = useState(null)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [signupForm, setSignupForm] = useState({ username: '', email: '', password: '' })
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [emailOtp, setEmailOtp] = useState('')
  const [forgotForm, setForgotForm] = useState({ email: '', otp: '', newPassword: '', confirmPassword: '' })
  const [passwordUpdateForm, setPasswordUpdateForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [loginButtonHovered, setLoginButtonHovered] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [copiedTemplate, setCopiedTemplate] = useState(false)
  const [showPasswordLengthError, setShowPasswordLengthError] = useState(false)
  const [passwordUpdateSuccess, setPasswordUpdateSuccess] = useState(false)
  const [projectCreatedSuccess, setProjectCreatedSuccess] = useState(false)

  const [projects, setProjects] = useState([])
  const [newProject, setNewProject] = useState({ name: '', domainInput: '', allowed_domains: [] })
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedProject, setSelectedProject] = useState(null)

  const [faqConfig, setFaqConfig] = useState(initialFaqConfig())
  const [billing, setBilling] = useState(null)
  const [templates, setTemplates] = useState([])
  const [selectedTemplatePath, setSelectedTemplatePath] = useState('')
  const [templateCode, setTemplateCode] = useState('')
  const [dashboardPage, setDashboardPage] = useState('projects')
  const [billingActionPlanId, setBillingActionPlanId] = useState('')
  const [lastPaymentResult, setLastPaymentResult] = useState(null)
  const [rewriteInput, setRewriteInput] = useState('')
  const [rewriteOutput, setRewriteOutput] = useState('')
  const [rewriteTriesLeft, setRewriteTriesLeft] = useState(null)
  const [enquiries, setEnquiries] = useState([])
  const [enquiryFilters, setEnquiryFilters] = useState({ category: '', search: '' })
  const [analyticsData, setAnalyticsData] = useState(null)
  const [showDashboardSplash, setShowDashboardSplash] = useState(false)
  const prevScreenRef = useRef(screen)
  const [supportMessages, setSupportMessages] = useState([])
  const [supportForm, setSupportForm] = useState({ subject: '', message: '' })
  const [notifications, setNotifications] = useState([])
  const [crmCollections, setCrmCollections] = useState([])
  const [crmSelectedCollectionId, setCrmSelectedCollectionId] = useState('')
  const [crmEntries, setCrmEntries] = useState([])
  const [crmCollectionName, setCrmCollectionName] = useState('')
  const [crmRenameName, setCrmRenameName] = useState('')
  const [crmEntryJson, setCrmEntryJson] = useState('{\n  "name": "Lead Name",\n  "email": "lead@example.com"\n}')
  const [crmEditEntryId, setCrmEditEntryId] = useState('')
  const [crmDisabled, setCrmDisabled] = useState(false)

  const isAuthenticated = Boolean(accessToken)
  const selectedProjectName = useMemo(() => {
    const match = projects.find((p) => String(p.id) === String(selectedProjectId))
    return match?.name || 'None selected'
  }, [projects, selectedProjectId])

  useEffect(() => {
    if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    else localStorage.removeItem(ACCESS_TOKEN_KEY)
  }, [accessToken])

  useEffect(() => {
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    else localStorage.removeItem(REFRESH_TOKEN_KEY)
  }, [refreshToken])

  function notify(nextStatus = '', nextError = '') {
    setStatus(nextStatus)
    setError(nextError)
  }

  async function call(task, okMessage = '', { useBusy = true } = {}) {
    if (useBusy) setBusy(true)
    notify('', '')
    try {
      const result = await task()
      if (okMessage) notify(okMessage, '')
      return result
    } catch (err) {
      notify('', err.message || 'Something went wrong')
      return null
    } finally {
      if (useBusy) setBusy(false)
    }
  }

  async function authedRequest(action) {
    const first = await action(accessToken)
    if (first.response.status !== 401) return first
    if (!refreshToken) return first

    const refreshed = await apiClient.refreshToken(refreshToken)
    if (!refreshed.response.ok || !refreshed.data?.access) {
      setAccessToken('')
      setRefreshToken('')
      setScreen('login')
      return first
    }

    setAccessToken(refreshed.data.access)
    return action(refreshed.data.access)
  }

  async function loadMe() {
    const { response, data } = await authedRequest((token) => apiClient.getMe(token))
    if (!response.ok) throw new Error(parseError(data))
    setMe(data)
    return data
  }

  async function loadProjects() {
    const { response, data } = await authedRequest((token) => apiClient.listProjects(token))
    if (!response.ok) throw new Error(parseError(data))
    const list = asList(data)
    setProjects(list)
    if (!selectedProjectId && list.length) {
      setSelectedProjectId(String(list[0].id))
    }
    return list
  }

  async function loadProjectDetails(projectId) {
    if (!projectId) return
    const { response, data } = await authedRequest((token) => apiClient.getProject(token, projectId))
    if (!response.ok) throw new Error(parseError(data))
    setSelectedProject(data)
    return data
  }

  async function loadFaqConfig(projectId) {
    if (!projectId) return
    const { response, data } = await authedRequest((token) => apiClient.getFaqConfig(token, projectId))
    if (!response.ok) throw new Error(parseError(data))
    setFaqConfig({ ...initialFaqConfig(), ...data })
    return data
  }

  async function loadBilling(projectId) {
    if (!projectId) return
    const { response, data } = await authedRequest((token) => apiClient.getBillingOverview(token, projectId))
    if (!response.ok) throw new Error(parseError(data))
    setBilling(data)
    return data
  }

  useEffect(() => {
    if (!isAuthenticated) {
      setScreen((prev) => (prev === 'signup' ? 'signup' : 'login'))
      return
    }
    call(async () => {
      try {
        const meData = await loadMe()
        if (!meData?.email_verified) {
          setScreen('verify-email')
          return
        }
        await loadProjects()
        setScreen('dashboard')
      } catch (err) {
        if (err.message && (err.message.includes('Session expired') || err.message.includes('token not valid'))) {
          setScreen('login')
        } else {
          throw err
        }
      }
    }, '', { useBusy: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || !selectedProjectId) return
    call(async () => {
      await loadProjectDetails(selectedProjectId)
      await Promise.all([loadFaqConfig(selectedProjectId), loadBilling(selectedProjectId)])
    }, '', { useBusy: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return
    call(loadTemplates, '', { useBusy: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || !selectedTemplatePath) return
    call(() => loadTemplateCode(selectedTemplatePath), '', { useBusy: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplatePath, isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || !selectedProjectId || dashboardPage !== 'submissions') return
    call(() => loadEnquiries(selectedProjectId), '', { useBusy: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardPage, selectedProjectId, isAuthenticated, enquiryFilters.category, enquiryFilters.search])

  useEffect(() => {
    if (!isAuthenticated || !selectedProjectId || dashboardPage !== 'analytics') return
    call(() => loadAnalytics(selectedProjectId), '', { useBusy: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardPage, selectedProjectId, isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || dashboardPage !== 'support') return
    call(loadSupportMessages, '', { useBusy: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardPage, isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || dashboardPage !== 'notifications') return
    call(loadNotifications, '', { useBusy: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardPage, isAuthenticated])

  useEffect(() => {
    setRewriteOutput('')
    setRewriteTriesLeft(null)
  }, [selectedProjectId])

  useEffect(() => {
    if (!isAuthenticated || !selectedProjectId || dashboardPage !== 'crm') return
    call(() => loadCrmCollections(selectedProjectId), '', { useBusy: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardPage, selectedProjectId, isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || !selectedProjectId || dashboardPage !== 'crm' || !crmSelectedCollectionId) return
    call(() => loadCrmEntries(selectedProjectId, crmSelectedCollectionId), '', { useBusy: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crmSelectedCollectionId, dashboardPage, selectedProjectId, isAuthenticated])

  useEffect(() => {
    const prevScreen = prevScreenRef.current
    const cameFromAuth = prevScreen === 'login' || prevScreen === 'signup'
    const enteredDashboard = screen === 'dashboard'
    if (cameFromAuth && enteredDashboard) {
      setShowDashboardSplash(true)
      const timer = setTimeout(() => setShowDashboardSplash(false), 2400)
      prevScreenRef.current = screen
      return () => clearTimeout(timer)
    }
    prevScreenRef.current = screen
  }, [screen])

  async function handleLogin(event) {
    event.preventDefault()
    await call(async () => {
      const { response, data } = await apiClient.login(loginForm.username, loginForm.password)
      if (!response.ok) throw new Error(parseError(data))
      setAccessToken(data.access || '')
      setRefreshToken(data.refresh || '')
    }, 'Login successful.')
  }

  async function handleSignup(event) {
    event.preventDefault()
    if (!acceptedTerms) {
      notify('', 'You must accept the Terms & Conditions and Privacy Policy to register.')
      return
    }
    await call(async () => {
      const { response, data } = await apiClient.register(signupForm.username, signupForm.email, signupForm.password)
      if (!response.ok) throw new Error(parseError(data))
      setAcceptedTerms(false)
      setScreen('login')
    }, 'Signup successful. Please login.')
  }

  async function handleVerifyEmail(event) {
    event.preventDefault()
    const code = emailOtp.trim()
    if (!/^\d{8}$/.test(code)) {
      notify('', 'Enter the 8-digit OTP sent to your email.')
      return
    }
    await call(async () => {
      const { response, data } = await authedRequest((token) => apiClient.verifyEmail(token, code))
      if (!response.ok) throw new Error(parseError(data))
      await loadMe()
      await loadProjects()
      setScreen('dashboard')
      setEmailOtp('')
    }, 'Email verified successfully.')
  }

  async function handleForgotPasswordRequest(event) {
    event.preventDefault()
    const email = forgotForm.email.trim()
    if (!email) {
      notify('', 'Email is required.')
      return
    }
    await call(async () => {
      const { response, data } = await apiClient.requestForgotPassword(email)
      if (!response.ok) throw new Error(parseError(data))
    }, 'If the account exists, an OTP has been sent to the email.')
  }

  async function handleForgotPasswordReset(event) {
    event.preventDefault()
    const email = forgotForm.email.trim()
    const otp = forgotForm.otp.trim()
    const newPassword = forgotForm.newPassword
    const confirmPassword = forgotForm.confirmPassword

    if (!email) {
      notify('', 'Email is required.')
      return
    }
    if (!/^\d{8}$/.test(otp)) {
      notify('', 'Enter a valid 8-digit OTP.')
      return
    }
    if (newPassword.length < 8) {
      notify('', 'New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      notify('', 'Passwords do not match.')
      return
    }

    await call(async () => {
      const { response, data } = await apiClient.resetForgotPassword({ email, otp, newPassword })
      if (!response.ok) throw new Error(parseError(data))
      setForgotForm({ email: '', otp: '', newPassword: '', confirmPassword: '' })
      setScreen('login')
    }, 'Password reset successful. Please login.')
  }

  async function handleUpdatePassword(event) {
    event.preventDefault()
    const currentPassword = passwordUpdateForm.currentPassword
    const newPassword = passwordUpdateForm.newPassword
    const confirmPassword = passwordUpdateForm.confirmPassword

    if (!currentPassword) {
      notify('', 'Current password is required.')
      return
    }
    if (newPassword.length < 8) {
      setShowPasswordLengthError(true)
      return
    }
    setShowPasswordLengthError(false)
    if (newPassword !== confirmPassword) {
      notify('', 'Passwords do not match.')
      return
    }

    setPasswordUpdateSuccess(false)
    await call(async () => {
      const { response, data } = await authedRequest((token) =>
        apiClient.updatePassword(token, { currentPassword, newPassword })
      )
      if (!response.ok) throw new Error(parseError(data))
      setPasswordUpdateForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordUpdateSuccess(true)
      setTimeout(() => setPasswordUpdateSuccess(false), 10000)
    }, '')
  }

  function handleLogout() {
    setAccessToken('')
    setRefreshToken('')
    setMe(null)
    setProjects([])
    setSelectedProjectId('')
    setSelectedProject(null)
    setFaqConfig(initialFaqConfig())
    setBilling(null)
    setScreen('login')
    notify('', '')
  }

  function addDomain() {
    const value = newProject.domainInput.trim().toLowerCase()
    if (!value || newProject.allowed_domains.includes(value)) return
    setNewProject((prev) => ({
      ...prev,
      domainInput: '',
      allowed_domains: [...prev.allowed_domains, value],
    }))
  }

  function removeDomain(domain) {
    setNewProject((prev) => ({
      ...prev,
      allowed_domains: prev.allowed_domains.filter((d) => d !== domain),
    }))
  }

  async function handleCreateProject(event) {
    event.preventDefault()
    if (!newProject.name.trim()) {
      notify('', 'Project name is required.')
      return
    }
    if (!newProject.allowed_domains.length) {
      notify('', 'Add at least one allowed domain.')
      return
    }

    setProjectCreatedSuccess(false)
    await call(async () => {
      const { response, data } = await authedRequest((token) => apiClient.createProject(token, {
        name: newProject.name.trim(),
        allowed_domains: newProject.allowed_domains,
      }))
      if (!response.ok) throw new Error(parseError(data))
      setNewProject({ name: '', domainInput: '', allowed_domains: [] })
      const list = await loadProjects()
      if (data?.id) setSelectedProjectId(String(data.id))
      else if (list.length) setSelectedProjectId(String(list[0].id))
      setProjectCreatedSuccess(true)
      setTimeout(() => setProjectCreatedSuccess(false), 10000)
    }, '')
  }

  async function rotateKey(type) {
    if (!selectedProjectId) return
    await call(async () => {
      const task = type === 'form' ? apiClient.rotateProjectKey : apiClient.rotateProjectFaqKey
      const { response, data } = await authedRequest((token) => task.call(apiClient, token, selectedProjectId))
      if (!response.ok) throw new Error(parseError(data))
      await loadProjectDetails(selectedProjectId)
    }, type === 'form' ? 'Form API key rotated.' : 'FAQ API key rotated.')
  }

  async function saveFaqConfig(event) {
    event.preventDefault()
    if (!selectedProjectId) return
    await call(async () => {
      const { response, data } = await authedRequest((token) => apiClient.updateFaqConfig(token, selectedProjectId, faqConfig))
      if (!response.ok) throw new Error(parseError(data))
      setFaqConfig({ ...initialFaqConfig(), ...data })
    }, 'FAQ bot configuration saved.')
  }

  async function loadTemplates() {
    const response = await fetch('/templates/index.json')
    if (!response.ok) {
      throw new Error('Could not load template index.')
    }
    const data = await response.json()
    const list = asList(data?.templates)
    setTemplates(list)
    if (!selectedTemplatePath && list.length) {
      setSelectedTemplatePath(list[0].path)
    }
  }

  async function loadTemplateCode(templatePath) {
    if (!templatePath) {
      setTemplateCode('')
      return
    }
    const normalizedPath = templatePath.startsWith('/') ? templatePath : `/${templatePath}`
    const response = await fetch(normalizedPath)
    if (!response.ok) {
      throw new Error('Could not load template HTML file.')
    }
    const code = await response.text()
    setTemplateCode(code)
  }

  async function copyTemplateCode() {
    if (!templateCode) return
    await call(async () => {
      await navigator.clipboard.writeText(templateCode)
      setCopiedTemplate(true)
      setTimeout(() => setCopiedTemplate(false), 2000)
    }, '')
  }

  async function copyApiKey(value, label) {
    if (!value) return
    await call(async () => {
      await navigator.clipboard.writeText(value)
    }, `${label} copied.`)
  }

  async function loadEnquiries(projectId = selectedProjectId) {
    if (!projectId) return
    const { response, data } = await authedRequest((token) => apiClient.listEnquiries(token, projectId, {
      category: enquiryFilters.category,
      search: enquiryFilters.search.trim(),
    }))
    if (!response.ok) throw new Error(parseError(data))
    setEnquiries(asList(data))
  }

  async function loadAnalytics(projectId = selectedProjectId) {
    if (!projectId) return
    const { response, data } = await authedRequest((token) => apiClient.getAnalytics(token, projectId))
    if (!response.ok) throw new Error(parseError(data))
    setAnalyticsData(data || {})
  }

  async function loadSupportMessages() {
    const { response, data } = await authedRequest((token) => apiClient.listSupportMessages(token))
    if (!response.ok) throw new Error(parseError(data))
    setSupportMessages(asList(data))
  }

  async function loadNotifications() {
    const { response, data } = await authedRequest((token) => apiClient.listNotifications(token))
    if (!response.ok) throw new Error(parseError(data))
    setNotifications(asList(data))
  }

  async function loadCrmCollections(projectId = selectedProjectId) {
    if (!projectId) return
    const { response, data } = await authedRequest((token) => apiClient.listCollections(token, projectId))
    if (!response.ok) {
      const message = parseError(data)
      if (response.status === 403 && message.toLowerCase().includes('crm is currently disabled')) {
        setCrmDisabled(true)
        setCrmCollections([])
        setCrmSelectedCollectionId('')
        setCrmEntries([])
        return
      }
      throw new Error(message)
    }
    setCrmDisabled(false)
    const list = asList(data)
    setCrmCollections(list)
    const hasSelected = list.some((c) => String(c.id) === String(crmSelectedCollectionId))
    const nextId = hasSelected ? String(crmSelectedCollectionId) : (list[0] ? String(list[0].id) : '')
    setCrmSelectedCollectionId(nextId)
    const selected = list.find((c) => String(c.id) === String(nextId))
    setCrmRenameName(selected?.name || '')
    if (!nextId) setCrmEntries([])
  }

  async function loadCrmEntries(projectId = selectedProjectId, collectionId = crmSelectedCollectionId) {
    if (!projectId || !collectionId) return
    const { response, data } = await authedRequest((token) =>
      apiClient.listEntries(token, projectId, collectionId, { limit: 50 })
    )
    if (!response.ok) {
      const message = parseError(data)
      if (response.status === 403 && message.toLowerCase().includes('crm is currently disabled')) {
        setCrmDisabled(true)
        setCrmEntries([])
        return
      }
      throw new Error(message)
    }
    setCrmDisabled(false)
    setCrmEntries(asList(data))
  }

  function parseCrmJsonInput() {
    try {
      const parsed = JSON.parse(crmEntryJson)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Entry data must be a JSON object.')
      }
      return parsed
    } catch {
      throw new Error('Invalid JSON format for entry data.')
    }
  }

  async function createCrmCollection(event) {
    event.preventDefault()
    if (!selectedProjectId) return
    const name = crmCollectionName.trim()
    if (!name) {
      notify('', 'Collection name is required.')
      return
    }
    await call(async () => {
      const { response, data } = await authedRequest((token) =>
        apiClient.createCollection(token, selectedProjectId, { name })
      )
      if (!response.ok) throw new Error(parseError(data))
      setCrmCollectionName('')
      await loadCrmCollections(selectedProjectId)
      if (data?.id) {
        setCrmSelectedCollectionId(String(data.id))
      }
    }, 'Collection created.')
  }

  async function renameCrmCollection() {
    if (!selectedProjectId || !crmSelectedCollectionId) return
    const name = crmRenameName.trim()
    if (!name) {
      notify('', 'Collection name is required.')
      return
    }
    await call(async () => {
      const { response, data } = await authedRequest((token) =>
        apiClient.updateCollection(token, selectedProjectId, crmSelectedCollectionId, { name })
      )
      if (!response.ok) throw new Error(parseError(data))
      setCrmRenameName(data?.name || name)
      await loadCrmCollections(selectedProjectId)
    }, 'Collection renamed.')
  }

  async function deleteCrmCollection() {
    if (!selectedProjectId || !crmSelectedCollectionId) return
    await call(async () => {
      const { response, data } = await authedRequest((token) =>
        apiClient.deleteCollection(token, selectedProjectId, crmSelectedCollectionId)
      )
      if (!response.ok) throw new Error(parseError(data))
      await loadCrmCollections(selectedProjectId)
    }, 'Collection deleted.')
  }

  async function saveCrmEntry(event) {
    event.preventDefault()
    if (!selectedProjectId || !crmSelectedCollectionId) {
      notify('', 'Select a collection first.')
      return
    }
    const data = parseCrmJsonInput()

    await call(async () => {
      if (crmEditEntryId) {
        const updated = await authedRequest((token) =>
          apiClient.updateEntry(token, selectedProjectId, crmSelectedCollectionId, crmEditEntryId, { data })
        )
        if (!updated.response.ok) throw new Error(parseError(updated.data))
      } else {
        const created = await authedRequest((token) =>
          apiClient.createEntry(token, selectedProjectId, crmSelectedCollectionId, { data })
        )
        if (!created.response.ok) throw new Error(parseError(created.data))
      }
      setCrmEntryJson('{\n  "name": "Lead Name",\n  "email": "lead@example.com"\n}')
      setCrmEditEntryId('')
      await loadCrmEntries(selectedProjectId, crmSelectedCollectionId)
    }, crmEditEntryId ? 'CRM entry updated.' : 'CRM entry created.')
  }

  async function deleteCrmEntry(entryId) {
    if (!selectedProjectId || !crmSelectedCollectionId || !entryId) return
    await call(async () => {
      const { response, data } = await authedRequest((token) =>
        apiClient.deleteEntry(token, selectedProjectId, crmSelectedCollectionId, entryId)
      )
      if (!response.ok) throw new Error(parseError(data))
      if (String(crmEditEntryId) === String(entryId)) {
        setCrmEditEntryId('')
        setCrmEntryJson('{\n  "name": "Lead Name",\n  "email": "lead@example.com"\n}')
      }
      await loadCrmEntries(selectedProjectId, crmSelectedCollectionId)
    }, 'CRM entry deleted.')
  }

  function startEditCrmEntry(entry) {
    if (!entry) return
    setCrmEditEntryId(String(entry.id))
    setCrmEntryJson(JSON.stringify(entry.data || {}, null, 2))
  }

  async function submitSupportMessage(event) {
    event.preventDefault()
    const subject = supportForm.subject.trim()
    const message = supportForm.message.trim()
    if (!subject || !message) {
      notify('', 'Subject and message are required.')
      return
    }
    await call(async () => {
      const { response, data } = await authedRequest((token) =>
        apiClient.createSupportMessage(token, { subject, message })
      )
      if (!response.ok) throw new Error(parseError(data))
      setSupportForm({ subject: '', message: '' })
      await loadSupportMessages()
    }, 'Report sent to admin.')
  }

  async function rewriteHtmlWithAi(event) {
    event.preventDefault()
    if (!selectedProjectId) {
      notify('', 'Select a project first.')
      return
    }
    if (!rewriteInput.trim()) {
      notify('', 'Enter HTML input to rewrite.')
      return
    }

    await call(async () => {
      const { response, data } = await authedRequest((token) => apiClient.rewriteHtml(token, {
        projectId: selectedProjectId,
        htmlInput: rewriteInput,
      }))
      if (!response.ok) throw new Error(parseError(data))
      setRewriteOutput(data?.rewritten_html || '')
      if (typeof data?.tries_left === 'number') {
        setRewriteTriesLeft(data.tries_left)
      }
    }, 'HTML rewritten successfully.')
  }

  async function copyRewrittenHtml() {
    if (!rewriteOutput) return
    await call(async () => {
      await navigator.clipboard.writeText(rewriteOutput)
    }, 'Rewritten HTML copied.')
  }

  async function buySubscription(plan) {
    if (!selectedProjectId || !plan?.id) return

    await call(async () => {
      setBillingActionPlanId(String(plan.id))
      setLastPaymentResult(null)

      const clientRequestId = `${selectedProjectId}-${plan.id}-${Date.now()}`
      const orderRes = await authedRequest((token) => apiClient.createBillingOrder(token, selectedProjectId, {
        planId: plan.id,
        clientRequestId,
      }))
      if (!orderRes.response.ok) throw new Error(parseError(orderRes.data))

      await ensureRazorpayLoaded()
      if (!window.Razorpay) throw new Error('Razorpay checkout is unavailable.')

      const paymentResponse = await new Promise((resolve, reject) => {
        const razorpay = new window.Razorpay({
          key: orderRes.data.razorpay_key_id,
          amount: Number(orderRes.data.amount_inr || plan.price_inr) * 100,
          currency: orderRes.data.currency || 'INR',
          name: selectedProject?.name || 'FormDocks',
          description: `${plan.name} subscription`,
          order_id: orderRes.data.order_id,
          prefill: {
            email: me?.email || '',
            name: me?.username || '',
          },
          handler: (response) => resolve(response),
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled.')),
          },
          theme: {
            color: '#2b57d4',
          },
        })
        razorpay.open()
      })

      const verifyRes = await authedRequest((token) => apiClient.verifyBillingPayment(token, selectedProjectId, {
        paymentId: orderRes.data.payment_id,
        razorpayOrderId: paymentResponse.razorpay_order_id,
        razorpayPaymentId: paymentResponse.razorpay_payment_id,
        razorpaySignature: paymentResponse.razorpay_signature,
      }))
      if (!verifyRes.response.ok) throw new Error(parseError(verifyRes.data))

      setLastPaymentResult(verifyRes.data)
      await loadBilling(selectedProjectId)
    }, `Subscription activated for ${plan.name}.`)

    setBillingActionPlanId('')
  }

  function renderAuth() {
    const isSignup = screen === 'signup'
    return (
      <div className="auth-shell">
        <div className="auth-bg">
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <ColorBends
              rotation={90}
              speed={0.2}
              colors={["#00066b"]}
              transparent
              autoRotate={0}
              scale={1.4}
              frequency={1}
              warpStrength={1}
              mouseInfluence={1}
              parallax={0.6}
              noise={0}
              iterations={1}
              intensity={1.5}
              bandWidth={6}
            />
          </div>
        </div>

        <div className="auth-brand-header">
          <img src="/brand-logo.png" alt="FormDocks Logo" />
          <ShinyText
            text="FormDocks"
            speed={2}
            delay={0}
            color="#b5b5b5"
            shineColor="#ffffff"
            spread={120}
            direction="left"
            yoyo={false}
            pauseOnHover={false}
            disabled={false}
          />
        </div>

        <div className="auth-header-link">
          <span>{isSignup ? 'Already have an account?' : "Don't have an account?"}</span>
          <button type="button" onClick={() => setScreen(isSignup ? 'login' : 'signup')} disabled={busy}>
            {isSignup ? 'Login' : 'Signup'}
          </button>
        </div>

        <div className="auth-card">
          <h1 className="brand-title">{isSignup ? "Let’s Begin!" : "Welcome Back!"}</h1>

          <form onSubmit={isSignup ? handleSignup : handleLogin} className="form-grid">
            <label>
              Username
              <input
                value={isSignup ? signupForm.username : loginForm.username}
                onChange={(event) => {
                  const value = event.target.value
                  if (isSignup) setSignupForm((prev) => ({ ...prev, username: value }))
                  else setLoginForm((prev) => ({ ...prev, username: value }))
                }}
                required
              />
            </label>

            {isSignup && (
              <label>
                Email
                <input
                  type="email"
                  value={signupForm.email}
                  onChange={(event) => setSignupForm((prev) => ({ ...prev, email: event.target.value }))}
                  required
                />
              </label>
            )}

            <label>
              Password
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  value={isSignup ? signupForm.password : loginForm.password}
                  onChange={(event) => {
                    const value = event.target.value
                    if (isSignup) setSignupForm((prev) => ({ ...prev, password: value }))
                    else setLoginForm((prev) => ({ ...prev, password: value }))
                  }}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="eye-icon">
                      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="eye-icon">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20" />
                    </svg>
                  )}
                </button>
              </div>
            </label>

            {!isSignup && (
              <div className="auth-switch auth-switch-subtle">
                Forgot your password?
                <button type="button" onClick={() => setScreen('forgot-password')} disabled={busy}>
                  Reset Password
                </button>
              </div>
            )}

            {isSignup && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  required
                />
                <span>
                  I agree to the{' '}
                  <button type="button" className="inline-link-btn" onClick={() => setScreen('terms')} disabled={busy}>
                    Terms & Conditions
                  </button>{' '}
                  and{' '}
                  <button type="button" className="inline-link-btn" onClick={() => setScreen('privacy')} disabled={busy}>
                    Privacy Policy
                  </button>.
                </span>
              </label>
            )}

            <button type="submit" disabled={busy}>
              {busy ? 'Please wait...' : isSignup ? 'Create Account' : 'Login'}
            </button>
          </form>

          {status && <p className="status">{status}</p>}
          {error && <p className="error">{error}</p>}
        </div>
        <div className="auth-footer">
          <span>© Forzasoft Solutions</span>
        </div>
      </div>
    )
  }

  function renderForgotPassword() {
    return (
      <div className="auth-shell">
        <div className="auth-bg">
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <ColorBends
              rotation={90}
              speed={0.2}
              colors={["#00066b"]}
              transparent
              autoRotate={0}
              scale={1.4}
              frequency={1}
              warpStrength={1}
              mouseInfluence={1}
              parallax={0.6}
              noise={0}
              iterations={1}
              intensity={1.5}
              bandWidth={6}
            />
          </div>
        </div>
        <div className="auth-brand-header">
          <img src="/brand-logo.png" alt="FormDocks Logo" />
          <span>FormDocks</span>
        </div>
        <div className="auth-card auth-card-wide">
          <h1 className="brand-title">Reset Password</h1>
          <p>Request OTP and reset your password securely.</p>

          <div className="auth-section">
            <h4>Step 1: Request OTP</h4>
            <form onSubmit={handleForgotPasswordRequest} className="form-grid">
              <label>
                Email
                <input
                  type="email"
                  value={forgotForm.email}
                  onChange={(event) => setForgotForm((prev) => ({ ...prev, email: event.target.value }))}
                  required
                />
              </label>
              <div className="button-row">
                <button type="submit" disabled={busy}>Send OTP</button>
              </div>
            </form>
          </div>

          <div className="auth-section">
            <h4>Step 2: Verify OTP and Set New Password</h4>
            <form onSubmit={handleForgotPasswordReset} className="form-grid">
              <label>
                8-digit OTP
                <input
                  inputMode="numeric"
                  pattern="[0-9]{8}"
                  maxLength={8}
                  value={forgotForm.otp}
                  onChange={(event) => setForgotForm((prev) => ({ ...prev, otp: event.target.value.replace(/\D/g, '').slice(0, 8) }))}
                  placeholder="12345678"
                  required
                />
              </label>
              <div className="grid-two">
                <label>
                  New Password
                  <input
                    type="password"
                    value={forgotForm.newPassword}
                    onChange={(event) => setForgotForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  Confirm New Password
                  <input
                    type="password"
                    value={forgotForm.confirmPassword}
                    onChange={(event) => setForgotForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                    required
                  />
                </label>
              </div>
              <div className="button-row">
                <button type="submit" disabled={busy}>Reset Password</button>
              </div>
            </form>
          </div>

          <div className="auth-switch">
            Back to login?
            <button type="button" onClick={() => setScreen('login')} disabled={busy}>
              Go to Login
            </button>
          </div>

          {status && <p className="status">{status}</p>}
          {error && <p className="error">{error}</p>}
        </div>
        <div className="auth-footer">
          <span>© Forzasoft Solutions</span>
        </div>
      </div>
    )
  }

  function renderVerifyEmail() {
    return (
      <div className="auth-shell">
        <div className="auth-bg">
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <ColorBends
              rotation={90}
              speed={0.2}
              colors={["#00066b"]}
              transparent
              autoRotate={0}
              scale={1.4}
              frequency={1}
              warpStrength={1}
              mouseInfluence={1}
              parallax={0.6}
              noise={0}
              iterations={1}
              intensity={1.5}
              bandWidth={6}
            />
          </div>
        </div>
        <div className="auth-brand-header">
          <img src="/brand-logo.png" alt="FormDocks Logo" />
          <span>FormDocks</span>
        </div>
        <div className="auth-card">
          <h1 className="brand-title">Verify Email</h1>
          <p>Enter the 8-digit OTP sent to <strong>{me?.email || 'your email'}</strong>.</p>

          <form onSubmit={handleVerifyEmail} className="form-grid">
            <label>
              8-digit OTP
              <input
                inputMode="numeric"
                pattern="[0-9]{8}"
                maxLength={8}
                value={emailOtp}
                onChange={(event) => setEmailOtp(event.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="12345678"
                required
              />
            </label>
            <button type="submit" disabled={busy || emailOtp.length !== 8}>
              {busy ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>

          <div className="auth-switch">
            Need to use a different account?
            <button type="button" onClick={handleLogout} disabled={busy}>
              Logout
            </button>
          </div>

          {status && <p className="status">{status}</p>}
          {error && <p className="error">{error}</p>}
        </div>
        <div className="auth-footer">
          <span>© Forzasoft Solutions</span>
        </div>
      </div>
    )
  }

  function renderPrivacyPolicy() {
    return (
      <div className="auth-shell">
        <div className="auth-bg">
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <ColorBends
              rotation={90}
              speed={0.2}
              colors={["#00066b"]}
              transparent
              autoRotate={0}
              scale={1.4}
              frequency={1}
              warpStrength={1}
              mouseInfluence={1}
              parallax={0.6}
              noise={0}
              iterations={1}
              intensity={1.5}
              bandWidth={6}
            />
          </div>
        </div>
        <div className="auth-brand-header">
          <img src="/brand-logo.png" alt="FormDocks Logo" />
          <span>FormDocks</span>
        </div>
        <div className="auth-card auth-card-wide">
          <h1 className="brand-title">Privacy Policy</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>Effective Date: 05 April 2026 | Last Updated: 05 April 2026</p>
          
          <div className="legal-scroll" style={{ maxHeight: '320px', overflowY: 'auto', textAlign: 'left', margin: '20px 0', paddingRight: '10px', fontSize: '0.88rem', lineHeight: '1.6', color: '#ece8ff' }}>
            <p>Welcome to FormDock ("FormDock", "we", "our", or "us"). FormDock is a Software-as-a-Service (SaaS) platform that enables businesses and developers to collect, process, manage, and automate form submissions without building their own backend infrastructure.</p>
            <p>Your privacy is important to us. This Privacy Policy explains what information we collect, how we use it, how we protect it, and the rights you have regarding your personal data.</p>
            <p>By using FormDock, you agree to the practices described in this Privacy Policy.</p>

            <h3 style={{ fontSize: '1.1rem', margin: '18px 0 6px', color: '#ffffff' }}>1. Information We Collect</h3>
            
            <h4 style={{ fontSize: '0.95rem', margin: '10px 0 4px', color: '#dad6ff' }}>1.1 Account Information</h4>
            <p style={{ margin: '0 0 6px' }}>When you create an account, we may collect:</p>
            <ul style={{ margin: '0 0 12px 20px', padding: 0 }}>
              <li>Name (if provided)</li>
              <li>Email address</li>
              <li>Password (stored only as a secure hash)</li>
              <li>Authentication credentials</li>
              <li>Account preferences</li>
            </ul>

            <h4 style={{ fontSize: '0.95rem', margin: '10px 0 4px', color: '#dad6ff' }}>1.2 Form Submission Data</h4>
            <p style={{ margin: '0 0 6px' }}>When your forms receive submissions, we process and securely store information submitted through those forms.</p>
            <p style={{ margin: '0 0 6px' }}>This may include:</p>
            <ul style={{ margin: '0 0 6px 20px', padding: 0 }}>
              <li>Names</li>
              <li>Email addresses</li>
              <li>Phone numbers</li>
              <li>Uploaded files</li>
              <li>Custom form fields</li>
              <li>Any other information configured by you within your forms</li>
            </ul>
            <p style={{ margin: '0 0 12px' }}>The exact information depends entirely on the fields you create.</p>

            <h4 style={{ fontSize: '0.95rem', margin: '10px 0 4px', color: '#dad6ff' }}>1.3 Submission Metadata</h4>
            <p style={{ margin: '0 0 6px' }}>To help provide security, analytics, and spam protection, we may collect:</p>
            <ul style={{ margin: '0 0 12px 20px', padding: 0 }}>
              <li>IP address</li>
              <li>Browser user agent</li>
              <li>Referrer URL</li>
              <li>Page URL</li>
              <li>Timestamp</li>
              <li>Device information</li>
              <li>Request headers</li>
              <li>Country or approximate region (derived from IP where applicable)</li>
            </ul>

            <h4 style={{ fontSize: '0.95rem', margin: '10px 0 4px', color: '#dad6ff' }}>1.4 Usage Information</h4>
            <p style={{ margin: '0 0 6px' }}>We may automatically collect information regarding how you use FormDock, including:</p>
            <ul style={{ margin: '0 0 12px 20px', padding: 0 }}>
              <li>API usage</li>
              <li>Feature usage</li>
              <li>Login history</li>
              <li>Error logs</li>
              <li>Performance metrics</li>
              <li>Diagnostic information</li>
              <li>Security logs</li>
              <li>Rate limiting information</li>
            </ul>

            <h3 style={{ fontSize: '1.1rem', margin: '18px 0 6px', color: '#ffffff' }}>2. How We Use Your Information</h3>
            <p style={{ margin: '0 0 6px' }}>We use collected information to:</p>
            <ul style={{ margin: '0 0 8px 20px', padding: 0 }}>
              <li>Provide and operate FormDock.</li>
              <li>Process and deliver form submissions.</li>
              <li>Send notifications for new submissions.</li>
              <li>Authenticate users.</li>
              <li>Maintain platform security.</li>
              <li>Prevent fraud, spam, abuse, and unauthorized access.</li>
              <li>Improve product performance and reliability.</li>
              <li>Respond to support requests.</li>
              <li>Comply with legal obligations.</li>
              <li>Generate aggregated, anonymous usage statistics.</li>
            </ul>
            <p style={{ fontWeight: '600', margin: '12px 0 4px', color: '#ffffff' }}>AI Usage</p>
            <p style={{ margin: '0 0 12px' }}>We do not use your data, your users' data, submitted forms, uploaded files, or website content to train artificial intelligence or machine learning models.</p>

            <h3 style={{ fontSize: '1.1rem', margin: '18px 0 6px', color: '#ffffff' }}>3. Legal Basis for Processing</h3>
            <p style={{ margin: '0 0 6px' }}>Where applicable under law, we process personal data based on one or more of the following:</p>
            <ul style={{ margin: '0 0 12px 20px', padding: 0 }}>
              <li>Your consent.</li>
              <li>Performance of a contract.</li>
              <li>Compliance with legal obligations.</li>
              <li>Legitimate interests, including maintaining platform security, preventing abuse, and improving our services.</li>
            </ul>

            <h3 style={{ fontSize: '1.1rem', margin: '18px 0 6px', color: '#ffffff' }}>4. Email Communications</h3>
            <p style={{ margin: '0 0 6px' }}>We may send emails relating to:</p>
            <ul style={{ margin: '0 0 8px 20px', padding: 0 }}>
              <li>Account verification</li>
              <li>Password resets</li>
              <li>Security alerts</li>
              <li>Service notifications</li>
              <li>Product updates</li>
              <li>Maintenance announcements</li>
              <li>Billing notifications (if applicable)</li>
              <li>Promotional communications (which you may opt out of)</li>
            </ul>
            <p style={{ margin: '0 0 12px' }}>You may unsubscribe from non-essential marketing emails at any time.</p>

            <h3 style={{ fontSize: '1.1rem', margin: '18px 0 6px', color: '#ffffff' }}>5. Data Ownership</h3>
            <p style={{ margin: '0 0 6px' }}>Your data belongs to you.</p>
            <p style={{ margin: '0 0 6px' }}>FormDock does not claim ownership of:</p>
            <ul style={{ margin: '0 0 6px 20px', padding: 0 }}>
              <li>Form submissions</li>
              <li>Uploaded files</li>
              <li>Customer data</li>
              <li>Website content</li>
            </ul>
            <p style={{ margin: '6px 0 6px' }}>FormDock acts only as the service provider processing your data.</p>
            <p style={{ margin: '0 0 12px', fontWeight: '600' }}>We do not sell, rent, or trade your personal data.</p>

            <h3 style={{ fontSize: '1.1rem', margin: '18px 0 6px', color: '#ffffff' }}>6. Third-Party Service Providers</h3>
            <p style={{ margin: '0 0 6px' }}>To operate our platform, we use trusted third-party service providers that may process data on our behalf.</p>
            <p style={{ margin: '0 0 6px' }}>These may include:</p>
            <ul style={{ margin: '0 0 8px 20px', padding: 0 }}>
              <li>Brevo – Transactional and notification email delivery</li>
              <li>Cloudflare – DNS, CDN, SSL, and security protection</li>
              <li>Hostinger – Cloud hosting infrastructure</li>
              <li>PostgreSQL – Database storage</li>
              <li>Redis – Queue and caching services</li>
              <li>Google Analytics (if enabled) – Website analytics</li>
              <li>Payment providers (if enabled) – Payment processing</li>
            </ul>
            <p style={{ margin: '0 0 12px' }}>These providers only receive the information necessary to perform their services and are expected to maintain appropriate security measures.</p>

            <h3 style={{ fontSize: '1.1rem', margin: '18px 0 6px', color: '#ffffff' }}>7. Cookies and Similar Technologies</h3>
            <p style={{ margin: '0 0 6px' }}>FormDock may use cookies or similar technologies to:</p>
            <ul style={{ margin: '0 0 8px 20px', padding: 0 }}>
              <li>Maintain login sessions</li>
              <li>Remember user preferences</li>
              <li>Improve website performance</li>
              <li>Analyze website usage</li>
              <li>Protect against abuse</li>
            </ul>
            <p style={{ margin: '0 0 12px' }}>You can disable cookies in your browser settings, although some features may not function correctly.</p>

            <h3 style={{ fontSize: '1.1rem', margin: '18px 0 6px', color: '#ffffff' }}>8. International Data Transfers</h3>
            <p style={{ margin: '0 0 6px' }}>Some of our third-party providers may process information outside your country of residence.</p>
            <p style={{ margin: '0 0 12px' }}>Where applicable, we implement reasonable safeguards to protect personal information during such transfers.</p>

            <h3 style={{ fontSize: '1.1rem', margin: '18px 0 6px', color: '#ffffff' }}>9. Data Security</h3>
            <p style={{ margin: '0 0 6px' }}>We implement commercially reasonable technical and organizational safeguards, including:</p>
            <ul style={{ margin: '0 0 8px 20px', padding: 0 }}>
              <li>HTTPS/TLS encryption</li>
              <li>Secure password hashing</li>
              <li>Access control policies</li>
              <li>Firewall protection</li>
              <li>Rate limiting</li>
              <li>Infrastructure monitoring</li>
              <li>Regular software updates</li>
              <li>Security logging</li>
              <li>Backup procedures where applicable</li>
            </ul>
            <p style={{ margin: '0 0 12px' }}>Although we strive to protect your information, no internet-based service can guarantee absolute security.</p>

            <h3 style={{ fontSize: '1.1rem', margin: '18px 0 6px', color: '#ffffff' }}>10. Data Retention</h3>
            <p style={{ margin: '0 0 6px' }}>We retain personal data only for as long as necessary to:</p>
            <ul style={{ margin: '0 0 8px 20px', padding: 0 }}>
              <li>Provide our services</li>
              <li>Maintain customer accounts</li>
              <li>Resolve disputes</li>
              <li>Meet legal obligations</li>
              <li>Maintain security records</li>
            </ul>
            <p style={{ margin: '0 0 12px' }}>Upon account deletion, certain information may remain in secure backups for a limited period before permanent deletion.</p>

            <h3 style={{ fontSize: '1.1rem', margin: '18px 0 6px', color: '#ffffff' }}>11. Children's Privacy</h3>
            <p style={{ margin: '0 0 6px' }}>FormDock is not intended for children under the age required by applicable law.</p>
            <p style={{ margin: '0 0 6px' }}>We do not knowingly collect personal information from children without the legally required consent of a parent or guardian.</p>
            <p style={{ margin: '0 0 12px' }}>If we become aware of such collection, we will take reasonable steps to delete the information.</p>

            <h3 style={{ fontSize: '1.1rem', margin: '18px 0 6px', color: '#ffffff' }}>12. Data Sharing</h3>
            <p style={{ margin: '0 0 6px', fontWeight: '600' }}>We do not sell personal information.</p>
            <p style={{ margin: '0 0 6px' }}>We may share information only:</p>
            <ul style={{ margin: '0 0 12px 20px', padding: 0 }}>
              <li>With trusted service providers.</li>
              <li>When required by law.</li>
              <li>To comply with lawful government requests.</li>
              <li>To investigate fraud or security incidents.</li>
              <li>During mergers, acquisitions, or business transfers.</li>
            </ul>

            <h3 style={{ fontSize: '1.1rem', margin: '18px 0 6px', color: '#ffffff' }}>13. Your Rights</h3>
            <p style={{ margin: '0 0 6px' }}>Depending on applicable law, including the Digital Personal Data Protection Act, 2023 (India), you may have the right to:</p>
            <ul style={{ margin: '0 0 12px 20px', padding: 0 }}>
              <li>Access your personal data.</li>
              <li>Correct inaccurate information.</li>
              <li>Update your information.</li>
              <li>Request deletion of your data.</li>
              <li>Withdraw previously given consent.</li>
              <li>Request details regarding how your data is processed.</li>
              <li>Lodge complaints with the appropriate regulatory authority.</li>
            </ul>
            <p style={{ margin: '0 0 12px' }}>To exercise your rights, please contact us using the information below.</p>

            <h3 style={{ fontSize: '1.1rem', margin: '18px 0 6px', color: '#ffffff' }}>14. Digital Personal Data Protection Act (India)</h3>
            <p style={{ margin: '0 0 8px' }}>Where applicable, FormDock complies with the Digital Personal Data Protection Act, 2023.</p>
            <p style={{ margin: '0 0 8px' }}>For customer account information, FormDock acts as a Data Fiduciary.</p>
            <p style={{ margin: '0 0 12px' }}>For form submissions collected through customer-created forms, FormDock generally acts as a Data Processor on behalf of the customer, while the customer remains responsible for ensuring they have the necessary legal basis to collect personal data from their end users.</p>

            <h3 style={{ fontSize: '1.1rem', margin: '18px 0 6px', color: '#ffffff' }}>15. Beta Services</h3>
            <p style={{ margin: '0 0 6px' }}>Some features may be released as beta or preview features.</p>
            <p style={{ margin: '0 0 6px' }}>During beta periods:</p>
            <ul style={{ margin: '0 0 12px 20px', padding: 0 }}>
              <li>Features may change without notice.</li>
              <li>Temporary service interruptions may occur.</li>
              <li>Unexpected bugs may exist.</li>
              <li>Data loss, while unlikely, may occur.</li>
            </ul>
            <p style={{ margin: '0 0 12px' }}>By using beta features, you acknowledge these risks.</p>

            <h3 style={{ fontSize: '1.1rem', margin: '18px 0 6px', color: '#ffffff' }}>16. Changes to this Privacy Policy</h3>
            <p style={{ margin: '0 0 12px' }}>We may update this Privacy Policy from time to time. Material changes will be reflected by updating the "Last Updated" date. Continued use of FormDock after changes become effective constitutes acceptance of the revised Privacy Policy.</p>

            <h3 style={{ fontSize: '1.1rem', margin: '18px 0 6px', color: '#ffffff' }}>17. Contact Us</h3>
            <p style={{ margin: '0 0 6px' }}>If you have questions regarding this Privacy Policy or our privacy practices, please contact us.</p>
            <p style={{ margin: '0 0 4px' }}><strong>General Support:</strong> support@formdock.in</p>
            <p style={{ margin: '0 0 4px' }}><strong>Privacy & Data Protection:</strong> privacy@formdock.in</p>
            <p style={{ margin: '0 0 12px' }}><strong>Website:</strong> <a href="https://formdock.in" target="_blank" rel="noopener noreferrer" style={{ color: '#9a87ff', textDecoration: 'underline' }}>https://formdock.in</a></p>
          </div>

          <div className="auth-switch">
            <button type="button" onClick={() => setScreen('signup')} disabled={busy}>
              Back to Signup
            </button>
          </div>
        </div>
        <div className="auth-footer">
          <span>© Forzasoft Solutions</span>
        </div>
      </div>
    )
  }

  function renderTermsAndConditions() {
    return (
      <div className="auth-shell">
        <div className="auth-bg">
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <ColorBends
              rotation={90}
              speed={0.2}
              colors={["#00066b"]}
              transparent
              autoRotate={0}
              scale={1.4}
              frequency={1}
              warpStrength={1}
              mouseInfluence={1}
              parallax={0.6}
              noise={0}
              iterations={1}
              intensity={1.5}
              bandWidth={6}
            />
          </div>
        </div>
        <div className="auth-brand-header">
          <img src="/brand-logo.png" alt="FormDocks Logo" />
          <span>FormDocks</span>
        </div>
        <div className="auth-card auth-card-wide">
          <h1 className="brand-title">Terms & Conditions</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>Last Updated: 05/04/2026</p>
          
          <div className="legal-scroll" style={{ maxHeight: '320px', overflowY: 'auto', textAlign: 'left', margin: '20px 0', paddingRight: '10px', fontSize: '0.88rem', lineHeight: '1.6', color: '#ece8ff' }}>
            <p>FormDock is a product owned and operated by ForzaSoft Solutions ("we", "our", "us").</p>
            <p>By using FormDock, you agree to the following Terms and Conditions.</p>

            <h3 style={{ fontSize: '1.1rem', margin: '18px 0 6px', color: '#ffffff' }}>1. Service Description</h3>
            <p style={{ margin: '0 0 12px' }}>FormDock provides a backend-as-a-service (BaaS) platform for collecting, processing, storing, and managing form submissions. The platform may also provide analytics, automation, APIs, webhooks, AI-assisted features, and other related services.</p>

            <h3 style={{ fontSize: '1.1rem', margin: '18px 0 6px', color: '#ffffff' }}>2. Ownership</h3>
            <p style={{ margin: '0 0 6px' }}>FormDock is owned and operated by ForzaSoft Solutions.</p>
            <p style={{ margin: '0 0 6px' }}>All rights, title, and interest in the platform, including but not limited to:</p>
            <ul style={{ margin: '0 0 6px 20px', padding: 0 }}>
              <li>Software</li>
              <li>APIs</li>
              <li>Source code</li>
              <li>Infrastructure</li>
              <li>Branding</li>
              <li>Logos</li>
              <li>Documentation</li>
              <li>Website content</li>
            </ul>
            <p style={{ margin: '6px 0 12px' }}>remain the exclusive property of ForzaSoft Solutions and are protected by applicable intellectual property laws.</p>

            <h3 style={{ fontSize: '1.1rem', margin: '18px 0 6px', color: '#ffffff' }}>3. Account Responsibility</h3>
            <p style={{ margin: '0 0 6px' }}>You are responsible for:</p>
            <ul style={{ margin: '0 0 6px 20px', padding: 0 }}>
              <li>Maintaining the confidentiality of your account credentials.</li>
              <li>Securing your API keys and access tokens.</li>
              <li>All activities conducted under your account.</li>
              <li>Promptly notifying us of any unauthorized access or security breach.</li>
            </ul>
            <p style={{ margin: '6px 0 12px' }}>You are responsible for all actions performed using your account unless otherwise required by law.</p>

            <h3 style={{ fontSize: '1.1rem', margin: '18px 0 6px', color: '#ffffff' }}>4. Acceptable Use</h3>
            <p style={{ margin: '0 0 6px' }}>You agree not to use FormDock for:</p>
            <ul style={{ margin: '0 0 6px 20px', padding: 0 }}>
              <li>Illegal or unlawful activities.</li>
              <li>Sending spam or unsolicited communications.</li>
              <li>Distributing malware, phishing content, or malicious code.</li>
              <li>Collecting personal or sensitive information without appropriate consent.</li>
              <li>Violating applicable laws or regulations.</li>
              <li>Attempting unauthorized access to FormDock systems.</li>
              <li>Reverse engineering or interfering with platform functionality.</li>
              <li>Circumventing security or rate-limiting mechanisms.</li>
            </ul>
            <p style={{ margin: '6px 0 12px' }}>Violation of these terms may result in immediate suspension or termination of your account.</p>

            <h3 style={{ fontSize: '1.1rem', margin: '18px 0 6px', color: '#ffffff' }}>5. API Usage</h3>
            <p style={{ margin: '0 0 6px' }}>When using the FormDock API:</p>
            <ul style={{ margin: '0 0 12px 20px', padding: 0 }}>
              <li>API keys must be kept secure.</li>
              <li>You must not share API credentials publicly.</li>
              <li>Abuse of the API, including excessive requests or attempts to bypass usage limits, may result in temporary or permanent suspension.</li>
              <li>We reserve the right to impose rate limits to maintain service stability.</li>
            </ul>

            <h3 style={{ fontSize: '1.1rem', margin: '18px 0 6px', color: '#ffffff' }}>6. Data Responsibility</h3>
            <p style={{ margin: '0 0 6px' }}>You are solely responsible for:</p>
            <ul style={{ margin: '0 0 6px 20px', padding: 0 }}>
              <li>The information collected through your forms.</li>
              <li>Obtaining any legally required consent from your users.</li>
              <li>Ensuring compliance with applicable privacy and data protection laws.</li>
              <li>The accuracy and legality of submitted content.</li>
            </ul>
            <p style={{ margin: '6px 0 6px' }}>FormDock acts as a service provider processing data on your behalf.</p>

            <h3 style={{ fontSize: '1.1rem', margin: '18px 0 6px', color: '#ffffff' }}>7. AI Features</h3>
            <p style={{ margin: '0 0 6px' }}>Where AI-assisted features are available:</p>
            <ul style={{ margin: '0 0 6px 20px', padding: 0 }}>
              <li>AI-generated outputs are automatically generated.</li>
              <li>AI responses may contain inaccuracies or incomplete information.</li>
              <li>You should independently verify important information before relying on AI-generated content.</li>
            </ul>
            <p style={{ margin: '6px 0 12px' }}>We do not use your data, your users' data, submitted forms, or website content to train AI models.</p>

            <h3 style={{ fontSize: '1.1rem', margin: '18px 0 6px', color: '#ffffff' }}>8. Beta Disclaimer</h3>
            <p style={{ margin: '0 0 6px' }}>Some or all features of FormDock may be released as beta or preview features.</p>
            <p style={{ margin: '0 0 6px' }}>During beta periods:</p>
            <ul style={{ margin: '0 0 6px 20px', padding: 0 }}>
              <li>Features may change without notice.</li>
              <li>Service interruptions may occur.</li>
              <li>Downtime may occur.</li>
              <li>Bugs may exist.</li>
              <li>Data loss is possible.</li>
            </ul>
            <p style={{ margin: '6px 0 6px' }}>We reserve the right to modify, suspend, or discontinue beta features at any time without prior notice.</p>
            <p style={{ margin: '0 0 12px' }}>By using beta services, you acknowledge and accept these risks.</p>

            <h3 style={{ fontSize: '1.1rem', margin: '18px 0 6px', color: '#ffffff' }}>9. Limitation of Liability</h3>
            <p style={{ margin: '0 0 6px' }}>To the fullest extent permitted by applicable law:</p>
            <ul style={{ margin: '0 0 6px 20px', padding: 0 }}>
              <li>FormDock is provided on an "AS IS" and "AS AVAILABLE" basis.</li>
              <li>We make no warranties regarding uninterrupted or error-free operation.</li>
              <li>ForzaSoft Solutions shall not be liable for data loss, service downtime, business interruption, lost profits, loss of goodwill, or indirect, incidental, consequential, or special damages arising from the use of FormDock.</li>
            </ul>
            <p style={{ margin: '6px 0 12px' }}>Nothing in these Terms excludes liability where such exclusion is prohibited by applicable law.</p>

            <h3 style={{ fontSize: '1.1rem', margin: '18px 0 6px', color: '#ffffff' }}>10. Suspension and Termination</h3>
            <p style={{ margin: '0 0 6px' }}>We may suspend or terminate your account if:</p>
            <ul style={{ margin: '0 0 6px 20px', padding: 0 }}>
              <li>You violate these Terms.</li>
              <li>Abuse, fraud, or malicious activity is detected.</li>
              <li>Required by applicable law.</li>
              <li>Continued access presents a security risk to FormDock or other users.</li>
            </ul>
            <p style={{ margin: '6px 0 12px' }}>Upon termination, access to certain services may cease immediately.</p>

            <h3 style={{ fontSize: '1.1rem', margin: '18px 0 6px', color: '#ffffff' }}>11. Payments</h3>
            <p style={{ margin: '0 0 6px' }}>If you subscribe to a paid plan:</p>
            <ul style={{ margin: '0 0 6px 20px', padding: 0 }}>
              <li>Fees will be charged as described at the time of purchase.</li>
              <li>Subscription fees are payable in advance unless otherwise stated.</li>
              <li>Failure to pay applicable fees may result in suspension of paid features.</li>
              <li>Unless otherwise expressly stated, payments are non-refundable.</li>
            </ul>
            <p style={{ margin: '6px 0 12px' }}>We do not guarantee uninterrupted availability of the service.</p>

            <h3 style={{ fontSize: '1.1rem', margin: '18px 0 6px', color: '#ffffff' }}>12. Intellectual Property</h3>
            <p style={{ margin: '0 0 6px' }}>All intellectual property relating to FormDock, including software, APIs, documentation, trademarks, branding, website design, graphics, and related materials, belongs exclusively to ForzaSoft Solutions.</p>
            <p style={{ margin: '0 0 6px' }}>You may not copy, modify, redistribute, resell, reverse engineer, or create derivative works without prior written permission.</p>

            <h3 style={{ fontSize: '1.1rem', margin: '18px 0 6px', color: '#ffffff' }}>13. Changes to These Terms</h3>
            <p style={{ margin: '0 0 12px' }}>We may update these Terms and Conditions from time to time. Material changes will be reflected by updating the Last Updated date. Your continued use of FormDock after such changes constitutes acceptance of the revised Terms.</p>

            <h3 style={{ fontSize: '1.1rem', margin: '18px 0 6px', color: '#ffffff' }}>14. Governing Law</h3>
            <p style={{ margin: '0 0 12px' }}>These Terms and Conditions shall be governed by and construed in accordance with the laws of India. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the competent courts in India.</p>

            <h3 style={{ fontSize: '1.1rem', margin: '18px 0 6px', color: '#ffffff' }}>15. Contact</h3>
            <p style={{ margin: '0 0 6px' }}>For support, legal inquiries, or questions regarding these Terms, contact:</p>
            <p style={{ margin: '0 0 4px' }}><strong>General Support:</strong> support@formdock.in</p>
            <p style={{ margin: '0 0 4px' }}><strong>Legal & Compliance:</strong> legal@formdock.in</p>
            <p style={{ margin: '0 0 12px' }}><strong>Website:</strong> <a href="https://formdock.in" target="_blank" rel="noopener noreferrer" style={{ color: '#9a87ff', textDecoration: 'underline' }}>https://formdock.in</a></p>
          </div>

          <div className="auth-switch">
            <button type="button" onClick={() => setScreen('signup')} disabled={busy}>
              Back to Signup
            </button>
          </div>
        </div>
        <div className="auth-footer">
          <span>© Forzasoft Solutions</span>
        </div>
      </div>
    )
  }

  function renderDashboard() {
    function renderProjectsPage() {
      return (
        <section className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>Your Projects</h3>
            <button type="button" className="btn-secondary btn-small" onClick={() => setDashboardPage('create-project')}>
              + Create Project
            </button>
          </div>

          {projects.length === 0 ? (
            <p className="muted">No projects found. Click "+ Create Project" to create your first project.</p>
          ) : (
            <div className="projects-list-rows">
              {projects.map((project) => {
                const isActive = String(project.id) === String(selectedProjectId);
                const domainList = Array.isArray(project.allowed_domains) && project.allowed_domains.length > 0 
                  ? project.allowed_domains.join(', ') 
                  : (project.domain || 'All domains allowed');

                return (
                  <div key={project.id} className={`project-item-row ${isActive ? 'active-project-row' : ''}`}>
                    <div className="project-row-left">
                      <div className="project-row-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                        </svg>
                      </div>
                      <div className="project-row-info">
                        <div className="project-row-title">
                          <strong>{project.name}</strong>
                          {isActive && <span className="active-badge">Active</span>}
                        </div>
                        <span className="project-row-domain">
                          Domains: {domainList}
                        </span>
                      </div>
                    </div>

                    <div className="project-row-right">
                      {!isActive ? (
                        <button 
                          type="button" 
                          className="btn-secondary btn-small"
                          onClick={() => setSelectedProjectId(project.id)}
                        >
                          Select Project
                        </button>
                      ) : (
                        <span className="selected-tag">Selected</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )
    }

    function renderCreateProjectPage() {
      return (
        <section className="card">
          <h3>Create Project</h3>
          <form onSubmit={handleCreateProject} className="form-grid compact">
            <label>
              Project Name
              <input
                value={newProject.name}
                onChange={(event) => {
                  setNewProject((prev) => ({ ...prev, name: event.target.value }))
                  setProjectCreatedSuccess(false)
                }}
                placeholder="Eg : My SaaS Website"
                required
              />
            </label>
            <label>
              Allowed Domain
              <div className="inline-input">
                <input
                  value={newProject.domainInput}
                  onChange={(event) => {
                    setNewProject((prev) => ({ ...prev, domainInput: event.target.value }))
                    setProjectCreatedSuccess(false)
                  }}
                  placeholder="example.com"
                />
                <button type="button" onClick={addDomain} className="btn-add">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="add-icon">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add
                </button>
              </div>
            </label>
            <div className="chip-row">
              {newProject.allowed_domains.map((domain) => (
                <button key={domain} type="button" className="chip" onClick={() => removeDomain(domain)}>
                  {domain} x
                </button>
              ))}
            </div>
            <button type="submit" disabled={busy} className="btn-primary-full">Create Project</button>
            {projectCreatedSuccess && (
              <p className="status" style={{ marginTop: '12px' }}>
                Project created successfully.
              </p>
            )}
          </form>
        </section>
      )
    }

    function renderApiKeysPage() {
      return (
        <section className="card">
          <h3>API Keys</h3>
          {!selectedProjectId && <p className="muted">Select a project first.</p>}
          <div className="api-key-list">
            <div className="api-key-row">
              <p className="muted">Form API Key: <code>{maskKey(selectedProject?.public_api_key)}</code></p>
              <div className="api-key-actions-inline">
                <button
                  type="button"
                  className="btn-small"
                  onClick={() => copyApiKey(selectedProject?.public_api_key, 'Form API key')}
                  disabled={busy || !selectedProject?.public_api_key}
                >
                  <svg className="icon-copy" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  Copy
                </button>
                <button
                  type="button"
                  className="btn-small"
                  onClick={() => rotateKey('form')}
                  disabled={busy || !selectedProjectId}
                >
                  <svg className="icon-rotate" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                  </svg>
                  Rotate
                </button>
              </div>
            </div>

            <div className="api-key-row">
              <p className="muted">FAQ API Key: <code>{maskKey(selectedProject?.faq_public_api_key)}</code></p>
              <div className="api-key-actions-inline">
                <button
                  type="button"
                  className="btn-small"
                  onClick={() => copyApiKey(selectedProject?.faq_public_api_key, 'FAQ API key')}
                  disabled={busy || !selectedProject?.faq_public_api_key}
                >
                  <svg className="icon-copy" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  Copy
                </button>
                <button
                  type="button"
                  className="btn-small"
                  onClick={() => rotateKey('faq')}
                  disabled={busy || !selectedProjectId}
                >
                  <svg className="icon-rotate" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                  </svg>
                  Rotate
                </button>
              </div>
            </div>
          </div>
        </section>
      )
    }

    function renderFaqPage() {
      return (
        <section className="card">
          <h3>FAQ Bot Configuration</h3>
          {!selectedProjectId && <p className="muted">Select a project first.</p>}
          <form onSubmit={saveFaqConfig} className="form-grid">
            <label>
              Site Name
              <input value={faqConfig.site_name} onChange={(event) => setFaqConfig((prev) => ({ ...prev, site_name: event.target.value }))} />
            </label>
            <label>
              Business Summary
              <textarea rows={3} value={faqConfig.business_summary} onChange={(event) => setFaqConfig((prev) => ({ ...prev, business_summary: event.target.value }))} />
            </label>
            <label>
              Key Points
              <textarea rows={3} value={faqConfig.key_points} onChange={(event) => setFaqConfig((prev) => ({ ...prev, key_points: event.target.value }))} />
            </label>
            <label>
              FAQs Text
              <textarea rows={4} value={faqConfig.faqs_text} onChange={(event) => setFaqConfig((prev) => ({ ...prev, faqs_text: event.target.value }))} />
            </label>
            <label>
              Extra Context
              <textarea rows={3} value={faqConfig.extra_context} onChange={(event) => setFaqConfig((prev) => ({ ...prev, extra_context: event.target.value }))} />
            </label>
            <div className="grid-two">
              <label>
                Support Email
                <input type="email" value={faqConfig.support_email} onChange={(event) => setFaqConfig((prev) => ({ ...prev, support_email: event.target.value }))} />
              </label>
              <label>
                Support Phone
                <input value={faqConfig.support_phone} onChange={(event) => setFaqConfig((prev) => ({ ...prev, support_phone: event.target.value }))} />
              </label>
            </div>
            <div className="grid-two">
              <label>
                Business Hours
                <input value={faqConfig.business_hours} onChange={(event) => setFaqConfig((prev) => ({ ...prev, business_hours: event.target.value }))} />
              </label>
              <label>
                Tone
                <input value={faqConfig.tone} onChange={(event) => setFaqConfig((prev) => ({ ...prev, tone: event.target.value }))} />
              </label>
            </div>
            <button type="submit" disabled={busy || !selectedProjectId}>Save FAQ Configuration</button>
          </form>
        </section>
      )
    }

    function renderSubscriptionPage() {
      return (
        <section className="card">
          <h3>Subscription</h3>
          {!selectedProjectId && <p className="muted">Select a project to view plans.</p>}
          {billing && (
            <>
              <p className="muted">Current Plan: {billing.subscription?.plan_name || 'Free'}</p>
              <div className="plan-grid">
                {asList(billing.plans).map((plan) => (
                  <article key={plan.id} className={billing.subscription?.plan_id === plan.id ? 'plan active' : 'plan'}>
                    <h4>{plan.name}</h4>
                    <p className="price">INR {plan.price_inr}</p>
                    <p>Duration: {plan.period_days} days</p>
                    <p>Form Feature: {plan.form_feature_enabled ? 'Yes' : 'No'}</p>
                    <p>FAQ Feature: {plan.faq_feature_enabled ? 'Yes' : 'No'}</p>
                    <p>Monthly Form Quota: {plan.monthly_quota ?? 'Unlimited'}</p>
                    <p>Monthly FAQ Quota: {plan.monthly_chat_quota ?? 'Unlimited'}</p>
                    <button
                      type="button"
                      onClick={() => buySubscription(plan)}
                      disabled={
                        busy ||
                        !billing.paywall_enabled ||
                        !selectedProjectId ||
                        !plan.is_active ||
                        String(billing.subscription?.plan_id || '') === String(plan.id)
                      }
                    >
                      {billingActionPlanId === String(plan.id) && busy ? 'Processing...' : String(billing.subscription?.plan_id || '') === String(plan.id) ? 'Current Plan' : `Buy ${plan.name}`}
                    </button>
                  </article>
                ))}
              </div>
              {lastPaymentResult && (
                <div className="payment-result">
                  <p><strong>Payment Status:</strong> Success</p>
                  <p><strong>Subscription:</strong> {lastPaymentResult.subscription?.plan_name || 'Updated'}</p>
                </div>
              )}
            </>
          )}
        </section>
      )
    }

    function renderTemplatesPage() {
      return (
        <section className="card">
          <h3>Template Viewer</h3>
          <p className="muted">Select a template, view source code, preview it, and copy the HTML.</p>
          <div className="template-actions">
            <label>
              Template
              <select value={selectedTemplatePath} onChange={(event) => setSelectedTemplatePath(event.target.value)}>
                <option value="">Choose a template</option>
                {templates.map((template) => (
                  <option key={template.id || template.path} value={template.path}>
                    {template.name || template.path}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={copyTemplateCode} disabled={busy || !templateCode}>
              {copiedTemplate ? 'Copied' : 'Copy Code'}
            </button>
          </div>
          <div className="template-split">
            <div>
              <h4>Code</h4>
              <textarea className="template-code" readOnly value={templateCode} />
            </div>
            <div>
              <h4>Preview</h4>
              <iframe
                className="template-preview"
                title="Template Preview"
                srcDoc={templateCode}
                sandbox="allow-same-origin allow-scripts"
              />
            </div>
          </div>
        </section>
      )
    }

    function renderAiRewritePage() {
      return (
        <section className="card">
          <h3>AI HTML Edit</h3>
          <p className="muted">Users get 2 free AI rewrites (enforced by backend). After each rewrite, remaining tries are shown.</p>
          {!selectedProjectId && <p className="muted">Select a project first.</p>}
          <form onSubmit={rewriteHtmlWithAi} className="form-grid">
            <label>
              HTML Input
              <textarea
                rows={12}
                value={rewriteInput}
                onChange={(event) => setRewriteInput(event.target.value)}
                placeholder="<form>...</form>"
              />
            </label>
            <div className="button-row">
              <button type="submit" disabled={busy || !selectedProjectId}>Rewrite with AI</button>
              <button
                type="button"
                onClick={() => setRewriteInput(templateCode)}
                disabled={busy || !templateCode}
              >
                Use Selected Template HTML
              </button>
            </div>
          </form>
          <p className="muted">
            Tries Left: {rewriteTriesLeft === null ? 'Run rewrite to fetch remaining tries' : rewriteTriesLeft}
          </p>
          <label>
            Rewritten HTML
            <textarea rows={12} readOnly value={rewriteOutput} />
          </label>
          <button type="button" onClick={copyRewrittenHtml} disabled={busy || !rewriteOutput}>Copy Rewritten HTML</button>
        </section>
      )
    }

    function renderSubmissionsPage() {
      return (
        <section className="card">
          <h3>Form Submissions</h3>
          <p className="muted">This section shows enquiries submitted through your public form API key.</p>
          {!selectedProjectId && <p className="muted">Select a project first.</p>}
          <div className="grid-two">
            <label>
              Category
              <select
                value={enquiryFilters.category}
                onChange={(event) => setEnquiryFilters((prev) => ({ ...prev, category: event.target.value }))}
              >
                <option value="">All</option>
                <option value="enquiry">Enquiry</option>
                <option value="support">Support</option>
                <option value="job">Job</option>
                <option value="spam">Spam</option>
              </select>
            </label>
            <label>
              Search
              <input
                value={enquiryFilters.search}
                onChange={(event) => setEnquiryFilters((prev) => ({ ...prev, search: event.target.value }))}
                placeholder="Search payload text"
              />
            </label>
          </div>
          <div className="enquiry-table-wrap">
            {enquiries.length === 0 && <p className="muted">No submissions found.</p>}
            {enquiries.length > 0 && (
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>Submitted At</th>
                    <th>Category</th>
                    <th>IP</th>
                    <th>Locked</th>
                    <th>Fields</th>
                  </tr>
                </thead>
                <tbody>
                  {enquiries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.created_at ? new Date(entry.created_at).toLocaleString() : 'N/A'}</td>
                      <td>{entry.category || 'enquiry'}</td>
                      <td>{entry.ip_address || 'N/A'}</td>
                      <td>{entry.is_locked ? 'Yes' : 'No'}</td>
                      <td>
                        {entry.raw_payload && typeof entry.raw_payload === 'object' ? (
                          <div className="payload-table compact">
                            {Object.entries(entry.raw_payload).slice(0, 4).map(([key, value]) => (
                              <div key={`${entry.id}-${key}`} className="payload-row">
                                <span className="payload-key">{key}</span>
                                <span className="payload-value">{formatFieldValue(value)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="muted">Hidden</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )
    }

    function renderAnalyticsPage() {
      const summary = analyticsData?.summary || {}
      const perDayLabels = analyticsData?.per_day?.labels || []
      const perDayCounts = analyticsData?.per_day?.counts || []
      const perMonthLabels = analyticsData?.per_month?.labels || []
      const perMonthCounts = analyticsData?.per_month?.counts || []
      const categoryEntries = Object.entries(analyticsData?.category_counts || {})
      const countryEntries = Object.entries(analyticsData?.country_counts || {})
      const maxCategory = Math.max(...categoryEntries.map(([, v]) => Number(v) || 0), 1)
      const maxCountry = Math.max(...countryEntries.map(([, v]) => Number(v) || 0), 1)
      const total30Days = Number(summary.month_enquiries ?? perDayCounts.reduce((acc, val) => acc + (Number(val) || 0), 0))
      const fallbackTotalFromCategories = categoryEntries.reduce((acc, [, value]) => acc + (Number(value) || 0), 0)
      const totalEnquiries = Number(summary.total_enquiries ?? fallbackTotalFromCategories ?? total30Days ?? 0)
      const totalFaqChats = Number(summary.total_faq_chats || 0)
      const todayEnquiries = Number(summary.today_enquiries || 0)
      const uniqueIps = Number(summary.unique_ip_addresses || 0)
      const peakHour = analyticsData?.peak_hour && analyticsData.peak_hour !== 'N/A' ? analyticsData.peak_hour : 'No activity yet'
      const currentMonthCount = perMonthCounts.length ? Number(perMonthCounts[perMonthCounts.length - 1] || 0) : total30Days
      const todayLabel = analyticsData?.today || 'N/A'

      return (
        <section className="card">
          <div className="analytics-head">
            <h3>Analytics</h3>
          </div>
          {!selectedProjectId && <p className="muted">Select a project first.</p>}
          {selectedProjectId && !analyticsData && <p className="muted">Loading analytics...</p>}
          {analyticsData && (
            <>
              {analyticsData?.error && <p className="error">Analytics service warning: {analyticsData?.message || 'Unable to compute full analytics.'}</p>}
              <div className="analytics-cards">
                <article className="metric-card"><span>Total Enquiries</span><strong>{totalEnquiries}</strong></article>
                <article className="metric-card"><span>Today Enquiries</span><strong>{todayEnquiries}</strong></article>
                <article className="metric-card"><span>Current Month</span><strong>{currentMonthCount}</strong></article>
                <article className="metric-card"><span>Total FAQ Chats</span><strong>{totalFaqChats}</strong></article>
                <article className="metric-card"><span>Unique IPs</span><strong>{uniqueIps}</strong></article>
                <article className="metric-card"><span>Peak Hour</span><strong>{peakHour}</strong></article>
                <article className="metric-card"><span>Analytics Date</span><strong>{todayLabel}</strong></article>
              </div>

              <div className="analytics-grid">
                <article className="analytics-panel">
                  <h4>Daily Trend</h4>
                  {perDayLabels.length === 0 && <p className="muted">No daily data.</p>}
                  {perDayLabels.length > 0 && (
                    <table className="mini-table compact">
                      <thead>
                        <tr><th>Date</th><th>Count</th></tr>
                      </thead>
                      <tbody>
                        {perDayLabels.map((label, index) => (
                          <tr key={`${label}-${index}`}>
                            <td>{label}</td>
                            <td>{perDayCounts[index] || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </article>

                <article className="analytics-panel">
                  <h4>Monthly Trend</h4>
                  {perMonthLabels.length === 0 && <p className="muted">No monthly data.</p>}
                  {perMonthLabels.length > 0 && (
                    <table className="mini-table compact">
                      <thead>
                        <tr><th>Month</th><th>Count</th></tr>
                      </thead>
                      <tbody>
                        {perMonthLabels.map((label, index) => (
                          <tr key={`${label}-${index}`}>
                            <td>{label}</td>
                            <td>{perMonthCounts[index] || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </article>

                <article className="analytics-panel">
                  <h4>Category Breakdown</h4>
                  {categoryEntries.length === 0 && <p className="muted">No category data.</p>}
                  {categoryEntries.map(([label, value]) => (
                    <div key={label} className="bar-row">
                      <div className="bar-label">{label} ({value})</div>
                      <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max(4, Math.round(((Number(value) || 0) / maxCategory) * 100))}%` }} /></div>
                    </div>
                  ))}
                </article>

                <article className="analytics-panel">
                  <h4>Country Breakdown</h4>
                  {countryEntries.length === 0 && <p className="muted">No country data.</p>}
                  {countryEntries.map(([label, value]) => (
                    <div key={label} className="bar-row">
                      <div className="bar-label">{label} ({value})</div>
                      <div className="bar-track"><div className="bar-fill alt" style={{ width: `${Math.max(4, Math.round(((Number(value) || 0) / maxCountry) * 100))}%` }} /></div>
                    </div>
                  ))}
                </article>
              </div>

            </>
          )}
        </section>
      )
    }

    function renderSupportPage() {
      return (
        <section className="card">
          <h3>Report Issue</h3>
          <p className="muted">Send a report directly to admin and track your previous messages.</p>

          <form onSubmit={submitSupportMessage} className="form-grid">
            <label>
              Subject
              <input
                value={supportForm.subject}
                onChange={(event) => setSupportForm((prev) => ({ ...prev, subject: event.target.value }))}
                placeholder="Example: Billing charged twice"
                maxLength={200}
                required
              />
            </label>
            <label>
              Message
              <textarea
                rows={5}
                value={supportForm.message}
                onChange={(event) => setSupportForm((prev) => ({ ...prev, message: event.target.value }))}
                placeholder="Describe the issue in detail..."
                maxLength={4000}
                required
              />
            </label>
            <div className="button-row">
              <button type="submit" disabled={busy}>Send Report</button>
              <button type="button" className="btn-secondary" onClick={() => setSupportForm({ subject: '', message: '' })} disabled={busy}>
                Clear
              </button>
            </div>
          </form>

          <div className="card reports-card">
            <h4>Your Previous Reports</h4>
            {supportMessages.length === 0 && <p className="muted">No reports yet.</p>}
            {supportMessages.length > 0 && (
              <ul className="list-clean">
                {supportMessages.map((item) => (
                  <li key={item.id || `${item.subject}-${item.created_at}`} className="list-item">
                    <div className="enquiry-head">
                      <strong>{item.subject || 'No Subject'}</strong>
                      <span className="muted">{item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A'}</span>
                    </div>
                    <p className="muted">{item.message || ''}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )
    }

    function renderNotificationsPage() {
      return (
        <section className="card">
          <h3>Notifications</h3>
          <p className="muted">System announcements and updates from FormDocks.</p>
          <div className="button-row notifications-actions">
            <button type="button" className="btn-secondary" onClick={() => call(loadNotifications, 'Notifications refreshed.')}>
              Refresh
            </button>
          </div>
          {notifications.length === 0 && <p className="muted">No notifications available right now.</p>}
          {notifications.length > 0 && (
            <ul className="list-clean">
              {notifications.map((item, index) => {
                const title = item.title || item.name || item.subject || `Notification ${index + 1}`
                const message = item.message || item.body || item.content || item.description || ''
                const publishAt = item.publish_at || item.published_at || item.created_at || null
                const expiresAt = item.expires_at || item.expiry_at || null

                return (
                  <li key={item.id || `${title}-${index}`} className="list-item notification-item">
                    <div className="enquiry-head">
                      <strong>{title}</strong>
                      {publishAt && <span className="muted">{new Date(publishAt).toLocaleString()}</span>}
                    </div>
                    {message && <p className="muted">{message}</p>}
                    <div className="notification-meta">
                      {item.priority && <span className="chip">Priority: {String(item.priority)}</span>}
                      {expiresAt && <span className="chip">Expires: {new Date(expiresAt).toLocaleDateString()}</span>}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )
    }

    function renderSecurityPage() {
      return (
        <section className="card">
          <h3>Security</h3>
          <p className="muted">Change your account password from inside dashboard.</p>
          <form onSubmit={handleUpdatePassword} className="form-grid">
            <label>
              Current Password
              <input
                type="password"
                value={passwordUpdateForm.currentPassword}
                onChange={(event) => {
                  setPasswordUpdateForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                  setPasswordUpdateSuccess(false)
                }}
                required
              />
            </label>
            <div className="grid-two">
              <label>
                New Password
                <input
                  type="password"
                  value={passwordUpdateForm.newPassword}
                  onChange={(event) => {
                    setPasswordUpdateForm((prev) => ({ ...prev, newPassword: event.target.value }))
                    setShowPasswordLengthError(false)
                    setPasswordUpdateSuccess(false)
                  }}
                  required
                />
                {showPasswordLengthError && (
                  <span className="field-helper-text" style={{ color: 'var(--danger)' }}>
                    New password must be at least 8 characters.
                  </span>
                )}
              </label>
              <label>
                Confirm New Password
                <input
                  type="password"
                  value={passwordUpdateForm.confirmPassword}
                  onChange={(event) => {
                    setPasswordUpdateForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                    setPasswordUpdateSuccess(false)
                  }}
                  required
                />
              </label>
            </div>
            <div className="button-row">
              <button type="submit" disabled={busy}>Update Password</button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setPasswordUpdateForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
                  setShowPasswordLengthError(false)
                  setPasswordUpdateSuccess(false)
                }}
                disabled={busy}
              >
                Clear
              </button>
            </div>
            {passwordUpdateSuccess && (
              <p className="status" style={{ marginTop: '12px' }}>
                Password updated successfully.
              </p>
            )}
          </form>
        </section>
      )
    }

    function renderCrmPage() {
      const selectedCollection = crmCollections.find((c) => String(c.id) === String(crmSelectedCollectionId))
      return (
        <section className="card">
          <h3>Mini CRM</h3>
          <p className="muted">Manage project collections and structured entries.</p>
          {!selectedProjectId && <p className="muted">Select a project first.</p>}
          {crmDisabled && (
            <p className="error">CRM is currently disabled by admin.</p>
          )}
          {!crmDisabled && selectedProjectId && (
            <div className="crm-grid">
              <article className="analytics-panel">
                <h4>Collections</h4>
                <form onSubmit={createCrmCollection} className="form-grid">
                  <label>
                    New Collection
                    <input
                      value={crmCollectionName}
                      onChange={(event) => setCrmCollectionName(event.target.value)}
                      placeholder="Leads"
                      required
                    />
                  </label>
                  <button type="submit" disabled={busy}>Create Collection</button>
                </form>

                <label>
                  Select Collection
                  <select
                    value={crmSelectedCollectionId}
                    onChange={(event) => {
                      const nextId = event.target.value
                      setCrmSelectedCollectionId(nextId)
                      const picked = crmCollections.find((c) => String(c.id) === String(nextId))
                      setCrmRenameName(picked?.name || '')
                    }}
                  >
                    <option value="">Choose a collection</option>
                    {crmCollections.map((collection) => (
                      <option key={collection.id} value={collection.id}>
                        {collection.name} ({collection.entries_count ?? 0})
                      </option>
                    ))}
                  </select>
                </label>

                {crmSelectedCollectionId && (
                  <div className="form-grid">
                    <label>
                      Rename Collection
                      <input
                        value={crmRenameName}
                        onChange={(event) => setCrmRenameName(event.target.value)}
                      />
                    </label>
                    <div className="button-row">
                      <button type="button" onClick={renameCrmCollection} disabled={busy}>
                        Rename
                      </button>
                      <button type="button" className="btn-danger" onClick={deleteCrmCollection} disabled={busy}>
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </article>

              <article className="analytics-panel">
                <h4>Entries {selectedCollection ? `- ${selectedCollection.name}` : ''}</h4>
                {!crmSelectedCollectionId && <p className="muted">Select a collection to manage entries.</p>}
                {crmSelectedCollectionId && (
                  <>
                    <form onSubmit={saveCrmEntry} className="form-grid">
                      <label>
                        Entry JSON Object
                        <textarea
                          rows={8}
                          className="crm-json-editor"
                          value={crmEntryJson}
                          onChange={(event) => setCrmEntryJson(event.target.value)}
                        />
                      </label>
                      <div className="button-row">
                        <button type="submit" disabled={busy}>
                          {crmEditEntryId ? 'Update Entry' : 'Create Entry'}
                        </button>
                        {crmEditEntryId && (
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => {
                              setCrmEditEntryId('')
                              setCrmEntryJson('{\n  "name": "Lead Name",\n  "email": "lead@example.com"\n}')
                            }}
                            disabled={busy}
                          >
                            Cancel Edit
                          </button>
                        )}
                      </div>
                    </form>

                    <ul className="list-clean">
                      {crmEntries.length === 0 && <li className="muted">No entries yet.</li>}
                      {crmEntries.map((entry) => (
                        <li key={entry.id} className="list-item">
                          <div className="enquiry-head">
                            <strong>{String(entry.id).slice(0, 8)}...</strong>
                            <span className="muted">{entry.created_at ? new Date(entry.created_at).toLocaleString() : 'N/A'}</span>
                          </div>
                          <div className="payload-table compact">
                            {Object.entries(entry.data || {}).length === 0 && (
                              <div className="payload-row">
                                <span className="payload-key">Data</span>
                                <span className="payload-value">N/A</span>
                              </div>
                            )}
                            {Object.entries(entry.data || {}).map(([key, value]) => (
                              <div key={`${entry.id}-${key}`} className="payload-row">
                                <span className="payload-key">{key}</span>
                                <span className="payload-value">{formatFieldValue(value)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="button-row">
                            <button type="button" className="btn-secondary" onClick={() => startEditCrmEntry(entry)} disabled={busy}>
                              Edit
                            </button>
                            <button type="button" className="btn-danger" onClick={() => deleteCrmEntry(entry.id)} disabled={busy}>
                              Delete
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </article>
            </div>
          )}
        </section>
      )
    }

    return (
      <div className="app-shell">
        {showDashboardSplash && (
          <div className="auth-flash" aria-hidden="true">
            <div className="auth-flash-card">
              <span className="flash-orb orb-a" />
              <span className="flash-orb orb-b" />
              <span className="flash-orb orb-c" />
              <div className="auth-flash-logo-wrap">
                <img src="/brand-logo.png" alt="" />
                <span className="auth-flash-ring" />
              </div>
              <div className="site-transform" aria-hidden="true">
                <div className="site-transform-window">
                  <div className="site-transform-topbar">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="site-transform-body">
                    <div className="site-static">
                      <div className="static-nav">
                        <span />
                        <span />
                      </div>
                      <div className="static-hero" />
                      <div className="static-lines">
                        <span />
                        <span />
                        <span />
                        <span />
                      </div>
                      <div className="static-cta" />
                    </div>
                    <div className="site-dynamic">
                      <div className="dynamic-header-wrap">
                        <div className="dynamic-header" />
                        <div className="dynamic-live">LIVE</div>
                      </div>
                      <div className="dynamic-grid">
                        <span />
                        <span />
                        <span />
                        <span />
                      </div>
                      <div className="dynamic-chart">
                        <i />
                        <b />
                        <u />
                      </div>
                      <div className="dynamic-toast">Automation Enabled</div>
                      <div className="dynamic-footer">
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <strong>FormDocks</strong>
              <p>Loading your workspace...</p>
            </div>
          </div>
        )}
        <header className="topbar sticky-topbar">
          <div>
            <h2 className="brand-title"><img src="/brand-logo.png" alt="FormDocks" />FormDocks Dashboard</h2>
            <p>{me?.email || me?.username || 'User'}</p>
          </div>
          <div className="topbar-actions" ref={userMenuRef}>
            <button type="button" onClick={() => setShowUserMenu(!showUserMenu)} className={`btn-menu ${showUserMenu ? 'open' : ''}`} aria-label="Toggle User Menu">
              <span className="menu-icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="menu-icon-hamburger">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="menu-icon-close">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </span>
            </button>
            {showUserMenu && (
              <div className="dropdown-menu">
                <button
                  type="button"
                  onClick={() => { setDashboardPage('security'); setShowUserMenu(false); }}
                  className={`dropdown-item ${dashboardPage === 'security' ? 'active' : ''}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  Security
                </button>
                <button
                  type="button"
                  onClick={() => { setDashboardPage('support'); setShowUserMenu(false); }}
                  className={`dropdown-item ${dashboardPage === 'support' ? 'active' : ''}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  Report Issue
                </button>
                <div className="dropdown-divider" />
                <button type="button" onClick={() => { handleLogout(); setShowUserMenu(false); }} className="dropdown-item logout-item">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="logout-icon">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="dashboard-layout">
          <main className="dashboard-main">
            {dashboardPage === 'projects' && renderProjectsPage()}
            {dashboardPage === 'create-project' && renderCreateProjectPage()}
            {dashboardPage === 'keys' && renderApiKeysPage()}
            {dashboardPage === 'faq' && renderFaqPage()}
            {dashboardPage === 'subscription' && renderSubscriptionPage()}
            {dashboardPage === 'templates' && renderTemplatesPage()}
            {dashboardPage === 'ai-rewrite' && renderAiRewritePage()}
            {dashboardPage === 'submissions' && renderSubmissionsPage()}
            {dashboardPage === 'analytics' && renderAnalyticsPage()}
            {dashboardPage === 'crm' && renderCrmPage()}
            {dashboardPage === 'notifications' && renderNotificationsPage()}
            {dashboardPage === 'security' && renderSecurityPage()}
            {dashboardPage === 'support' && renderSupportPage()}

            {status && <p className="status">{status}</p>}
            {error && <p className="error">{error}</p>}
          </main>

          <nav className="dashboard-bottom-nav">
            <button type="button" className={dashboardPage === 'projects' ? 'active' : ''} onClick={() => setDashboardPage('projects')}>
              <div className="nav-icon-wrap">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="nav-icon"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              </div>
              <span>Projects</span>
            </button>
            <button type="button" className={dashboardPage === 'keys' ? 'active' : ''} onClick={() => setDashboardPage('keys')}>
              <div className="nav-icon-wrap">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="nav-icon"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
              </div>
              <span>API Keys</span>
            </button>
            <button type="button" className={dashboardPage === 'faq' ? 'active' : ''} onClick={() => setDashboardPage('faq')}>
              <div className="nav-icon-wrap">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="nav-icon"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/><line x1="12" y1="17" x2="12.01" y2="17"/><path d="M12 13.5a1.5 1.5 0 0 1 1-1.4 2 2 0 1 0-2-3.6"/></svg>
              </div>
              <span>FAQ Config</span>
            </button>
            <button type="button" className={dashboardPage === 'subscription' ? 'active' : ''} onClick={() => setDashboardPage('subscription')}>
              <div className="nav-icon-wrap">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="nav-icon"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              </div>
              <span>Subscription</span>
            </button>
            <button type="button" className={dashboardPage === 'templates' ? 'active' : ''} onClick={() => setDashboardPage('templates')}>
              <div className="nav-icon-wrap">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="nav-icon"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 13 7 15 9 17"/><polyline points="15 13 17 15 15 17"/></svg>
              </div>
              <span>HTML Viewer</span>
            </button>
            <button type="button" className={`nav-center-btn ${dashboardPage === 'create-project' ? 'active' : ''}`} onClick={() => setDashboardPage('create-project')}>
              <div className="nav-icon-wrap">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="nav-icon"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
              </div>
              <span>Create Project</span>
            </button>
            <button type="button" className={dashboardPage === 'ai-rewrite' ? 'active' : ''} onClick={() => setDashboardPage('ai-rewrite')}>
              <div className="nav-icon-wrap">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="nav-icon"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </div>
              <span>AI HTML Edit</span>
            </button>
            <button type="button" className={dashboardPage === 'submissions' ? 'active' : ''} onClick={() => setDashboardPage('submissions')}>
              <div className="nav-icon-wrap">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="nav-icon"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
              </div>
              <span>Submissions</span>
            </button>
            <button type="button" className={dashboardPage === 'analytics' ? 'active' : ''} onClick={() => setDashboardPage('analytics')}>
              <div className="nav-icon-wrap">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="nav-icon"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              </div>
              <span>Analytics</span>
            </button>
            <button type="button" className={dashboardPage === 'crm' ? 'active' : ''} onClick={() => setDashboardPage('crm')}>
              <div className="nav-icon-wrap">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="nav-icon"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              </div>
              <span>Mini CRM</span>
            </button>
            <button type="button" className={dashboardPage === 'notifications' ? 'active' : ''} onClick={() => setDashboardPage('notifications')}>
              <div className="nav-icon-wrap">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="nav-icon"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                <span className="notification-badge-dot" />
              </div>
              <span>Notifications</span>
            </button>
          </nav>
        </div>
        <footer className="dashboard-footer">
          <span>© 2026 Forzasoft Solutions. All rights reserved.</span>
        </footer>
      </div>
    )
  }

  if (screen === 'verify-email') {
    return renderVerifyEmail()
  }

  if (screen === 'forgot-password') {
    return renderForgotPassword()
  }

  if (screen === 'privacy') {
    return renderPrivacyPolicy()
  }

  if (screen === 'terms') {
    return renderTermsAndConditions()
  }

  if (!isAuthenticated || screen === 'login' || screen === 'signup') {
    return renderAuth()
  }

  return renderDashboard()
}

export default App
