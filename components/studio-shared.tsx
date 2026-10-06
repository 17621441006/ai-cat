"use client";
import {ArrowUpRight,FlaskConical,CheckCircle2,ChevronRight} from 'lucide-react';
import {Button} from '@/components/ui/button';
export const art={project:'/images/project-delivery.webp',context:'/images/context-engineering.webp',agent:'/images/agent-workflow.webp'};
export function StudioHeading({eyebrow,title,desc,simulation=false}:{eyebrow:string,title:string,desc:string,simulation?:boolean}){return <div className="studio-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{desc}</p></div>{simulation&&<span className="simulation-badge"><FlaskConical size={15}/>教学模拟 · 无真实业务写入</span>}</div>}
export function FlowDiagram({steps,active=-1}:{steps:string[],active?:number}){return <div className="concept-flow">{steps.map((s,i)=><div className={`concept-flow-step ${active===i?'current':''}`} key={s}><span>{String(i+1).padStart(2,'0')}</span><strong>{s}</strong>{i<steps.length-1&&<ChevronRight className="flow-arrow" size={18}/>}</div>)}</div>}
export function SourceLinks({sources}:{sources:{title:string,url:string}[]}){return <div className="lesson-sources"><span>来源与延伸阅读</span>{sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">{s.title}<ArrowUpRight size={14}/></a>)}</div>}
export function ExerciseResult({done,text,onReset}:{done:boolean,text:string,onReset?:()=>void}){return <div className={`exercise-feedback ${done?'success':''}`}><CheckCircle2 size={20}/><p>{text}</p>{onReset&&<Button variant="ghost" size="sm" onClick={onReset}>重置</Button>}</div>}
