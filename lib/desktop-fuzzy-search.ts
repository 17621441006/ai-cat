/** Deterministic navigation: only a user's explicit command can open an app. */
export type SearchEntry={id:string;title:string;description:string;aliases:string[]};
export type RankedEntry={entry:SearchEntry;score:number};
export const normalize=(value:string)=>value.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu,'');
function distance(a:string,b:string){let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const row=[i];for(let j=1;j<=b.length;j++)row[j]=Math.min(row[j-1]+1,prev[j]+1,prev[j-1]+Number(a[i-1]!==b[j-1]));prev=row}return prev[b.length]}
export function rankEntries(query:string,entries:SearchEntry[]):RankedEntry[]{
 const q=normalize(parseOpenIntent(query)||query);if(!q)return [];
 const unique=[...new Map(entries.map(e=>[e.id,e])).values()];
 return unique.map(entry=>{let score=0;for(const label of [entry.id,entry.title,...entry.aliases]){const s=normalize(label);if(!s)continue;
  if(s===q)score=Math.max(score,.99);
  else if(s.includes(q))score=Math.max(score,.78+.09*q.length/s.length);
  else if(q.length>=3&&s.length>=3&&[...q].every(c=>s.includes(c))&&[...s].every(c=>q.includes(c)))score=Math.max(score,.96);
  else if(q.length>=2&&Math.abs(q.length-s.length)<=2){const d=distance(q,s);if(d<=Math.max(1,Math.floor(Math.max(q.length,s.length)*.24)))score=Math.max(score,.72-.1*(d-1))}
 }
 if(normalize(entry.description).includes(q))score=Math.max(score,.46);
 return {entry,score};}).filter(r=>r.score>=.45).sort((a,b)=>b.score-a.score);
}
export function parseOpenIntent(question:string):string|null{
 const q=question.trim();if(/不要|不想|别打开|先别|不用|如何|怎么|怎样|为什么|是否|如果|假如|假设|会不会|之前|之后/.test(q))return null;
 const match=q.match(/^(?:(?:ai\s*小脏|小脏|猫咪|猫助手)[，,\s]*)?(?:(?:请|帮我|请帮我|我想要?|麻烦你?|能不能|可以)[，,\s]*)*(?:打开|进入|带我去|看看|open\s+)\s*(?:一下|这个|那个)?\s*(.+?)(?:一下|好吗|好么|吧|呀|啦|呢)?[。！!？?\s]*$/i);
 return match?.[1]?.trim()||null;
}
export function resolveEntries(question:string,entries:SearchEntry[],pending:string[]=[]):{kind:'open';destination:SearchEntry}|{kind:'choose';options:SearchEntry[];scores:Record<string,number>}|{kind:'cancel'}|{kind:'missing'}|null{
 const q=normalize(question);
 if(pending.length){if(/^(取消|算了|不用了|不打开|暂不跳转)$/.test(q))return {kind:'cancel'};const ordinal=q.match(/^(?:第)?([一二三四五12345])(?:个|项)?$/);if(ordinal){const i='一二三四五'.indexOf(ordinal[1]),n=i>=0?i:Number(ordinal[1])-1;const destination=entries.find(e=>e.id===pending[n]);if(destination)return {kind:'open',destination}}const exact=pending.map(id=>entries.find(e=>e.id===id)).filter((e):e is SearchEntry=>!!e&&[e.title,...e.aliases].some(s=>normalize(s)===q));if(exact.length===1)return {kind:'open',destination:exact[0]};if(exact.length>1)return {kind:'choose',options:exact,scores:Object.fromEntries(exact.map(e=>[e.id,99]))}}
 const target=parseOpenIntent(question);if(!target)return null;const hits=rankEntries(target,entries);if(!hits.length)return {kind:'missing'};
 if(hits[0].score>=.92&&hits[0].score-(hits[1]?.score||0)>=.1&&normalize(target).length>=2)return {kind:'open',destination:hits[0].entry};
 const options=hits.slice(0,5);return {kind:'choose',options:options.map(r=>r.entry),scores:Object.fromEntries(options.map(r=>[r.entry.id,Math.round(r.score*100)]))};
}
