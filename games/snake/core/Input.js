export class Input {
  constructor({ target, wrap, directions, swipeMin, onDirection, onSpace, onRestart, onPausedKey, onEscape }) {
    this.target=target;this.wrap=wrap;this.directions=directions;this.swipeMin=swipeMin;this.onDirection=onDirection;this.onSpace=onSpace;this.onRestart=onRestart;this.onPausedKey=onPausedKey;this.onEscape=onEscape;this.touchStart=null;
    this.keyMap={ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'};
  }
  bind(){this.target.addEventListener('keydown',event=>this.keydown(event));this.wrap.addEventListener('touchstart',event=>this.touchstart(event),{passive:false});this.wrap.addEventListener('touchmove',event=>this.touchmove(event),{passive:false});this.wrap.addEventListener('touchend',event=>this.touchend(event),{passive:false});this.wrap.addEventListener('touchcancel',()=>{this.touchStart=null;});}
  keydown(event){if(event.key==='Escape'&&this.onEscape()) {event.preventDefault();return;}if(event.code==='Space'&&this.onSpace()) {event.preventDefault();return;}if((event.key==='r'||event.key==='R')&&this.onRestart()) {event.preventDefault();return;}if(this.onPausedKey(event.key)) {event.preventDefault();return;}const name=this.keyMap[event.key];if(name){event.preventDefault();this.onDirection(name);}}
  touchstart(event){if(event.touches.length!==1)return;const touch=event.touches[0];this.touchStart={x:touch.clientX,y:touch.clientY};event.preventDefault();}
  touchmove(event){if(this.touchStart)event.preventDefault();}
  touchend(event){if(!this.touchStart)return;const touch=event.changedTouches[0],dx=touch.clientX-this.touchStart.x,dy=touch.clientY-this.touchStart.y;this.touchStart=null;if(Math.max(Math.abs(dx),Math.abs(dy))<this.swipeMin)return;event.preventDefault();this.onDirection(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));}
}
