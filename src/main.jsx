import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import LoginPage from './components/auth/LoginPage.jsx'
import UserManagementPage from './components/auth/UserManagementPage.jsx'
import { useAuthStore } from './store/authStore.js'
import './index.css'
import '@fortawesome/fontawesome-free/css/all.min.css'

function Root() {
  const { user, token, loading, setAuth, clearAuth, setLoading } = useAuthStore()
  const [showUsers, setShowUsers] = useState(false)

  useEffect(() => {
    if (!token) { setLoading(false); return }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setAuth(data.user, token)
        else clearAuth()
      })
      .catch(() => clearAuth())
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <span className="text-gray-500 text-sm">Loading…</span>
      </div>
    )
  }

  if (!user) return <LoginPage />

  if (showUsers && user.role === 'admin') {
    return <UserManagementPage onClose={() => setShowUsers(false)} />
  }

  return <App onOpenUsers={user.role === 'admin' ? () => setShowUsers(true) : null} />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
