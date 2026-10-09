import {component,element,text,prop,attr,action,image} from '../dom.js';
import {timeText} from '../ViewModel.js';
const labels={READY:'准备',RUNNING:'游戏中',PAUSED:'已暂停',GAME_OVER:'本局结束',MODAL:'验证中',TRANSITION:'切换中'};

export function renderHUD(root,{viewModel:vm}) {
  text(root,'[data-bind="score"], #score',vm.score);text(root,'[data-bind="best"], #best-score',vm.bestScore);
  text(root,'[data-bind="length"]',vm.length);text(root,'[data-bind="time"]',timeText(vm.elapsedTime));
  const button=root.querySelector('[data-role="pause"], #pause-button');prop(button,'hidden',!vm.canControl);prop(button,'disabled',!vm.canControl);
  if(button){prop(button,'textContent',vm.gameState==='PAUSED'?'继续':'暂停');action(button,vm.gameState==='PAUSED'?'resume':'pause');}
}
export function renderStatus(root,{viewModel:vm}){
  text(root,'#state-status',labels[vm.gameState]);
  prop(root.querySelector('#mode-status'),'hidden',vm.runMode!=='CHEAT');
  prop(root.querySelector('#world-status'),'hidden',!(vm.currentMap.id==='outside'&&vm.currentMap.known));
  const buff=vm.activeBuffs.map(entry=>entry.displayName).join(' · ');text(root,'#buff-status',buff);prop(root.querySelector('#buff-status'),'hidden',!buff);
  prop(root.querySelector('#special-status'),'hidden',vm.runMode!=='CHEAT'&&!(vm.currentMap.id==='outside'&&vm.currentMap.known)&&!buff);
}
export function renderStart(root,{viewModel:vm,assets}){
  prop(root,'hidden',vm.gameState!=='READY');const button=root.querySelector('[data-role="start"], #start-button');action(button,'start');prop(button,'disabled',vm.gameState!=='READY');
  text(root,'[data-bind="skin"]',vm.currentSkin.displayName);text(root,'[data-bind="difficulty"]',{easy:'简单',normal:'普通',hard:'困难'}[vm.difficulty]);
  image(root.querySelector('[data-bind="portrait"]'),vm.currentSkin.previewAsset,assets);
}
export function renderPause(root,{viewModel:vm}){prop(root,'hidden',vm.gameState!=='PAUSED');action(root.querySelector('#restart-button'),'restart');}
export function renderOver(root,{viewModel:vm,assets}){
  prop(root,'hidden',vm.gameState!=='GAME_OVER');text(root,'[data-bind="score"], #final-score',vm.score);text(root,'[data-bind="best"], #final-best',vm.bestScore);text(root,'[data-bind="length"], #final-length',vm.length);text(root,'[data-bind="time"], #final-time',timeText(vm.elapsedTime));
  const button=root.querySelector('[data-role="replay"], #play-again-button');action(button,'restart');prop(button,'disabled',vm.gameState!=='GAME_OVER');
  prop(root.querySelector('#game-over-stats'),'hidden',false);prop(root.querySelector('#outside-note'),'hidden',!vm.discoveredContent.discoveries.includes('outside-discovered'));
  image(root.querySelector('[data-bind="portrait"]'),vm.currentSkin.previewAsset,assets);
}
export function renderController(root,{viewModel:vm,themeContext}){
  prop(root,'hidden',!vm.canControl);
  root.querySelectorAll('[data-direction]').forEach(button=>{action(button,'move',button.dataset.direction);prop(button,'disabled',!vm.canControl);});
  const func=root.querySelector('[data-control="BUTTON_FUNC"]');action(func,'control','BUTTON_FUNC');prop(func,'disabled',!vm.canControl);text(root,'#func-label',vm.gameState==='PAUSED'?'继续':'暂停');attr(func,'aria-label',vm.gameState==='PAUSED'?'继续':'暂停');
  for(const token of ['BUTTON_B','BUTTON_A']){const button=root.querySelector(`[data-control="${token}"]`),skill=vm.skillStates[token];if(!button)continue;action(button,'control',token);prop(button,'disabled',!skill.enabled);attr(button,'data-state',skill.active?'active':skill.cooldownRemaining?'cooldown':'idle');const caption=themeContext.skillLabels[token];text(button,'span',caption?.name??token);attr(button,'aria-label',caption?.name??token);text(button,'strong',vm.gameState==='RUNNING'?(skill.active?'生效':skill.cooldownRemaining?`${(skill.cooldownRemaining/1000).toFixed(1)}s`:''):'');}
}
function renderModal(kind){let active=false,lastError='';return (root,{viewModel:vm})=>{
  const open=vm.modal.id===kind;prop(root,'hidden',!open);
  const form=root.querySelector('form'),input=root.querySelector('input');form.dataset.uiForm=kind;input.name='code';action(root.querySelector('.dialog-close'),'cancel');
  text(root,'.dialog-error',vm.modal.error);
  if(open&&!active){form.reset();requestAnimationFrame(()=>{if(!root.hidden&&root.isConnected)input.focus();});}
  if(open&&vm.modal.error&&vm.modal.error!==lastError)requestAnimationFrame(()=>input.select());
  active=open;lastError=vm.modal.error;
};}
export function skinCard({skin,selected,canSetup,assets}){
  const card=element('<article class="skin-card"><div class="skin-art"><img alt="皮肤预览" hidden><span aria-hidden="true">■</span></div><div class="skin-description"><h3></h3><p></p><small></small></div><button class="skin-button" type="button"></button></article>');
  text(card,'h3',skin.displayName);text(card,'p',skin.description);text(card,'small',skin.themeFeature===skin.description?'':skin.themeFeature);
  image(card.querySelector('img'),skin.previewAsset,assets);if(skin.previewAsset)card.querySelector('.skin-art span').hidden=true;
  const button=card.querySelector('button');button.dataset.skin=skin.id;action(button,'equipSkin',skin.id);prop(button,'disabled',!canSetup);prop(button,'textContent',selected?'已装备':'装备');attr(button,'aria-pressed',selected);
  return card;
}
export function selectorComponent(){return {id:'default/SkinSelector',mount({baseElement,assets,cardRegistry,logger}){
  const node=baseElement;node.dataset.uiPanel='selector';node.innerHTML='<summary>外观</summary><div class="skin-controls"><div class="skin-catalog"></div><p class="selector-notice" role="status"></p><button class="redeem-button" id="redeem-button" type="button" data-ui-action="openRedeem">兑换皮肤</button></div>';
  let listKey='';
  return {element:node,update({viewModel:vm,themeContext}){
    prop(node,'hidden',!vm.canSetup);prop(node,'open',vm.canSetup&&vm.selectorOpen);
    const key=JSON.stringify([vm.discoveredContent.skins,vm.currentSkin.id,vm.canSetup]);
    if(key!==listKey){const cards=vm.discoveredContent.skins.map(skin=>{const args={skin,selected:skin.id===vm.currentSkin.id,canSetup:vm.canSetup,assets,themeContext};try{const factory=cardRegistry.get(skin.selectorCardId)?.renderCard??skinCard;const card=factory(args);if(!(card instanceof HTMLElement))throw new Error('Invalid skin card');return card;}catch(error){logger.warn('[Snake UI] Skin card fallback',error);return skinCard(args);}});node.querySelector('.skin-catalog').replaceChildren(...cards);listKey=key;}
    text(node,'.selector-notice',vm.notice);prop(node.querySelector('#redeem-button'),'disabled',!vm.canSetup);
  },dispose(){}};
}};}
export const defaultComponents=[
  component('default/Header','Header',()=>{}),component('default/HUD','HUD',renderHUD),component('default/Status','Status',renderStatus),component('default/StartScreen','StartScreen',renderStart),component('default/PauseOverlay','PauseOverlay',renderPause),component('default/GameOver','GameOver',renderOver),selectorComponent(),
  {id:'default/RedeemModal',mount({baseElement}){const render=renderModal('redeem');return {element:baseElement,update:args=>render(baseElement,args),dispose(){}};}},
  {id:'default/CheatAuthModal',mount({baseElement}){const render=renderModal('cheat');return {element:baseElement,update:args=>render(baseElement,args),dispose(){}};}},
  component('default/Controller','Controller',renderController),component('default/WorldViewport','WorldViewport',()=>{}),
  component('default/Setup','Setup',(root,{viewModel:vm})=>{root.querySelectorAll('[data-difficulty]').forEach(button=>{action(button,'chooseDifficulty',button.dataset.difficulty);prop(button,'disabled',!vm.canSetup);attr(button,'aria-pressed',button.dataset.difficulty===vm.difficulty);});}),
  {id:'default/SkinCard',renderCard:skinCard}
];
