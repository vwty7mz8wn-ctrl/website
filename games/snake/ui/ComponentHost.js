import {UI_SLOTS} from '../systems/ThemeContextResolver.js';
const bootstrap={Header:'.intro',HUD:'.scoreboard',Status:'#status-slot',StartScreen:'#start-screen',PauseOverlay:'#pause-overlay',GameOver:'#message',SkinSelector:'#appearance-panel',RedeemModal:'#redeem-modal',CheatAuthModal:'#verification-modal',Controller:'#touch-controls',WorldViewport:'.viewport-stage',Setup:'.game-controls'};
const topSlots=['Header','HUD','Status','Setup','WorldViewport','Controller'];

export class ComponentHost {
  constructor({root,registry,assets,logger=console}){
    Object.assign(this,{root,registry,assets,logger});this.hosts=new Map();this.bases=new Map();this.mounted=new Map();this.tokens=new Set();this.sequence=0;this.layoutKey='';this.contextKey='';this.pending=new Set();
    for(const slot of UI_SLOTS){const base=document.querySelector(bootstrap[slot]);if(!base)throw new Error(`Missing default slot: ${slot}`);const host=document.createElement('div');host.dataset.uiSlot=slot;host.className='ui-slot';base.replaceWith(host);host.append(base);this.hosts.set(slot,host);this.bases.set(slot,base);}
  }
  warn(slot,error){this.logger.warn(`[Snake UI] ${slot} → Default`,error);}
  arrange(context){
    const key=JSON.stringify([context.layoutVariantId,context.regions]);if(key===this.layoutKey)return;
    const arrange=regions=>{
      const names=regions.flatMap(region=>region.slots);if(names.length!==topSlots.length||new Set(names).size!==topSlots.length||!topSlots.every(slot=>names.includes(slot)))throw new Error('Layout must place each top-level slot exactly once');
      const containers=regions.map(region=>{const node=document.createElement('div');node.className='theme-region';node.dataset.region=region.id;region.slots.forEach(slot=>node.append(this.hosts.get(slot)));return node;});
      this.root.replaceChildren(...containers,this.hosts.get('RedeemModal'),this.hosts.get('CheatAuthModal'));
    };
    try{arrange(context.regions);this.root.dataset.layout=context.layoutVariantId;}catch(error){this.warn('Layout',error);arrange([{id:'main',slots:topSlots}]);this.root.dataset.layout='default';}
    this.layoutKey=key;
  }
  applyTokens(context){
    const key=JSON.stringify(context.tokens);if(key===this.contextKey)return;
    // Remove only properties owned by this host; never mutate global stylesheet rules.
    for(const token of this.tokens)document.body.style.removeProperty(token);this.tokens.clear();
    for(const [token,value] of Object.entries(context.tokens)){if(/^--ui-[a-z-]+$/.test(token)&&typeof value==='string'){document.body.style.setProperty(token,value);this.tokens.add(token);}}
    this.contextKey=key;
  }
  disposeSlot(slot){const entry=this.mounted.get(slot);if(!entry)return;entry.abort.abort();try{entry.instance.dispose?.();}catch(error){this.warn(slot,error);}this.assets.release(entry.owner);this.mounted.delete(slot);}
  install(slot,definition,requested,args){
    this.disposeSlot(slot);const abort=new AbortController(),owner=`ui:${slot}:${++this.sequence}`;
    try{
      const instance=definition.mount({baseElement:this.bases.get(slot),assets:this.assets.scope(owner),signal:abort.signal,cardRegistry:this.registry,logger:this.logger,...args});
      if(!instance?.element||!(instance.element instanceof HTMLElement)||typeof instance.update!=='function')throw new Error('Invalid component contract');
      if(slot==='WorldViewport'&&instance.element!==this.bases.get(slot))throw new Error('WorldViewport must preserve the engine surface');
      this.hosts.get(slot).replaceChildren(instance.element);instance.element.dataset.component=definition.id;
      const entry={requested,definition,instance,abort,owner};this.mounted.set(slot,entry);instance.update(args);return entry;
    }catch(error){abort.abort();this.assets.release(owner);this.warn(slot,error);if(definition.id===`default/${slot}`)throw error;return this.install(slot,this.registry.get(`default/${slot}`),requested,args);}
  }
  render(viewModel,actions,themeContext){
    this.arrange(themeContext);this.applyTokens(themeContext);
    const args={viewModel,actions,themeContext};this.latestArgs=args;
    for(const slot of UI_SLOTS){
      const requested=themeContext.components[slot]??`default/${slot}`,fallback=this.registry.get(`default/${slot}`),definition=this.registry.get(requested);
      let entry=this.mounted.get(slot);
      if(!entry||entry.requested!==requested){
        if(!definition)this.warn(slot,new Error(`Unregistered component: ${requested}`));
        entry=this.install(slot,definition?.mount?definition:fallback,requested,args);
        if(definition?.load){const generation=entry.owner;const task=Promise.resolve().then(()=>definition.load()).then(loaded=>{if(this.mounted.get(slot)?.owner!==generation)return;this.install(slot,{id:requested,...loaded},requested,this.latestArgs);}).catch(error=>this.warn(slot,error)).finally(()=>this.pending.delete(task));this.pending.add(task);}
      }else{try{entry.instance.update(args);}catch(error){this.warn(slot,error);if(entry.definition.id!==`default/${slot}`)this.install(slot,fallback,requested,args);}}
    }
  }
  getElement(slot){return this.mounted.get(slot)?.instance.element??this.bases.get(slot);}
  dispose(){for(const slot of UI_SLOTS)this.disposeSlot(slot);for(const token of this.tokens)document.body.style.removeProperty(token);this.tokens.clear();}
  stats(){return {mounted:this.mounted.size,pending:this.pending.size,sequence:this.sequence};}
}
