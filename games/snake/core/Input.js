export const isEditableTarget=target=>Boolean(target?.isContentEditable||target?.closest?.('input, textarea, select, button, [contenteditable="true"]'));

export class Input {
  constructor({ target, wrap, directions, swipeMin, onAction, onEscape }) {
    this.target=target;this.wrap=wrap;this.directions=directions;this.swipeMin=swipeMin;this.onAction=onAction;this.onEscape=onEscape;this.pointerStart=null;
    this.keyMap={ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'};
  }
  bind(){this.target.addEventListener('keydown',event=>this.keydown(event));this.wrap.addEventListener('pointerdown',event=>this.pointerdown(event));this.wrap.addEventListener('pointermove',event=>this.pointermove(event));this.wrap.addEventListener('pointerup',event=>this.pointerup(event));this.wrap.addEventListener('pointercancel',()=>{this.pointerStart=null;});}
  keydown(event){if(isEditableTarget(event.target))return;if(event.key==='Escape'&&this.onEscape()) {event.preventDefault();return;}if(event.code==='Space'){event.preventDefault();this.onAction('PAUSE');return;}if(event.key==='r'||event.key==='R'){event.preventDefault();this.onAction('RESTART');return;}if(event.key==='b'||event.key==='B'){event.preventDefault();this.onAction('SKILL_B');return;}if(event.key==='A'){event.preventDefault();this.onAction('SKILL_A');return;}const name=this.keyMap[event.key];if(name){event.preventDefault();this.onAction(`MOVE_${name.toUpperCase()}`);}}
  pointerdown(event){if(event.pointerType==='mouse'&&event.button!==0)return;this.pointerStart={id:event.pointerId,x:event.clientX,y:event.clientY};this.wrap.setPointerCapture?.(event.pointerId);}
  pointermove(event){if(this.pointerStart?.id===event.pointerId)event.preventDefault();}
  pointerup(event){if(!this.pointerStart||this.pointerStart.id!==event.pointerId)return;const {x,y}=this.pointerStart,dx=event.clientX-x,dy=event.clientY-y;this.pointerStart=null;this.wrap.releasePointerCapture?.(event.pointerId);if(Math.max(Math.abs(dx),Math.abs(dy))<this.swipeMin)return;event.preventDefault();this.onAction(`MOVE_${Math.abs(dx)>Math.abs(dy)?(dx>0?'RIGHT':'LEFT'):(dy>0?'DOWN':'UP')}`);}
}
