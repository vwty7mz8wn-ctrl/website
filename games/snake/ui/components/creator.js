import {component} from '../dom.js';
import {renderHUD,renderStart,renderOver,renderController} from './default.js';
import {help,directions,skills,pauseButton,startButton,replayButton,stats} from './packTemplates.js';
export const creatorComponents = [
  component('creator/Header','Header',()=>{},`<header class="intro creator-heading"><div><small class="pack-eyebrow">CREATOR / FIELD TERMINAL</small><h1 id="game-title">贪吃蛇</h1></div>${help}</header>`),
  component('creator/HUD','HUD',renderHUD,`<aside class="creator-instruments" aria-label="游戏参数"><p class="pack-eyebrow">RUN PARAMETERS</p><dl><div><dt>分数 / SCORE</dt><dd id="score" data-bind="score">0</dd></div><div><dt>最高 / BEST</dt><dd id="best-score" data-bind="best">0</dd></div><div><dt>长度 / LENGTH</dt><dd data-bind="length">3</dd></div><div><dt>用时 / TIME</dt><dd data-bind="time">00:00</dd></div></dl>${pauseButton}</aside>`),
  component('creator/StartScreen','StartScreen',renderStart,`<div class="start-screen creator-start" id="start-screen"><div class="start-copy"><small class="pack-eyebrow">SYSTEM READY</small><h2>开始本局</h2><dl class="boot-info"><div><dt>PROFILE</dt><dd data-bind="skin"></dd></div><div><dt>LEVEL</dt><dd data-bind="difficulty"></dd></div></dl>${startButton}<p class="desktop-hint">ENTER / SPACE</p></div></div>`),
  component('creator/GameOver','GameOver',renderOver,`<div class="message creator-result" id="message" hidden><div class="message-copy"><small class="pack-eyebrow">RUN REPORT</small><h2 class="message-title">本局结束</h2>${stats}${replayButton}<p id="outside-note" hidden>OUTSIDE 已发现</p></div></div>`),
  component('creator/Controller','Controller',renderController,`<nav class="touch-controls creator-controller" id="touch-controls" aria-label="触控控制器" hidden><section class="controller-bank">${directions}</section><section class="controller-bank">${skills}</section></nav>`)
];
