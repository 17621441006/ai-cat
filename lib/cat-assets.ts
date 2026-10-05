const decoded=new Map<string,Promise<void>>();

/** Share decoded images between the launcher, menu, and assistant header. */
export function prepareCatImage(src:string):Promise<void>{
 const existing=decoded.get(src);if(existing)return existing;
 const promise=new Promise<void>((resolve,reject)=>{
  const image=new Image();image.decoding='async';image.fetchPriority='low';
  image.onload=()=>image.decode().then(()=>resolve(),reject);
  image.onerror=()=>reject(new Error('Cat image unavailable'));
  image.src=src;
 }).catch(error=>{decoded.delete(src);throw error});
 decoded.set(src,promise);return promise;
}

export const catPortrait=(mood:string)=>mood==='happy'?'/images/cat-portrait-grin-v27.webp':`/images/cat-portrait-${mood}.webp`;
export function warmCatPortraits(){
 void prepareCatImage(catPortrait('listening')).catch(()=>{});
 const timer=window.setTimeout(()=>{
  void Promise.allSettled(['curious','thinking','happy'].map(mood=>prepareCatImage(catPortrait(mood))));
 },800);
 return()=>window.clearTimeout(timer);
}
