"use client";
import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Plus,X,ChevronLeft,ChevronRight} from 'lucide-react';
import {TabsList,TabsTrigger} from '@/components/ui/tabs';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuLabel,DropdownMenuSeparator,DropdownMenuItem} from '@/components/ui/dropdown-menu';
import {navigationGroups,navigationItems,type View} from '@/lib/navigation';
import {learningLocationEvent,learningUrlEvent} from '@/lib/learning-location';
import {resolveLearningTab,adjacentLearningTab} from '@/lib/learning-tabs';

const address=(view:View)=>navigationItems.find(item=>item.id===view)!.href;
const currentAddress=()=>location.pathname+location.search+location.hash;
function viewAt(url:URL){return navigationItems.find(item=>item.href===(url.pathname.replace(/\/$/,'')||'/'))?.id}

export function useLearningWorkspace(initialView:View){
 const [workspace,setWorkspace]=useState({view:initialView,opened:[initialView]});
 const state=useRef(workspace),urls=useRef<Partial<Record<View,string>>>({}),scrolls=useRef<Partial<Record<View,number>>>({});
 const pending=useRef<{y:number;hash:string;notify:boolean}|null>(null);
 state.current=workspace;
 const activate=useCallback((href:string,historyMode:'push'|'pop'='push')=>{
  const before=state.current;
  scrolls.current[before.view]=window.scrollY;
  if(historyMode==='push')urls.current[before.view]=currentAddress();
  const resolved=resolveLearningTab(href,location.origin,navigationItems,urls.current,historyMode==='pop');
  if(!resolved)return false;
  const {view:next,href:target,changed:changedAddress}=resolved;
  urls.current[next]=target;
  if(historyMode==='push'&&currentAddress()!==target)history.pushState({...history.state,learningWorkspace:true},'',target);
  const targetUrl=new URL(target,location.origin);
  pending.current={y:changedAddress?0:scrolls.current[next]||0,hash:targetUrl.hash,notify:changedAddress||!before.opened.includes(next)};
  const updated={view:next,opened:before.opened.includes(next)?before.opened:[...before.opened,next]};
  state.current=updated;setWorkspace(updated);
  return true;
 },[]);
 const close=useCallback((view:View)=>{
  const before=state.current;if(before.opened.length===1)return;
  const remaining=before.opened.filter(item=>item!==view),adjacent=adjacentLearningTab(before.opened,view)!;
  if(before.view===view)activate(urls.current[adjacent]||address(adjacent));
  const updated={...state.current,opened:remaining};state.current=updated;setWorkspace(updated);
  delete urls.current[view];delete scrolls.current[view];
  if(before.view===view)requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>(`[data-workspace-tab="${adjacent}"] [role=tab]`)?.focus({preventScroll:true}));
 },[activate]);
 useEffect(()=>{
  urls.current[initialView]=currentAddress();
  history.replaceState({...history.state,learningWorkspace:true},'',location.href);
  const previousRestoration=history.scrollRestoration;history.scrollRestoration='manual';
  function click(event:MouseEvent){
   if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   const link=(event.target as Element)?.closest?.('a[href]') as HTMLAnchorElement|null;
   if(!link||link.hasAttribute('download')||(link.target&&link.target!=='_self')||link.getAttribute('href')?.startsWith('#'))return;
   const url=new URL(link.href,location.origin);
   if(url.origin===location.origin&&viewAt(url)){event.preventDefault();activate(url.href)}
  }
  // These are shallow workspace entries; let the framework handle other history.
  const pop=(event:PopStateEvent)=>{if(event.state?.learningWorkspace&&viewAt(new URL(location.href))){event.stopImmediatePropagation();activate(currentAddress(),'pop')}};
  const update=()=>{urls.current[state.current.view]=currentAddress()};
  document.addEventListener('click',click);window.addEventListener('popstate',pop,true);window.addEventListener(learningUrlEvent,update);
  return()=>{history.scrollRestoration=previousRestoration;document.removeEventListener('click',click);window.removeEventListener('popstate',pop,true);window.removeEventListener(learningUrlEvent,update)};
 },[activate,initialView]);
 useLayoutEffect(()=>{
  const next=pending.current;if(!next)return;pending.current=null;
  if(next.notify)window.dispatchEvent(new Event(learningLocationEvent));
  window.scrollTo({top:next.y,behavior:'instant'});
  const frame=requestAnimationFrame(()=>{
   if(next.hash){try{document.getElementById(decodeURIComponent(next.hash.slice(1)))?.scrollIntoView({block:'start',behavior:'instant'})}catch{}}
  });
  return()=>cancelAnimationFrame(frame);
 },[workspace]);
 return {...workspace,navigate:activate,close,select:(view:string)=>activate(urls.current[view as View]||address(view as View))};
}

export function LearningTabBar({opened,view,onSelect,onClose}:{opened:View[];view:View;onSelect:(view:string)=>void;onClose:(view:View)=>void}){
 const rail=useRef<HTMLDivElement>(null);
 const [overflow,setOverflow]=useState({left:false,right:false});
 useEffect(()=>{
  const node=rail.current;if(!node)return;
  const update=()=>setOverflow({left:node.scrollLeft>2,right:node.scrollWidth-node.clientWidth-node.scrollLeft>2});
  const observer=new ResizeObserver(update);observer.observe(node);node.addEventListener('scroll',update,{passive:true});update();
  return()=>{observer.disconnect();node.removeEventListener('scroll',update)};
 },[opened.length]);
 useEffect(()=>{const node=rail.current,selected=node?.querySelector<HTMLElement>('[data-workspace-tab="'+view+'"]');if(node&&selected){const left=selected.offsetLeft,right=left+selected.offsetWidth;if(left<node.scrollLeft)node.scrollLeft=left;if(right>node.scrollLeft+node.clientWidth)node.scrollLeft=right-node.clientWidth}},[view,opened.length]);
 function shift(direction:number){rail.current?.scrollBy({left:direction*240,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}
 return <div className="workspace-tabbar">
  {overflow.left&&<button className="workspace-scroll-tab" aria-label="向左查看页签" onClick={()=>shift(-1)}><ChevronLeft size={16}/></button>}
  <div className="workspace-tab-scroll" ref={rail}><TabsList className="workspace-tab-list" aria-label="已打开的学习页面">
   {opened.map(id=>{const item=navigationItems.find(item=>item.id===id)!;return <div key={id} className="workspace-tab" data-selected={view===id} data-workspace-tab={id}>
    <TabsTrigger value={id} className="workspace-tab-trigger" onKeyDown={event=>{if(event.key==='Delete'&&opened.length>1){event.preventDefault();onClose(id)}}}><item.icon size={16}/><span>{item.label}</span></TabsTrigger>
    {opened.length>1&&<button className="workspace-tab-close" aria-label={`关闭${item.label}页签`} title="关闭页签" onClick={()=>onClose(id)}><X size={13}/></button>}
   </div>})}
  </TabsList></div>
  {overflow.right&&<button className="workspace-scroll-tab" aria-label="向右查看页签" onClick={()=>shift(1)}><ChevronRight size={16}/></button>}
  <DropdownMenu><DropdownMenuTrigger asChild><button className="workspace-new-tab" aria-label="打开学习页签" title="打开学习页签"><Plus size={16}/><span>打开页面</span></button></DropdownMenuTrigger><DropdownMenuContent className="workspace-page-menu" align="end" sideOffset={8}>
   {navigationGroups.map((group,index)=><div key={group.id}>{index>0&&<DropdownMenuSeparator/>}<DropdownMenuLabel>{group.label}</DropdownMenuLabel>{group.items.map(item=><DropdownMenuItem key={item.id} onSelect={()=>onSelect(item.id)}><item.icon size={16}/><span>{item.label}</span>{opened.includes(item.id)&&<small>已打开</small>}</DropdownMenuItem>)}</div>)}
  </DropdownMenuContent></DropdownMenu>
 </div>;
}
