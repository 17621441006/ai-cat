"use client";

import {useId,useState} from 'react';
import {Maximize2,Pointer,ArrowUpRight} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {lessonVisuals,type LessonVisual} from '@/lib/lesson-visuals';

function VisualDiagram({model,selected,onSelect}:{model:LessonVisual;selected:string;onSelect:(id:string)=>void}){
 const uid=useId().replace(/:/g,'');
 return <svg className="lesson-diagram" viewBox="0 0 990 340" role="group" aria-label={model.title}>
  <defs>{['active','rest'].map(state=><marker key={state} id={`arrow-${uid}-${state}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill={state==='active'?'#8d72d3':'#99acc2'}/></marker>)}</defs>
  {model.edges.map((e,i)=>{const a=model.nodes.find(n=>n.id===e.from)!,b=model.nodes.find(n=>n.id===e.to)!;const active=e.from===selected||e.to===selected;let x1=a.x+184,y1=a.y+42,x2=b.x-8,y2=b.y+42;
   let path='';if((b.id==='model'||b.id==='context')&&a.x<300){const channelY=y2+(a.y<120?-18:18);path=`M${x1} ${y1} H${x1+18} V${channelY} H${x2-10} L${x2} ${y2}`;}else if(a.x===b.x){x1=a.x+92;x2=b.x+92;y1=a.y<b.y?a.y+84:a.y;y2=a.y<b.y?b.y-8:b.y+92;path=`M${x1} ${y1} L${x2} ${y2}`;}else if(b.x<a.x){x1=a.x;x2=b.x+192;path=`M${x1} ${y1} C${(x1+x2)/2} ${y1} ${(x1+x2)/2} ${y2} ${x2} ${y2}`;}else{path=`M${x1} ${y1} C${(x1+x2)/2} ${y1} ${(x1+x2)/2} ${y2} ${x2} ${y2}`;}
   return <g key={i} className={`lesson-diagram-edge ${active?'active':''}`}><path d={path} fill="none" stroke="currentColor" strokeWidth={active?3:2} markerEnd={`url(#arrow-${uid}-${active?'active':'rest'})`}/>{e.label&&<text x={(x1+x2)/2} y={(y1+y2)/2-12} textAnchor="middle">{e.label}</text>}</g>;
  })}
  {model.nodes.map(n=><g key={n.id} className={`lesson-diagram-node tone-${n.tone} ${selected===n.id?'active':''}`} transform={`translate(${n.x},${n.y})`} role="button" aria-label={`图解：${n.title}`} aria-pressed={selected===n.id} tabIndex={0} onClick={()=>onSelect(n.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(n.id)}}}>
    <rect width="184" height="84" rx="12"/><rect className="node-accent" width="5" height="44" x="0" y="20" rx="2"/><text x="20" y="33" className="node-title">{n.title}</text><text x="20" y="61" className="node-subtitle">{n.subtitle}</text>
  </g>)}
 </svg>
}

export function LessonVisualOverview({lesson}:{lesson:string}){
 const model=lessonVisuals[lesson];const[selected,setSelected]=useState(model.nodes[0].id);const[open,setOpen]=useState(false);
 const current=model.nodes.find(n=>n.id===selected)||model.nodes[0];
 const diagram=<VisualDiagram model={model} selected={selected} onSelect={setSelected}/>;
 const detail=<div className={`lesson-diagram-detail tone-${current.tone}`} aria-live="polite"><strong>{current.title}</strong><p>{current.detail}</p></div>;
 return <figure className="lesson-visual-overview">
  <figcaption><div><span>一图读懂</span><h3>{model.title}</h3></div><Button variant="outline" size="sm" onClick={()=>setOpen(true)} aria-label="放大本课图解"><Maximize2 size={15}/>放大</Button></figcaption>
  <div className="lesson-diagram-scroll">{diagram}</div>{detail}
  <div className="lesson-visual-footer"><span><Pointer size={14}/>点击节点，看供应链例子</span><span>本站原创图解 · 教学案例</span></div>
  <Dialog open={open} onOpenChange={setOpen}><DialogContent className="lesson-visual-dialog"><DialogHeader><DialogTitle>{model.title}</DialogTitle><DialogDescription>{model.caption}</DialogDescription></DialogHeader><div className="lesson-diagram-scroll">{diagram}</div>{detail}</DialogContent></Dialog>
 </figure>
}

const promptTitles=['把“分析得好”变成可检查的记录','使用者、场景、交付物一起说清','规则与业务数据，各有自己的位置','三类样例，划清判断边界','同一条订单，只改变提示词版本'];
function PromptGraphic({index}:{index:number}){
 const base={fontFamily:'system-ui, sans-serif'};
 return <svg viewBox="0 0 440 174" role="img" aria-label={promptTitles[index]} style={base} className="prompt-concept-svg">
  {index===0&&<><rect x="16" y="17" width="408" height="140" rx="10" className="mini-surface"/><path d="M16 61H424M152 17V157M286 17V157M16 107H424" className="mini-rule"/><text x="37" y="46">采购单号</text><text x="176" y="46">异常类型</text><text x="313" y="46">证据字段</text><text x="37" y="91" className="mini-value">PO-101</text><text x="169" y="91" className="mini-warn">逾期未收齐</text><text x="314" y="91" className="mini-value">80 / 100 吨</text><text x="40" y="137" className="mini-success">✓ 有标识</text><text x="173" y="137" className="mini-success">✓ 可分类</text><text x="305" y="137" className="mini-success">✓ 能核对</text></>}
  {index===1&&<>{[['采购员','谁来用'],['晨会跟催','在哪里用'],['待跟催清单','交付什么']].map(([a,b],i)=><g key={a} transform={`translate(${19+i*144},37)`}><rect width="116" height="100" rx="12" className={`mini-block block-${i}`}/><text x="58" y="39" textAnchor="middle" className="mini-value">{a}</text><text x="58" y="70" textAnchor="middle">{b}</text>{i<2&&<path d="M122 50H138M133 45L139 50L133 55" className="mini-arrow"/>}</g>)}</>}
  {index===2&&<>{[['判断规则','交期已过，且未收齐'],['订单数据','PO-101 · 已收 80 / 100'],['输出要求','异常类型 + 依据 + 建议']].map(([a,b],i)=><g key={a} transform={`translate(17,${12+i*53})`}><rect width="406" height="44" rx="8" className={`mini-block block-${i}`}/><text x="14" y="28" className="mini-value">{a}</text><text x="123" y="28">{b}</text></g>)}</>}
  {index===3&&<>{[['已按期收齐','正常','✓'],['逾期未收齐','异常','!'],['交期未提供','待核实','?']].map(([a,b,c],i)=><g key={a} transform={`translate(${16+i*144},19)`}><rect width="120" height="136" rx="10" className={`mini-block sample-${i}`}/><text x="60" y="39" textAnchor="middle" className="mini-symbol">{c}</text><text x="60" y="79" textAnchor="middle" className="mini-value">{b}</text><text x="60" y="110" textAnchor="middle" fontSize="16">{a}</text></g>)}</>}
  {index===4&&<><text x="22" y="31">同一条逾期订单：已收 80 / 100 吨</text><rect x="17" y="53" width="185" height="104" rx="10" className="mini-block sample-1"/><rect x="238" y="53" width="185" height="104" rx="10" className="mini-block sample-0"/><text x="35" y="83" className="mini-value">V1 · 有收货就通过</text><text x="35" y="119" className="mini-warn">× 误判已完成</text><text x="255" y="83" className="mini-value">V2 · 收齐才通过</text><text x="255" y="119" className="mini-success">✓ 仍需跟催 20 吨</text><path d="M208 106H230M224 100L230 106L224 112" className="mini-arrow"/></>}
 </svg>
}
export function PromptConceptFigure({index}:{index:number}){
 const[open,setOpen]=useState(false);return <figure className="prompt-concept-figure"><button onClick={()=>setOpen(true)} aria-label={`放大图解：${promptTitles[index]}`}><PromptGraphic index={index}/><Maximize2 size={14}/></button><figcaption>{promptTitles[index]}</figcaption><Dialog open={open} onOpenChange={setOpen}><DialogContent className="prompt-figure-dialog"><DialogHeader><DialogTitle>{promptTitles[index]}</DialogTitle><DialogDescription>本站原创图解 · 采购异常教学案例</DialogDescription></DialogHeader><PromptGraphic index={index}/></DialogContent></Dialog></figure>
}

export function VisualSourceNote({lesson}:{lesson:string}){return <div className="lesson-art-source">图解由本站围绕供应链案例原创制作。方法参考{lesson==='prompt'?<> <a href="https://ai.google.dev/gemini-api/docs/prompting-strategies" target="_blank" rel="noopener noreferrer">Google 提示词设计指南<ArrowUpRight size={13}/></a> 与本课官方资料</>:<>本课“资料与来源”中的官方文档</>}；未使用第三方原图。</div>}
