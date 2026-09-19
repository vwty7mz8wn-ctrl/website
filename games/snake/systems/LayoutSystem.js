const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

export class LayoutSystem {
  constructor({ viewport, canvas, gridSystem, config, eventBus }) {
    this.viewportElement=viewport;this.canvas=canvas;this.gridSystem=gridSystem;this.config=config;this.eventBus=eventBus;this.viewport={ width:canvas.width,height:canvas.height,cellSize:canvas.width/gridSystem.cols,cols:gridSystem.cols,rows:gridSystem.rows };this.onChange=null;
    this.resize=()=>this.update();this.observer=new ResizeObserver(this.resize);this.observer.observe(viewport.parentElement);window.addEventListener('resize',this.resize);eventBus.on('map:enter',({map})=>{this.gridSystem.setGrid(map.grid);this.update();});this.update();
  }
  setOnChange(callback) { this.onChange=callback; }
  update() {
    const { minCellSize,maxCellSize,viewportPadding }=this.config.layout;
    const availableWidth=Math.max(0,this.viewportElement.parentElement.clientWidth-viewportPadding*2);
    const availableHeight=Math.max(0,Math.min(availableWidth*(this.gridSystem.rows/this.gridSystem.cols),window.innerHeight*.72)-viewportPadding*2);
    const raw=Math.min(availableWidth/this.gridSystem.cols,availableHeight/this.gridSystem.rows);
    const cellSize=Math.round(clamp(raw,minCellSize,maxCellSize)*100)/100;
    const width=Math.round(cellSize*this.gridSystem.cols),height=Math.round(cellSize*this.gridSystem.rows);
    const changed=width!==this.canvas.width||height!==this.canvas.height;
    this.gridSystem.setCellSize(cellSize);this.viewport={ width,height,cellSize,cols:this.gridSystem.cols,rows:this.gridSystem.rows };
    this.canvas.width=width;this.canvas.height=height;this.viewportElement.style.width=`${width}px`;this.viewportElement.style.height=`${height}px`;
    if(changed){this.eventBus.emit('layout:change',{viewport:this.viewport});this.onChange?.(this.viewport);}
    return this.viewport;
  }
  worldToScreen(position,camera={x:0,y:0}) { const cellSize=this.gridSystem.getCellSize();return { x:(position.x-(camera.x??0))*cellSize,y:(position.y-(camera.y??0))*cellSize }; }
}
