export function element(html){const template=document.createElement('template');template.innerHTML=html.trim();return template.content.firstElementChild;}
export function text(root,selector,value){const node=root.querySelector(selector);if(node&&node.textContent!==String(value??''))node.textContent=String(value??'');}
export function prop(node,key,value){if(node&&node[key]!==value)node[key]=value;}
export function attr(node,key,value){if(node&&node.getAttribute(key)!==String(value))node.setAttribute(key,String(value));}
export function action(node,name,arg){if(!node)return;node.dataset.uiAction=name;if(arg!==undefined)node.dataset.uiArg=arg;}
export function image(node,path,assets){
  if(!node||node.dataset.asset===String(path??''))return;
  node.dataset.asset=String(path??'');node.hidden=true;
  if(!path){node.removeAttribute('src');return;}
  assets.image(path).then(value=>{if(node.dataset.asset!==path||!node.isConnected)return;if(value){node.src=value.src;node.hidden=false;}else node.removeAttribute('src');});
}
export function component(id,slot,render,markup=null){return {id,mount({baseElement,assets,signal}){const node=markup?element(markup):baseElement;return {element:node,update:args=>render(node,{...args,assets,signal}),dispose(){}};}};}
