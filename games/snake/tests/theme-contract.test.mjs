import test from 'node:test';
import assert from 'node:assert/strict';
import {Registry} from '../systems/Registry.js';
import {ThemeContextResolver,UI_SLOTS} from '../systems/ThemeContextResolver.js';
import {freezeSnapshot} from '../systems/Immutable.js';
import {themePacks} from '../content/themePacks.js';
import {layoutVariants} from '../content/layoutVariants.js';
import {controllerStyles} from '../content/controllerStyles.js';
import {skillPresentations} from '../content/skillPresentations.js';
import {skillSets} from '../content/skillSets.js';
import {SkinSystem} from '../systems/SkinSystem.js';
import {AssetLoader} from '../systems/AssetLoader.js';
import {getSegmentVisualType,RenderSystem} from '../systems/RenderSystem.js';
import {createBoundaryBreakMechanic} from '../content/mechanics.js';
import {CONFIG} from '../content/config.js';
const registry=(name,items)=>{const result=new Registry(name);items.forEach(item=>result.register(item.id,item));return result;};
const resolver=()=>new ThemeContextResolver({packs:registry('packs',themePacks),layouts:registry('layouts',layoutVariants),themes:registry('themes',[{id:'default',tokens:{'--ui-bg':'black','--ui-text':'white'}},{id:'creator',tokens:{'--ui-border':'gray'}},{id:'outside',tokens:{'--ui-bg':'charcoal'}}]),controllers:registry('controllers',controllerStyles),presentations:registry('presentations',skillPresentations),skillSets:registry('skills',skillSets),logger:{warn(){}}});
test('immutable nested snapshots cannot mutate engine data',()=>{const source={a:{score:2}};const copy=freezeSnapshot(source);assert.throws(()=>copy.a.score=9);assert.equal(source.a.score,2);});
test('all required slots have a default implementation',()=>{assert.ok(UI_SLOTS.every(slot=>layoutVariants[0].components[slot]));});
test('map and event overlays preserve skin layout, merge tokens and restore',()=>{const r=resolver(),skin={id:'creator',themePackId:'creator'},map={id:'outside',uiThemeId:'outside'};let ctx=r.resolve({skin,map});assert.equal(ctx.layoutVariantId,'creator');assert.equal(ctx.components.HUD,'creator/HUD');assert.equal(ctx.tokens['--ui-border'],'gray');assert.equal(ctx.tokens['--ui-bg'],'charcoal');r.setEvent('test',{tokens:{'--ui-bg':'event'},components:{Status:'event/Status'}});ctx=r.resolve({skin,map});assert.equal(ctx.tokens['--ui-bg'],'event');assert.equal(ctx.components.HUD,'creator/HUD');r.clearEvent('test');assert.equal(r.resolve({skin,map}).tokens['--ui-bg'],'charcoal');assert.equal(r.resolve({skin,map:{id:'normal',uiThemeId:'default'}}).tokens['--ui-bg'],'black');});
test('unknown pack/layout/theme and mobile-incompatible layout fall back',()=>{const r=resolver();let ctx=r.resolve({skin:{id:'gone',themePackId:'gone'},map:{id:'normal'}});assert.equal(ctx.layoutVariantId,'default');r.layouts.register('desktop',{id:'desktop',supportsMobile:false});r.packs.register('desktop',{layoutVariantId:'desktop',uiThemeId:'missing'});ctx=r.resolve({skin:{id:'desktop',themePackId:'desktop'},map:{id:'normal'},mobile:true});assert.equal(ctx.layoutVariantId,'default');assert.equal(ctx.tokens['--ui-text'],'white');});
test('theme inheritance cycles terminate',()=>{const r=resolver();r.themes.register('a',{extends:'b'});r.themes.register('b',{extends:'a'});r.packs.register('cycle',{uiThemeId:'a'});assert.equal(r.resolve({skin:{id:'x',themePackId:'cycle'},map:{id:'normal'}}).tokens['--ui-text'],'white');});
test('layout inheritance cycles terminate and unknown skills fall back',()=>{const r=resolver();r.layouts.register('a',{extends:'b'});r.layouts.register('b',{extends:'a'});r.packs.register('cycle',{layoutVariantId:'a',skillSetId:'gone'});const ctx=r.resolve({skin:{id:'x',themePackId:'cycle'},map:{id:'normal'}});assert.equal(ctx.skillSetId,'default');assert.ok(ctx.regions);});
test('event layers restore in any removal order without replacing appearance/rules',()=>{const r=resolver(),args={skin:{id:'creator',themePackId:'creator'},map:{id:'normal'}};r.setEvent('a',{appearanceId:'wrong',layoutVariantId:'wrong',tokens:{'--ui-bg':'a'}});r.setEvent('b',{tokens:{'--ui-bg':'b'}});r.clearEvent('a');const ctx=r.resolve(args);assert.equal(ctx.appearanceId,'creator');assert.equal(ctx.layoutVariantId,'creator');assert.equal(ctx.tokens['--ui-bg'],'b');r.clearEvent('b');assert.equal(r.resolve(args).tokens['--ui-bg'],'black');});
test('SkinSystem guards all unsafe states and snapshots nested mechanics',()=>{
  const skinDefs=[{id:'default',mechanics:[]},{id:'extra',mechanics:['test'],capabilities:[]}];let state='READY';
  const profile={profile:{ownedSkins:['default','extra'],discoveredSkins:['default','extra'],selectedSkinId:'default'},owns:id=>['default','extra'].includes(id),equipSkin(){}};
  const system=new SkinSystem(registry('skins',skinDefs),profile,{emit(){}});system.setStateProvider(()=>state);assert.equal(system.equip('extra'),true);
  const snapshot=system.beginRun();assert.throws(()=>snapshot.mechanics.push('changed'));skinDefs[1].mechanics.push('later');assert.deepEqual(system.current.mechanics,['test']);
  for(state of ['RUNNING','PAUSED','MODAL','TRANSITION'])assert.equal(system.equip('default'),false);
  state='GAME_OVER';assert.equal(system.equip('default'),true);
});
test('partial skill presentation inherits untouched default slots',()=>{const r=resolver();r.presentations.register('partial',{labels:{BUTTON_A:{name:'Custom'}}});r.packs.register('partial',{skillPresentationId:'partial'});const ctx=r.resolve({skin:{id:'partial',themePackId:'partial'},map:{id:'normal'}});assert.equal(ctx.skillLabels.BUTTON_A.name,'Custom');assert.equal(ctx.skillLabels.BUTTON_B.name,'刹车');});
test('body/corner classifications remain logical-coordinate based',()=>{
  assert.equal(getSegmentVisualType({x:0,y:1},{x:1,y:1},{x:2,y:1}),'body-horizontal');
  assert.equal(getSegmentVisualType({x:1,y:0},{x:1,y:1},{x:1,y:2}),'body-vertical');
  for(const [p,n,type] of [[{x:1,y:0},{x:0,y:1},'corner-ul'],[{x:1,y:0},{x:2,y:1},'corner-ur'],[{x:1,y:2},{x:0,y:1},'corner-dl'],[{x:1,y:2},{x:2,y:1},'corner-dr']])assert.equal(getSegmentVisualType(p,{x:1,y:1},n),type);
});
test('shared loader caches requests, releases owners and bounds unused resources',async()=>{
  const originals={Image:globalThis.Image,document:globalThis.document,location:globalThis.location};
  globalThis.document={baseURI:'http://example.test/game/'};globalThis.location={origin:'http://example.test'};
  globalThis.Image=class{set src(value){this._src=value;queueMicrotask(()=>value.includes('missing')?this.onerror():this.onload());}get src(){return this._src;}};
  try{const loader=new AssetLoader({maxUnused:2,logger:{warn(){}}});
    const first=loader.image('ok.png','a'),second=loader.image('ok.png','b');assert.equal(first,second);await first;assert.equal(loader.stats().requests,1);
    loader.release('a');assert.equal(loader.stats().owned,1);loader.release('b');assert.equal(loader.stats().owned,0);
    assert.equal(await loader.image('missing.png'),null);assert.equal(await loader.image('missing.png'),null);assert.equal(loader.stats().requests,2);
    assert.equal(await loader.image('http://other.test/image.png'),null);assert.equal(await loader.image('http://['),null);
    for(let i=0;i<8;i++)await loader.image(`${i}.png`);assert.equal(loader.stats().cached,2);
  }finally{for(const [key,value] of Object.entries(originals)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});
test('atlas draws its frame with preserved source proportions',()=>{
  let args;const target={ctx:{drawImage(...values){args=values;}}};const image={width:128,height:128};
  RenderSystem.prototype.drawSprite.call(target,{image,frame:{x:8,y:16,width:16,height:8}},50,50,32,32,0,0,false);
  assert.deepEqual(args,[image,8,16,16,8,34,42,32,16]);assert.equal(target.ctx.imageSmoothingEnabled,false);
});
test('entertainment mode cannot qualify for the normal boundary route',()=>{
  const mechanic=createBoundaryBreakMechanic(CONFIG);const game={context:{runMode:'CHEAT',nextFoodId:null},skinSystem:{hasCapability:()=>true},mapSystem:{current:{id:'normal'}},snake:{length:20},buffSystem:{has:()=>true}};
  mechanic.onScoreChanged({game,score:50});assert.equal(game.context.nextFoodId,null);
  assert.equal(mechanic.onCollision({game,collision:{edge:'bottom'},head:{x:10,y:20}}),null);
});
