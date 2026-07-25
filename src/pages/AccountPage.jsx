/**
 * AccountPage.jsx
 * User account management and settings
 */
import { useState, useEffect } from 'react'
import { apiClient } from '../services/apiClient'

export function AccountPage({ accessToken, navigate }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [forceDelete, setForceDelete] = useState(false)

  // Load user data
  useEffect(() => {
    async function loadUser() {
      try {
        const { response, data } = await apiClient.getMe(accessToken)
        if (!response.ok) {
          setError('Failed to load user data')
          return
        }
        setUser(data)
        setError('')
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, [accessToken])

  // Handle account deletion
  async function handleDeleteAccount() {
    if (!confirm('Are you sure? This action cannot be undone.')) return

    try {
      setError('')
      const { response, data } = await apiClient.deleteAccount(accessToken, { forceDelete })

      if (!response.ok) {
        if (response.status === 409) {
          setError(data.error || 'Cannot delete account with active subscription')
          return
        }
        setError('Failed to delete account')
        return
      }

      setStatus('Account deleted successfully. You will be logged out.')
      setTimeout(() => {
        localStorage.removeItem('formdock_access_token')
        localStorage.removeItem('formdock_refresh_token')
        navigate('/login', { replace: true })
      }, 2000)
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading account information...</div>
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>Account Settings</h1>

      {status && <div style={{ backgroundColor: '#c8e6c9', color: '#2e7d32', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>{status}</div>}

      {error && <div style={{ backgroundColor: '#ffcdd2', color: '#c62828', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>{error}</div>}

      {user && (
        <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '20px', marginBottom: '30px' }}>
          <h2>Profile Information</h2>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Username</label>
            <input type="text" value={user.username || ''} disabled style={{ width: '100%', padding: '8px', backgroundColor: '#f5f5f5' }} />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Email</label>
            <input type="email" value={user.email || ''} disabled style={{ width: '100%', padding: '8px', backgroundColor: '#f5f5f5' }} />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Email Verified</label>
            <div style={{ padding: '8px' }}>
              {user.email_verified ? <span style={{ color: 'green' }}>✓ Verified</span> : <span style={{ color: 'red' }}>✗ Not Verified</span>}
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>User ID</label>
            <input type="text" value={user.id || ''} disabled style={{ width: '100%', padding: '8px', backgroundColor: '#f5f5f5', fontFamily: 'monospace' }} />
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div style={{ border: '2px solid #f44336', borderRadius: '4px', padding: '20px', backgroundColor: '#ffebee' }}>
        <h2 style={{ color: '#f44336', marginTop: 0 }}>⚠️ Danger Zone</h2>

        <div>
          <h3>Delete Account</h3>
          <p>Permanently delete your account and all associated data. This action cannot be undone.</p>

          {!deleteConfirm ? (
            <button onClick={() => setDeleteConfirm(true)} style={{ padding: '10px 20px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Delete My Account
            </button>
          ) : (
            <div style={{ border: '1px solid #f44336', padding: '15px', borderRadius: '4px', backgroundColor: 'white' }}>
              <p style={{ color: '#f44336', fontWeight: 'bold' }}>This will permanently delete your account.</p>

              {user && user.active_subscription && (
                <div style={{ backgroundColor: '#fff3e0', padding: '10px', borderRadius: '4px', marginBottom: '15px', borderLeft: '4px solid #ff9800' }}>
                  <p>⚠️ <strong>You have an active subscription.</strong></p>
                  <p>Your subscription will NOT be refunded if you delete your account.</p>
                  <label style={{ display: 'block', marginTop: '10px' }}>
                    <input type="checkbox" checked={forceDelete} onChange={(e) => setForceDelete(e.target.checked)} />
                    I understand and accept this risk. Delete my account anyway.
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleDeleteAccount} disabled={user && user.active_subscription && !forceDelete} style={{ padding: '10px 20px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  Confirm Delete
                </button>
                <button onClick={() => setDeleteConfirm(false)} style={{ padding: '10px 20px', backgroundColor: '#f5f5f5', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
