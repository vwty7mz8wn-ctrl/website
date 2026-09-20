export const isEditableTarget=target=>Boolean(target?.isContentEditable||target?.closest?.('input, textarea, select, button, [contenteditable="true"]'));

export class Input {
  constructor({ target, wrap, directions, swipeMin, onAction, onEscape }) {
    this.target=target;this.wrap=wrap;this.directions=directions;this.swipeMin=swipeMin;this.onAction=onAction;this.onEscape=onEscape;this.touchStart=null;
    this.keyMap={ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'};
  }
  bind(){this.target.addEventListener('keydown',event=>this.keydown(event));this.wrap.addEventListener('touchstart',event=>this.touchstart(event),{passive:false});this.wrap.addEventListener('touchmove',event=>this.touchmove(event),{passive:false});this.wrap.addEventListener('touchend',event=>this.touchend(event),{passive:false});this.wrap.addEventListener('touchcancel',()=>{this.touchStart=null;});}
  keydown(event){if(isEditableTarget(event.target))return;if(event.key==='Escape'&&this.onEscape()) {event.preventDefault();return;}if(event.code==='Space'){event.preventDefault();this.onAction('PAUSE');return;}if((event.key==='r'||event.key==='R')){event.preventDefault();this.onAction('RESTART');return;}if(event.key==='b'||event.key==='B'){event.preventDefault();this.onAction('SKILL_B');return;}if(event.key==='A'){event.preventDefault();this.onAction('SKILL_A');return;}const name=this.keyMap[event.key];if(name){event.preventDefault();this.onAction(`MOVE_${name.toUpperCase()}`);}}
  touchstart(event){if(event.touches.length!==1)return;const touch=event.touches[0];this.touchStart={x:touch.clientX,y:touch.clientY};event.preventDefault();}
  touchmove(event){if(this.touchStart)event.preventDefault();}
  touchend(event){if(!this.touchStart)return;const touch=event.changedTouches[0],dx=touch.clientX-this.touchStart.x,dy=touch.clientY-this.touchStart.y;this.touchStart=null;if(Math.max(Math.abs(dx),Math.abs(dy))<this.swipeMin)return;event.preventDefault();this.onAction(`MOVE_${Math.abs(dx)>Math.abs(dy)?(dx>0?'RIGHT':'LEFT'):(dy>0?'DOWN':'UP')}`);}
}
