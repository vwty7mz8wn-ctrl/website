export class AssetLoader {
  constructor() { this.images=new Map(); }
  image(path) { if(!path) return Promise.resolve(null); if(!this.images.has(path)) this.images.set(path,new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>resolve(null);image.src=path;})); return this.images.get(path); }
  loadSkin(skin) { const names=['head-up','head-down','head-left','head-right','tail-up','tail-down','tail-left','tail-right','body-horizontal','body-vertical','corner-ul','corner-ur','corner-dl','corner-dr','food']; return Promise.all(names.map(async name=>[name,await this.image(`${skin.assetPath}${name}.png`)])).then(entries=>new Map(entries)); }
}
