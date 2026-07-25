/**
 * useApi.js
 * Custom React hooks for API calls
 */
import { useState, useCallback } from 'react'

export function useApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const request = useCallback(async (apiCall) => {
    setLoading(true)
    setError(null)
    try {
      const { response, data } = await apiCall()
      if (!response.ok) {
        const errorMsg = typeof data?.detail === 'string' ? data.detail : JSON.stringify(data)
        setError(errorMsg || 'Request failed')
        return { response, data, error: errorMsg }
      }
      return { response, data, error: null }
    } catch (err) {
      const errorMsg = err.message || 'An error occurred'
      setError(errorMsg)
      return { response: null, data: null, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }, [])

  return { request, loading, error, setError }
}

// Helper to parse API errors
export function parseApiError(data) {
  if (!data) return 'Request failed'
  if (typeof data === 'string') return data
  if (typeof data.detail === 'string') return data.detail
  if (typeof data.error === 'string') return data.error
  return JSON.stringify(data)
}

// Helper to extract list from paginated response
export function asList(data) {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.results)) return data.results
  return []
}
