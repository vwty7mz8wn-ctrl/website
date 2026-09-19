export class BuffSystem {
  constructor(registry, eventBus) { this.registry = registry; this.eventBus = eventBus; this.active = new Map(); }
  reset() { this.active.clear(); }
  apply(buffId, options = {}) { const definition = this.registry.get(buffId); if (!definition) return null; const current = this.active.get(buffId); const duration = options.duration ?? definition.defaultDuration; const value = definition.stackMode === 'stack' && current ? current.duration + duration : duration; const buff={ ...definition, duration:value }; this.active.set(buffId,buff); this.eventBus.emit('buff:add',{buff}); return buff; }
  has(buffId) { return this.active.has(buffId); }
  consume(buffId, amount = 1) { const buff=this.active.get(buffId); if (!buff) return false; buff.duration-=amount; if (buff.duration<=0) this.remove(buffId); return true; }
  remove(buffId) { const buff=this.active.get(buffId); if (!buff) return false; this.active.delete(buffId); this.eventBus.emit('buff:remove',{buff}); return true; }
  list() { return [...this.active.values()]; }
}
