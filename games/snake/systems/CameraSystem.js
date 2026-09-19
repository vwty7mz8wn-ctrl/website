export class CameraSystem {
  constructor(eventBus) { this.x=0;this.y=0;this.mode='fixed';eventBus.on('map:enter',({map})=>{this.mode=map.cameraMode;}); }
  reset() { this.x=0;this.y=0;this.mode='fixed'; }
  update(target) { const desired=this.mode==='follow' ? Math.max(0,target.y-12) : 0; this.y+=Math.max(-1.2,Math.min(1.2,(desired-this.y)*.3)); if(Math.abs(desired-this.y)<.02)this.y=desired; return this.y; }
}
