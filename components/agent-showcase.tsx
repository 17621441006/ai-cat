"use client";
import {useEffect,useRef,useState} from 'react';
import {ArrowDown,ArrowRight,Check,Database,FileText,GitBranch,Pause,Play,ShieldCheck,Workflow} from 'lucide-react';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {invoices,matchInvoice,money} from '@/lib/simulation';
const samples=[{id:invoices[1].id,label:'数量异常'},{id:invoices[0].id,label:'正常单据'},{id:invoices[4].id,label:'大额审批'}];
const stages=[{name:'读取单据',icon:FileText},{name:'检索与解释',icon:Database},{name:'规则分流',icon:GitBranch},{name:'交付建议',icon:ShieldCheck}];
export default function AgentShowcase({onTry}:{onTry:(id:string)=>void}){
 const[sample,setSample]=useState(samples[0].id);const[step,setStep]=useState(0);const[playing,setPlaying]=useState(false);const[reduced,setReduced]=useState(false);const[inView,setInView]=useState(true);const scene=useRef<HTMLElement>(null);
 const invoice=invoices.find(x=>x.id===sample)!;const match=matchInvoice(invoice,1,100000);const needsReview=match.exception||match.approval;
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const sync=()=>{setReduced(media.matches);setPlaying(!media.matches)};sync();media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync)},[]);
 useEffect(()=>{const observer=new IntersectionObserver(([entry])=>setInView(entry.isIntersecting),{threshold:.15});if(scene.current)observer.observe(scene.current);return()=>observer.disconnect()},[]);
 useEffect(()=>{if(!playing||!inView)return;const timer=setTimeout(()=>{if(step===3)setPlaying(false);else setStep(step+1)},2700);return()=>clearTimeout(timer)},[playing,step,inView,sample]);
 function choose(id:string){setSample(id);setStep(0);setPlaying(!reduced)}
 function startBuilding(){onTry(sample);document.getElementById('procurement-builder')?.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});document.getElementById('procurement-builder')?.focus({preventScroll:true})}
 const descriptions=[`读取 ${invoice.purchaseOrderId}、收货记录和发票，先把输入字段对齐。`,'检索采购制度 v1.0，再由模型解释差异。计算交给规则，说明保留依据。',`数量差异 ${(match.qtyRate*100).toFixed(2)}%，单价差异 ${(match.priceRate*100).toFixed(2)}%。${match.exception?'超过 1% 容差，转人工复核。':match.approval?'金额达到 10 万元，转人工审批。':'未触发异常与大额条件。'}`,needsReview?'把单据、差异和证据一起交给审核人。工作台中需要你亲自确认或退回。':'输出三单匹配建议，附带字段和制度版本，便于后续追溯。'];
 return <section className={`agent-showcase ${playing&&!reduced?'is-playing':''}`} ref={scene} aria-label="采购审单智能体动态导览">
  <div className="agent-story-copy"><span className="story-eyebrow"><Workflow size={16}/>AGENT WORKSHOP</span><h1>让一个想法，<br/>沿着工作流<span>变成行动。</span></h1><p className="story-lede">一张采购单如何经过知识检索、规则判断与人工确认？先看它运行，再亲手搭建。</p><button className="story-cta" onClick={startBuilding}>用这张单据开始搭建 <ArrowDown size={17}/></button><a className="story-secondary" href="/learn?lesson=dify">先了解节点与工作流 <ArrowRight size={15}/></a><div className="story-facts"><span><strong>01</strong> 业务任务</span><span><strong>06</strong> 可配置节点</span><span><strong>你</strong> 决定行动边界</span></div></div>
  <div className="agent-story-demo"><div className="story-gradient" aria-hidden="true"/><div className="story-demo-top"><span>采购审单 / 动态演示</span><button onClick={()=>{if(!playing&&step===3)setStep(0);setPlaying(!playing)}} aria-label={playing?'暂停动态导览':step===3?'重播动态导览':'播放动态导览'}>{playing?<Pause size={15}/>:<Play size={15}/>}<span>{playing?'暂停':step===3?'重播':'播放'}</span></button></div>
   <Tabs value={sample} onValueChange={choose} className="story-samples"><TabsList aria-label="选择导览场景">{samples.map(s=><TabsTrigger value={s.id} key={s.id}>{s.label}</TabsTrigger>)}</TabsList></Tabs>
   <div className="story-window"><div className="story-window-chrome"><span><i/><i/><i/></span><small>PROCUREMENT AGENT</small><span className="story-sandbox">模拟</span></div><div className="story-invoice"><div><span className="story-document-icon"><FileText size={23}/></span><span><strong>{invoice.itemName}</strong><small>{invoice.id} · {invoice.supplier}</small></span><b>{money(invoice.invoiceAmount)}</b></div><div className="story-fields"><span>收货数量<strong>{invoice.receivedQty}</strong></span><span>发票数量<strong>{invoice.invoicedQty}</strong></span><span>数量差异<strong className={match.exception?'story-warning':''}>{(match.qtyRate*100).toFixed(2)}%</strong></span></div></div>
    <div className="story-pipeline" aria-label="演示步骤">{stages.map((stage,i)=><button key={stage.name} className={`${step===i?'current':''} ${step>i?'complete':''}`} aria-label={`查看第 ${i+1} 步：${stage.name}`} aria-pressed={step===i} onClick={()=>{setStep(i);setPlaying(false)}}><span>{step>i?<Check size={18}/>:<stage.icon size={18}/>}</span><strong>{stage.name}</strong><small>{String(i+1).padStart(2,'0')}</small></button>)}</div>
    <div className="story-step-note" aria-live={playing?'off':'polite'}><span>STEP 0{step+1}</span><p>{descriptions[step]}</p></div>
   </div><div className={`story-result ${step===3?'arrived':''} ${needsReview?'review':'matched'}`}><span className="story-result-icon">{needsReview?<ShieldCheck size={23}/>:<Check size={23}/>}</span><div><small>{step===3?'本次演示的下一步':'接下来的流转方向'}</small><strong>{needsReview?'交给人工，带上依据。':'规则通过，输出建议。'}</strong></div><span className="story-result-badge">{needsReview?'待确认':'匹配'}</span></div><p className="story-demo-caption">教学合成单据 · 预置流程演示 · 下方工作台可实际调整规则</p>
  </div>
 </section>
}
