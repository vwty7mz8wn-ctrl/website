export class MechanicSystem {
  constructor(registry) { this.registry=registry; this.active=[]; }
  configure(ids, context) { this.active=[...new Set(ids)].map(id=>this.registry.get(id)).filter(Boolean); this.active.forEach(mechanic=>mechanic.onAttach?.(context)); }
  run(hook, context) { return this.active.map(mechanic=>mechanic[hook]?.(context)).filter(Boolean); }
}
