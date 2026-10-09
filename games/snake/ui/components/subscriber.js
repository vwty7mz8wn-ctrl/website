import {component,image,text} from '../dom.js';
import {renderHUD,renderStart,renderOver,renderController,skinCard} from './default.js';
import {help,directions,skills,pauseButton,startButton,replayButton,stats} from './packTemplates.js';
export const subscriberComponents = [
  component('subscriber/Header','Header',(root,{viewModel:vm,assets})=>image(root.querySelector('img'),vm.currentSkin.previewAsset,assets),`<header class="intro subscriber-heading"><div class="subscriber-identity"><img alt="Subscriber 001 黑猫" hidden><div><small class="pack-eyebrow">SUBSCRIBER 001</small><h1 id="game-title">贪吃蛇</h1></div></div>${help}</header>`),
  component('subscriber/HUD','HUD',renderHUD,`<section class="subscriber-score" aria-label="游戏分数"><div class="subscriber-current"><span class="label">本局分数</span><strong id="score" data-bind="score">0</strong></div><div class="subscriber-best"><span class="label">最高分</span><strong id="best-score" data-bind="best">0</strong></div>${pauseButton}</section>`),
  component('subscriber/StartScreen','StartScreen',renderStart,`<div class="start-screen subscriber-start" id="start-screen"><div class="start-copy"><img class="start-portrait" data-bind="portrait" alt="黑猫" hidden><h2>一起出发</h2>${startButton}<p class="desktop-hint">也可按 Enter / Space</p></div></div>`),
  component('subscriber/GameOver','GameOver',renderOver,`<div class="message subscriber-result" id="message" hidden><div class="message-copy"><div class="subscriber-result-heading"><img data-bind="portrait" alt="黑猫" hidden><h2 class="message-title">本局结束</h2></div>${stats}${replayButton}<p id="outside-note" hidden>OUTSIDE 已发现</p></div></div>`),
  component('subscriber/Controller','Controller',renderController,`<nav class="touch-controls subscriber-controller" id="touch-controls" aria-label="触控控制器" hidden><div class="subscriber-pad">${directions}</div>${skills}</nav>`),
  {id:'subscriber/SkinCard',renderCard(args){const card=skinCard(args);card.classList.add('subscriber-card');text(card,'small','黑猫 · 红白围巾 · 纪念布局');return card;}}
];
