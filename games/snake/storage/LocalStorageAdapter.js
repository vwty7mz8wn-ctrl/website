export class LocalStorageAdapter {
  get(key, fallback = null) { try { const value = localStorage.getItem(key); return value === null ? fallback : JSON.parse(value); } catch { return fallback; } }
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
  raw(key) { try { return localStorage.getItem(key); } catch { return null; } }
}
