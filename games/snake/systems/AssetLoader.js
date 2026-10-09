const spriteNames=['head-up','head-down','head-left','head-right','tail-up','tail-down','tail-left','tail-right','body-horizontal','body-vertical','corner-ul','corner-ur','corner-dl','corner-dr','food'];

export class AssetLoader {
  constructor({maxUnused=32,logger=console}={}) {this.resources=new Map();this.maxUnused=maxUnused;this.logger=logger;this.requests=0;}
  load(path,type='image',owner=null) {
    if(!path)return Promise.resolve(null);
    const url=new URL(path,document.baseURI);
    if(url.origin!==location.origin&&url.protocol!=='data:'){this.logger.warn('[Snake Assets] External resource refused');return Promise.resolve(null);}
    const key=`${type}:${url.href}`;
    let entry=this.resources.get(key);
    if(!entry){
      entry={owners:new Set(),pending:true,value:null};this.resources.set(key,entry);this.requests++;
      entry.promise=(type==='image'?new Promise(resolve=>{const image=new Image();image.onload=()=>{image.onload=null;image.onerror=null;resolve(image);};image.onerror=()=>{image.onload=null;image.onerror=null;resolve(null);};image.src=url.href;}):fetch(url.href).then(response=>{if(!response.ok)return null;return type==='text'?response.text():response.arrayBuffer();})).catch(()=>null).then(value=>{entry.pending=false;entry.value=value;if(!value)this.logger.warn(`[Snake Assets] ${type} failed: ${url.pathname}`);this.prune();return value;});
    }
    if(owner)entry.owners.add(owner);
    return entry.promise;
  }
  image(path,owner=null){return this.load(path,'image',owner);}
  preload(manifest=[],owner=null){return Promise.all(manifest.map(asset=>typeof asset==='string'?this.image(asset,owner):this.load(asset.path,asset.type??'image',owner)));}
  scope(owner){return Object.freeze({image:path=>this.image(path,owner),preload:manifest=>this.preload(manifest,owner)});}
  release(owner){for(const entry of this.resources.values())entry.owners.delete(owner);this.prune();}
  prune(){const unused=[...this.resources.entries()].filter(([,entry])=>!entry.owners.size&&!entry.pending);while(unused.length>this.maxUnused)this.resources.delete(unused.shift()[0]);}
  stats(){return {cached:this.resources.size,requests:this.requests,owned:[...this.resources.values()].filter(entry=>entry.owners.size).length};}
  async loadSkin(skin,owner=null) {
    if(skin.spriteAtlas){const image=await this.image(skin.spriteAtlas.path,owner);return new Map(spriteNames.map(name=>{const frame=skin.spriteAtlas.frames?.[name];return [name,image&&frame?{image,frame}:null];}));}
    return new Map(await Promise.all(spriteNames.map(async name=>[name,await this.image(`${skin.assetPath}${name}.png`,owner)])));
  }
}
