/**
 * ProjectsListPage.jsx
 * List and manage all projects
 */
import { useState, useEffect } from 'react'
import { apiClient } from '../services/apiClient'

export function ProjectsListPage({ accessToken, navigate }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [newProjectForm, setNewProjectForm] = useState({ name: '', domainInput: '' })

  // Load projects
  useEffect(() => {
    async function loadProjects() {
      try {
        const { response, data } = await apiClient.listProjects(accessToken)
        if (!response.ok) {
          setError('Failed to load projects')
          return
        }
        const list = Array.isArray(data) ? data : data.results || []
        setProjects(list)
        setError('')
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadProjects()
  }, [accessToken])

  // Handle create project
  async function handleCreateProject(e) {
    e.preventDefault()

    if (!newProjectForm.name.trim()) {
      setError('Project name is required')
      return
    }

    const domains = newProjectForm.domainInput
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean)

    try {
      setError('')
      const { response, data } = await apiClient.createProject(accessToken, {
        name: newProjectForm.name,
        allowed_domains: domains,
      })

      if (!response.ok) {
        setError('Failed to create project')
        return
      }

      setProjects([data, ...projects])
      setNewProjectForm({ name: '', domainInput: '' })
      setShowForm(false)
      setStatus('✓ Project created successfully')
      setTimeout(() => setStatus(''), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  // Handle delete project
  async function handleDeleteProject(projectId) {
    if (!confirm('Delete this project? This action cannot be undone.')) return

    try {
      setError('')
      const { response } = await apiClient.deleteProject(accessToken, projectId)

      if (!response.ok) {
        setError('Failed to delete project')
        return
      }

      setProjects(projects.filter((p) => p.id !== projectId))
      setStatus('✓ Project deleted')
      setTimeout(() => setStatus(''), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Projects</h1>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {showForm ? 'Cancel' : 'Create Project'}
        </button>
      </div>

      {status && <div style={{ backgroundColor: '#c8e6c9', color: '#2e7d32', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>{status}</div>}

      {error && <div style={{ backgroundColor: '#ffcdd2', color: '#c62828', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>{error}</div>}

      {/* Create Project Form */}
      {showForm && (
        <form onSubmit={handleCreateProject} style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '20px', marginBottom: '30px', backgroundColor: '#f5f5f5' }}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Project Name *</label>
            <input
              type="text"
              value={newProjectForm.name}
              onChange={(e) => setNewProjectForm({ ...newProjectForm, name: e.target.value })}
              placeholder="e.g., My SaaS Platform"
              style={{ width: '100%', maxWidth: '500px', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              required
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Allowed Domains (optional)</label>
            <textarea
              value={newProjectForm.domainInput}
              onChange={(e) => setNewProjectForm({ ...newProjectForm, domainInput: e.target.value })}
              placeholder="example.com, app.example.com&#10;(comma-separated)"
              style={{ width: '100%', maxWidth: '500px', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minHeight: '80px', fontFamily: 'monospace' }}
            />
            <small style={{ color: '#999' }}>Leave empty to allow all domains</small>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Create Project
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 20px', backgroundColor: '#f5f5f5', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Projects Grid */}
      {loading ? (
        <p>Loading projects...</p>
      ) : projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <p style={{ color: '#999', fontSize: '18px' }}>No projects yet. Create one to get started!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {projects.map((project) => (
            <div key={project.id} style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '20px', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3 style={{ marginTop: 0 }}>{project.name}</h3>

              <div style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>
                <small style={{ color: '#666' }}>
                  <strong>Form API Key:</strong>
                  <br />
                  {project.public_api_key ? project.public_api_key.substring(0, 20) + '...' : 'N/A'}
                </small>
              </div>

              {project.allowed_domains && project.allowed_domains.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <small style={{ color: '#666' }}>
                    <strong>Allowed Domains:</strong> {project.allowed_domains.join(', ')}
                  </small>
                </div>
              )}

              <small style={{ color: '#999' }}>Created: {new Date(project.created_at).toLocaleDateString()}</small>

              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button onClick={() => navigate(`/projects/${encodeURIComponent(project.id)}`)} style={{ flex: 1, padding: '8px 16px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  Dashboard
                </button>
                <button
                  onClick={() => handleDeleteProject(project.id)}
                  style={{ padding: '8px 16px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
