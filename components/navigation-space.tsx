"use client";
import {useEffect,useState,type CSSProperties,type ReactNode} from 'react';
import {PanelLeftClose,PanelLeftOpen} from 'lucide-react';
import {SidebarProvider,useSidebar} from '@/components/ui/sidebar';
import {Button} from '@/components/ui/button';

export function NavigationSpaceProvider({children,style}:{children:ReactNode;style?:CSSProperties}){
 const[open,setOpen]=useState(true);
 useEffect(()=>{const media=window.matchMedia('(max-width: 1280px)');const sync=()=>{let saved=null;try{saved=localStorage.getItem('ai-practice-navigation')}catch{}setOpen(saved?saved==='expanded':!media.matches)};sync();media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync)},[]);
 function change(value:boolean){setOpen(value);try{localStorage.setItem('ai-practice-navigation',value?'expanded':'collapsed')}catch{}}
 return <SidebarProvider open={open} onOpenChange={change} style={{...style,'--sidebar-width-icon':'64px'} as CSSProperties}>{children}</SidebarProvider>
}
export function NavigationToggle(){const{open,isMobile,openMobile,toggleSidebar}=useSidebar();const expanded=isMobile?openMobile:open;return <Button variant="ghost" size="sm" className="navigation-toggle" onClick={toggleSidebar} aria-expanded={expanded} aria-label={expanded?'收起主导航':'展开主导航'} title={expanded?'收起主导航 · Ctrl / ⌘ B':'展开主导航 · Ctrl / ⌘ B'}>{expanded?<PanelLeftClose size={19}/>:<PanelLeftOpen size={19}/>}<span>{expanded?'收起导航':'展开导航'}</span></Button>}
