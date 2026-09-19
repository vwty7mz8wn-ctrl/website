export class ProfileService {
  constructor(saveService) { this.saveService = saveService; }
  get profile() { return this.saveService.save.profile; }
  owns(skinId) { return this.profile.ownedSkins.includes(skinId); }
  unlockSkin(skinId) { this.saveService.update(save => { if (!save.profile.discoveredSkins.includes(skinId)) save.profile.discoveredSkins.push(skinId); if (!save.profile.ownedSkins.includes(skinId)) save.profile.ownedSkins.push(skinId); }); }
  equipSkin(skinId) { if (!this.owns(skinId)) return false; this.saveService.update(save => { save.profile.selectedSkinId = skinId; }); return true; }
  discover(secretId) { this.saveService.update(save => { if (!save.profile.discoveries.includes(secretId)) save.profile.discoveries.push(secretId); if (secretId === 'outside-discovered' && !save.world.discoveredMaps.includes('outside')) save.world.discoveredMaps.push('outside'); if (!save.world.discoveries.includes(secretId)) save.world.discoveries.push(secretId); }); }
}
