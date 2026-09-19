export class EventBus {
  constructor() { this.listeners = new Map(); }
  on(name, callback) { const set = this.listeners.get(name) ?? new Set(); set.add(callback); this.listeners.set(name, set); return () => this.off(name, callback); }
  off(name, callback) { this.listeners.get(name)?.delete(callback); }
  emit(name, payload = {}) { this.listeners.get(name)?.forEach(callback => callback(payload)); }
}
