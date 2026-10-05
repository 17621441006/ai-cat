"use client";
import {useEffect,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {GripVertical} from 'lucide-react';
import {SheetContent} from '@/components/ui/sheet';

const preferenceKey='ai-practice-assistant-width';
export default function AssistantPanel({children}:{children:ReactNode}){
 const [panel,setPanel]=useState<HTMLDivElement|null>(null);
 const [manual,setManual]=useState<number|null>(null),[automatic,setAutomatic]=useState(560);
 const [viewport,setViewport]=useState(0),[dragging,setDragging]=useState(false);
 const restored=useRef(false),drag=useRef<{pointer:number;x:number;width:number;previous:number|null}|null>(null);
 const limit=viewport?Math.max(320,Math.min(1440,viewport-24)):1440,min=Math.min(440,limit);
 const width=Math.round(Math.min(limit,Math.max(min,manual??automatic)));
 const clamp=(value:number)=>Math.round(Math.min(limit,Math.max(min,value)));
 useEffect(()=>{
  try{const saved=localStorage.getItem(preferenceKey);if(saved!==null&&Number.isFinite(Number(saved))&&Number(saved)>0)setManual(Number(saved))}catch{}
  restored.current=true;
  const resize=()=>setViewport(window.innerWidth);resize();window.addEventListener('resize',resize);
  return()=>window.removeEventListener('resize',resize);
 },[]);
 useEffect(()=>{
  if(!restored.current||dragging)return;
  try{if(manual===null)localStorage.removeItem(preferenceKey);else localStorage.setItem(preferenceKey,String(manual))}catch{}
 },[manual,dragging]);
 useEffect(()=>{
  if(!panel)return;
  let turn:Element|null=null,peak=560;
  const fit=()=>{
   const latest=panel.querySelector('.knowledge-turn:last-child');
   if(latest!==turn){turn=latest;peak=560}
   const widths=Array.from(latest?.querySelectorAll('[data-table-width]')??[],el=>Number(el.getAttribute('data-table-width'))||0);
   const needed=Math.max(560,...widths.map(value=>Math.ceil((value+50)/40)*40));
   peak=Math.max(peak,Math.min(1120,needed));setAutomatic(peak);
  };
  fit();const observer=new MutationObserver(fit);
  observer.observe(panel,{childList:true,subtree:true,attributes:true,attributeFilter:['data-table-width']});
  return()=>observer.disconnect();
 },[panel]);
 const reset=()=>setManual(null);
 return <SheetContent ref={setPanel} className="knowledge-assistant-sheet" data-resizing={dragging||undefined} style={{'--assistant-panel-width':`${width}px`} as CSSProperties}>
  <div className="assistant-resize-handle" role="separator" tabIndex={0} aria-label="调整对话窗口宽度" aria-orientation="vertical" aria-valuemin={min} aria-valuemax={limit} aria-valuenow={width} aria-valuetext={`${width} 像素${manual===null?'，自动适配':''}`} title="拖动调整宽度 · 双击恢复自动宽度" onDoubleClick={reset}
   onPointerDown={event=>{if(event.button!==0)return;event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);drag.current={pointer:event.pointerId,x:event.clientX,width:panel?.getBoundingClientRect().width??width,previous:manual};setDragging(true)}}
   onPointerMove={event=>{const start=drag.current;if(start?.pointer===event.pointerId)setManual(clamp(start.width+start.x-event.clientX))}}
   onPointerUp={event=>{if(drag.current?.pointer!==event.pointerId)return;drag.current=null;setDragging(false);event.currentTarget.releasePointerCapture(event.pointerId)}}
   onPointerCancel={()=>{if(drag.current)setManual(drag.current.previous);drag.current=null;setDragging(false)}}
   onLostPointerCapture={()=>{drag.current=null;setDragging(false)}}
   onKeyDown={event=>{
    const step=event.shiftKey?80:24;
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();setManual(clamp(width+(event.key==='ArrowLeft'?step:-step)))}
    else if(event.key==='Home'||event.key==='End'){event.preventDefault();setManual(event.key==='Home'?min:limit)}
    else if(event.key==='Enter'){event.preventDefault();reset()}
   }}><span aria-hidden="true"><GripVertical size={15}/></span><span className="sr-only">左右方向键调整宽度，Enter 恢复自动宽度。</span></div>
  {children}
 </SheetContent>;
}
