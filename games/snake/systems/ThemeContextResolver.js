import { freezeSnapshot } from './Immutable.js';

export const UI_SLOTS = Object.freeze(['Header','HUD','Status','StartScreen','PauseOverlay','GameOver','SkinSelector','RedeemModal','CheatAuthModal','Controller','WorldViewport','Setup']);
const pick = (value, keys) => Object.fromEntries(keys.filter(key => value?.[key] !== undefined).map(key => [key,value[key]]));
const packKeys = ['id','displayName','description','appearanceId','uiThemeId','layoutVariantId','controllerStyleId','skillPresentationId','previewAsset','assetBasePath','capabilities','mechanicIds','skillSetId','unlock','secretTags','version','assets','selectorCardId'];

export class ThemeContextResolver {
  constructor({ packs, themes, layouts, controllers, presentations, skillSets, logger = console }) {
    Object.assign(this,{packs,themes,layouts,controllers,presentations,skillSets,logger});
    this.events = new Map();this.reported = new Set();
  }
  warn(message) { if (!this.reported.has(message)) { this.reported.add(message);this.logger.warn(`[Snake Theme] ${message}`); } }
  definition(registry,id,fallback='default') {
    const value=registry.get(id);if(value)return value;
    this.warn(`${registry.name}: ${id ?? '(missing)'} → ${fallback}`);
    return registry.get(fallback) ?? {};
  }
  packFor(skin) {
    const base=this.packs.get('default') ?? {};
    const id=skin.themePackId;
    const pack=id?this.definition(this.packs,id):{};
    return freezeSnapshot({...pick(base,packKeys),...pick(pack,packKeys),
      appearanceId:pack.appearanceId??skin.appearanceId??skin.id,
      uiThemeId:pack.uiThemeId??skin.uiThemeId??base.uiThemeId,
      id:pack.id??skin.id});
  }
  theme(id, seen=new Set()) {
    if(seen.has(id)){this.warn(`Theme inheritance cycle: ${id}`);return this.themes.get('default')??{};}
    const definition=this.definition(this.themes,id);seen.add(id);
    const parent=definition.extends?this.theme(definition.extends,seen):{};
    return {...parent,...definition,tokens:{...parent.tokens,...definition.tokens},components:{...parent.components,...definition.components}};
  }
  layout(id,mobile=false,seen=new Set()) {
    if(seen.has(id)){this.warn(`Layout inheritance cycle: ${id}`);return this.layouts.get('default');}
    const definition=this.definition(this.layouts,id);seen.add(id);
    if(mobile&&definition.supportsMobile===false){this.warn(`Layout ${id} has no mobile implementation`);return this.layouts.get('default');}
    const parent=definition.extends?this.layout(definition.extends,mobile,seen):{};
    return {...parent,...definition,components:{...parent?.components,...definition.components}};
  }
  setEvent(id,overlay) { if(!id)throw new Error('Visual event needs an id');this.events.set(id,freezeSnapshot(overlay)); }
  clearEvent(id) { return this.events.delete(id); }
  clearEvents() { this.events.clear(); }
  resolve({skin,map,mobile=false}) {
    const pack=this.packFor(skin),layout=this.layout(pack.layoutVariantId,mobile);
    const controller=this.definition(this.controllers,pack.controllerStyleId);
    const presentation=this.definition(this.presentations,pack.skillPresentationId);
    const defaultTheme=this.theme('default'),skinTheme=this.theme(pack.uiThemeId);
    const context={pack,layoutVariantId:layout.id,regions:layout.regions,
      appearanceId:pack.appearanceId,skillSetId:pack.skillSetId,
      controllerStyleId:controller.id,skillPresentationId:presentation.id,
      tokens:{...defaultTheme.tokens,...skinTheme.tokens},
      components:{...this.layouts.get('default')?.components,...layout.components,...skinTheme.components},
      skillLabels:presentation.labels??{},sources:['default',`skin:${pack.id}`],assets:pack.assets??[]};
    if(controller.componentId)context.components.Controller=controller.componentId;
    // Normal's legacy default theme must not erase a skin's UI language.
    const mapOverlay=map.themeOverlay??(map.uiThemeId&&map.uiThemeId!=='default'?{uiThemeId:map.uiThemeId}:null);
    const layers=[...(mapOverlay?[['map:'+map.id,mapOverlay]]:[]),...this.events.entries()].map(([id,overlay])=>[id,overlay]);
    for(const [id,overlay] of layers){
      const theme=overlay.uiThemeId?this.theme(overlay.uiThemeId):{};
      Object.assign(context.tokens,theme.tokens,overlay.tokens);
      Object.assign(context.components,theme.components,overlay.components);
      context.sources.push(id);
    }
    return freezeSnapshot(context);
  }
}
