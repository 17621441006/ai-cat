"use client";
import {useEffect,useState} from 'react';
import {Check,ChevronDown,Loader2,Pause,CircleAlert} from 'lucide-react';
import {Collapsible,CollapsibleContent,CollapsibleTrigger} from '@/components/ui/collapsible';
import type {AssistantStage} from '@/lib/assistant-stream';
export type AssistantTrace={
 startedAt:number;finishedAt?:number;status:'running'|'complete'|'error'|'stopped';
 steps:{stage:AssistantStage;message:string;startedAt:number;finishedAt?:number}[];
 sources?:{title:string;href:string}[];
};
export function advanceTrace(trace:AssistantTrace,stage:AssistantStage,message:string,sources?:AssistantTrace['sources']):AssistantTrace{
 const now=Date.now(),last=trace.steps.at(-1);
 if(last?.stage===stage)return {...trace,sources:sources||trace.sources,steps:trace.steps.map((step,i)=>i===trace.steps.length-1?{...step,message}:step)};
 return {...trace,sources:sources||trace.sources,steps:[...trace.steps.map(step=>step.finishedAt?step:{...step,finishedAt:now}),{stage,message,startedAt:now}]};
}
export function finishTrace(trace:AssistantTrace,status:AssistantTrace['status']):AssistantTrace{
 const now=Date.now();return {...trace,status,finishedAt:now,steps:trace.steps.map(step=>step.finishedAt||status!=='complete'?step:{...step,finishedAt:now})};
}
export default function AssistantProgress({trace,onStop}:{trace:AssistantTrace;onStop?:()=>void}){
 const[open,setOpen]=useState(false),[now,setNow]=useState(Date.now());
 const running=trace.status==='running';
 useEffect(()=>{if(!running)return;setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[running]);
 const seconds=Math.max(0,Math.round(((trace.finishedAt||now)-trace.startedAt)/1000));
 const label=running?(trace.steps.at(-1)?.message||'正在准备回答'):trace.status==='complete'?'回答已完成':trace.status==='stopped'?'已停止生成':'本次连接未完成';
 return <Collapsible className="assistant-trace" open={open} onOpenChange={setOpen} data-status={trace.status}>
  <div className="assistant-trace-summary">
   <CollapsibleTrigger aria-label={`${open?'收起':'展开'}回答进度`}>
    {running?<Loader2 size={14} className="spin"/>:trace.status==='complete'?<Check size={14}/>:trace.status==='stopped'?<Pause size={14}/>:<CircleAlert size={14}/>}
    <span role="status">{label}</span><small>{seconds} 秒</small><ChevronDown size={14} className={open?'is-open':''}/>
   </CollapsibleTrigger>
   {running&&onStop&&<button type="button" className="assistant-stop" onClick={onStop}>停止</button>}
  </div>
  <CollapsibleContent>
   <ol className="assistant-trace-steps">{trace.steps.map((step,i)=><li key={step.stage}>
    <span className="assistant-step-state">{step.finishedAt?<Check size={12}/>:running?<Loader2 size={12} className="spin"/>:trace.status==='stopped'?<Pause size={12}/>:<CircleAlert size={12}/>}</span>
    <span>{step.message}</span><small>{Math.max(0,Math.round(((step.finishedAt||trace.finishedAt||now)-step.startedAt)/1000))} 秒</small>
    {i===0&&trace.sources?.length?<ul>{trace.sources.map((source,index)=><li key={index}>{source.title}</li>)}</ul>:null}
   </li>)}</ol>
   <p className="assistant-trace-caption">显示实际处理进度与参考资料。</p>
  </CollapsibleContent>
 </Collapsible>;
}
