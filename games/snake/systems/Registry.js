export class Registry {
  constructor(name, defaults = {}) { this.name = name; this.defaults = defaults; this.items = new Map(); }
  register(id, definition) { if (!id) throw new Error(`${this.name} requires an id`); this.items.set(id, Object.freeze({ ...this.defaults, ...definition, id })); return this; }
  get(id) { return this.items.get(id) ?? null; }
  has(id) { return this.items.has(id); }
  list() { return [...this.items.values()]; }
}
