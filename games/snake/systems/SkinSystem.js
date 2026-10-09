import { freezeSnapshot } from './Immutable.js';

export class SkinSystem {
  constructor(registry, profileService, eventBus, {appearances=null,packs=null,logger=console}={}) { this.registry=registry; this.profile=profileService; this.eventBus=eventBus; this.appearances=appearances;this.packs=packs;this.logger=logger;this.reported=new Set();this.currentId='default';this.runSnapshot=null;this.stateProvider=null; }
  warn(message){if(!this.reported.has(message)){this.reported.add(message);this.logger.warn(`[Snake Skin] ${message}`);}}
  load() { const saved=this.profile.profile.selectedSkinId; this.currentId=this.profile.owns(saved)&&this.registry.has(saved) ? saved : 'default';if(saved!==this.currentId)this.warn(`Saved skin ${saved} unavailable → default (save retained)`); return this.current; }
  resolve(skinId) { const skin=this.registry.get(skinId)??this.registry.get('default'),pack=this.packs?.get(skin.themePackId),appearanceId=pack?.appearanceId??skin.appearanceId??skin.id,appearance=this.appearances?.get(appearanceId)??this.appearances?.get('default');if(this.appearances&&!this.appearances.has(appearanceId))this.warn(`Appearance ${appearanceId} unavailable → default`);return {...skin,...appearance,id:skin.id,themePackId:skin.themePackId,capabilities:pack?.capabilities??skin.capabilities??[],mechanics:pack?.mechanicIds??skin.mechanics??[],skillSetId:pack?.skillSetId??skin.skillSetId??'default'}; }
  get current() { return this.runSnapshot??this.resolve(this.currentId); }
  listOwned() { return this.profile.profile.ownedSkins.filter(id=>this.registry.has(id)).map(id=>this.resolve(id)); }
  setStateProvider(provider){this.stateProvider=provider;}
  beginRun(){if(!this.runSnapshot)this.runSnapshot=freezeSnapshot(this.resolve(this.currentId));return this.runSnapshot;}
  endRun(){this.runSnapshot=null;}
  hasCapability(capability) { return this.current.capabilities?.includes(capability) ?? false; }
  equip(skinId) { if(this.stateProvider&&!['READY','GAME_OVER'].includes(this.stateProvider()))return false;if (!this.registry.has(skinId)||!this.profile.owns(skinId)||!this.profile.profile.discoveredSkins.includes(skinId)) return false; this.endRun();this.currentId=skinId; this.profile.equipSkin(skinId); this.eventBus.emit('skin:equip',{skin:this.current}); return true; }
  unlock(skinId) { if (!this.registry.has(skinId)) return false; const unlocked=this.profile.unlockSkin(skinId); if (unlocked) this.eventBus.emit('skin:unlock',{skin:this.registry.get(skinId)}); return unlocked; }
}
