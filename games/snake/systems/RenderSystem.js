export class RenderSystem {
  constructor(canvas, config) { this.canvas=canvas; this.ctx=canvas.getContext('2d'); this.config=config; }
  render(game) {
    const {ctx,canvas}=this, cell=canvas.width/this.config.gridSize, map=game.mapSystem.current, cameraY=game.cameraSystem.y;
    const visibleY=y=>(y-cameraY)*cell;
    ctx.fillStyle='#0b0c0c';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle='#171919';ctx.lineWidth=1;
    const start=Math.floor(cameraY)-1,end=Math.ceil(cameraY)+this.config.gridSize+1;
    for(let x=0;x<=map.width;x+=1){const px=Math.round(x*cell)+.5;ctx.beginPath();ctx.moveTo(px,0);ctx.lineTo(px,canvas.height);ctx.stroke();}
    for(let y=start;y<=end;y+=1){const py=Math.round(visibleY(y))+.5;if(map.id==='normal'||(Math.abs(y)%2===0&&Math.abs(y%5)!==1)){ctx.beginPath();ctx.moveTo(0,py);ctx.lineTo(canvas.width,py);ctx.stroke();}}
    if(map.id==='outside'){ctx.fillStyle='#242626';for(let y=Math.max(20,start);y<end;y+=1)for(let x=0;x<map.width;x+=1)if((x*17+y*11)%29===0)ctx.fillRect(x*cell+cell*.42,visibleY(y)+cell*.42,cell*.16,cell*.16);}
    this.drawBoundary(game,cell,visibleY);this.drawFood(game,cell,visibleY);
    game.snake.segments.forEach((segment,index)=>{const y=visibleY(segment.y);if(y<-cell||y>canvas.height)return;ctx.fillStyle=index===0?'#e8e9e7':'#c8cac8';ctx.fillRect(segment.x*cell+2,y+2,cell-4,cell-4);});
  }
  drawBoundary(game,cell,visibleY){const map=game.mapSystem.registry.get('normal');const {ctx}=this,{outside}=this.config,bottom=visibleY(map.height)+.5,top=visibleY(0)+.5,start=outside.weakWallStart*cell,end=(outside.weakWallEnd+1)*cell;ctx.strokeStyle='#5e6160';ctx.beginPath();ctx.moveTo(.5,top);ctx.lineTo(this.canvas.width-.5,top);ctx.moveTo(.5,top);ctx.lineTo(.5,bottom);ctx.moveTo(this.canvas.width-.5,top);ctx.lineTo(this.canvas.width-.5,bottom);ctx.moveTo(0,bottom);ctx.lineTo(start,bottom);ctx.moveTo(end,bottom);ctx.lineTo(this.canvas.width,bottom);ctx.stroke();if(game.context.boundaryBroken){ctx.strokeStyle='#8d9190';ctx.beginPath();ctx.moveTo(start,bottom-5);ctx.lineTo(start+5,bottom);ctx.moveTo(end-5,bottom);ctx.lineTo(end,bottom-5);ctx.stroke();}else{ctx.strokeStyle=game.buffSystem.has('break')?'#b7b9b8':'#444646';ctx.beginPath();ctx.moveTo(start,bottom);ctx.lineTo(end,bottom);ctx.stroke();}}
  drawFood(game,cell,visibleY){const {ctx}=this,food=game.world.entities.get('food');if(!food)return;const x=food.x*cell,y=visibleY(food.y);if(food.definition.id==='break'){ctx.strokeStyle='#d4d6d4';ctx.strokeRect(x+6,y+6,cell-12,cell-12);ctx.fillStyle='#d4d6d4';ctx.fillRect(x+cell/2-2,y+cell/2-2,4,4);}else{ctx.fillStyle='#8d9190';ctx.fillRect(x+4,y+4,cell-8,cell-8);}}
}
