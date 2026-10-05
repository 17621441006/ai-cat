"use client";
import {useLearningLocation,replaceLearningUrl} from '@/lib/learning-location';
import {useEffect,useState} from 'react';
import {ArrowUpRight,BookOpen,Layers,ArrowRight} from 'lucide-react';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import ProjectGallery from './project-gallery';
import {StudioHeading} from './studio-shared';
import industry from '@/lib/industry.json';
export default function ResearchHub(){
 const[tab,setTab]=useState('products');
 useLearningLocation('/projects',params=>setTab(params.get('tab')==='research'?'research':'products'));
 function change(value:string){setTab(value);const url=new URL(location.href);if(value==='research')url.searchParams.set('tab',value);else url.searchParams.delete('tab');replaceLearningUrl(url.pathname+url.search)}
 return <><StudioHeading eyebrow="RESEARCH & PRODUCT LIBRARY" title="行业研究与产品专栏" desc="在同一个入口查阅行业依据与项目案例。想动手验证？再进入对应的供应链工作台。"/><Tabs value={tab} onValueChange={change} className="research-hub-tabs"><TabsList><TabsTrigger value="products"><Layers size={17}/>产品案例 · 11 个场景</TabsTrigger><TabsTrigger value="research"><BookOpen size={17}/>行业研究 · 公开依据</TabsTrigger></TabsList><TabsContent value="products"><ProjectGallery embedded/></TabsContent><TabsContent value="research"><div className="research-intro"><div><span className="eyebrow">FROM EVIDENCE TO A PILOT</span><h2>先读懂行业方法，再选择试点。</h2><p>这里汇总已有专栏的一手资料与研究摘要。场景设计、数据依赖和验收建议统一放在“云应用 × 供应链”。</p></div><a href="/industry">进入业务试点设计 <ArrowRight size={17}/></a></div><div className="research-source-grid">{industry.sources.map((source,i)=><article key={source.id}><span className="research-source-meta">{String(i+1).padStart(2,'0')} / {source.publisher}</span><h3>{source.title}</h3><p>{source.fact}</p><a href={source.url} target="_blank" rel="noopener noreferrer">查阅官方原文 <ArrowUpRight size={15}/></a></article>)}</div><p className="fine-print">研究摘要沿用站内已有专栏资料；产品当前能力以官方原文为准，试点建议不代表既有业绩。</p></TabsContent></Tabs></>
}
