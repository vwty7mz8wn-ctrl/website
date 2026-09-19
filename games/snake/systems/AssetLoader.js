export class AssetLoader {
  constructor() { this.images=new Map(); }
  image(path) { if(!path) return Promise.resolve(null); if(!this.images.has(path)) this.images.set(path,new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>resolve(null);image.src=path;})); return this.images.get(path); }
}
