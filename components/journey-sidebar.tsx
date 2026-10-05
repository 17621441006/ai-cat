"use client";
import {useEffect,useState} from 'react';
import {ArrowUpRight,Download,Layers,Workflow} from 'lucide-react';
import {Sidebar,SidebarContent,SidebarHeader,SidebarFooter,SidebarMenu,SidebarMenuItem,SidebarMenuButton,useSidebar} from '@/components/ui/sidebar';
import {Accordion,AccordionContent,AccordionItem,AccordionTrigger} from '@/components/ui/accordion';
import {navigationGroups,groupForView,type View} from '@/lib/navigation';

export default function JourneySidebar({view}:{view:View}){
 const current=groupForView(view);const[expanded,setExpanded]=useState(current.id);const{setOpenMobile,state,isMobile}=useSidebar();const compact=state==='collapsed'&&!isMobile;
 useEffect(()=>setExpanded(current.id),[current.id]);
 const [workshopDone,setWorkshopDone]=useState(false);
 useEffect(()=>{const abort=new AbortController();fetch('/api/workshop-progress',{signal:abort.signal}).then(async response=>{if(response.ok){const data=await response.json() as {completedAt?:number};setWorkshopDone(typeof data.completedAt==='number')}}).catch(()=>{});const done=()=>setWorkshopDone(true);window.addEventListener('workshop-completed',done);return()=>{abort.abort();window.removeEventListener('workshop-completed',done)}},[]);
 return <Sidebar collapsible="icon" className={`site-sidebar journey-sidebar ${compact?'journey-compact':''}`}>
  <SidebarHeader className="brand-header"><a href="/" className="brand" aria-label="AI 进阶研习所首页"><span className="brand-mark"><Layers size={22}/></span><span><strong>AI 进阶研习所</strong><small>THE AI PRACTICE</small></span></a></SidebarHeader>
  <SidebarContent className="journey-scroll"><nav aria-label="学习与实践导航">{compact?<div className="journey-icon-navigation">{navigationGroups.map(group=><SidebarMenu className={`compact-nav-group group-${group.id}`} key={group.id}>{group.items.map(item=><SidebarMenuItem key={item.id}><SidebarMenuButton asChild tooltip={item.label} isActive={view===item.id}><a href={item.href} aria-label={item.label} aria-current={view===item.id?'page':undefined}><item.icon size={19}/></a></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu>)}</div>:<><span className="journey-nav-caption">你的 AI 成长旅程</span>
   <Accordion type="single" collapsible value={expanded} onValueChange={setExpanded} className="journey-accordion">
    {navigationGroups.map((group,index)=><AccordionItem key={group.id} value={group.id} className={`journey-group group-${group.id}`}>
     <AccordionTrigger className="journey-group-trigger" aria-label={group.label}><span className="journey-group-icon"><group.icon size={18}/></span><span>{group.label}<small>{String(index+1).padStart(2,'0')}{current.id===group.id?' · 当前分组':''}</small></span></AccordionTrigger>
     <AccordionContent className="journey-group-content"><p>{group.description}</p><SidebarMenu>{group.items.map(item=><SidebarMenuItem key={item.id}><SidebarMenuButton asChild isActive={view===item.id} className="nav-button journey-link"><a href={item.href} aria-current={view===item.id?'page':undefined} onClick={()=>setOpenMobile(false)}><span className="journey-item-icon"><item.icon size={17}/></span><span>{item.label}</span>{item.id==='agents'&&workshopDone?<small className="aw-nav-complete">✓ 已学完</small>:item.hint&&<small className="nav-count">{item.hint}</small>}</a></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></AccordionContent>
    </AccordionItem>)}
   </Accordion></>}
  </nav></SidebarContent>
  <SidebarFooter className="journey-footer"><a className="next-experiment" href="/agents#agent-builder" aria-label="搭建多智能体履约助手" title="你的下一次实验：搭建多智能体履约助手" onClick={()=>setOpenMobile(false)}><span className="next-experiment-kicker"><Workflow size={16}/>你的下一次实验</span><strong>搭建一个履约协同助手</strong><p>连接三个系统，看看异常如何交给人工。</p><span className="next-experiment-action">进入搭建工作台 <ArrowUpRight size={16}/></span></a><a className="journey-download" href="/downloads/AI项目经理与AI产品经理转型指南.docx" download><Download size={15}/><span>下载完整指南</span><small>DOCX</small></a></SidebarFooter>
 </Sidebar>
}
