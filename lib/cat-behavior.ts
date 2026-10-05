export type CatAction='idle'|'think'|'roll'|'tap'|'walk'|'eat'|'drink'|'work'|'knit'|'exercise'|'play'|'sleep'|'happy'|'squint'|'sad'|'closed'|'curious';
const range=(low:number,high:number,random:()=>number)=>low+(high-low)*random();
const cycles=(seconds:number,min:number,max:number,random:()=>number)=>seconds*1000*(min+Math.floor(random()*(max-min+1)));

/** Short gestures finish a few loops; resting and sleeping are much longer. */
export function catDuration(action:CatAction,random=Math.random):number{
 switch(action){
  case 'sleep':return range(180_000,420_000,random);
  case 'idle':return range(55_000,110_000,random);
  case 'think':return range(35_000,80_000,random);
  case 'walk':return cycles(15,2,4,random);
  case 'eat':return cycles(2.8,10,17,random);
  case 'drink':return cycles(1.8,7,13,random);
  case 'work':return cycles(2.6,24,52,random);
  case 'knit':return cycles(4.2,18,36,random);
  case 'exercise':return cycles(5.6,5,9,random);
  case 'play':return cycles(3.6,4,8,random);
  case 'roll':return cycles(7.5,1,3,random);
  case 'tap':return cycles(3,2,4,random);
  case 'curious':case 'happy':return cycles(4.8,1,2,random);
  case 'sad':return cycles(5.2,1,2,random);
  case 'squint':return range(18_000,38_000,random);
  case 'closed':return range(30_000,65_000,random);
 }
}
const activities:{id:CatAction;weight:number;cooldown:number}[]=[
 {id:'think',weight:3,cooldown:100_000},{id:'walk',weight:3,cooldown:120_000},
 {id:'sleep',weight:3,cooldown:240_000},{id:'roll',weight:1,cooldown:180_000},
 {id:'tap',weight:1,cooldown:240_000},{id:'eat',weight:1,cooldown:480_000},
 {id:'drink',weight:2,cooldown:180_000},{id:'play',weight:2,cooldown:240_000},
 {id:'work',weight:2,cooldown:360_000},{id:'knit',weight:1,cooldown:480_000},
 {id:'exercise',weight:1,cooldown:420_000},
];
export function nextCatActivity(recent:CatAction[],lastUsed:Partial<Record<CatAction,number>>,now:number,random=Math.random):CatAction{
 const last=recent.at(-1);
 const candidates=activities.filter(item=>!recent.includes(item.id)&&(lastUsed[item.id]===undefined||now-lastUsed[item.id]!>=item.cooldown));
 const weighted=candidates.flatMap(item=>{
  const related=last==='eat'&&item.id==='drink'||['play','exercise'].includes(last||'')&&['drink','sleep'].includes(item.id)||last==='sleep'&&item.id==='walk'||last==='work'&&item.id==='walk';
  return Array<CatAction>(item.weight+(related?5:0)).fill(item.id);
 });
 return weighted[Math.floor(random()*weighted.length)]||'idle';
}
