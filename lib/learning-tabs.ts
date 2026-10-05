export type LearningRoute={id:string;href:string};

/** Only recognised, same-site learning pages belong in this workspace. */
export function resolveLearningTab<T extends LearningRoute>(href:string,origin:string,routes:readonly T[],remembered:Partial<Record<T['id'],string>>,traverse=false){
 const url=new URL(href,origin);
 if(url.origin!==origin)return null;
 const route=routes.find(item=>item.href===(url.pathname.replace(/\/$/,'')||'/'));
 if(!route)return null;
 const saved=remembered[route.id as T['id']];
 const target=!traverse&&!url.search&&!url.hash&&saved?saved:url.pathname+url.search+url.hash;
 return {view:route.id as T['id'],href:target,changed:Boolean(saved&&saved!==target)};
}

export function adjacentLearningTab<T extends string>(opened:readonly T[],closing:T){
 const index=opened.indexOf(closing);
 const remaining=opened.filter(item=>item!==closing);
 return remaining[Math.max(0,index-1)];
}
