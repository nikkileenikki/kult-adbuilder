// IndexedDB-backed storage for zustand's `persist` middleware — used instead of
// localStorage for stores that can hold large base64 image data (AI-generated images
// especially), since localStorage's ~5-10MB quota is easy to exceed and throws
// synchronously ("Setting the value of '...' exceeded the quota"), crashing the app.
// IndexedDB has a much larger practical quota (typically hundreds of MB or more).
const DB_NAME = 'kult-adbuilder-idb'
const STORE_NAME = 'kv'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE_NAME) }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function withStore(type, run) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, type)
    const store = tx.objectStore(STORE_NAME)
    const request = run(store)
    tx.oncomplete = () => resolve(request?.result)
    tx.onerror = () => reject(tx.error || request?.error)
  }))
}

export const idbStorage = {
  getItem: async (name) => {
    try {
      const existing = await withStore('readonly', (store) => store.get(name))
      if (existing != null) return existing
      // One-time migration from the old localStorage-based persistence, so upgrading
      // doesn't silently drop whatever was already saved there.
      const legacy = localStorage.getItem(name)
      if (legacy != null) {
        await withStore('readwrite', (store) => store.put(legacy, name)).catch(() => {})
        localStorage.removeItem(name)
        return legacy
      }
      return null
    } catch {
      return null
    }
  },
  setItem: async (name, value) => {
    try {
      await withStore('readwrite', (store) => store.put(value, name))
    } catch (err) {
      console.error('idbStorage setItem failed', err)
    }
  },
  removeItem: async (name) => {
    try {
      await withStore('readwrite', (store) => store.delete(name))
    } catch { /* ignore */ }
  },
}
