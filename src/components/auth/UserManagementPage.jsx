import React, { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../../store/authStore.js'

function Modal({ onClose, children }) {
  const innerRef = useRef(null)
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onMouseDown={(e) => { if (!innerRef.current?.contains(e.target)) onClose() }}
    >
      <div ref={innerRef} className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm shadow-2xl">
        {children}
      </div>
    </div>
  )
}

export default function UserManagementPage({ onClose }) {
  const { token } = useAuthStore()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [changePwUser, setChangePwUser] = useState(null)

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/list-users', { headers: authHeaders })
      const data = await res.json()
      if (res.ok) setUsers(data.users)
      else setError(data.error || 'Failed to load users')
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const toggleDisabled = async (user) => {
    const res = await fetch('/api/auth/update-user', {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ id: user.id, disabled: !user.disabled }),
    })
    if (res.ok) setUsers((u) => u.map((x) => x.id === user.id ? { ...x, disabled: !user.disabled } : x))
    else { const d = await res.json(); alert(d.error || 'Failed') }
  }

  const changeRole = async (user, role) => {
    const res = await fetch('/api/auth/update-user', {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ id: user.id, role }),
    })
    if (res.ok) setUsers((u) => u.map((x) => x.id === user.id ? { ...x, role } : x))
    else { const d = await res.json(); alert(d.error || 'Failed') }
  }

  const deleteUser = async (user) => {
    if (!confirm(`Delete user "${user.username}"? This cannot be undone.`)) return
    const res = await fetch(`/api/auth/delete-user?id=${user.id}`, { method: 'DELETE', headers: authHeaders })
    if (res.ok) setUsers((u) => u.filter((x) => x.id !== user.id))
    else { const d = await res.json(); alert(d.error || 'Failed') }
  }

  return (
    <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-700 px-6 py-3 flex items-center gap-3">
        <span className="text-white font-bold text-sm tracking-wide">
          <span className="text-purple-400">KULT</span> AD
        </span>
        <div className="w-px h-5 bg-gray-700" />
        <span className="text-gray-200 text-sm font-medium">User Management</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-xs font-medium"
          >
            <i className="fa-solid fa-user-plus" style={{ fontSize: 12 }} /> Add User
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded text-xs border border-gray-700"
          >
            <i className="fa-solid fa-arrow-left" style={{ fontSize: 12 }} /> Back to Editor
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading && <p className="text-gray-500 text-sm">Loading…</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {!loading && !error && (
          <div className="max-w-5xl mx-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="pb-3 pr-4 font-medium">Username</th>
                  <th className="pb-3 pr-4 font-medium">Display Name</th>
                  <th className="pb-3 pr-4 font-medium">Email</th>
                  <th className="pb-3 pr-4 font-medium">Role</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-800 hover:bg-gray-900/50">
                    <td className="py-3 pr-4 text-gray-200 font-mono text-xs">{u.username}</td>
                    <td className="py-3 pr-4 text-gray-200">{u.display_name}</td>
                    <td className="py-3 pr-4 text-gray-400 text-xs">{u.email}</td>
                    <td className="py-3 pr-4">
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u, e.target.value)}
                        className="bg-gray-800 text-gray-200 border border-gray-700 rounded px-2 py-0.5 text-xs focus:outline-none focus:border-purple-500"
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${u.disabled ? 'bg-red-900/40 text-red-400' : 'bg-green-900/40 text-green-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.disabled ? 'bg-red-400' : 'bg-green-400'}`} />
                        {u.disabled ? 'Disabled' : 'Active'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setChangePwUser(u)}
                          title="Set password"
                          className="px-2.5 py-1 rounded text-xs border border-gray-700 text-gray-400 hover:bg-gray-800 transition-colors"
                        >
                          Set Password
                        </button>
                        <button
                          onClick={() => toggleDisabled(u)}
                          title={u.disabled ? 'Enable user' : 'Disable user'}
                          className={`px-2.5 py-1 rounded text-xs border transition-colors ${u.disabled ? 'border-green-700 text-green-400 hover:bg-green-900/30' : 'border-yellow-700 text-yellow-400 hover:bg-yellow-900/30'}`}
                        >
                          {u.disabled ? 'Enable' : 'Disable'}
                        </button>
                        <button
                          onClick={() => deleteUser(u)}
                          title="Delete user"
                          className="px-2.5 py-1 rounded text-xs border border-red-800 text-red-400 hover:bg-red-900/30 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <p className="text-gray-500 text-sm mt-6">No users found.</p>}
          </div>
        )}
      </div>

      {showAdd && (
        <AddUserModal
          authHeaders={authHeaders}
          onClose={() => setShowAdd(false)}
          onCreated={(u) => { setUsers((prev) => [...prev, u]); setShowAdd(false) }}
        />
      )}

      {changePwUser && (
        <ChangePasswordModal
          authHeaders={authHeaders}
          targetUser={changePwUser}
          isSelf={false}
          onClose={() => setChangePwUser(null)}
        />
      )}
    </div>
  )
}

function AddUserModal({ authHeaders, onClose, onCreated }) {
  const [form, setForm] = useState({ username: '', display_name: '', email: '', password: '', role: 'user' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/create-user', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); return }
      onCreated({ id: data.id, ...form, disabled: 0 })
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-white font-semibold text-base mb-4">Add User</h2>
      <form onSubmit={submit} className="space-y-3">
        {[
          { label: 'Username', key: 'username', type: 'text' },
          { label: 'Display Name', key: 'display_name', type: 'text' },
          { label: 'Email', key: 'email', type: 'email' },
          { label: 'Password', key: 'password', type: 'password' },
        ].map(({ label, key, type }) => (
          <div key={key}>
            <label className="block text-xs text-gray-400 mb-1">{label}</label>
            <input
              type={type} value={form[key]} onChange={set(key)} required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>
        ))}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Role</label>
          <select value={form.role} onChange={set('role')}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500">
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg py-2 text-sm border border-gray-700">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium">
            {loading ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function ChangePasswordModal({ authHeaders, targetUser, isSelf, onClose }) {
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (newPw !== confirmPw) { setError('Passwords do not match'); return }
    setError('')
    setLoading(true)
    try {
      const body = { new_password: newPw }
      if (isSelf) body.current_password = currentPw
      else body.id = targetUser.id

      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); return }
      setSuccess(true)
      setTimeout(onClose, 1200)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const title = isSelf ? 'Change Password' : `Set Password — ${targetUser?.username}`

  return (
    <Modal onClose={onClose}>
      <h2 className="text-white font-semibold text-base mb-4">{title}</h2>
      {success ? (
        <p className="text-green-400 text-sm text-center py-4">Password updated!</p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          {isSelf && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">Current Password</label>
              <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500" />
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-400 mb-1">New Password</label>
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Confirm New Password</label>
            <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500" />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg py-2 text-sm border border-gray-700">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium">
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
