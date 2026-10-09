import { GameState,RunMode } from '../core/GameState.js';
import { isEditableTarget } from '../core/Input.js';
import { freezeSnapshot } from './Immutable.js';
import { buildViewModel } from '../ui/ViewModel.js';

// One action router and one state source for every theme component.
export class UISystem {
  constructor({game,skinSystem,profileService,redeemService,saveService,eventBus,foodRegistry,resolver,host,skillSets,assetLoader}) {
    Object.assign(this,{game,skinSystem,redeemService,eventBus,foodRegistry,resolver,host,skillSets,assetLoader});this.profile=profileService;this.save=saveService;
    this.konami=[];this.returnState=GameState.PAUSED;this.modalErrors={};this.notice='';this.selectorOpen=false;
    this.skill={active:null,until:0,cooldowns:{BUTTON_B:0,BUTTON_A:0}};this.skillTimer=null;this.runDefinition=null;this.subscriptions=[];this.bound=false;this.lastRender='';this.assetOwner=null;
    this.actions=Object.freeze({start:()=>this.start(),pause:()=>this.pause(),resume:()=>this.resume(),restart:()=>this.restart(),openSkinSelector:()=>this.openSkinSelector(),equipSkin:id=>this.equipSkin(id),openRedeem:()=>this.openRedeem(),submitRedeem:code=>this.submitRedeem(code),closeModal:()=>this.closeModal(),move:name=>this.action(`MOVE_${String(name).toUpperCase()}`),activateSkill:token=>this.action(token),confirm:code=>this.confirm(code),cancel:()=>this.cancel(),chooseDifficulty:id=>this.chooseDifficulty(id),control:token=>this.action(token)});
  }
  bind(){
    if(this.bound)return;this.bound=true;
    this.click=event=>{const button=event.target.closest('[data-ui-action]');if(!button||!this.host.root.contains(button)||button.disabled)return;this.actions[button.dataset.uiAction]?.(button.dataset.uiArg);};
    this.submit=event=>{const form=event.target.closest('[data-ui-form]');if(!form)return;event.preventDefault();this.confirm(form.elements.code?.value??'');};
    this.toggle=event=>{if(event.target.dataset.uiPanel==='selector'){this.selectorOpen=event.target.open&&this.canSetup();this.update();}};
    this.keydown=event=>{if(!isEditableTarget(event.target)&&event.key==='Enter'&&this.start())event.preventDefault();};
    this.resize=()=>this.update();
    this.host.root.addEventListener('click',this.click);this.host.root.addEventListener('submit',this.submit);this.host.root.addEventListener('toggle',this.toggle,true);document.addEventListener('keydown',this.keydown);window.addEventListener('resize',this.resize);
    const on=(name,callback)=>this.subscriptions.push(this.eventBus.on(name,callback));
    on('game:start',()=>{const skin=this.skinSystem.beginRun(),set=this.skillSets.get(skin.skillSetId)??this.skillSets.get('default');this.runDefinition=freezeSnapshot({skinId:skin.id,mechanicIds:skin.mechanics,skillSetId:set.id,skills:set.slots});this.konami=[];this.selectorOpen=false;this.host.getElement('Header').querySelector('details')?.removeAttribute('open');this.releaseControlFocus();this.update();});
    on('game:resume',()=>{this.konami=[];this.releaseControlFocus();this.update();});
    on('game:pause',()=>{this.releaseControlFocus();this.update();});
    on('game:restart',()=>{this.skinSystem.endRun();this.resolver.clearEvents();this.konami=[];this.notice='';this.update();});
    on('game:over',()=>this.recordRun());
    on('secret:discover',({secretId})=>{this.profile.discover(secretId);this.update();});
    on('mode:change',({mode})=>{if(mode===RunMode.CHEAT)this.resolver.setEvent('run:cheat',{uiThemeId:'cheat-context'});else this.resolver.clearEvent('run:cheat');this.update();});
    on('theme:event:start',({id,overlay})=>{this.resolver.setEvent(id,overlay);this.update();});on('theme:event:end',({id})=>{this.resolver.clearEvent(id);this.update();});
    ['score:change','skin:equip','skin:unlock','buff:add','buff:remove','map:enter','map:leave','ui:modal-open','ui:modal-close'].forEach(name=>on(name,()=>this.update()));
    // Poll only clocks/cooldowns; unchanged snapshots do not touch the DOM.
    this.ticker=window.setInterval(()=>this.update(),100);this.update();
  }
  canSetup(){return [GameState.READY,GameState.GAME_OVER].includes(this.game.state);}
  releaseControlFocus(){if(document.activeElement?.matches('button, summary'))document.activeElement.blur();}
  start(){if(this.game.state!==GameState.READY)return false;this.game.start();return true;}
  pause(){if(this.game.state!==GameState.RUNNING)return false;this.game.pause();return true;}
  resume(){if(this.game.state!==GameState.PAUSED)return false;this.game.start();return true;}
  restart(){if(![GameState.PAUSED,GameState.GAME_OVER].includes(this.game.state))return false;this.clearSkill();this.skill.cooldowns={BUTTON_B:0,BUTTON_A:0};this.skinSystem.endRun();this.game.reset();return this.start();}
  chooseDifficulty(id){if(!this.game.chooseDifficulty(id))return false;this.save.update(save=>{save.settings.difficulty=id;});this.update();return true;}
  openSkinSelector(){if(!this.canSetup())return false;this.selectorOpen=true;this.update();return true;}
  equipSkin(id){if(!this.canSetup()||!this.skinSystem.equip(id))return false;this.clearSkill();this.konami=[];this.selectorOpen=false;this.notice=`已装备 ${this.skinSystem.current.displayName}`;if(this.game.state===GameState.READY)this.game.reset();else this.game.render();this.update();return true;}
  action(token){
    if(token==='BUTTON_FUNC'){if(this.game.state===GameState.READY)return this.start();if(this.game.state===GameState.RUNNING)return this.pause();if(this.game.state===GameState.PAUSED)return this.resume();if(this.game.state===GameState.GAME_OVER)return this.restart();return false;}
    if(token==='PAUSE'){if(this.game.state===GameState.MODAL)return true;if(this.game.state===GameState.READY)return this.start();return this.game.state===GameState.PAUSED?this.resume():this.pause();}
    if(token==='RESTART')return this.restart();
    if(token.startsWith('MOVE_')){if(this.game.state===GameState.PAUSED)return this.pausedAction(token);if(this.game.state!==GameState.RUNNING)return false;return this.game.queueDirection(this.game.config.directions[token.slice(5).toLowerCase()]);}
    if(token==='BUTTON_A'||token==='BUTTON_B')return this.game.state===GameState.PAUSED?this.pausedAction(token):this.triggerSkill(token);
    return false;
  }
  pausedAction(token){if(this.game.state!==GameState.PAUSED||this.game.context.runMode!==RunMode.NORMAL)return false;this.konami.push(token);if(this.konami.length>10)this.konami.shift();const sequence=['MOVE_UP','MOVE_UP','MOVE_DOWN','MOVE_DOWN','MOVE_LEFT','MOVE_RIGHT','MOVE_LEFT','MOVE_RIGHT','BUTTON_B','BUTTON_A'];if(sequence.every((entry,index)=>this.konami[index]===entry)){this.konami=[];this.openCheat();}return true;}
  triggerSkill(token){if(this.game.state!==GameState.RUNNING||this.skill.active||performance.now()<this.skill.cooldowns[token])return false;const definition=this.runDefinition?.skills[token]??this.skillSets.get('default').slots[token];if(!definition)return false;this.skill.active=token;this.skill.until=performance.now()+definition.duration;this.skill.cooldowns[token]=performance.now()+definition.cooldown;this.game.context.speedMultiplier=definition.speedMultiplier;this.game.schedule();this.skillTimer=window.setTimeout(()=>{if(this.skill.active===token){this.clearSkill();if(this.game.state===GameState.RUNNING)this.game.schedule();this.update();}},definition.duration);this.update();return true;}
  clearSkill(){window.clearTimeout(this.skillTimer);this.skillTimer=null;this.skill.active=null;this.skill.until=0;this.game.context.speedMultiplier=1;}
  openCheat(){if(this.game.state!==GameState.PAUSED)return false;this.returnState=GameState.PAUSED;this.modalErrors.cheat='';this.game.openModal('cheat');this.update();return true;}
  openRedeem(){if(!this.canSetup())return false;this.returnState=this.game.state;this.modalErrors.redeem='';this.game.openModal('redeem');this.update();return true;}
  closeModal(){if(this.game.state!==GameState.MODAL)return false;const next=this.game.context.activeModal==='cheat'?GameState.PAUSED:this.returnState;this.game.closeModal(next);this.update();return true;}
  confirm(code){if(this.game.context.activeModal==='redeem')return this.submitRedeem(code);if(this.game.context.activeModal!=='cheat'||this.game.state!==GameState.MODAL)return false;if(String(code).trim().toLowerCase()!=='mario'){this.modalErrors.cheat='口令不正确，请重试。';this.update();return false;}this.game.setRunMode(RunMode.CHEAT);this.game.buffSystem.remove('break');if(this.game.food?.definition.id==='break')this.game.food.definition=this.foodRegistry.get('normal');return this.closeModal();}
  submitRedeem(code){if(this.game.state!==GameState.MODAL||this.game.context.activeModal!=='redeem')return false;const result=this.redeemService.redeem(String(code));if(!result.success){this.modalErrors.redeem=result.message;this.update();return false;}this.closeModal();if(result.rewardType==='skin'){this.skinSystem.unlock(result.rewardId);this.equipSkin(result.rewardId);}this.notice=result.message;this.selectorOpen=true;this.update();return true;}
  cancel(){if(this.game.state===GameState.MODAL)return this.closeModal();this.selectorOpen=false;this.update();return true;}
  escape(){return this.game.state===GameState.MODAL?this.closeModal():false;}
  recordRun(){const category=this.game.context.runMode===RunMode.CHEAT?'cheatBestScore':this.game.context.runMode===RunMode.ASSISTED?'assistedBestScore':'normalBestScore';this.save.update(save=>{save.stats[category]=Math.max(save.stats[category],this.game.score.value);save.stats.totalRuns++;save.stats.totalScore+=this.game.score.value;});this.update();}
  update(){
    const themeContext=this.resolver.resolve({skin:this.skinSystem.current,map:this.game.mapSystem.current,mobile:window.innerWidth<=760});
    const vm=buildViewModel({game:this.game,skinSystem:this.skinSystem,profile:this.profile,save:this.save,skill:this.skill,resolver:this.resolver,modalErrors:this.modalErrors,notice:this.notice,selectorOpen:this.selectorOpen});
    this.viewModel=vm;this.themeContext=themeContext;
    const key=JSON.stringify([vm,themeContext]);if(key===this.lastRender)return;this.lastRender=key;
    if(document.body.dataset.gameState!==vm.gameState)document.body.dataset.gameState=vm.gameState;
    document.body.classList.toggle('modal-open',vm.gameState===GameState.MODAL);
    if(this.assetOwner!==themeContext.pack.id){if(this.assetOwner)this.assetLoader.release(`theme:${this.assetOwner}`);this.assetOwner=themeContext.pack.id;this.assetLoader.preload(themeContext.assets,`theme:${this.assetOwner}`);}
    this.host.render(vm,this.actions,themeContext);
  }
  dispose(){if(!this.bound)return;this.bound=false;window.clearInterval(this.ticker);this.clearSkill();this.subscriptions.splice(0).forEach(off=>off());this.host.root.removeEventListener('click',this.click);this.host.root.removeEventListener('submit',this.submit);this.host.root.removeEventListener('toggle',this.toggle,true);document.removeEventListener('keydown',this.keydown);window.removeEventListener('resize',this.resize);if(this.assetOwner)this.assetLoader.release(`theme:${this.assetOwner}`);this.host.dispose();}
}
