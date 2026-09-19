export class SkinSystem {
  constructor(registry, profileService, eventBus) { this.registry=registry; this.profile=profileService; this.eventBus=eventBus; this.currentId='default'; }
  load() { const saved=this.profile.profile.selectedSkinId; this.currentId=this.profile.owns(saved)&&this.registry.has(saved) ? saved : 'default'; return this.current; }
  get current() { return this.registry.get(this.currentId) ?? this.registry.get('default'); }
  listOwned() { return this.profile.profile.ownedSkins.map(id=>this.registry.get(id)).filter(Boolean); }
  hasCapability(capability) { return this.current.capabilities?.includes(capability) ?? false; }
  equip(skinId) { if (!this.registry.has(skinId)||!this.profile.owns(skinId)) return false; this.currentId=skinId; this.profile.equipSkin(skinId); this.eventBus.emit('skin:equip',{skin:this.current}); return true; }
  unlock(skinId) { if (!this.registry.has(skinId)) return false; this.profile.unlockSkin(skinId); this.eventBus.emit('skin:unlock',{skin:this.registry.get(skinId)}); return true; }
}
