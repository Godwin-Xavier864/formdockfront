/**
 * apiClient.js
 * Comprehensive API client for all backend endpoints
 */
import { API_BASE_URL, ACCESS_TOKEN_KEY } from '../config'

export class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL.replace(/\/+$/, '')
  }

  async requestWithFallback(endpoints, options = {}) {
    let last = { response: { ok: false, status: 0 }, data: null }
    for (const endpoint of endpoints) {
      const result = await this.request(endpoint, options)
      last = result
      if (result.response.status !== 404) return result
    }
    return last
  }

  // Get the current access token
  getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY) || ''
  }

  // Build headers with authorization
  buildHeaders(token) {
    const headers = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    return headers
  }

  // Make a raw request
  async request(endpoint, { method = 'GET', body, token } = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const headers = this.buildHeaders(token)

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    const text = await response.text()
    let data = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = text
    }

    return { response, data }
  }

  // ===== AUTHENTICATION ENDPOINTS =====
  async register(username, email, password) {
    return this.request('/api/auth/register/', {
      method: 'POST',
      body: { username, email, password },
    })
  }

  async login(username, password) {
    return this.request('/api/auth/token/', {
      method: 'POST',
      body: { username, password },
    })
  }

  async refreshToken(refreshToken) {
    return this.request('/api/auth/token/refresh/', {
      method: 'POST',
      body: { refresh: refreshToken },
    })
  }

  // ===== USER ENDPOINTS =====
  async getMe(token) {
    return this.request('/api/v1/me/', { token })
  }

  async deleteAccount(token, { forceDelete = false } = {}) {
    const url = `/api/v1/me/${forceDelete ? '?force_delete=true' : ''}`
    return this.request(url, {
      method: 'DELETE',
      token,
    })
  }

  async verifyEmail(token, code) {
    return this.request('/api/auth/email/verify/', {
      method: 'POST',
      body: { code },
      token,
    })
  }

  async requestForgotPassword(email) {
    return this.requestWithFallback(
      ['/api/auth/password/forgot/', '/api/auth/forgot-password/'],
      {
        method: 'POST',
        body: { email },
      }
    )
  }

  async resetForgotPassword({ email, otp, newPassword }) {
    return this.requestWithFallback(
      ['/api/auth/password/reset/', '/api/auth/password/reset-otp/', '/api/auth/reset-password/'],
      {
        method: 'POST',
        body: {
          email,
          otp,
          new_password1: newPassword,
          new_password2: newPassword,
        },
      }
    )
  }

  async updatePassword(token, { currentPassword, newPassword }) {
    const primary = await this.requestWithFallback(
      ['/api/auth/password/change/', '/api/auth/password/update/', '/api/auth/update-password/'],
      {
        method: 'POST',
        body: {
          old_password: currentPassword,
          new_password1: newPassword,
          new_password2: newPassword,
        },
        token,
      }
    )
    if (primary.response.ok || primary.response.status !== 400) return primary

    return this.requestWithFallback(
      ['/api/auth/password/change/', '/api/auth/password/update/', '/api/auth/update-password/'],
      {
        method: 'POST',
        body: {
          old_password: currentPassword,
          new_password: newPassword,
        },
        token,
      }
    )
  }

  // ===== PROJECTS ENDPOINTS =====
  async listProjects(token) {
    return this.request('/api/v1/projects/', { token })
  }

  async createProject(token, { name, allowed_domains = [] }) {
    return this.request('/api/v1/projects/', {
      method: 'POST',
      body: { name, allowed_domains },
      token,
    })
  }

  async getProject(token, projectId) {
    return this.request(`/api/v1/projects/${projectId}/`, { token })
  }

  async updateProject(token, projectId, { name, allowed_domains }) {
    return this.request(`/api/v1/projects/${projectId}/`, {
      method: 'PATCH',
      body: { name, allowed_domains },
      token,
    })
  }

  async deleteProject(token, projectId) {
    return this.request(`/api/v1/projects/${projectId}/`, {
      method: 'DELETE',
      token,
    })
  }

  // ===== PROJECT API KEYS =====
  async rotateProjectKey(token, projectId) {
    return this.request(`/api/v1/projects/${projectId}/rotate-key/`, {
      method: 'POST',
      token,
    })
  }

  async rotateProjectFaqKey(token, projectId) {
    return this.request(`/api/v1/projects/${projectId}/rotate-faq-key/`, {
      method: 'POST',
      token,
    })
  }

  // ===== PROJECT OVERVIEW =====
  async getProjectOverview(token, projectId) {
    return this.request(`/api/v1/projects/${projectId}/overview/`, { token })
  }

  // ===== ENQUIRIES =====
  async listEnquiries(token, projectId, { category = '', search = '' } = {}) {
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (search) params.set('search', search)
    const query = params.toString()
    const endpoint = `/api/v1/projects/${projectId}/enquiries/${query ? `?${query}` : ''}`
    return this.request(endpoint, { token })
  }

  // ===== FAQ CHAT =====
  async listFaqChats(token, projectId, { blocked = '', search = '' } = {}) {
    const params = new URLSearchParams()
    if (blocked) params.set('blocked', blocked)
    if (search) params.set('search', search)
    const query = params.toString()
    return this.request(`/api/v1/projects/${projectId}/faq-chats/${query ? `?${query}` : ''}`, {
      token,
    })
  }

  async projectFaqAsk(token, projectId, { question, include_collections = false }) {
    return this.request(`/api/v1/projects/${projectId}/faq/ask/`, {
      method: 'POST',
      body: { question, include_collections },
      token,
    })
  }

  // ===== FAQ CONFIG =====
  async getFaqConfig(token, projectId) {
    return this.request(`/api/v1/projects/${projectId}/faq-config/`, { token })
  }

  async updateFaqConfig(token, projectId, config) {
    return this.request(`/api/v1/projects/${projectId}/faq-config/`, {
      method: 'PUT',
      body: config,
      token,
    })
  }

  // ===== COLLECTIONS =====
  async listCollections(token, projectId) {
    return this.request(`/api/v1/projects/${projectId}/collections/`, { token })
  }

  async createCollection(token, projectId, { name }) {
    return this.request(`/api/v1/projects/${projectId}/collections/`, {
      method: 'POST',
      body: { name },
      token,
    })
  }

  async getCollection(token, projectId, collectionId) {
    return this.request(`/api/v1/projects/${projectId}/collections/${collectionId}/`, {
      token,
    })
  }

  async updateCollection(token, projectId, collectionId, { name }) {
    return this.request(`/api/v1/projects/${projectId}/collections/${collectionId}/`, {
      method: 'PATCH',
      body: { name },
      token,
    })
  }

  async deleteCollection(token, projectId, collectionId) {
    return this.request(`/api/v1/projects/${projectId}/collections/${collectionId}/`, {
      method: 'DELETE',
      token,
    })
  }

  // ===== COLLECTION ENTRIES =====
  async listEntries(token, projectId, collectionId, { limit = 20 } = {}) {
    const params = new URLSearchParams()
    if (limit) params.set('limit', limit)
    const query = params.toString()
    return this.request(
      `/api/v1/projects/${projectId}/collections/${collectionId}/entries/${query ? `?${query}` : ''}`,
      { token }
    )
  }

  async createEntry(token, projectId, collectionId, { data }) {
    return this.request(`/api/v1/projects/${projectId}/collections/${collectionId}/entries/`, {
      method: 'POST',
      body: { data },
      token,
    })
  }

  async updateEntry(token, projectId, collectionId, entryId, { data }) {
    return this.request(
      `/api/v1/projects/${projectId}/collections/${collectionId}/entries/${entryId}/`,
      {
        method: 'PATCH',
        body: { data },
        token,
      }
    )
  }

  async deleteEntry(token, projectId, collectionId, entryId) {
    return this.request(
      `/api/v1/projects/${projectId}/collections/${collectionId}/entries/${entryId}/`,
      {
        method: 'DELETE',
        token,
      }
    )
  }

  // ===== PUBLIC COLLECTION READ (no auth) =====
  async publicReadCollection(collectionSlug, { projectApiKey, limit = 20, pageUrl = '' }) {
    const params = new URLSearchParams()
    params.set('project_api_key', projectApiKey)
    if (limit) params.set('limit', limit)
    if (pageUrl) params.set('page_url', pageUrl)
    const query = params.toString()
    return this.request(`/api/v1/public/collections/${collectionSlug}/${query ? `?${query}` : ''}`)
  }

  // ===== PUBLIC FORM SUBMIT (no auth) =====
  async publicFormSubmit({ projectApiKey, fields, metadata = {} }) {
    return this.request('/api/v1/public/forms/submit/', {
      method: 'POST',
      body: {
        project_api_key: projectApiKey,
        fields,
        metadata,
      },
    })
  }

  // ===== PUBLIC FAQ CHAT (no auth) =====
  async publicFaqChat({ faqApiKey, question, metadata = {}, includeCollections = false }) {
    return this.request('/api/v1/public/faq/chat/', {
      method: 'POST',
      body: {
        faq_api_key: faqApiKey,
        question,
        metadata,
        include_collections: includeCollections,
      },
    })
  }

  // ===== ANALYTICS =====
  async getAnalytics(token, projectId) {
    return this.request(`/api/v1/projects/${projectId}/analytics/`, { token })
  }

  // ===== BILLING =====
  async getBillingOverview(token, projectId) {
    return this.request(`/api/v1/projects/${projectId}/billing/`, { token })
  }

  async createBillingOrder(token, projectId, { planId, clientRequestId = '' }) {
    return this.request(`/api/v1/projects/${projectId}/billing/order/`, {
      method: 'POST',
      body: {
        plan_id: planId,
        client_request_id: clientRequestId,
      },
      token,
    })
  }

  async verifyBillingPayment(token, projectId, { paymentId, razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
    return this.request(`/api/v1/projects/${projectId}/billing/verify/`, {
      method: 'POST',
      body: {
        payment_id: paymentId,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
      },
      token,
    })
  }

  // ===== NOTIFICATIONS =====
  async listNotifications(token) {
    return this.request('/api/v1/notifications/', { token })
  }

  // ===== SUPPORT =====
  async listSupportMessages(token) {
    return this.request('/api/v1/support/', { token })
  }

  async createSupportMessage(token, { subject, message }) {
    return this.request('/api/v1/support/', {
      method: 'POST',
      body: { subject, message },
      token,
    })
  }

  // ===== HTML REWRITE =====
  async rewriteHtml(token, { projectId, htmlInput }) {
    return this.request('/api/v1/tools/form-rewrite/', {
      method: 'POST',
      body: {
        project_id: projectId,
        html_input: htmlInput,
      },
      token,
    })
  }
}

// Export a singleton instance
export const apiClient = new ApiClient()
