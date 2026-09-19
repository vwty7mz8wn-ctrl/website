export class GridSystem {
  constructor(grid = { cols:20, rows:20 }) { this.cellSize=0;this.setGrid(grid); }
  setGrid(grid) { this.cols=grid?.cols??20;this.rows=grid?.rows??20;return this; }
  setCellSize(cellSize) { this.cellSize=cellSize;return this; }
  getCellSize() { return this.cellSize; }
  gridToWorld(x,y) { return { x,y }; }
  worldToGrid(x,y) { return { x:Math.floor(x),y:Math.floor(y) }; }
}
