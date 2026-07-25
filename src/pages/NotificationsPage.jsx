/**
 * NotificationsPage.jsx
 * Display system notifications
 */
import { useState, useEffect } from 'react'
import { apiClient } from '../services/apiClient'

export function NotificationsPage({ accessToken }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadNotifications() {
      try {
        const { response, data } = await apiClient.listNotifications(accessToken)
        if (!response.ok) {
          setError('Failed to load notifications')
          return
        }
        const list = Array.isArray(data) ? data : data.results || []
        setNotifications(list)
        setError('')
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadNotifications()
  }, [accessToken])

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading notifications...</div>
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>Notifications</h1>

      {error && <div style={{ backgroundColor: '#ffcdd2', color: '#c62828', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>{error}</div>}

      {notifications.length === 0 ? (
        <p style={{ color: '#999' }}>No notifications</p>
      ) : (
        <div>
          {notifications.map((notif) => (
            <div key={notif.id} style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '20px', marginBottom: '15px' }}>
              <h3 style={{ marginTop: 0 }}>{notif.title}</h3>
              <p>{notif.message}</p>
              <small style={{ color: '#999' }}>Published: {new Date(notif.publish_at).toLocaleString()}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
