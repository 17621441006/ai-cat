"use client";

import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {MessageCircle,MoreHorizontal,Pause,Play,Shuffle,Smile,PawPrint} from 'lucide-react';
import * as Context from '@/components/ui/context-menu';
import * as Dropdown from '@/components/ui/dropdown-menu';
import {catDuration,nextCatActivity} from '@/lib/cat-behavior';
import {prepareCatImage} from '@/lib/cat-assets';

const actions=[
 {id:'idle',name:'安静陪着你',hint:'我在这里，陪你慢慢学',sheet:'front-v25',row:0,speed:9},
 {id:'think',name:'托腮沉思',hint:'陪你想一想',sheet:'daily',row:0,speed:9},
 {id:'roll',name:'地上打滚',hint:'慢悠悠地翻个身',sheet:'gentle',row:0,speed:7.5},
 {id:'tap',name:'敲击屏幕',hint:'叩叩，陪我玩一下？',sheet:'tap-v25',row:0,speed:3},
 {id:'walk',name:'来回散步',hint:'在角落溜达一下',sheet:'play',row:2,speed:2.4},
 {id:'eat',name:'吃点猫粮',hint:'埋头干饭，认真嚼嚼',sheet:'mealtime',row:0,speed:2.8},
 {id:'drink',name:'喝口水',hint:'舔两口水，你也歇一下',sheet:'mealtime',row:1,speed:1.8},
 {id:'work',name:'打开电脑工作',hint:'你忙你的，我也有项目要赶',sheet:'work-v25',row:0,speed:2.6},
 {id:'knit',name:'织一件小毛衣',hint:'一针一线，给自己织件毛衣',sheet:'knit-v25',row:0,speed:4.2},
 {id:'exercise',name:'举哑铃锻炼',hint:'猫粮要吃，铁也要举',sheet:'hobbies',row:2,speed:5.6},
 {id:'play',name:'玩小皮球',hint:'猫猫的课间活动',sheet:'play',row:3,speed:3.6},
 {id:'sleep',name:'蜷着打盹',hint:'安静陪你学习',sheet:'daily',row:3,speed:10},
 {id:'happy',name:'高兴',hint:'今天也有新收获，开心！',sheet:'expressive',row:1,speed:4.8},
 {id:'squint',name:'眯眼',hint:'眯着眼，舒服地陪着你',sheet:'front-v25',row:0,speed:6,frame:1},
 {id:'sad',name:'小沮丧',hint:'卡住也没关系，慢慢来',sheet:'expressive',row:2,speed:5.2},
 {id:'closed',name:'闭眼休息',hint:'闭目养神一小会儿',sheet:'front-v25',row:0,speed:6,frame:2},
 {id:'curious',name:'好奇',hint:'咦，你在研究什么呀？',sheet:'expressive',row:3,speed:4.8},
] as const;
type Action=typeof actions[number]['id'];
type Mode=Action|'auto';
const preferenceKey='ai-practice-cat-companion';
const expressionIds:Action[]=['happy','squint','think','sad','closed','curious'];
const idleExpressions:Action[]=['squint','squint','closed','happy'];
function between(min:number,max:number){return min+Math.random()*(max-min)}
type Cycle={mode:Mode;action:Action;elapsed:number;duration:number;changedAt:number;expression:Action;expressionElapsed:number;expressionDuration:number};
function newCycle(mode:Mode,action:Action,now:number):Cycle{return {mode,action,elapsed:0,duration:catDuration(action),changedAt:now,expression:'idle',expressionElapsed:0,expressionDuration:between(25_000,45_000)}}

// The generated poses have individual bounds. Give each the same center and
// ground line so playing a blink or a head dip never shifts the whole cat.
const refinedBounds:Record<string,number[][]>={
 gentle:[[55,109,287,296],[367,109,596,295],[673,110,908,295],[986,110,1219,296],
  [70,386,291,595],[381,386,603,595],[687,386,913,595],[995,387,1221,596],
  [59,693,291,887],[369,692,603,886],[675,692,912,886],[984,692,1222,886],
  [60,976,293,1168],[371,975,604,1169],[675,975,912,1168],[984,975,1222,1169]],
 upright:[[96,123,314,321],[387,122,606,321],[674,123,894,321],[965,122,1184,321]],
 expressive:[[32,47,319,301],[366,32,608,304],[638,47,916,301],[943,46,1234,300],
  [37,344,311,603],[348,343,617,603],[656,344,926,603],[964,346,1235,603],
  [38,647,311,912],[348,648,618,912],[656,647,926,912],[964,648,1235,912],
  [38,942,311,1207],[348,940,618,1207],[656,940,927,1207],[964,945,1235,1207]],
};
function spriteStyle(sheet:string,row:number,frame=0):CSSProperties{
 if(sheet.endsWith('-v25'))return {backgroundImage:`url(/images/cat-${sheet}.webp)`,backgroundSize:'400% 100%',backgroundPosition:`${frame/3*100}% 0%`};
 if(sheet==='mealtime'||sheet==='hobbies'){
  const rows=sheet==='mealtime'?2:3;
  // The curl traverses low / midway / raised / midway, then returns to low.
  const index=sheet==='hobbies'&&row===2?[0,2,1,2][frame]:frame;
  return {backgroundImage:`url(/images/cat-${sheet}.webp)`,backgroundSize:`400% ${rows*100}%`,backgroundPosition:`${index/3*100}% ${row/(rows-1)*100}%`};
 }
 const bounds=refinedBounds[sheet]?.[row*4+frame];
 const size=sheet==='expressive'?320:256,range=1254-size;
 const x=bounds?(bounds[0]+bounds[2]-size)/2:0,y=bounds?bounds[3]+6-size:0;
 const position=bounds?`${x/range*100}% ${y/range*100}%`:`${frame/3*100}% ${row/3*100}%`;
 // Keep the transparent padding for alignment without exposing a neighboring pose.
 const crop=bounds?[bounds[1]-4-y,x+size-bounds[2]-4,y+size-bounds[3]-4,bounds[0]-4-x].map(inset=>`${Math.max(0,inset)/size*100}%`).join(' '):undefined;
 return {backgroundImage:`url(/images/cat-${sheet}.webp)`,backgroundPosition:position,backgroundSize:bounds?`${1254/size*100}% ${1254/size*100}%`:'400% 400%',clipPath:crop?`inset(${crop})`:undefined};
}
function poseFrames(sheet:string,row:number){return [0,1,2,3].map(frame=><span key={frame} className={`cat-sprite-frame cat-sprite-frame-${frame}`} style={spriteStyle(sheet,row,frame)}/>)}

export default function CatAssistantLauncher({open,onOpen}:{open:boolean;onOpen:()=>void}){
 const root=useRef<HTMLDivElement>(null),cat=useRef<HTMLButtonElement>(null);
 const near=useRef(false),recentActivities=useRef<Action[]>([]),ambient=useRef<'idle'|'auto'>('auto');
 const activityClock=useRef(0),lastUsed=useRef<Partial<Record<Action,number>>>({});
 const cycle=useRef<Cycle>(newCycle('auto','idle',0));
 const [mode,setMode]=useState<Mode>('auto'),[action,setAction]=useState<Action>('idle');
 const [idleExpression,setIdleExpression]=useState<Action>('idle');
 const [displayedPose,setDisplayedPose]=useState<Action>('idle');
 const [showHints,setShowHints]=useState(false);
 const [paused,setPaused]=useState(false),[reduced,setReduced]=useState(false),[visible,setVisible]=useState(true);
 const [contextOpen,setContextOpen]=useState(false),[dropdownOpen,setDropdownOpen]=useState(false);
 const [restored,setRestored]=useState(false),[loaded,setLoaded]=useState<Record<string,boolean>>({});
 const menuOpen=contextOpen||dropdownOpen;
 const activity=actions.find(a=>a.id===action)!;
 const desired=actions.find(a=>a.id===(action==='idle'?idleExpression:action))!;
 const current=actions.find(a=>a.id===displayedPose)!;
 const active=!paused&&visible&&!open&&!menuOpen;
 const moving=active&&!reduced;

 useEffect(()=>{
  try{
   const saved=JSON.parse(localStorage.getItem(preferenceKey)||'null');
   if(saved){
    // A chosen trick is temporary; a reload always starts with the upright resting pose.
    const preference=saved.version===2&&saved.mode==='idle'?'idle':'auto';
    ambient.current=preference;
    cycle.current=newCycle(preference,'idle',performance.now());
    setMode(preference);setPaused(saved.paused===true);setShowHints(saved.showHints===true);
   }
  }catch{}
  setRestored(true);
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const updateMotion=()=>setReduced(media.matches),updateVisibility=()=>setVisible(!document.hidden);
  updateMotion();updateVisibility();media.addEventListener('change',updateMotion);document.addEventListener('visibilitychange',updateVisibility);
  return()=>{media.removeEventListener('change',updateMotion);document.removeEventListener('visibilitychange',updateVisibility)};
 },[]);
 useEffect(()=>{if(restored)try{localStorage.setItem(preferenceKey,JSON.stringify({version:2,mode:ambient.current,paused,showHints}))}catch{}},[mode,paused,restored,showHints]);
 useEffect(()=>{
  let alive=true;
  const prepare=(sheet:string)=>prepareCatImage(`/images/cat-${sheet}.webp`).then(()=>{if(alive)setLoaded(old=>({...old,[sheet]:true}))}).catch(()=>{});
  void prepare('front-v25');
  // Leave first-page resources and the small chat portrait a head start.
  const timer=window.setTimeout(()=>{void (async()=>{for(const sheet of ['tap-v25','work-v25','knit-v25','mealtime','daily','hobbies','play','expressive','gentle']){if(!alive)return;await prepare(sheet)}})()},900);
  return()=>{alive=false;window.clearTimeout(timer)};
 },[]);
 useEffect(()=>{
  let alive=true;
  if(!loaded[desired.sheet])prepareCatImage(`/images/cat-${desired.sheet}.webp`).then(()=>{if(alive)setLoaded(old=>({...old,[desired.sheet]:true}))}).catch(()=>{});
  return()=>{alive=false};
 },[desired.sheet,loaded]);
 useEffect(()=>{
  if(loaded[desired.sheet]&&(desired.id!=='walk'||loaded.expressive))setDisplayedPose(desired.id);
 },[desired.id,desired.sheet,loaded]);

 useEffect(()=>{
  if(!active||!restored||!loaded['front-v25'])return;
  let previous=performance.now();
  const timer=setInterval(()=>{
   const now=performance.now(),state=cycle.current;
   const delta=now-Math.max(previous,state.changedAt);state.elapsed+=delta;activityClock.current+=delta;previous=now;
   if(state.action==='idle'&&!reduced){
    state.expressionElapsed+=delta;
    if(state.expressionElapsed>=state.expressionDuration){
     state.expressionElapsed=0;
     state.expression=state.expression==='idle'?idleExpressions[Math.floor(Math.random()*idleExpressions.length)]:'idle';
     state.expressionDuration=state.expression==='idle'?between(30_000,65_000):catDuration(state.expression);
     setIdleExpression(state.expression);
    }
   }
   if(state.action!=='idle'&&state.elapsed>=state.duration){
    const nextMode:Mode=ambient.current;
    cycle.current=newCycle(nextMode,'idle',now);
    setMode(nextMode);setAction('idle');setIdleExpression('idle');
   }else if(!reduced&&state.mode==='auto'&&state.action==='idle'&&state.elapsed>=state.duration&&!near.current){
    const next=nextCatActivity(recentActivities.current,lastUsed.current,activityClock.current);
    if(next!=='idle'){recentActivities.current=[...recentActivities.current,next].slice(-2);lastUsed.current[next]=activityClock.current}
    cycle.current=newCycle('auto',next,now);setAction(next);
   }
  },100);
  // Menus, the chat panel, a hidden tab and Pause suspend both playback and its clock.
  return()=>{clearInterval(timer);cycle.current.elapsed+=performance.now()-Math.max(previous,cycle.current.changedAt)};
 },[active,restored,reduced,loaded['front-v25']]);

 useEffect(()=>{
  const el=root.current;if(!el||open)return;
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(pointer: fine)');
  let frame=0,px=0,py=0;
  function reset(){near.current=false;el!.style.setProperty('--cat-turn','rotateX(0deg) rotateY(0deg)');el!.removeAttribute('data-near')}
  function point(e:PointerEvent){
   if(e.pointerType==='touch'||!fine.matches)return;px=e.clientX;py=e.clientY;if(frame)return;
   frame=requestAnimationFrame(()=>{
    frame=0;const box=cat.current?.getBoundingClientRect();if(!box)return;
    const dx=px-(box.left+box.width/2),dy=py-(box.top+box.height*.4);
    if(Math.hypot(dx,dy)>170){reset();return}
    near.current=true;el!.setAttribute('data-near','true');
    if(motion.matches||paused||action!=='think'){el!.style.setProperty('--cat-turn','rotateX(0deg) rotateY(0deg)');return}
    const x=Math.max(-1,Math.min(1,dx/140)),y=Math.max(-1,Math.min(1,dy/140));
    el!.style.setProperty('--cat-turn',`rotateX(${-y*2}deg) rotateY(${x*4}deg) translate(${x*.7}px,${y*.4}px)`);
   });
  }
  window.addEventListener('pointermove',point,{passive:true});document.addEventListener('pointerleave',reset);motion.addEventListener('change',reset);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('pointermove',point);document.removeEventListener('pointerleave',reset);motion.removeEventListener('change',reset);reset()};
 },[open,paused,action]);

 function choose(value:string){
  const nextMode=value as Mode,nextAction=nextMode==='auto'?'idle':nextMode;
  if(nextMode==='auto'||nextMode==='idle')ambient.current=nextMode;
  cycle.current=newCycle(nextMode,nextAction,performance.now());
  if(nextAction!=='idle'){lastUsed.current[nextAction]=activityClock.current;recentActivities.current=[...recentActivities.current,nextAction].slice(-2)}
  setMode(nextMode);setAction(nextAction);setIdleExpression('idle');setPaused(false);
 }
 function menuItems(kind:'context'|'dropdown'){
  const Label=kind==='context'?Context.ContextMenuLabel:Dropdown.DropdownMenuLabel;
  const Separator=kind==='context'?Context.ContextMenuSeparator:Dropdown.DropdownMenuSeparator;
  const Item=kind==='context'?Context.ContextMenuItem:Dropdown.DropdownMenuItem;
  const Checkbox=kind==='context'?Context.ContextMenuCheckboxItem:Dropdown.DropdownMenuCheckboxItem;
  const Group=kind==='context'?Context.ContextMenuRadioGroup:Dropdown.DropdownMenuRadioGroup;
  const Radio=kind==='context'?Context.ContextMenuRadioItem:Dropdown.DropdownMenuRadioItem;
  const Sub=kind==='context'?Context.ContextMenuSub:Dropdown.DropdownMenuSub;
  const SubTrigger=kind==='context'?Context.ContextMenuSubTrigger:Dropdown.DropdownMenuSubTrigger;
  const SubContent=kind==='context'?Context.ContextMenuSubContent:Dropdown.DropdownMenuSubContent;
  function option(a:typeof actions[number]){return <Radio key={a.id} value={a.id} className="cat-action-option"><span className={`cat-menu-pose ${loaded[a.sheet]?'ready':''}`} style={loaded[a.sheet]?spriteStyle(a.sheet,a.row,'frame' in a?a.frame:0):undefined} aria-hidden="true"/><span>{a.name}<small>{a.id==='idle'?'默认姿态 · 表情自然变化':a.hint}</small></span></Radio>}
  return <><Label className="cat-menu-heading">AI小脏的小日常<small>{reduced?'已跟随系统减少动态效果':paused?'正在安静陪伴':`${mode==='auto'?'自己活动 · ':''}${activity.name}${action==='idle'&&current.id!=='idle'?` · ${current.name}`:''}`}</small></Label>
   <p className="cat-menu-note">工作、织毛衣会待久一点，运动适量，打盹几分钟。做完就休息，每次节奏都不同。</p>
   <Group value={mode} onValueChange={choose}>
    <Radio value="auto" className="cat-action-option"><Shuffle size={16}/><span>自己活动<small>工作、玩耍、吃喝，也会安静休息</small></span></Radio>
    <Separator/>
    {actions.filter(a=>!expressionIds.includes(a.id)).map(option)}
   </Group><Separator/>
   <Sub><SubTrigger className="cat-action-option"><Smile size={16}/><span>换个表情<small>高兴、眯眼、沉思、好奇…</small></span></SubTrigger><SubContent className="cat-expression-menu" collisionPadding={12}><Label className="cat-menu-heading">换个表情<small>张望短一点，沉思久一点，再回到安静陪伴</small></Label><Group value={action} onValueChange={choose}>{expressionIds.map(id=>option(actions.find(a=>a.id===id)!))}</Group></SubContent></Sub>
   <Separator/>
   <Checkbox checked={showHints} onCheckedChange={value=>setShowHints(value===true)} onSelect={event=>event.preventDefault()} className="cat-action-option"><span>显示互动提示<small>靠近猫咪时显示一句话</small></span></Checkbox>
   <Item onSelect={()=>setPaused(v=>!v)} className="cat-action-option">{paused?<Play size={16}/>:<Pause size={16}/>}<span>{paused?'继续活动':'暂停动态'}</span></Item>
   <Item onSelect={onOpen} className="cat-action-option"><MessageCircle size={16}/><span>问 AI小脏一个问题</span></Item>
  </>;
 }
 const style={'--cat-speed':`${current.speed}s`} as CSSProperties;
 return <Context.ContextMenu onOpenChange={setContextOpen}><Context.ContextMenuTrigger asChild>
  <div ref={root} className="cat-companion" hidden={open} data-action={action} data-expression={current.id} data-moving={moving} style={style}>
   <button ref={cat} type="button" className="cat-assistant-launcher" aria-label="打开 AI小脏研习助手" aria-expanded={open} onClick={onOpen} title={showHints?"AI小脏 · 点击问问题，右键换动作":undefined}>
    {showHints&&<span className="cat-assistant-greeting" aria-hidden="true"><strong>{current.hint}</strong><small>AI小脏 · 右键换动作</small></span>}
    <span className="cat-assistant-breathe"><span className="cat-assistant-facing"><span className="cat-assistant-turn">
     {actions.map(pose=><span key={pose.id} className="cat-pose-layer" data-pose={pose.id} data-active={displayedPose===pose.id||undefined} aria-hidden={displayedPose!==pose.id} style={{'--cat-speed':`${pose.speed}s`} as CSSProperties}>
      <span className="cat-assistant-sprite" role="img" aria-label={`AI小脏正在${pose.name}`}>
       {loaded[pose.sheet]&&(pose.id==='walk'?<span className="cat-walk-scene">
        <span className="cat-walk-layer cat-walk-left">{poseFrames('play',2)}</span>
        <span className="cat-walk-layer cat-walk-right">{poseFrames('play',2)}</span>
        <span className="cat-walk-layer cat-walk-quarter-left" style={spriteStyle('expressive',0,0)}/><span className="cat-walk-layer cat-walk-front" style={spriteStyle('expressive',0,1)}/><span className="cat-walk-layer cat-walk-quarter-right" style={spriteStyle('expressive',0,0)}/>
       </span>:'frame' in pose?<span className="cat-sprite-still" style={spriteStyle(pose.sheet,pose.row,pose.frame)}/>:poseFrames(pose.sheet,pose.row))}
      </span>
      {pose.id==='tap'&&<span className="cat-knock-feedback" aria-hidden="true"><span className="cat-knock-ring cat-knock-first"/><span className="cat-knock-ring cat-knock-second"/><span className="cat-knock-contact"/></span>}
     </span>)}
    </span></span></span>
   </button>
   <button type="button" className="cat-assistant-label" onClick={onOpen} aria-label="问一问 AI小脏" aria-expanded={open}><span className="cat-launcher-energy" aria-hidden="true"/><span className="cat-launcher-paw" aria-hidden="true"><PawPrint size={19} strokeWidth={1.8}/></span><span className="cat-launcher-text">问一问</span></button>
   <Dropdown.DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}><Dropdown.DropdownMenuTrigger asChild><button className="cat-menu-toggle" aria-label="选择猫咪动作" title="选择猫咪动作"><MoreHorizontal size={17}/></button></Dropdown.DropdownMenuTrigger><Dropdown.DropdownMenuContent side="top" align="end" sideOffset={10} collisionPadding={12} className="cat-action-menu">{menuItems('dropdown')}</Dropdown.DropdownMenuContent></Dropdown.DropdownMenu>
  </div>
 </Context.ContextMenuTrigger><Context.ContextMenuContent collisionPadding={12} className="cat-action-menu">{menuItems('context')}</Context.ContextMenuContent></Context.ContextMenu>;
}
